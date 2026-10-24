-- Migration 0017 : Bonus de lancement de 5 000 coins pour chaque étudiant
-- Les nouveaux comptes reçoivent 5 000 coins (STARTING_COINS, défaut 5000).
-- Les comptes étudiants existants sont complétés une seule fois jusqu'à 5 000 coins.
-- Idempotent : la transaction 'launch-bonus-5000' empêche un second crédit.

-- 1. Nouveau type de transaction 'bonus' (crédit offert, hors chiffre d'affaires)
alter table public.app_wallet_transactions
  drop constraint if exists app_wallet_transactions_type_check;

alter table public.app_wallet_transactions
  add constraint app_wallet_transactions_type_check
  check (type in ('topup', 'purchase', 'withdrawal', 'commission', 'subscription', 'ia_pack', 'bonus'));

-- 2. Complément jusqu'à 5 000 coins, tracé dans l'historique du wallet
with eligible as (
  select w.user_id, 5000 - w.balance_coins as amount
    from public.app_wallets w
    join public.app_users u on u.id = w.user_id
   where u.role = 'student'
     and w.balance_coins < 5000
     and not exists (
       select 1 from public.app_wallet_transactions t
        where t.user_id = w.user_id and t.reference_id = 'launch-bonus-5000'
     )
   for update of w
),
credited as (
  update public.app_wallets w
     set balance_coins = w.balance_coins + e.amount, updated_at = now()
    from eligible e
   where w.user_id = e.user_id
  returning w.user_id, e.amount
)
insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
select user_id, 'bonus', amount, 'launch-bonus-5000', 'success' from credited;
