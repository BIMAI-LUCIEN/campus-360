-- Migration 0012: Account deletion hardening & audit trail
-- Idempotent migration to allow anonymization of financial transactions and preserve accounting audit logs.

ALTER TABLE public.app_wallet_transactions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.app_wallet_transactions ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'app_wallet_transactions_user_id_fkey' 
          AND conrelid = 'public.app_wallet_transactions'::regclass
    ) THEN
        ALTER TABLE public.app_wallet_transactions DROP CONSTRAINT app_wallet_transactions_user_id_fkey;
    END IF;
    
    ALTER TABLE public.app_wallet_transactions
        ADD CONSTRAINT app_wallet_transactions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.app_account_deletions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deleted_at timestamptz NOT NULL DEFAULT now(),
    counts jsonb NOT NULL DEFAULT '{}'::jsonb,
    whatsapp_logout text NOT NULL DEFAULT 'skipped'
);
