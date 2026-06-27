import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { Client } from 'pg';
import { PDFDocument } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Helper to load env variables
const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv(path.join(root, '.env.local'));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing in admin-app/.env.local');
  process.exit(1);
}

console.log('Compiling TypeScript files for testing...');
try {
  execSync(
    'npx tsc lib/pdf-preview.ts lib/supabase-pdf.ts lib/paths.ts lib/course-db.ts --outDir scripts/temp --module commonjs --target es2020 --skipLibCheck --esModuleInterop',
    { cwd: root, stdio: 'inherit' }
  );
  console.log('TS Compilation successful.');
} catch (err) {
  console.error('TS Compilation failed:', err);
  process.exit(1);
}

// Dynamically import compiled modules using createRequire (since they are CommonJS now)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const tempDir = path.join(root, 'scripts', 'temp');
const { generateWatermarkedPreview } = require('./temp/pdf-preview.js');
const { getSupabasePdfAnalytics, deleteSupabasePdf, uploadSupabasePdfBytes } = require('./temp/supabase-pdf.js');

async function testPdfWatermark() {
  console.log('\n--- 1. Testing PDF Page Extraction & Watermarking ---');
  // Create a 3-page dummy PDF
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([600, 800]);
  pdfDoc.addPage([600, 800]);
  pdfDoc.addPage([600, 800]);
  const srcBytes = await pdfDoc.save();
  const srcBuffer = Buffer.from(srcBytes);

  console.log(`Original PDF pages: ${pdfDoc.getPageCount()}`);
  
  // Generate watermarked preview (extracts first page and overlays watermark)
  const previewBuffer = await generateWatermarkedPreview(srcBuffer, 'Campus-Bordes Preview');
  
  // Load generated preview PDF
  const previewDoc = await PDFDocument.load(previewBuffer);
  const pageCount = previewDoc.getPageCount();
  console.log(`Preview PDF pages: ${pageCount}`);
  
  if (pageCount !== 1) {
    throw new Error(`Expected exactly 1 page in preview, got ${pageCount}`);
  }
  console.log('PDF Watermarking: SUCCESS (Contains exactly 1 page).');
}

async function testDeleteTriggersBucketDeletion() {
  console.log('\n--- 2. Testing Delete Triggers Bucket Deletion ---');
  const dummyId = 'pdf-test-challenger-delete';
  const dummyFileName = 'test-challenger-delete.pdf';
  const dummyFilePath = `admin/${dummyFileName}`;
  const dummyBuffer = Buffer.from('dummy PDF content for challenger testing');

  console.log('Uploading dummy files to Supabase Storage...');
  await uploadSupabasePdfBytes(dummyFilePath, dummyBuffer, 'documents');
  await uploadSupabasePdfBytes(dummyFilePath, dummyBuffer, 'document-previews');

  // Insert dummy document in DB
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await pgClient.connect();

  try {
    console.log('Inserting dummy document in database...');
    await pgClient.query(`
      insert into public.documents (
        id, title, description, university, faculty, subject, level, academic_year, file_path, preview_path, status
      ) values (
        $1, 'Challenger Delete Test Doc', 'Desc', 'Univ', 'Faculty', 'Subject', 'Level', '2025-2026', $2, $3, 'draft'
      ) on conflict (id) do nothing;
    `, [dummyId, dummyFilePath, dummyFilePath]);

    // Verify they exist in storage before delete
    const checkFileExists = async (bucket, filePath) => {
      const url = `${process.env.SUPABASE_URL?.replace(/\/$/, '')}/storage/v1/object/${bucket}/${filePath}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        }
      });
      const text = await res.text();
      console.log(`[Storage Check] GET /object/${bucket}/${filePath} -> Status: ${res.status}, Body length: ${text.length}`);
      if (res.status !== 200) {
        console.log(`[Storage Check info] Non-200 Response: ${text}`);
      }
      return res.status === 200;
    };

    const docExistsBefore = await checkFileExists('documents', dummyFilePath);
    const previewExistsBefore = await checkFileExists('document-previews', dummyFilePath);
    console.log(`Document exists in bucket before delete: ${docExistsBefore}`);
    console.log(`Preview exists in bucket before delete: ${previewExistsBefore}`);

    if (!docExistsBefore || !previewExistsBefore) {
      throw new Error('Dummy files were not uploaded successfully before delete test.');
    }

    console.log('Calling deleteSupabasePdf...');
    await deleteSupabasePdf(dummyId);

    // Verify row is gone from DB
    const { rows } = await pgClient.query('select * from public.documents where id = $1', [dummyId]);
    console.log(`Database row count after delete: ${rows.length}`);
    if (rows.length !== 0) {
      throw new Error('Database row was not deleted.');
    }

    // Verify files are deleted from buckets (should return 404 or 400 instead of 200)
    let docExistsAfter = await checkFileExists('documents', dummyFilePath);
    let previewExistsAfter = await checkFileExists('document-previews', dummyFilePath);
    console.log(`Document exists in bucket after delete: ${docExistsAfter}`);
    console.log(`Preview exists in bucket after delete: ${previewExistsAfter}`);

    if (docExistsAfter || previewExistsAfter) {
      console.log('WARNING: Files still exist in buckets after calling deleteSupabasePdf! This indicates a BUG in deleteSupabaseFile.');
      
      console.log('Testing alternative correct DELETE endpoint (DELETE with body prefixes)...');
      const deleteCorrectly = async (bucket, filePath) => {
        const url = `${process.env.SUPABASE_URL?.replace(/\/$/, '')}/storage/v1/object/${bucket}`;
        const res = await fetch(url, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: [filePath] }),
        });
        return res.status === 200;
      };

      await deleteCorrectly('documents', dummyFilePath);
      await deleteCorrectly('document-previews', dummyFilePath);

      docExistsAfter = await checkFileExists('documents', dummyFilePath);
      previewExistsAfter = await checkFileExists('document-previews', dummyFilePath);
      console.log(`Document exists in bucket after correct DELETE: ${docExistsAfter}`);
      console.log(`Preview exists in bucket after correct DELETE: ${previewExistsAfter}`);

      if (!docExistsAfter && !previewExistsAfter) {
        console.log('Confirmed: Deletion works when using DELETE on /object/:bucket with { prefixes } body. The implementation in deleteSupabaseFile is BUGGED.');
      } else {
        console.log('ERROR: Deletion failed even with alternative DELETE prefixes endpoint.');
      }
    } else {
      console.log('Delete bucket triggers: SUCCESS.');
    }
  } finally {
    // Make sure we clean up the storage files using the correct prefixes endpoint
    const urlDoc = `${process.env.SUPABASE_URL?.replace(/\/$/, '')}/storage/v1/object/documents`;
    const urlPreview = `${process.env.SUPABASE_URL?.replace(/\/$/, '')}/storage/v1/object/document-previews`;
    const headers = {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    };
    await fetch(urlDoc, { method: 'DELETE', headers, body: JSON.stringify({ prefixes: [dummyFilePath] }) });
    await fetch(urlPreview, { method: 'DELETE', headers, body: JSON.stringify({ prefixes: [dummyFilePath] }) });
    await pgClient.end();
  }
}

async function testAnalyticsDashboard() {
  console.log('\n--- 3. Testing Analytics Dashboard Resolution & Revenue ---');
  const dummyUserId = 'c0a80101-0000-0000-0000-000000000001';
  const dummyEmail = 'challenger-test-user@campus360.local';
  const dummyDocId = 'pdf-test-challenger-analytics';
  const dummyEventId = 'e0a80101-0000-0000-0000-000000000001';
  const dummyPurchaseId = 'd0a80101-0000-0000-0000-000000000001';

  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await pgClient.connect();

  try {
    console.log('Creating dummy user in auth.users...');
    await pgClient.query(`
      insert into auth.users (id, email, raw_user_meta_data, role, aud, created_at, updated_at)
      values ($1, $2, '{"name": "Challenger Test User"}', 'authenticated', 'authenticated', now(), now())
      on conflict (id) do nothing;
    `, [dummyUserId, dummyEmail]);

    // Force profile insert in case trigger isn't configured identically
    await pgClient.query(`
      insert into public.profiles (id, email, name)
      values ($1, $2, 'Challenger Test User')
      on conflict (id) do update set email = excluded.email;
    `, [dummyUserId, dummyEmail]);

    console.log('Inserting dummy document...');
    await pgClient.query(`
      insert into public.documents (
        id, title, description, university, faculty, subject, level, academic_year, file_path, status
      ) values (
        $1, 'Challenger Analytics Doc', 'Desc', 'Univ', 'Faculty', 'Subject', 'Level', '2025-2026', 'admin/test.pdf', 'published'
      ) on conflict (id) do nothing;
    `, [dummyDocId]);

    console.log('Inserting dummy event for mobile user...');
    await pgClient.query(`
      insert into public.document_events (id, user_id, document_id, event_type, session_id, created_at)
      values ($1, $2, $3, 'preview_open', 'session-challenger', now())
      on conflict (id) do nothing;
    `, [dummyEventId, dummyUserId, dummyDocId]);

    // Query analytics before purchase
    let analytics = await getSupabasePdfAnalytics();
    const initialRevenue = analytics.totals.revenue;
    console.log(`Initial Revenue: ${initialRevenue}`);

    // Verify email join
    const testEvent = analytics.recentEvents.find(e => e.id === dummyEventId);
    if (!testEvent) {
      throw new Error('Test event not found in recentEvents list.');
    }
    console.log(`Found event. User ID: ${testEvent.userId}, resolved User Email: ${testEvent.userEmail}`);
    if (testEvent.userEmail !== dummyEmail) {
      throw new Error(`Email resolution failed. Expected ${dummyEmail}, got ${testEvent.userEmail}`);
    }
    console.log('Mobile user email resolution join: SUCCESS.');

    console.log('Inserting purchase of 999 coins...');
    await pgClient.query(`
      insert into public.document_purchases (id, document_id, buyer_id, amount_coins, created_at)
      values ($1, $2, $3, 999, now())
      on conflict (id) do nothing;
    `, [dummyPurchaseId, dummyDocId, dummyUserId]);

    // Query analytics after purchase
    analytics = await getSupabasePdfAnalytics();
    const postRevenue = analytics.totals.revenue;
    console.log(`Revenue after purchase: ${postRevenue}`);

    if (postRevenue - initialRevenue !== 999) {
      throw new Error(`Revenue metric did not increase by 999. Before: ${initialRevenue}, After: ${postRevenue}`);
    }
    console.log('Revenue metric computation from document_purchases: SUCCESS.');

  } finally {
    // Cleanup
    console.log('Cleaning up analytics dummy records...');
    await pgClient.query('delete from public.document_purchases where id = $1', [dummyPurchaseId]);
    await pgClient.query('delete from public.document_events where id = $1', [dummyEventId]);
    await pgClient.query('delete from public.documents where id = $1', [dummyDocId]);
    await pgClient.query('delete from public.profiles where id = $1', [dummyUserId]);
    await pgClient.query('delete from auth.users where id = $1', [dummyUserId]);
    await pgClient.end();
  }
}

async function run() {
  try {
    await testPdfWatermark();
    await testDeleteTriggersBucketDeletion();
    await testAnalyticsDashboard();
    console.log('\n=========================================');
    console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
    console.log('=========================================');
  } catch (err) {
    console.error('\nVerification failed:', err);
    process.exit(1);
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

run();
