-- Campus 360 MVP: stages persistants et quatre offres documentaires.
-- Exécuter après le schéma Better Auth principal.
create extension if not exists pgcrypto;

do $$
declare constraint_name text;
begin
  select con.conname into constraint_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
   where nsp.nspname = 'public' and rel.relname = 'app_users'
     and con.contype = 'c' and pg_get_constraintdef(con.oid) like '%subscription_tier%'
   limit 1;
  if constraint_name is not null then
    execute format('alter table public.app_users drop constraint %I', constraint_name);
  end if;
end $$;

update public.app_users set subscription_tier = 'elite' where subscription_tier = 'premium';
alter table public.app_users add constraint app_users_subscription_tier_check
  check (subscription_tier in ('free', 'basic', 'pro', 'elite'));

create table if not exists public.app_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  tier text not null check (tier in ('basic', 'pro', 'elite')),
  status text not null default 'active' check (status in ('active', 'canceled', 'expired', 'payment_failed')),
  auto_renew boolean not null default true,
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  last_renewed_at timestamptz,
  last_renewal_attempt_at timestamptz,
  last_renewal_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare constraint_name text;
begin
  select con.conname into constraint_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
   where nsp.nspname = 'public' and rel.relname = 'app_subscriptions'
     and con.contype = 'c' and pg_get_constraintdef(con.oid) like '%tier%'
   limit 1;
  if constraint_name is not null then
    execute format('alter table public.app_subscriptions drop constraint %I', constraint_name);
  end if;
end $$;

update public.app_subscriptions set tier = 'elite' where tier = 'premium';
alter table public.app_subscriptions add constraint app_subscriptions_tier_check
  check (tier in ('basic', 'pro', 'elite'));
create index if not exists idx_app_subscriptions_user_period
  on public.app_subscriptions(user_id, current_period_end desc);

with duplicate_current as (
  select id,
         row_number() over (
           partition by user_id order by current_period_end desc, created_at desc
         ) as position
    from public.app_subscriptions
   where status in ('active', 'canceled', 'payment_failed')
)
update public.app_subscriptions subscriptions
   set status = 'expired', updated_at = now()
  from duplicate_current duplicates
 where subscriptions.id = duplicates.id and duplicates.position > 1;

create unique index if not exists idx_app_subscriptions_one_current
  on public.app_subscriptions(user_id)
  where status in ('active', 'canceled', 'payment_failed');

insert into public.app_subscriptions (
  user_id, tier, status, auto_renew, current_period_start, current_period_end
)
select id, subscription_tier, 'active', false, now(), subscription_expires_at
  from public.app_users
 where subscription_tier in ('basic', 'pro', 'elite')
   and subscription_expires_at > now()
on conflict do nothing;

do $$ begin
  if to_regclass('public.subscription_plans') is not null then
    delete from public.subscription_plans where id = 'premium';
    insert into public.subscription_plans (id, name, price_coins, duration_days, ia_credits_included)
    values
      ('basic', 'Basique', 2000, 30, 0),
      ('pro', 'Pro', 3500, 30, 0),
      ('elite', 'Elite', 5000, 30, 100)
    on conflict (id) do update set
      name = excluded.name,
      price_coins = excluded.price_coins,
      duration_days = excluded.duration_days,
      ia_credits_included = excluded.ia_credits_included;
  end if;
end $$;

\ir STAGES_SUPABASE.sql
