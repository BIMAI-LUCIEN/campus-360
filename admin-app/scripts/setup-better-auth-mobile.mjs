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

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing.');

const sql = `
create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  better_auth_user_id text not null unique,
  legacy_supabase_user_id uuid unique,
  email text not null unique,
  name text not null default 'Etudiant Campus 3602',
  role text not null default 'student' check (role in ('student', 'admin', 'super_admin')),
  phone text,
  whatsapp_phone text,
  university text,
  faculty text,
  level text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'basic', 'premium')),
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users add column if not exists phone text;
alter table public.app_users add column if not exists whatsapp_phone text;
alter table public.app_users add column if not exists subscription_tier text not null default 'free' check (subscription_tier in ('free', 'basic', 'premium'));
alter table public.app_users add column if not exists subscription_expires_at timestamptz;

create table if not exists public.app_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  balance_coins integer not null default 5000 check (balance_coins >= 0),
  ia_credits integer not null default 0 check (ia_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_wallets add column if not exists ia_credits integer not null default 0 check (ia_credits >= 0);

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

create table if not exists public.app_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  type text not null check (type in ('topup', 'purchase', 'withdrawal', 'commission', 'subscription', 'ia_pack')),
  amount_coins integer not null,
  reference_id text,
  status text not null default 'success',
  created_at timestamptz not null default now()
);

create table if not exists public.app_ia_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  document_id text references public.documents(id) on delete set null,
  tokens_used integer not null default 0,
  created_at timestamptz not null default now()
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

create table if not exists public.app_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null,
  description text,
  template_type text not null default 'stage',
  font_family text not null default 'Times New Roman',
  line_spacing numeric not null default 1.5,
  margins text not null default 'normal',
  cover_template text not null default 'classic',
  cover_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_report_sections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.app_reports(id) on delete cascade,
  title text not null,
  content_html text not null default '',
  content_json jsonb,
  sort_order integer not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_events
  add column if not exists better_auth_user_id text;

create index if not exists app_users_email_idx on public.app_users (lower(email));
create index if not exists app_document_purchases_buyer_idx on public.app_document_purchases (buyer_id, created_at desc);
create index if not exists app_pack_purchases_buyer_idx on public.app_pack_purchases (buyer_id, created_at desc);
create index if not exists app_wallet_transactions_user_idx on public.app_wallet_transactions (user_id, created_at desc);
create index if not exists app_ia_usage_logs_user_idx on public.app_ia_usage_logs (user_id, created_at desc);
create index if not exists app_user_push_tokens_user_idx on public.app_user_push_tokens (user_id);
create index if not exists app_reports_user_idx on public.app_reports (user_id);
create index if not exists app_report_sections_report_idx on public.app_report_sections (report_id, sort_order);

alter table public.app_users enable row level security;
alter table public.app_wallets enable row level security;
alter table public.app_document_purchases enable row level security;
alter table public.app_pack_purchases enable row level security;
alter table public.app_wallet_transactions enable row level security;
alter table public.app_ia_usage_logs enable row level security;
alter table public.app_user_push_tokens enable row level security;
alter table public.app_reports enable row level security;
alter table public.app_report_sections enable row level security;
`;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  try {
    await client.query(`
      alter table public."user" add column if not exists phone text;
      alter table public."user" add column if not exists "whatsappPhone" text;
      alter table public."user" add column if not exists university text;
      alter table public."user" add column if not exists faculty text;
      alter table public."user" add column if not exists level text;
    `);
    console.log("Successfully altered Better Auth 'user' table.");
  } catch (err) {
    console.log("Could not alter Better Auth 'user' table (it might not exist yet):", err.message);
  }
  console.log(JSON.stringify({ ok: true, schema: 'better-auth-mobile' }));
} finally {
  await client.end();
}
