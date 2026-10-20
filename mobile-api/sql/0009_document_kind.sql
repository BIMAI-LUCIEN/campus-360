-- Migration 0009: Document kind and always_free flag for catalog documents
-- Ensures course materials and past exams remain free even after promotional launch.

-- 1. Add kind and always_free columns if they don't exist
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'autre',
  ADD COLUMN IF NOT EXISTS always_free boolean NOT NULL DEFAULT false;

-- 2. Add kind check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_kind_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_kind_check
      CHECK (kind IN ('cours', 'ancien_sujet', 'corrige', 'rapport', 'memoire', 'autre'));
  END IF;
END $$;

-- 3. Automatic reclassification for existing documents (user-confirmed)
UPDATE public.documents
  SET kind = 'cours', always_free = true
  WHERE (title ILIKE '%cours%' OR description ILIKE '%cours%')
    AND kind = 'autre';

UPDATE public.documents
  SET kind = 'ancien_sujet', always_free = true
  WHERE (title ILIKE '%examen%' OR title ILIKE '%sujet%' OR description ILIKE '%examen%' OR description ILIKE '%sujet%')
    AND kind = 'autre';
