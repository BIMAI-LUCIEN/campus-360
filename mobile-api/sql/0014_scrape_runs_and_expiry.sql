-- Scraping runs journal and offer expiry (Module 25, tasks 25.5 to 25.8). Idempotent.
--  * stage_scrape_runs: one row per real scraping run (never written in dry-run),
--    with the counters by decision and whether the daily cap of added offers was hit.
--  * stage_jobs.status gains 'expired': offers whose expires_at has passed are
--    taken off the app by the daily expiry step (scripts/agents/expire_offers.py).
--  * index on stage_jobs.created_at: the daily cap counts offers added today.

begin;

create table if not exists public.stage_scrape_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  window_label text not null default 'manuel',
  sources text[] not null default '{}',
  collected integer not null default 0,
  published integer not null default 0,
  pending_review integer not null default 0,
  rejected integer not null default 0,
  deferred integer not null default 0,
  cap_reached boolean not null default false,
  error text
);

create index if not exists idx_stage_scrape_runs_started_at
  on public.stage_scrape_runs (started_at desc);

comment on table public.stage_scrape_runs is
  'One row per real scraping run: counters by decision, daily cap reached, error if any. Dry-runs write nothing.';

alter table public.stage_jobs drop constraint if exists stage_jobs_status_check;
alter table public.stage_jobs add constraint stage_jobs_status_check
  check (status in ('published', 'pending_review', 'rejected', 'expired'));

create index if not exists idx_stage_jobs_created_at
  on public.stage_jobs (created_at);

commit;
