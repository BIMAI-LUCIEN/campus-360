import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from 'pg';
const { Client } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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
  console.error('DATABASE_URL is missing in environment variables');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = `
-- 1. Check if the table public.app_reports exists before trying to rename it
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_reports') THEN
        ALTER TABLE public.app_reports RENAME TO app_documents;
        RAISE NOTICE 'Table app_reports renamed to app_documents';
    ELSE
        RAISE NOTICE 'Table app_reports does not exist or was already renamed';
    END IF;
END
$$;

-- 2. Check if the table public.app_report_sections exists before trying to rename it
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_report_sections') THEN
        ALTER TABLE public.app_report_sections RENAME TO app_document_sections;
        RAISE NOTICE 'Table app_report_sections renamed to app_document_sections';
    ELSE
        RAISE NOTICE 'Table app_report_sections does not exist or was already renamed';
    END IF;
END
$$;

-- 3. Check if the column report_id in app_document_sections exists before trying to rename it
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'app_document_sections' 
        AND column_name = 'report_id'
    ) THEN
        ALTER TABLE public.app_document_sections RENAME COLUMN report_id TO document_id;
        RAISE NOTICE 'Column report_id in app_document_sections renamed to document_id';
    ELSE
        RAISE NOTICE 'Column report_id does not exist or was already renamed';
    END IF;
END
$$;

-- 4. Enable RLS and setup policies on the renamed tables
ALTER TABLE public.app_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_document_sections ENABLE ROW LEVEL SECURITY;

-- Clean up any old policies
DROP POLICY IF EXISTS "documents_all_own" ON public.app_documents;
DROP POLICY IF EXISTS "documents_select_own" ON public.app_documents;
DROP POLICY IF EXISTS "document_sections_all_own" ON public.app_document_sections;

-- Create policies for app_documents (all operations are tied to owner user_id)
CREATE POLICY "documents_all_own" ON public.app_documents 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Create policies for app_document_sections (all operations are allowed if the owner owns the parent document)
CREATE POLICY "document_sections_all_own" ON public.app_document_sections 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.app_documents 
            WHERE app_documents.id = document_id 
            AND app_documents.user_id = auth.uid()
        )
    );
`;

async function run() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');
    await client.query(sql);
    console.log('Migration successfully completed: app_reports ➔ app_documents, app_report_sections ➔ app_document_sections.');
  } catch (err) {
    console.error('Failed to run migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
