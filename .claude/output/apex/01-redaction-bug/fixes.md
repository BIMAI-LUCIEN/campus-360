# Bug Fixes — Document Editor (rédaction) 500 Errors

**Date:** 2026-07-18
**User report:** "j'ai toujours des erreurs 500 dans mon app côté rédaction, j'arrive pas à rédiger aucun document"

---

## Root Causes

### 1. `app_document_sections.content_json` column missing in production
**File:** `mobile-api/lib/documents-db.ts` → `updateDocumentSection()`

The `DocumentSection` type and the PATCH section route both support a `content_json` field (TipTap/ProseMirror JSON). If the column doesn't exist in the production database, any UPDATE to a section row would fail with:
```
column "content_json" of relation "app_document_sections" does not exist
```
This surfaces as a 500 error on every save in the editor.

### 2. `app_documents` missing new schema columns
**File:** `mobile-api/lib/documents-db.ts` → `createDocument()`

The `app_documents` table was missing these columns that were added in a later schema revision:
- `primary_color` — accent color for H1 headings
- `secondary_color` — accent color for H2 headings
- `font_family`, `line_spacing`, `margins`, `cover_template`, `cover_data`

`createDocument` only inserted `user_id, title, description, template_type`, leaving all other columns to the database defaults. If any of those columns were `NOT NULL` without a default, document creation would fail.

### 3. `app_wallets.ia_credits` column missing
**Files:** all AI routes (`generate/route.ts`, `generate-full/route.ts`, `ai/route.ts`)

Every AI endpoint queries `app_wallets.ia_credits` to check if the user has enough credits before deducting. If this column doesn't exist, the wallet query fails and every AI operation returns 500.

### 4. `app_ia_usage_logs` and `app_wallet_transactions` tables missing
**Files:** all AI routes

AI routes insert into `app_ia_usage_logs` (token usage tracking) and `app_wallet_transactions` (ledger). If these tables don't exist, the inserts throw 500.

---

## Fixes Applied

### Fix 1 — SQL Migration (`mobile-api/sql/0004_add_document_editor_columns.sql`)

Creates all missing columns and tables in one idempotent migration:

```sql
-- Missing column on app_document_sections
ALTER TABLE public.app_document_sections
  ADD COLUMN IF NOT EXISTS content_json jsonb DEFAULT NULL;

-- Missing columns on app_documents
ALTER TABLE public.app_documents
  ADD COLUMN IF NOT EXISTS primary_color   text DEFAULT '#2563EB',
  ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#0D9488',
  ADD COLUMN IF NOT EXISTS font_family     text DEFAULT 'Lora',
  ADD COLUMN IF NOT EXISTS line_spacing    numeric(3,2) DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS margins         text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS cover_template  text DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS cover_data      jsonb DEFAULT '{}';

-- Missing column on app_wallets
ALTER TABLE public.app_wallets
  ADD COLUMN IF NOT EXISTS ia_credits integer DEFAULT 10;

-- Missing tables
CREATE TABLE IF NOT EXISTS public.app_ia_usage_logs (...);
CREATE TABLE IF NOT EXISTS public.app_wallet_transactions (...);

-- Retroactively fix existing rows with NULL values
UPDATE public.app_documents SET ... WHERE primary_color IS NULL ...;
```

**To run on production:**
```bash
psql "$DATABASE_URL" -f mobile-api/sql/0004_add_document_editor_columns.sql
```
Or apply via Supabase SQL Editor / pgAdmin.

### Fix 2 — `documents-db.ts`: explicit defaults in `createDocument`

**File:** `mobile-api/lib/documents-db.ts`

The `INSERT` now explicitly sets all 11 columns so the row is always complete regardless of DB-side defaults:

```typescript
// Before (only 4 columns, rest left to DB):
INSERT INTO app_documents (user_id, title, description, template_type)
VALUES ($1, $2, $3, $4)

// After (all 11 columns explicit):
INSERT INTO app_documents
  (user_id, title, description, template_type,
   font_family, line_spacing, margins, cover_template, cover_data,
   primary_color, secondary_color)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
-- values: userId, title, description, templateType,
--         'Lora', 1.5, 'normal', 'classic', {},
--         '#2563EB', '#0D9488'
```

This ensures new documents are never in a half-initialized state.

---

## Files Modified

| File | Change |
|------|--------|
| `mobile-api/sql/0004_add_document_editor_columns.sql` | **New** — adds all missing DB columns/tables |
| `mobile-api/lib/documents-db.ts` | `createDocument()` INSERT now explicitly sets all columns with defaults |

## Verification

- TypeScript: `cd mobile-api && npx tsc --noEmit` → **0 errors**
- No changes to auth, routing, or Zod schemas — conservative fix only

## Next Steps (Deploy)

1. **Apply the migration** on the production database (Supabase dashboard SQL Editor or `psql`)
2. **Redeploy** `mobile-api` to Vercel so the code changes take effect
3. Test: create a new document → open in editor → type and save a section → check no 500 errors
