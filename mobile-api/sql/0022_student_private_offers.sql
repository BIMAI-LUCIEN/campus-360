-- Migration 0022 : offres trouvées hors de l'app par un étudiant (affiche,
-- capture, texte). Elles sont enregistrées comme des offres « private »,
-- visibles et utilisables seulement par l'étudiant qui les a ajoutées, pour
-- réutiliser tout le parcours de candidature (CV IA, lettre, envoi, suivi).
-- Idempotent.

alter table public.stage_jobs add column if not exists owner_user_id text;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'stage_jobs_status_check') then
    alter table public.stage_jobs drop constraint stage_jobs_status_check;
  end if;
  alter table public.stage_jobs add constraint stage_jobs_status_check
    check (status in ('published', 'pending_review', 'rejected', 'expired', 'private'));

  if not exists (select 1 from pg_constraint where conname = 'stage_jobs_private_owner_check') then
    alter table public.stage_jobs add constraint stage_jobs_private_owner_check
      check (status <> 'private' or owner_user_id is not null);
  end if;
end $$;

create index if not exists idx_stage_jobs_owner on public.stage_jobs(owner_user_id) where owner_user_id is not null;
