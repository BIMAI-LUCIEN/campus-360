-- 0000_baseline.sql
-- Baseline schema for Campus 360: all core tables, enum types and extensions
-- preceding migration 0004. Fully idempotent (safe to run on fresh or existing databases).

create extension if not exists pgcrypto;

-- ── 1. Enum Types ─────────────────────────────────────────────────────────────
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

-- ── 2. Better Auth Core Tables ────────────────────────────────────────────────
create table if not exists public."user" (
  id text primary key not null,
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp,
  role text default 'student',
  banned boolean default false,
  "banReason" text,
  "banExpires" timestamptz,
  phone text,
  "whatsappPhone" text,
  university text,
  faculty text,
  level text
);

create table if not exists public."session" (
  id text primary key not null,
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references public."user"(id) on delete cascade,
  "impersonatedBy" text
);

create table if not exists public."account" (
  id text primary key not null,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references public."user"(id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create table if not exists public."verification" (
  id text primary key not null,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create table if not exists public."rateLimit" (
  id text primary key not null,
  key text not null,
  count integer not null,
  "lastRequest" bigint not null
);

-- ── 3. Application Users & Wallets ───────────────────────────────────────────
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  better_auth_user_id text not null unique,
  legacy_supabase_user_id uuid unique,
  email text not null unique,
  name text not null default 'Etudiant Campus 360',
  role text not null default 'student' check (role in ('student', 'admin', 'super_admin')),
  phone text,
  whatsapp_phone text,
  university text,
  faculty text,
  level text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'basic', 'pro', 'elite')),
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users add column if not exists phone text;
alter table public.app_users add column if not exists whatsapp_phone text;
alter table public.app_users add column if not exists subscription_tier text not null default 'free';
alter table public.app_users add column if not exists subscription_expires_at timestamptz;

create table if not exists public.app_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  balance_coins integer not null default 0 check (balance_coins >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 4. Catalogue Documents & Packs ───────────────────────────────────────────
create table if not exists public.documents (
  id text primary key,
  title text not null,
  description text not null,
  university text not null,
  faculty text not null,
  subject text not null,
  teacher text,
  level text not null,
  academic_year text not null,
  price_coins integer not null default 0 check (price_coins >= 0),
  page_count integer not null default 1 check (page_count >= 1),
  file_path text not null,
  preview_path text,
  file_size text,
  status text not null default 'draft' check (status in ('draft', 'analyzing', 'needs_review', 'published', 'archived')),
  commission_rate integer not null default 20 check (commission_rate between 0 and 100),
  rating numeric not null default 4.7,
  sales_count integer not null default 0,
  downloads_count integer not null default 0,
  ai_summary text not null default '',
  ai_tags jsonb not null default '[]'::jsonb,
  ai_difficulty text not null default 'standard',
  suggested_price_coins integer not null default 0,
  quality_score integer not null default 0,
  ai_study_plan jsonb not null default '[]'::jsonb,
  ai_quiz jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pdf_packs (
  id text primary key,
  title text not null,
  description text not null,
  university text not null default 'Multi-etablissements',
  faculty text not null default 'Transversal',
  level text not null default 'Tous niveaux',
  semester text not null default 'Libre',
  pack_type text not null default 'transversal' check (pack_type in ('semester', 'exam_prep', 'corrections', 'course_bundle', 'catch_up', 'transversal')),
  price_coins integer not null default 0 check (price_coins >= 0),
  original_price_coins integer not null default 0 check (original_price_coins >= 0),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  status text not null default 'draft' check (status in ('draft', 'analyzing', 'needs_review', 'published', 'archived')),
  sales_count integer not null default 0,
  revenue_coins integer not null default 0,
  ai_summary text not null default '',
  ai_confidence integer not null default 0 check (ai_confidence between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pdf_pack_items (
  id uuid primary key default gen_random_uuid(),
  pack_id text not null references public.pdf_packs(id) on delete cascade,
  document_id text not null references public.documents(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (pack_id, document_id)
);

create table if not exists public.document_purchases (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.documents(id) on delete cascade,
  buyer_id uuid not null,
  amount_coins integer not null,
  created_at timestamptz not null default now(),
  unique (document_id, buyer_id)
);

create table if not exists public.pack_purchases (
  id uuid primary key default gen_random_uuid(),
  pack_id text not null references public.pdf_packs(id) on delete cascade,
  buyer_id uuid not null,
  amount_coins integer not null,
  document_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (pack_id, buyer_id)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  amount_coins integer not null,
  reference_id text,
  status text not null default 'success',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key,
  email text unique,
  name text not null default 'Etudiant Campus 360',
  role text not null default 'student',
  university text,
  faculty text,
  level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  balance_coins integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  document_id text,
  event_type text not null,
  session_id text not null default 'anonymous',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  better_auth_user_id text
);

alter table public.document_events
  add column if not exists better_auth_user_id text;

-- ── 5. App Documents & Sections ──────────────────────────────────────────────
create table if not exists public.app_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null,
  description text,
  template_type text not null default 'stage',
  document_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_documents add column if not exists document_metadata jsonb not null default '{}';

create table if not exists public.app_document_sections (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.app_documents(id) on delete cascade,
  title text not null,
  content_html text not null default '',
  sort_order integer not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_document_purchases (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.documents(id) on delete cascade,
  buyer_id uuid not null references public.app_users(id) on delete cascade,
  amount_coins integer not null,
  created_at timestamptz not null default now(),
  unique (document_id, buyer_id)
);

create table if not exists public.app_pack_purchases (
  id uuid primary key default gen_random_uuid(),
  pack_id text not null references public.pdf_packs(id) on delete cascade,
  buyer_id uuid not null references public.app_users(id) on delete cascade,
  amount_coins integer not null,
  document_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (pack_id, buyer_id)
);

create table if not exists public.app_user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  push_token text not null unique,
  device_name text,
  device_type text check (device_type in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 6. Auxiliary Tables (previously dynamically ensured by code) ─────────────
create table if not exists public.app_document_sources (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.app_documents(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  file_name text not null,
  file_type text not null default 'pdf',
  file_size bigint default 0,
  file_url text not null,
  extracted_text text default '',
  summary text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.app_document_images (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.app_documents(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  file_name text not null,
  image_url text not null,
  ai_description text default '',
  suggested_caption text default '',
  suggested_section_id uuid,
  is_placed boolean default false,
  file_id uuid,
  created_at timestamptz default now()
);

create table if not exists public.app_login_attempts (
  key text primary key,
  attempts integer not null default 0,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now()
);

create table if not exists public.app_rate_limits (
  bucket text not null,
  key text not null,
  window_started_at timestamptz not null default now(),
  count integer not null default 1,
  primary key (bucket, key)
);

create table if not exists public.admin_audit_logs (
  id text primary key,
  admin_user_id text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata text not null default '{}',
  created_at timestamptz not null default now()
);

-- ── 7. Stages Module Tables ──────────────────────────────────────────────────
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
  created_at timestamptz not null default now(),
  app_user_id uuid references public.app_users(id) on delete cascade,
  whatsapp_connected boolean not null default false,
  whatsapp_instance text,
  whatsapp_linked_at timestamptz
);

alter table public.stage_students add column if not exists app_user_id uuid references public.app_users(id) on delete cascade;
alter table public.stage_students add column if not exists whatsapp_connected boolean not null default false;
alter table public.stage_students add column if not exists whatsapp_instance text;
alter table public.stage_students add column if not exists whatsapp_linked_at timestamptz;

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

alter table public.stage_companies add column if not exists logo_url text;

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

alter table public.stage_jobs add column if not exists flyer_url text;
alter table public.stage_jobs add column if not exists video_url text;

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
  last_reminded_at timestamptz,
  notes text
);

alter table public.stage_applications add column if not exists notes text;

create table if not exists public.scraped_stage_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  theme text,
  author text,
  school text,
  company text,
  field text not null default 'Informatique / Génie Logiciel',
  level text default 'Licence',
  academic_year text,
  abstract text,
  table_of_contents jsonb default '[]'::jsonb,
  file_url text not null,
  source_platform text not null,
  source_url text unique not null,
  tags text[] default '{}',
  quality_score integer default 80 check (quality_score between 0 and 100),
  view_count integer default 0,
  download_count integer default 0,
  created_at timestamptz default now()
);

-- ── 8. Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_user_email on public."user"(lower(email));
create index if not exists idx_session_userId on public."session"("userId");
create index if not exists idx_account_userId on public."account"("userId");
create index if not exists idx_verification_identifier on public."verification"(identifier);

create index if not exists idx_app_users_email on public.app_users(lower(email));
create index if not exists idx_app_doc_purchases_buyer on public.app_document_purchases(buyer_id, created_at desc);
create index if not exists idx_app_pack_purchases_buyer on public.app_pack_purchases(buyer_id, created_at desc);
create index if not exists idx_app_push_tokens_user on public.app_user_push_tokens(user_id);
create index if not exists idx_app_documents_user on public.app_documents(user_id);
create index if not exists idx_app_document_sections_doc on public.app_document_sections(document_id, sort_order);

create unique index if not exists idx_stage_students_app_user on public.stage_students(app_user_id) where app_user_id is not null;
create index if not exists idx_stage_students_phone_whatsapp on public.stage_students(phone_whatsapp);
create index if not exists idx_stage_students_whatsapp_instance on public.stage_students(whatsapp_instance);

create index if not exists idx_stage_jobs_company on public.stage_jobs(company_id);
create index if not exists idx_stage_jobs_sponsored on public.stage_jobs(is_sponsored, created_at desc);
create index if not exists idx_stage_apps_student on public.stage_applications(student_id);
create index if not exists idx_stage_apps_job on public.stage_applications(job_id);
create index if not exists idx_stage_apps_pending on public.stage_applications(status, applied_at);
create unique index if not exists idx_stage_apps_student_job on public.stage_applications(student_id, job_id);

create index if not exists idx_scraped_reports_field on public.scraped_stage_reports(field);
create index if not exists idx_scraped_reports_source on public.scraped_stage_reports(source_platform);

create index if not exists idx_doc_sources_doc_id on public.app_document_sources(document_id);
create index if not exists idx_doc_images_doc_id on public.app_document_images(document_id);

create index if not exists app_login_attempts_last_idx on public.app_login_attempts (last_attempt_at);
create index if not exists app_rate_limits_window_idx on public.app_rate_limits (window_started_at);
