-- Migration 0019 : photo du CV officiel, gardée sur le compte étudiant.
-- Stockée en data URI (png/jpeg/webp) ; la taille est bornée par l'API (2 000 000 caractères).
-- Idempotent.

alter table if exists public.app_users add column if not exists cv_photo text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_users_cv_photo_check') then
    alter table public.app_users
      add constraint app_users_cv_photo_check check (cv_photo is null or length(cv_photo) <= 2000000);
  end if;
end $$;
