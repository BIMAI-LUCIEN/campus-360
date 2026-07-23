-- 0004_add_document_editor_columns.sql
-- Adds columns and tables required by the document editor (rédaction) feature.
-- Safe to re-run: every block is idempotent (IF NOT EXISTS / IF NOT EXISTS ON).

-- ── app_document_sections.content_json ───────────────────────────────────────
-- Used by updateDocumentSection() when the editor sends content_json.
-- Many rows will already exist with NULL for this column — that's fine.
ALTER TABLE public.app_document_sections
  ADD COLUMN IF NOT EXISTS content_json jsonb DEFAULT NULL;

COMMENT ON COLUMN public.app_document_sections.content_json
  IS 'TipTap/ProseMirror JSON document tree for collaborative editing.';

-- ── app_documents theme + layout columns ─────────────────────────────────────
-- These were added in a later schema revision and may not exist in production.
ALTER TABLE public.app_documents
  ADD COLUMN IF NOT EXISTS primary_color   text DEFAULT '#2563EB',
  ADD COLUMN IF NOT EXISTS secondary_color  text DEFAULT '#0D9488',
  ADD COLUMN IF NOT EXISTS font_family     text DEFAULT 'Lora',
  ADD COLUMN IF NOT EXISTS line_spacing    numeric(3,2) DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS margins          text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS cover_template  text DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS cover_data      jsonb DEFAULT '{}';

COMMENT ON COLUMN public.app_documents.primary_color
  IS 'Accent colour applied to H1 headings in the editor preview and PDF export.';
COMMENT ON COLUMN public.app_documents.secondary_color
  IS 'Accent colour applied to H2 headings in the editor preview and PDF export.';

-- ── app_wallets.ia_credits ───────────────────────────────────────────────────
-- Used by every AI route (generate, generate-full, ai) before deducting credits.
ALTER TABLE public.app_wallets
  ADD COLUMN IF NOT EXISTS ia_credits integer DEFAULT 10;

COMMENT ON COLUMN public.app_wallets.ia_credits
  IS 'AI generation credits separate from coin balance.';

-- ── app_ia_usage_logs ────────────────────────────────────────────────────────
-- Inserts in: generate/route.ts, generate-full/route.ts, ai/route.ts
CREATE TABLE IF NOT EXISTS public.app_ia_usage_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  tokens_used integer     NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ia_usage_logs_user_id
  ON public.app_ia_usage_logs(user_id);

-- ── app_wallet_transactions (if not already created by another migration) ─────
-- Inserts in: generate/route.ts, generate-full/route.ts, ai/route.ts,
-- mobile-access.ts (legacy copy)
CREATE TABLE IF NOT EXISTS public.app_wallet_transactions (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  type          text        NOT NULL,            -- 'purchase', 'ai_generation', …
  amount_coins  integer     NOT NULL DEFAULT 0,
  reference_id  text,
  status        text        NOT NULL DEFAULT 'success',  -- 'success', 'pending', 'failed'
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id
  ON public.app_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_reference
  ON public.app_wallet_transactions(reference_id);

-- ── Ensure existing rows have sensible defaults ───────────────────────────────
-- Covers documents created before this migration ran.
UPDATE public.app_documents
SET    primary_color   = COALESCE(primary_color,   '#2563EB'),
       secondary_color = COALESCE(secondary_color, '#0D9488'),
       font_family     = COALESCE(font_family,     'Lora'),
       line_spacing    = COALESCE(line_spacing,    1.5),
       margins         = COALESCE(margins,          'normal'),
       cover_template  = COALESCE(cover_template,  'classic'),
       cover_data      = COALESCE(cover_data,      '{}')
WHERE  primary_color IS NULL
    OR secondary_color IS NULL
    OR font_family IS NULL
    OR line_spacing IS NULL
    OR margins IS NULL
    OR cover_template IS NULL
    OR cover_data IS NULL;
