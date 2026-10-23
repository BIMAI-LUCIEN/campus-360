-- Migration 0016 : Ajout de la colonne failure_message aux transactions du wallet
-- Idempotent : peut être exécuté plusieurs fois sans erreur.

ALTER TABLE public.app_wallet_transactions
  ADD COLUMN IF NOT EXISTS failure_message text;
