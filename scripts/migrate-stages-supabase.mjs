import pg from '../mobile-api/node_modules/pg/lib/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', 'mobile-api', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      const k = key.trim();
      const v = vals.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL is missing in .env.local');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('📦 Executing docs/STAGES_SUPABASE.sql in Supabase PostgreSQL...');
  const sqlPath = path.join(__dirname, '..', 'docs', 'STAGES_SUPABASE.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Tables stage_companies, stage_jobs, stage_applications created successfully!');

    try {
      await client.query("NOTIFY pgrst, 'reload schema';");
      console.log('✅ PostgREST schema cache reloaded!');
    } catch (_) {}

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
