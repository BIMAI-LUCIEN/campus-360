-- Migration 0026 : type de transaction « ai_generation »
-- La génération CV / lettre / rapport complet (documents/generate, generate-full)
-- enregistre une ligne 'ai_generation' que la contrainte de 0024 refusait :
-- la transaction était annulée et la section générée perdue.
-- Garde les 11 types de 0024. Idempotent : peut être exécuté plusieurs fois.

alter table public.app_wallet_transactions
  drop constraint if exists app_wallet_transactions_type_check;

alter table public.app_wallet_transactions
  add constraint app_wallet_transactions_type_check
  check (type in ('topup', 'purchase', 'withdrawal', 'commission', 'subscription', 'ia_pack', 'bonus', 'admin_adjustment', 'contribution_reward', 'pack_purchase', 'pass_purchase', 'ai_generation'));
