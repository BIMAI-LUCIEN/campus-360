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

-- Indexes for high performance querying
create index if not exists idx_stage_jobs_company on public.stage_jobs(company_id);
create index if not exists idx_stage_jobs_sponsored on public.stage_jobs(is_sponsored, created_at desc);
create index if not exists idx_stage_apps_student on public.stage_applications(student_id);
create index if not exists idx_stage_apps_job on public.stage_applications(job_id);
create index if not exists idx_stage_apps_pending on public.stage_applications(status, applied_at);
