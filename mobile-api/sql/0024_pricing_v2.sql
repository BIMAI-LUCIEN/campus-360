-- Migration 0024 : modèle économique v2 (crédits de candidature, Pass Révision, actions IA gratuites, mémoire par chapitre)
-- Idempotent : peut etre execute plusieurs fois sans erreur.

-- 1. Crédits de candidature achetés en pack (valables 30 jours)
create table if not exists public.app_credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  offer_code text not null,
  credits_total integer not null check (credits_total > 0),
  credits_left integer not null check (credits_left >= 0),
  expires_at timestamptz not null,
  reference_id text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists app_credit_grants_user_idx on public.app_credit_grants (user_id, expires_at);

-- 2. Crédits consommés par candidature (une seule consommation active par offre)
create table if not exists public.app_credit_usages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  grant_id uuid not null references public.app_credit_grants(id) on delete cascade,
  credits integer not null check (credits > 0),
  reference_id text not null,
  status text not null default 'success' check (status in ('success', 'refunded')),
  created_at timestamptz not null default now()
);
create unique index if not exists app_credit_usages_active_uidx
  on public.app_credit_usages (user_id, reference_id) where status = 'success';

-- 3. Pass Révision (IA illimitée sur les PDF, dans le quota journalier)
create table if not exists public.app_revision_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text not null check (source in ('purchase', 'pack')),
  reference_id text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists app_revision_passes_user_idx on public.app_revision_passes (user_id, expires_at desc);

-- 4. Actions IA gratuites du jour (3 par jour ; une conversation compte 1 action toutes les 5 questions)
create table if not exists public.app_ai_free_actions (
  user_id uuid not null references public.app_users(id) on delete cascade,
  day date not null,
  actions integer not null default 0 check (actions >= 0),
  questions integer not null default 0 check (questions >= 0),
  primary key (user_id, day)
);

-- 5. Mémoire payé au forfait ou par chapitre
create table if not exists public.app_thesis_purchases (
  user_id uuid not null references public.app_users(id) on delete cascade,
  generation_id text not null,
  mode text not null check (mode in ('forfait', 'chapitre')),
  chapters integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, generation_id)
);

-- 6. Nouveaux types de transaction (garde les 9 types de 0023)
alter table public.app_wallet_transactions
  drop constraint if exists app_wallet_transactions_type_check;

alter table public.app_wallet_transactions
  add constraint app_wallet_transactions_type_check
  check (type in ('topup', 'purchase', 'withdrawal', 'commission', 'subscription', 'ia_pack', 'bonus', 'admin_adjustment', 'contribution_reward', 'pack_purchase', 'pass_purchase'));
