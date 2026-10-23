-- Migration 0013: report templates (Module 24).
-- A template = a complete document style (cover blocks included), a section
-- outline, logo slots and a preview. Logos and previews are stored in the
-- database (app_template_assets) because app_document_files requires a student
-- document. Idempotent: safe to run twice.

create table if not exists public.app_document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  establishment text not null default '',
  degree text not null default '',
  kind text not null default 'both',
  document_style jsonb not null,
  outline jsonb not null default '[]'::jsonb,
  logo_assets jsonb not null default '{}'::jsonb,
  preview_asset_id uuid,
  status text not null default 'draft',
  source_format text,
  source_report jsonb,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.app_document_templates drop constraint if exists app_document_templates_kind_check;
alter table public.app_document_templates
  add constraint app_document_templates_kind_check check (kind in ('stage', 'memoire', 'both'));

alter table public.app_document_templates drop constraint if exists app_document_templates_status_check;
alter table public.app_document_templates
  add constraint app_document_templates_status_check check (status in ('draft', 'published', 'archived'));

alter table public.app_document_templates drop constraint if exists app_document_templates_source_format_check;
alter table public.app_document_templates
  add constraint app_document_templates_source_format_check check (source_format is null or source_format in ('docx', 'pdf', 'manual'));

alter table public.app_document_templates drop constraint if exists app_document_templates_name_check;
alter table public.app_document_templates
  add constraint app_document_templates_name_check check (char_length(name) between 1 and 120);

create table if not exists public.app_template_assets (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.app_document_templates(id) on delete cascade,
  role text not null,
  mime text not null,
  width integer not null default 0,
  height integer not null default 0,
  bytes integer not null,
  data bytea not null,
  sha256 text not null,
  created_at timestamptz not null default now()
);

alter table public.app_template_assets drop constraint if exists app_template_assets_role_check;
alter table public.app_template_assets
  add constraint app_template_assets_role_check check (role in ('logo', 'preview'));

alter table public.app_template_assets drop constraint if exists app_template_assets_mime_check;
alter table public.app_template_assets
  add constraint app_template_assets_mime_check check (mime in ('image/png', 'image/jpeg', 'image/webp'));

alter table public.app_template_assets drop constraint if exists app_template_assets_bytes_check;
alter table public.app_template_assets
  add constraint app_template_assets_bytes_check check (bytes <= 2097152);

create index if not exists app_document_templates_status_idx on public.app_document_templates (status, establishment);
create index if not exists app_template_assets_template_idx on public.app_template_assets (template_id);

-- Informative: the template a document started from (the document does not follow it).
alter table public.app_documents add column if not exists template_id uuid references public.app_document_templates(id) on delete set null;
