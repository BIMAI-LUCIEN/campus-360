-- migrate:no-transaction
-- Migration 0011: Stage applications WITHDRAWN status & scraped reports status hardening

-- 1. Add WITHDRAWN to stage_app_status enum
ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';

-- 2. Add status column to scraped_stage_reports
ALTER TABLE public.scraped_stage_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

-- 3. Enforce check constraint for scraped_stage_reports status
ALTER TABLE public.scraped_stage_reports
  DROP CONSTRAINT IF EXISTS scraped_stage_reports_status_check;

ALTER TABLE public.scraped_stage_reports
  ADD CONSTRAINT scraped_stage_reports_status_check
  CHECK (status IN ('published', 'pending_review', 'rejected'));
