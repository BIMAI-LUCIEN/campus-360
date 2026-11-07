-- Migration 0032 : kits de candidature pour les offres LINK (contexte.md §22)
-- Stocke la lettre, les 4 réponses prêtes et jusqu'à 5 questions du formulaire
-- collées par l'étudiant, par étudiant et par offre.
-- Idempotent : peut être exécuté plusieurs fois sans erreur.

create table if not exists public.stage_application_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  job_id uuid not null references public.stage_jobs(id) on delete cascade,
  letter text not null default '',
  answers jsonb not null default '{}'::jsonb,
  questions_used integer not null default 0 check (questions_used >= 0 and questions_used <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stage_application_kits_user_job_key unique (user_id, job_id)
);

create index if not exists idx_stage_application_kits_user
  on public.stage_application_kits (user_id, updated_at desc);
