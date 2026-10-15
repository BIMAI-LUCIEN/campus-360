-- Document files (images + sources) stored on the VPS disk, and the text chunks
-- extracted from sources for lexical retrieval (Module 19). Idempotent.

create table if not exists public.app_document_files (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references public.app_documents(id) on delete cascade,
  user_id       uuid not null references public.app_users(id) on delete cascade,
  kind          text not null,
  origin        text not null,
  storage_key   text,
  original_name text not null default '',
  title         text not null default '',
  mime          text not null default '',
  bytes         bigint not null default 0,
  sha256        text,
  source_url    text,
  status        text not null default 'pending',
  error         text,
  page_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_document_files_kind_check') then
    alter table public.app_document_files add constraint app_document_files_kind_check
      check (kind in ('image', 'source'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_document_files_origin_check') then
    alter table public.app_document_files add constraint app_document_files_origin_check
      check (origin in ('upload', 'url', 'text'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_document_files_status_check') then
    alter table public.app_document_files add constraint app_document_files_status_check
      check (status in ('pending', 'ready', 'failed'));
  end if;
end $$;

create index if not exists idx_doc_files_document on public.app_document_files(document_id, kind);
create index if not exists idx_doc_files_user on public.app_document_files(user_id);

create table if not exists public.app_document_chunks (
  id          uuid primary key default gen_random_uuid(),
  file_id     uuid not null references public.app_document_files(id) on delete cascade,
  document_id uuid not null references public.app_documents(id) on delete cascade,
  user_id     uuid not null references public.app_users(id) on delete cascade,
  page        integer not null default 1,
  position    integer not null default 0,
  content     text not null,
  tsv         tsvector generated always as (to_tsvector('french', coalesce(content, ''))) stored
);

create index if not exists idx_doc_chunks_tsv on public.app_document_chunks using gin (tsv);
create index if not exists idx_doc_chunks_file on public.app_document_chunks(file_id, position);
create index if not exists idx_doc_chunks_document on public.app_document_chunks(document_id, user_id);

-- Images placed in the editor point at an uploaded file instead of a raw URL.
alter table if exists public.app_document_images add column if not exists file_id uuid
  references public.app_document_files(id) on delete cascade;
