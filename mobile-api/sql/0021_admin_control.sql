-- Migration 0021 : pilotage de l'app mobile depuis le dashboard admin
-- Idempotent : peut être exécuté plusieurs fois sans erreur.

-- 1. Réglages de l'app lus au démarrage par le mobile (GET /api/mobile/config)
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.app_config (key, value) values
  ('maintenance', '{"enabled": false, "message": "Campus 360 est en maintenance. Revenez dans quelques minutes."}'::jsonb),
  ('min_version', '{"android": "0.0.0", "ios": "0.0.0", "recommended": "0.0.0", "updateUrl": "https://campus360b.site"}'::jsonb),
  ('features', '{"ai": true, "payments": true, "stages": true, "pdf": true, "documents": true}'::jsonb),
  ('announcement', '{"enabled": false, "title": "", "message": "", "tone": "info", "link": ""}'::jsonb)
on conflict (key) do nothing;

-- 2. Historique des notifications push envoyées depuis le dashboard
create table if not exists public.app_push_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  segment jsonb not null default '{}'::jsonb,
  target_users integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_push_campaigns_created_at
  on public.app_push_campaigns(created_at desc);

-- 3. Crédit ou débit manuel de coins par un admin
alter table public.app_wallet_transactions
  drop constraint if exists app_wallet_transactions_type_check;

alter table public.app_wallet_transactions
  add constraint app_wallet_transactions_type_check
  check (type in ('topup', 'purchase', 'withdrawal', 'commission', 'subscription', 'ia_pack', 'bonus', 'admin_adjustment'));

alter table public.app_wallet_transactions
  add column if not exists note text;
