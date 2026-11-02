-- Migration 0029 : relance recruteur et rappels de suivi (contexte.md §21)
-- 1. reminder_count : nombre de relances envoyées, plafonné par la règle serveur.
--    Une relance déjà enregistrée compte pour une.
-- 2. followup_notified_at : dernier rappel envoyé à l'étudiant, un seul par échéance.
-- Idempotent : peut être exécuté plusieurs fois sans erreur.

alter table public.stage_applications
  add column if not exists reminder_count integer not null default 0;

alter table public.stage_applications
  add column if not exists followup_notified_at timestamptz;

update public.stage_applications
   set reminder_count = 1
 where last_reminded_at is not null and reminder_count = 0;

create index if not exists idx_stage_applications_followup_due
  on public.stage_applications (coalesce(last_reminded_at, applied_at))
  where status in ('PENDING', 'DELIVERED');
