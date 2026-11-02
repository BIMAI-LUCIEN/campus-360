-- Migration 0030 : retire la clé étrangère héritée de document_events.user_id
-- La contrainte pointe vers auth.users, alors que user_id vient de public.app_users :
-- l'insertion échouait et l'événement était perdu.
-- La suppression de compte efface déjà ces lignes (lib/account-deletion.ts).
-- Idempotent : peut être exécuté plusieurs fois sans erreur.

alter table public.document_events
  drop constraint if exists document_events_user_id_fkey;
