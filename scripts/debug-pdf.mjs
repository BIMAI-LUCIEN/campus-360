import pg from 'pg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres.bplvhhckcstfhyqjpsnm:LucienLucien1234567890@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
  });

  const docId = '031a54ff-3a2a-4091-b3de-2270ade00cef';
  const docRes = await pool.query('select * from public.app_documents where id = $1', [docId]);
  const doc = docRes.rows[0];
  console.log('Doc title:', doc?.title);
  console.log('Doc cover_data:', doc?.cover_data);

  const secRes = await pool.query('select * from public.app_document_sections where document_id = $1 order by sort_order asc', [docId]);
  console.log('Sections count:', secRes.rows.length);

  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tmpHtml = path.join(os.tmpdir(), `debug_test_${Date.now()}.html`);
  const tmpPdf = path.join(os.tmpdir(), `debug_test_${Date.now()}.pdf`);

  fs.writeFileSync(tmpHtml, `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>@page { size: A4; margin: 2cm; }</style>
      </head>
      <body>
        <h1>${doc.title}</h1>
        <p>Test PDF generation</p>
      </body>
    </html>
  `);

  const fileUrl = `file:///${tmpHtml.replace(/\\/g, '/')}`;
  const cmd = `"${chrome}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${tmpPdf}" "${fileUrl}"`;
  console.log('Executing:', cmd);

  execSync(cmd, { stdio: 'inherit', timeout: 30000 });

  if (fs.existsSync(tmpPdf)) {
    console.log('SUCCESS! PDF generated with size:', fs.statSync(tmpPdf).size, 'bytes');
  } else {
    console.error('PDF file does not exist');
  }

  await pool.end();
}

main().catch(console.error);
