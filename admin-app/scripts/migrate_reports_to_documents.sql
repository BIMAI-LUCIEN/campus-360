-- Migration: rename reports → documents
-- Run this on your Supabase database (via SQL Editor or psql)

BEGIN;

-- Rename tables
ALTER TABLE public.app_reports RENAME TO app_documents;
ALTER TABLE public.app_report_sections RENAME TO app_document_sections;

-- Rename the foreign key column inside app_document_sections
ALTER TABLE public.app_document_sections RENAME COLUMN report_id TO document_id;

-- Rename indexes (they follow the pattern idx_ and fk_)
ALTER INDEX IF EXISTS idx_app_report_sections_report_id RENAME TO idx_app_document_sections_document_id;
ALTER INDEX IF EXISTS idx_app_reports_student_id RENAME TO idx_app_documents_student_id;
ALTER INDEX IF EXISTS idx_app_reports_status RENAME TO idx_app_documents_status;
ALTER INDEX IF EXISTS idx_app_reports_created_at RENAME TO idx_app_documents_created_at;

-- Rename primary key constraint on app_documents (usually pk_...)
ALTER INDEX IF EXISTS app_reports_pkey RENAME TO app_documents_pkey;
ALTER INDEX IF EXISTS app_report_sections_pkey RENAME TO app_document_sections_pkey;

-- Rename foreign key constraints (naming varies by DB tool, rename any that reference report_id)
-- These are common patterns; if they don't exist, that's fine — just skip
DO $$
DECLARE
  cons record;
BEGIN
  FOR cons IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.app_document_sections'::regclass
      AND conname ILIKE '%report%'
  LOOP
    EXECUTE format('ALTER INDEX %I RENAME TO %I',
      cons.conname,
      regexp_replace(cons.conname, 'report', 'document', 'gi')
    );
  END LOOP;
END;
$$;

COMMIT;
