-- Migration 0033 : droits de lecture par colonne sur public.documents
-- L'app lit le catalogue par l'API REST Supabase avec la clé publique (rôles anon
-- et authenticated). Le droit SELECT sur toute la table laissait sortir les
-- colonnes anti-doublon et l'auteur d'une contribution (Module 27).
-- On retire la lecture de la table entière et on ne rend que les colonnes du
-- catalogue (CATALOGUE_COLUMNS dans src/features/pdf/pdfApi.ts).
-- Une nouvelle colonne n'est plus lisible par défaut : l'ajouter ici si l'app en a besoin.
-- Le serveur (postgres, service_role) garde tous ses droits.
-- Idempotent : peut être exécuté plusieurs fois sans erreur.

revoke select on public.documents from anon, authenticated;

revoke select (file_sha256, text_fingerprint, minhash, embedding, source, contributor_id, updated_at)
  on public.documents from anon, authenticated;

grant select (
  id, title, description, university, faculty, subject, teacher, level, academic_year,
  price_coins, page_count, file_path, preview_path, file_size, kind, always_free, status,
  commission_rate, rating, sales_count, downloads_count, ai_summary, ai_tags, ai_difficulty,
  suggested_price_coins, quality_score, ai_study_plan, ai_quiz, created_at
) on public.documents to anon, authenticated;
