-- Migration 0034 : clé d'idempotence sur les recharges Mobile Money
-- Le client envoie un requestId par intention de recharge. Un double appui, ou un
-- nouvel essai après une coupure ou un crash du serveur, retombe sur la même ligne :
-- aucun second push n'est envoyé à l'opérateur, donc aucun second débit.
-- Idempotent : peut être exécuté plusieurs fois sans erreur.

alter table public.app_wallet_transactions
  add column if not exists idempotency_key text;

create unique index if not exists app_wallet_transactions_user_idempotency_key
  on public.app_wallet_transactions (user_id, idempotency_key)
  where idempotency_key is not null;
