-- migrate:no-transaction
-- Migration 0027 : suivi des candidatures sans DDL au runtime
-- 1. Les statuts d'envoi existaient seulement grâce à des ALTER TYPE exécutés à chaque envoi
--    (lib/stages-db.ts, retirés) : ils sont maintenant déclarés ici.
-- 2. Notes privées de l'étudiant séparées de la colonne `notes` (pitch et canal d'envoi).
-- 3. Date du dernier changement de statut (affichée dans le suivi).
-- Idempotent : peut être exécuté plusieurs fois sans erreur.

ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'SENT_PENDING';
ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';

ALTER TABLE public.stage_applications
  ADD COLUMN IF NOT EXISTS student_notes text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;
