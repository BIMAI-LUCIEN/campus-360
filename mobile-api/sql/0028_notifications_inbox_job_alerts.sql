-- Migration 0028 : boîte de notifications et alertes de nouvelles offres
-- 1. app_notifications : chaque notification envoyée à un étudiant est gardée côté serveur.
--    La cloche de l'app la lit ici : elle survit au redémarrage du téléphone et s'affiche
--    même quand le push n'a pas pu partir (pas de jeton, permission refusée).
-- 2. stage_jobs.alerted_at : date à laquelle les étudiants ont été prévenus d'une offre publiée.
--    Les offres déjà publiées avant cette migration sont considérées comme annoncées
--    (pas de rafale d'alertes au premier passage).
-- Idempotent : peut être exécuté plusieurs fois sans erreur.

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  job_id uuid references public.stage_jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_app_notifications_user_created
  on public.app_notifications (user_id, created_at desc);

-- Une seule alerte par étudiant et par offre.
create unique index if not exists idx_app_notifications_user_job_alert
  on public.app_notifications (user_id, job_id)
  where type = 'job_match';

alter table public.stage_jobs
  add column if not exists alerted_at timestamptz;

update public.stage_jobs
   set alerted_at = coalesce(reviewed_at, created_at, now())
 where status = 'published' and alerted_at is null
   and not exists (select 1 from public.schema_migrations where name = '0028_notifications_inbox_job_alerts.sql');

create index if not exists idx_stage_jobs_alert_pending
  on public.stage_jobs (created_at)
  where status = 'published' and alerted_at is null;
