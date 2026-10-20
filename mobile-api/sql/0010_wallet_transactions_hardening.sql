-- Migration 0010 : Durcissement des transactions du wallet
-- Idempotent : peut être exécuté plusieurs fois sans erreur.

-- 1. Colonne pack_type optionnelle pour les recharges typées
alter table public.app_wallet_transactions
  add column if not exists pack_type text;

-- 2. Normalisation des anciens enregistrements momo_* vers topup
update public.app_wallet_transactions
set pack_type = substring(type from 6),
    type = 'topup'
where type like 'momo\_%';

-- 3. Normalisation des statuts 'completed' vers 'success'
update public.app_wallet_transactions
set status = 'success'
where status = 'completed';

-- 4. Contrainte CHECK sur le type de transaction
alter table public.app_wallet_transactions
  drop constraint if exists app_wallet_transactions_type_check;

alter table public.app_wallet_transactions
  add constraint app_wallet_transactions_type_check
  check (type in ('topup', 'purchase', 'withdrawal', 'commission', 'subscription', 'ia_pack'));

-- 5. Contrainte CHECK sur le statut de la transaction
alter table public.app_wallet_transactions
  drop constraint if exists app_wallet_transactions_status_check;

alter table public.app_wallet_transactions
  add constraint app_wallet_transactions_status_check
  check (status in ('pending', 'success', 'failed'));

-- 6. Index unique partiel anti-rejeu sur la référence de recharge
create unique index if not exists app_wallet_transactions_topup_ref_uidx
  on public.app_wallet_transactions (reference_id)
  where type = 'topup' and reference_id is not null;
