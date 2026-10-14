-- Quality columns for the scraping pipeline (Module 17). Idempotent.
alter table public.stage_jobs add column if not exists kind text not null default 'stage';
alter table public.stage_jobs add column if not exists status text not null default 'published';
alter table public.stage_jobs add column if not exists confidence numeric(4,3);
alter table public.stage_jobs add column if not exists review_reason text;
alter table public.stage_jobs add column if not exists evidence jsonb not null default '{}'::jsonb;
alter table public.stage_jobs add column if not exists source_url text;
alter table public.stage_jobs add column if not exists source_published_at timestamptz;
alter table public.stage_jobs add column if not exists company_normalized text;
alter table public.stage_jobs add column if not exists reviewed_at timestamptz;
alter table public.stage_jobs add column if not exists reviewed_by text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'stage_jobs_kind_check') then
    alter table public.stage_jobs add constraint stage_jobs_kind_check check (kind in ('stage', 'emploi'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stage_jobs_status_check') then
    alter table public.stage_jobs add constraint stage_jobs_status_check
      check (status in ('published', 'pending_review', 'rejected'));
  end if;
end $$;

create index if not exists idx_stage_jobs_status on public.stage_jobs(status);
create index if not exists idx_stage_jobs_company_normalized on public.stage_jobs(company_normalized);

-- Journal of everything the pipeline refused, to tune the rules later.
create table if not exists public.stage_job_rejections (
  id bigserial primary key,
  stage text not null,
  reason text not null,
  source_platform text,
  source_url text,
  source_title text,
  source_text text,
  created_at timestamptz not null default now()
);
create index if not exists idx_stage_job_rejections_created on public.stage_job_rejections(created_at desc);
