-- Migration 0020 : parcours de l'étudiant pour le CV (expériences, formations,
-- compétences, langues, loisirs), saisi une fois ou importé d'un CV existant,
-- puis réutilisé par l'IA à chaque candidature.
-- Stocké en jsonb ; la taille est bornée ici et par l'API.
-- Idempotent.

alter table if exists public.app_users add column if not exists cv_background jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_users_cv_background_check') then
    alter table public.app_users
      add constraint app_users_cv_background_check
      check (cv_background is null or length(cv_background::text) <= 60000);
  end if;
end $$;
