-- Student-voice writing (Module 21). Idempotent.
--  * app_documents.field: field of study chosen at creation, drives the default
--    outline and the interview questions.
--  * app_document_sections.interview_answers: answers given in the "Rédiger avec
--    moi" interview, kept so the student can come back later.
--    Shape: { "questions": [{ "id", "question", "hint" }], "answers": { "<id>": "text" }, "updatedAt": "..." }

alter table public.app_documents add column if not exists field text;

alter table public.app_documents drop constraint if exists app_documents_field_check;
alter table public.app_documents add constraint app_documents_field_check
  check (field is null or field in ('informatique', 'gestion', 'marketing', 'btp', 'droit'));

alter table public.app_document_sections add column if not exists interview_answers jsonb;
