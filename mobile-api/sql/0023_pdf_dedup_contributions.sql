-- Migration 0023 : empreintes PDF, envois en lot, récompenses de contribution
-- Idempotent : peut etre execute plusieurs fois sans erreur.

-- 1. Empreintes et origine des documents du catalogue
alter table public.documents
  add column if not exists file_sha256 text,
  add column if not exists text_fingerprint text,
  add column if not exists minhash integer[],
  add column if not exists embedding real[],
  add column if not exists source text not null default 'admin',
  add column if not exists contributor_id uuid references public.app_users(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documents_source_check') then
    alter table public.documents
      add constraint documents_source_check check (source in ('admin', 'student'));
  end if;
end $$;

-- Partiel : les documents déjà au catalogue n'ont pas de hash.
create unique index if not exists documents_file_sha256_uidx
  on public.documents (file_sha256) where file_sha256 is not null;

create index if not exists documents_text_fingerprint_idx
  on public.documents (text_fingerprint);

-- 2. Suivi de chaque fichier envoyé (admin ou étudiant)
create table if not exists public.pdf_uploads (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  uploader_id uuid not null references public.app_users(id) on delete cascade,
  source text not null check (source in ('admin', 'student')),
  status text not null check (status in ('analyzing', 'duplicate', 'probable_duplicate', 'ready', 'pending_review', 'published', 'rejected')),
  original_name text not null,
  file_size integer not null,
  storage_url text,
  file_sha256 text not null,
  text_fingerprint text,
  minhash integer[],
  embedding real[],
  page_count integer,
  extracted_text text,
  ai_sheet jsonb not null default '{}',
  duplicate_of_document text references public.documents(id) on delete set null,
  duplicate_of_upload uuid,
  similarity numeric,
  reject_reason text,
  rights_declared boolean not null default false,
  copyright_flag boolean not null default false,
  personal_data_flag boolean not null default false,
  ai_attempts integer not null default 0,
  document_id text references public.documents(id) on delete set null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pdf_uploads_uploader_created_idx
  on public.pdf_uploads (uploader_id, created_at desc);
create index if not exists pdf_uploads_batch_idx on public.pdf_uploads (batch_id);
create index if not exists pdf_uploads_status_idx on public.pdf_uploads (status);
create index if not exists pdf_uploads_sha_idx on public.pdf_uploads (file_sha256);

-- Deux envois en attente du même fichier sont impossibles.
create unique index if not exists pdf_uploads_active_sha_uidx
  on public.pdf_uploads (file_sha256)
  where status in ('analyzing', 'ready', 'pending_review', 'probable_duplicate');

-- 3. Une seule récompense par envoi publié
create table if not exists public.contribution_rewards (
  upload_id uuid primary key references public.pdf_uploads(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  amount_coins integer not null check (amount_coins > 0),
  created_at timestamptz not null default now()
);

-- 4. Nouveau type de transaction (garde les 8 types de 0021)
alter table public.app_wallet_transactions
  drop constraint if exists app_wallet_transactions_type_check;

alter table public.app_wallet_transactions
  add constraint app_wallet_transactions_type_check
  check (type in ('topup', 'purchase', 'withdrawal', 'commission', 'subscription', 'ia_pack', 'bonus', 'admin_adjustment', 'contribution_reward'));
