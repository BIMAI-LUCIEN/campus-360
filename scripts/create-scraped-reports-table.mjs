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
  console.log('📦 Creating table public.scraped_stage_reports in Supabase PostgreSQL...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.scraped_stage_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        theme TEXT,
        author TEXT,
        school TEXT,
        company TEXT,
        field TEXT NOT NULL DEFAULT 'Informatique / Génie Logiciel',
        level TEXT DEFAULT 'Licence',
        academic_year TEXT,
        abstract TEXT,
        table_of_contents JSONB DEFAULT '[]',
        file_url TEXT NOT NULL,
        source_platform TEXT NOT NULL,
        source_url TEXT UNIQUE NOT NULL,
        tags TEXT[] DEFAULT '{}',
        quality_score INTEGER DEFAULT 80 CHECK (quality_score BETWEEN 0 AND 100),
        view_count INTEGER DEFAULT 0,
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_scraped_reports_field ON public.scraped_stage_reports(field);
      CREATE INDEX IF NOT EXISTS idx_scraped_reports_source ON public.scraped_stage_reports(source_platform);
      CREATE INDEX IF NOT EXISTS idx_scraped_reports_created ON public.scraped_stage_reports(created_at DESC);
    `);
    console.log('✅ Table public.scraped_stage_reports created successfully!');

    // Notify Supabase PostgREST to reload schema cache
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
