-- Migration 0018 : Description intégrale des offres (plus de résumé ni de coupe à 2 000 caractères)
-- Idempotent : peut être exécuté plusieurs fois sans erreur.

alter table public.stage_jobs
  drop constraint if exists stage_jobs_description_check;

alter table public.stage_jobs
  add constraint stage_jobs_description_check check (char_length(description) <= 20000);
