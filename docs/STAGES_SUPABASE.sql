-- Migration SQL Exhaustive — Campus 360 Stages & Automatisation IA
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type company_status as enum ('UNVERIFIED', 'VERIFIED', 'SUSPENDED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type apply_method as enum ('WHATSAPP', 'EMAIL', 'PHYSICAL');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type job_source as enum ('INTERNAL', 'SCRAPED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type stage_app_status as enum ('PENDING', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED');
exception when duplicate_object then null;
end $$;

-- Table Students
create table if not exists public.stage_students (
  id uuid primary key default gen_random_uuid(),
  auth_id text unique not null,
  full_name text not null,
  phone_whatsapp text unique,
  email text unique not null,
  education_level text not null default 'Licence 2',
  major text not null default 'Informatique',
  skills text[] not null default '{}',
  portfolio_url text,
  tokens integer not null default 1 check (tokens >= 0),
  is_premium boolean not null default false,
  boost_ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.stage_students add column if not exists app_user_id uuid references public.app_users(id) on delete cascade;
create unique index if not exists idx_stage_students_app_user on public.stage_students(app_user_id) where app_user_id is not null;

-- Table Companies
create table if not exists public.stage_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null,
  address text not null,
  contact_email text not null,
  contact_whatsapp text,
  kyb_score integer not null default 0 check (kyb_score between 0 and 100),
  status company_status not null default 'UNVERIFIED',
  is_premium boolean not null default false,
  logo_url text,
  created_at timestamptz not null default now()
);

-- Table Jobs
create table if not exists public.stage_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.stage_companies(id) on delete cascade,
  title text not null,
  description text not null check (char_length(description) <= 2000),
  requirements text[] not null default '{}',
  apply_method apply_method not null default 'WHATSAPP',
  is_sponsored boolean not null default false,
  source job_source not null default 'INTERNAL',
  location text default 'Abidjan / Hybride',
  duration text default '3 à 6 mois',
  stipend text default 'Rémunéré',
  flyer_url text,
  video_url text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

-- Table Applications
create table if not exists public.stage_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.stage_students(id) on delete cascade,
  job_id uuid not null references public.stage_jobs(id) on delete cascade,
  status stage_app_status not null default 'PENDING',
  applied_at timestamptz not null default now(),
  cv_file_url text,
  letter_file_url text,
  generated_cv_text text,
  generated_letter_text text,
  last_reminded_at timestamptz
);

alter table public.stage_companies add column if not exists logo_url text;
alter table public.stage_jobs add column if not exists flyer_url text;
alter table public.stage_jobs add column if not exists video_url text;
alter table public.stage_applications add column if not exists notes text;
delete from public.stage_applications a
using public.stage_applications newer
where a.student_id = newer.student_id and a.job_id = newer.job_id
  and (a.applied_at < newer.applied_at or (a.applied_at = newer.applied_at and a.id::text < newer.id::text));
create unique index if not exists idx_stage_apps_student_job on public.stage_applications(student_id, job_id);

-- Indexes for high performance querying
create index if not exists idx_stage_jobs_company on public.stage_jobs(company_id);
create index if not exists idx_stage_jobs_sponsored on public.stage_jobs(is_sponsored, created_at desc);
create index if not exists idx_stage_apps_student on public.stage_applications(student_id);
create index if not exists idx_stage_apps_job on public.stage_applications(job_id);
create index if not exists idx_stage_apps_pending on public.stage_applications(status, applied_at);
