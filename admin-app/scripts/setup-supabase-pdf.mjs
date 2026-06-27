import fs from 'node:fs';
import { Client } from 'pg';

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv('.env.local');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in admin-app/.env.local');
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = `
create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 20971520, array['application/pdf']),
  ('document-previews', 'document-previews', false, 5242880, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text not null default 'Etudiant Campus 3602',
  role text not null default 'student' check (role in ('student', 'admin', 'super_admin')),
  university text,
  faculty text,
  level text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'basic', 'premium')),
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  balance_coins integer not null default 5000 check (balance_coins >= 0),
  ia_credits integer not null default 0 check (ia_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.document_purchases (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.documents(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  amount_coins integer not null,
  created_at timestamptz not null default now(),
  unique (document_id, buyer_id)
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

create table if not exists public.pack_purchases (
  id uuid primary key default gen_random_uuid(),
  pack_id text not null references public.pdf_packs(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  amount_coins integer not null,
  document_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (pack_id, buyer_id)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('topup', 'purchase', 'withdrawal', 'commission', 'subscription', 'ia_pack')),
  amount_coins integer not null,
  reference_id text,
  status text not null default 'success',
  created_at timestamptz not null default now()
);

create table if not exists public.ia_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id text references public.documents(id) on delete set null,
  tokens_used integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  price_coins integer not null,
  duration_days integer not null default 30,
  ia_credits_included integer not null default 0,
  active boolean not null default true
);

insert into public.subscription_plans (id, name, price_coins, duration_days, ia_credits_included)
values
  ('basic', 'Basic', 1000, 30, 0),
  ('premium', 'Premium', 2000, 30, 100)
on conflict (id) do update set price_coins = excluded.price_coins, ia_credits_included = excluded.ia_credits_included;

create table if not exists public.ia_packs (
  id text primary key,
  name text not null,
  price_coins integer not null,
  credits_included integer not null,
  active boolean not null default true
);

insert into public.ia_packs (id, name, price_coins, credits_included)
values
  ('micro', 'Micro', 250, 20),
  ('standard', 'Standard', 500, 50),
  ('boost', 'Boost', 1000, 120)
on conflict (id) do update set price_coins = excluded.price_coins, credits_included = excluded.credits_included;

create table if not exists public.document_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  document_id text references public.documents(id) on delete set null,
  event_type text not null check (
    event_type in (
      'catalog_view',
      'search',
      'preview_open',
      'purchase_start',
      'purchase_success',
      'purchase_failed',
      'reader_open',
      'assistant_question'
    )
  ),
  session_id text not null default 'anonymous',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists documents_catalog_idx
on public.documents (status, university, faculty, level, subject, created_at desc);

create index if not exists documents_search_idx
on public.documents using gin (
  to_tsvector(
    'simple',
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(subject, '') || ' ' ||
    coalesce(teacher, '') || ' ' ||
    coalesce(level, '')
  )
);

create index if not exists document_events_document_idx
on public.document_events (document_id, event_type, created_at desc);

create index if not exists document_events_session_idx
on public.document_events (session_id, created_at desc);

create index if not exists ia_usage_logs_user_idx
on public.ia_usage_logs (user_id, created_at desc);

create index if not exists pdf_packs_catalog_idx
on public.pdf_packs (status, university, faculty, level, created_at desc);

create index if not exists pdf_pack_items_pack_idx
on public.pdf_pack_items (pack_id, sort_order);

create or replace function public.ensure_user_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email, 'Etudiant Campus 3602'))
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance_coins)
  values (new.id, 5000)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_campus360 on auth.users;
drop trigger if exists on_auth_user_created_campus_bordes on auth.users;
create trigger on_auth_user_created_campus_bordes
after insert on auth.users
for each row execute function public.ensure_user_wallet();

create or replace function public.purchase_document(target_document_id text)
returns public.document_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  target_document public.documents%rowtype;
  current_wallet public.wallets%rowtype;
  purchase_row public.document_purchases%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into target_document
  from public.documents
  where id = target_document_id and status = 'published';

  if target_document.id is null then
    raise exception 'Document unavailable';
  end if;

  select * into current_wallet
  from public.wallets
  where user_id = auth.uid()
  for update;

  if current_wallet.id is null then
    insert into public.wallets (user_id, balance_coins)
    values (auth.uid(), 0)
    returning * into current_wallet;
  end if;

  if current_wallet.balance_coins < target_document.price_coins then
    raise exception 'Insufficient balance';
  end if;

  update public.wallets
  set balance_coins = balance_coins - target_document.price_coins,
      updated_at = now()
  where user_id = auth.uid();

  insert into public.document_purchases (document_id, buyer_id, amount_coins)
  values (target_document.id, auth.uid(), target_document.price_coins)
  returning * into purchase_row;

  insert into public.wallet_transactions (user_id, type, amount_coins, reference_id)
  values (auth.uid(), 'purchase', -target_document.price_coins, target_document.id);

  update public.documents
  set sales_count = sales_count + 1,
      updated_at = now()
  where id = target_document.id;

  return purchase_row;
end;
$$;

create or replace function public.purchase_pdf_pack(target_pack_id text)
returns public.pack_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  target_pack public.pdf_packs%rowtype;
  current_wallet public.wallets%rowtype;
  purchase_row public.pack_purchases%rowtype;
  included_document_ids text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into target_pack
  from public.pdf_packs
  where id = target_pack_id and status = 'published';

  if target_pack.id is null then
    raise exception 'Pack unavailable';
  end if;

  select coalesce(array_agg(document_id order by sort_order), '{}') into included_document_ids
  from public.pdf_pack_items
  join public.documents on documents.id = pdf_pack_items.document_id
  where pack_id = target_pack.id
    and documents.status = 'published';

  if array_length(included_document_ids, 1) is null then
    raise exception 'Pack has no published documents';
  end if;

  select * into current_wallet
  from public.wallets
  where user_id = auth.uid()
  for update;

  if current_wallet.id is null then
    insert into public.wallets (user_id, balance_coins)
    values (auth.uid(), 0)
    returning * into current_wallet;
  end if;

  if current_wallet.balance_coins < target_pack.price_coins then
    raise exception 'Insufficient balance';
  end if;

  update public.wallets
  set balance_coins = balance_coins - target_pack.price_coins,
      updated_at = now()
  where user_id = auth.uid();

  insert into public.pack_purchases (pack_id, buyer_id, amount_coins, document_ids)
  values (target_pack.id, auth.uid(), target_pack.price_coins, included_document_ids)
  returning * into purchase_row;

  insert into public.wallet_transactions (user_id, type, amount_coins, reference_id)
  values (auth.uid(), 'purchase', -target_pack.price_coins, target_pack.id);

  update public.pdf_packs
  set sales_count = sales_count + 1,
      revenue_coins = revenue_coins + target_pack.price_coins,
      updated_at = now()
  where id = target_pack.id;

  return purchase_row;
end;
$$;

create or replace function public.topup_wallet(target_amount integer, provider_name text default 'Mobile Money')
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  current_wallet public.wallets%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if target_amount is null or target_amount < 100 then
    raise exception 'Invalid amount';
  end if;

  select * into current_wallet
  from public.wallets
  where user_id = auth.uid()
  for update;

  if current_wallet.id is null then
    insert into public.wallets (user_id, balance_coins)
    values (auth.uid(), 0)
    returning * into current_wallet;
  end if;

  update public.wallets
  set balance_coins = balance_coins + target_amount,
      updated_at = now()
  where user_id = auth.uid()
  returning * into current_wallet;

  insert into public.wallet_transactions (user_id, type, amount_coins, reference_id)
  values (auth.uid(), 'topup', target_amount, provider_name);

  return current_wallet;
end;
$$;

create or replace function public.purchase_subscription(target_plan_id text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  target_plan public.subscription_plans%rowtype;
  current_wallet public.wallets%rowtype;
  updated_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into target_plan
  from public.subscription_plans
  where id = target_plan_id and active = true;

  if target_plan.id is null then
    raise exception 'Plan unavailable';
  end if;

  select * into current_wallet
  from public.wallets
  where user_id = auth.uid()
  for update;

  if current_wallet.id is null then
    insert into public.wallets (user_id, balance_coins)
    values (auth.uid(), 0)
    returning * into current_wallet;
  end if;

  if current_wallet.balance_coins < target_plan.price_coins then
    raise exception 'Insufficient balance';
  end if;

  update public.wallets
  set balance_coins = balance_coins - target_plan.price_coins,
      ia_credits = ia_credits + target_plan.ia_credits_included,
      updated_at = now()
  where user_id = auth.uid();

  insert into public.wallet_transactions (user_id, type, amount_coins, reference_id)
  values (auth.uid(), 'subscription', -target_plan.price_coins, target_plan.id);

  update public.profiles
  set subscription_tier = target_plan.id,
      subscription_expires_at = now() + (target_plan.duration_days || ' days')::interval,
      updated_at = now()
  where id = auth.uid()
  returning * into updated_profile;

  return updated_profile;
end;
$$;

create or replace function public.purchase_ia_pack(target_pack_id text)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  target_pack public.ia_packs%rowtype;
  current_wallet public.wallets%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into target_pack
  from public.ia_packs
  where id = target_pack_id and active = true;

  if target_pack.id is null then
    raise exception 'Pack unavailable';
  end if;

  select * into current_wallet
  from public.wallets
  where user_id = auth.uid()
  for update;

  if current_wallet.balance_coins < target_pack.price_coins then
    raise exception 'Insufficient balance';
  end if;

  update public.wallets
  set balance_coins = balance_coins - target_pack.price_coins,
      ia_credits = ia_credits + target_pack.credits_included,
      updated_at = now()
  where user_id = auth.uid()
  returning * into current_wallet;

  insert into public.wallet_transactions (user_id, type, amount_coins, reference_id)
  values (auth.uid(), 'ia_pack', -target_pack.price_coins, target_pack.id);

  return current_wallet;
end;
$$;

create or replace function public.consume_ia_credit(target_document_id text, target_tokens integer default 0)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_wallet public.wallets%rowtype;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into current_wallet
  from public.wallets
  where user_id = auth.uid()
  for update;

  if current_wallet.ia_credits <= 0 then
    return false;
  end if;

  update public.wallets
  set ia_credits = ia_credits - 1,
      updated_at = now()
  where user_id = auth.uid();

  insert into public.ia_usage_logs (user_id, document_id, tokens_used)
  values (auth.uid(), nullif(target_document_id, ''), target_tokens);

  return true;
end;
$$;

create or replace function public.record_document_event(
  event_type text,
  target_document_id text default null,
  event_metadata jsonb default '{}'::jsonb,
  analytics_session_id text default 'anonymous'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if event_type not in (
    'catalog_view',
    'search',
    'preview_open',
    'purchase_start',
    'purchase_success',
    'purchase_failed',
    'reader_open',
    'assistant_question'
  ) then
    raise exception 'Invalid event type';
  end if;

  insert into public.document_events (
    user_id,
    document_id,
    event_type,
    session_id,
    metadata
  )
  values (
    auth.uid(),
    nullif(target_document_id, ''),
    event_type,
    coalesce(nullif(analytics_session_id, ''), 'anonymous'),
    coalesce(event_metadata, '{}'::jsonb)
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.documents enable row level security;
alter table public.document_purchases enable row level security;
alter table public.pdf_packs enable row level security;
alter table public.pdf_pack_items enable row level security;
alter table public.pack_purchases enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.document_events enable row level security;
alter table public.ia_usage_logs enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.ia_packs enable row level security;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "wallet read own" on public.wallets;
create policy "wallet read own" on public.wallets
for select using (auth.uid() = user_id);

drop policy if exists "documents read published" on public.documents;
create policy "documents read published" on public.documents
for select to anon, authenticated using (status = 'published');

drop policy if exists "packs read published" on public.pdf_packs;
create policy "packs read published" on public.pdf_packs
for select to anon, authenticated using (status = 'published');

drop policy if exists "pack items read published packs" on public.pdf_pack_items;
create policy "pack items read published packs" on public.pdf_pack_items
for select to anon, authenticated using (
  exists (
    select 1 from public.pdf_packs
    where pdf_packs.id = pdf_pack_items.pack_id
    and pdf_packs.status = 'published'
  )
);

drop policy if exists "purchases read own" on public.document_purchases;
create policy "purchases read own" on public.document_purchases
for select using (auth.uid() = buyer_id);

drop policy if exists "pack purchases read own" on public.pack_purchases;
create policy "pack purchases read own" on public.pack_purchases
for select using (auth.uid() = buyer_id);

drop policy if exists "transactions read own" on public.wallet_transactions;
create policy "transactions read own" on public.wallet_transactions
for select using (auth.uid() = user_id);

drop policy if exists "document events admin read" on public.document_events;
create policy "document events admin read" on public.document_events
for select to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'super_admin')
  )
);

drop policy if exists "subscription plans public read" on public.subscription_plans;
create policy "subscription plans public read" on public.subscription_plans
for select to anon, authenticated using (active = true);

drop policy if exists "ia packs public read" on public.ia_packs;
create policy "ia packs public read" on public.ia_packs
for select to anon, authenticated using (active = true);

drop policy if exists "ia usage read own" on public.ia_usage_logs;
create policy "ia usage read own" on public.ia_usage_logs
for select using (auth.uid() = user_id);

drop policy if exists "document previews public read" on storage.objects;
create policy "document previews public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'document-previews');

drop policy if exists "purchased documents read" on storage.objects;
create policy "purchased documents read" on storage.objects
for select to authenticated
using (
  bucket_id = 'documents'
  and (
    exists (
      select 1
      from public.document_purchases
      join public.documents on documents.id = document_purchases.document_id
      where document_purchases.buyer_id = auth.uid()
      and documents.file_path = storage.objects.name
    )
    or exists (
      select 1
      from public.pack_purchases
      join public.pdf_pack_items on pdf_pack_items.pack_id = pack_purchases.pack_id
      join public.documents on documents.id = pdf_pack_items.document_id
      where pack_purchases.buyer_id = auth.uid()
      and documents.file_path = storage.objects.name
    )
  )
);

revoke all on function public.purchase_document(text) from public;
grant execute on function public.purchase_document(text) to authenticated;

revoke all on function public.purchase_pdf_pack(text) from public;
grant execute on function public.purchase_pdf_pack(text) to authenticated;

revoke all on function public.topup_wallet(integer, text) from public;
grant execute on function public.topup_wallet(integer, text) to authenticated;

revoke all on function public.record_document_event(text, text, jsonb, text) from public;
grant execute on function public.record_document_event(text, text, jsonb, text) to anon, authenticated;

revoke all on function public.purchase_subscription(text) from public;
grant execute on function public.purchase_subscription(text) to authenticated;

revoke all on function public.purchase_ia_pack(text) from public;
grant execute on function public.purchase_ia_pack(text) to authenticated;

revoke all on function public.consume_ia_credit(text, integer) from public;
grant execute on function public.consume_ia_credit(text, integer) to authenticated;

`;

await client.connect();
try {
  await client.query(sql);
  const { rows } = await client.query(
    "select id, title, status, price_coins from public.documents order by created_at desc limit 5",
  );
  console.log(JSON.stringify({ ok: true, documents: rows }, null, 2));
} finally {
  await client.end();
}
