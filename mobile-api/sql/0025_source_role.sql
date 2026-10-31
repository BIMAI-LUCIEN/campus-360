-- Migration 0025 : rôle des sources d'un document (rapport, mémoire)
-- « reference » : appui fourni à l'IA (article, norme, lien, modèle de l'encadreur)
-- « personal »  : matière de l'étudiant (rapports journaliers, comptes rendus, notes de stage)
-- Idempotent : peut etre execute plusieurs fois sans erreur.

alter table public.app_document_files
  add column if not exists source_role text not null default 'personal';

alter table public.app_document_files
  drop constraint if exists app_document_files_source_role_check;
alter table public.app_document_files
  add constraint app_document_files_source_role_check check (source_role in ('reference', 'personal'));

-- Les pages web déjà ajoutées sont des références.
update public.app_document_files
   set source_role = 'reference'
 where kind = 'source' and origin = 'url' and source_role = 'personal';
