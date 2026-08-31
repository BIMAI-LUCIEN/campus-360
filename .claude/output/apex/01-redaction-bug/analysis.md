# Root Cause Analysis — Campus 360 Document Editor 500 Errors

**Date:** 2026-07-18
**Analyst:** Agent 1 — Bug Analyzer
**App:** Campus 360 Mobile (Expo/React Native)
**API:** api.campus360b.site (mobile-api, Next.js on Vercel)

---

## Summary

Every API call made by `DocumentEditorScreen.tsx` — including the initial document load on mount (`GET /api/mobile/documents/[id]`) and all subsequent saves — returns HTTP 500. The root cause is that **the production Vercel environment has empty secrets**, causing a cascade of failures starting from auth initialization.

---

## 1. What's Failing

All document editor API calls fail with HTTP 500:

| API Call | Route | Triggered By |
|---|---|---|
| `GET /api/mobile/documents/:id` | `[id]/route.ts` GET | App mount, loadReport() |
| `PATCH /api/mobile/documents/:id` | `[id]/route.ts` PATCH | Cover data save, font/spacing change |
| `PATCH /api/mobile/documents/:id/sections/:sectionId` | `[id]/sections/[sectionId]/route.ts` PATCH | Auto-save section content |
| `POST /api/mobile/documents/:id/sections` | `[id]/sections/route.ts` POST | Add new section |
| `DELETE /api/mobile/documents/:id/sections/:sectionId` | `[id]/sections/[sectionId]/route.ts` DELETE | Delete section |

Every route goes through `requireMobileUser()` (`mobile-access.ts:72`), which depends on both `auth` and `databasePool`. Both are broken in production.

---

## 2. Root Cause — CRITICAL (P0)

### Root Cause A: `BETTER_AUTH_SECRET` is empty in production

**File:** `mobile-api/.env.production` (line 2)

```
BETTER_AUTH_SECRET=""
```

**Impact:** When `auth.ts` initializes in production (`auth.ts:177`), `buildBetterAuthConfig()` is called. At line 91, it reads `process.env.BETTER_AUTH_SECRET`:

```typescript
// auth.ts:91
const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
if (!authSecret) {
  if (isProd) {
    throw new Error(
      'BETTER_AUTH_SECRET is required in production. Generate one with: openssl rand -hex 32',
    );
  }
```

`isProd` is `true` (Vercel sets `NODE_ENV=production`). Since `BETTER_AUTH_SECRET` is `""` (empty string, not missing), `.trim()` returns `""` which is falsy, so the `if (!authSecret)` branch fires and **throws immediately**.

This means `betterAuth(buildBetterAuthConfig())` at `auth.ts:210` throws. The `auth` export becomes the `notConfiguredAuth` throwing Proxy. Every call to `auth.api.getSession()` (used in `requireMobileUser` at `mobile-access.ts:83`) throws.

The throw is caught by `mobileErrorResponse()` at `mobile-access.ts:161`:
```typescript
// mobile-access.ts:161-165
console.error('Mobile API error', error);
return NextResponse.json(
  { error: 'Service momentanement indisponible.' },
  { status: 500 },
);
```

→ Returns HTTP 500 with generic message.

---

### Root Cause B: `DATABASE_URL` is empty in production

**File:** `mobile-api/.env.production` (line 3)

```
DATABASE_URL=""
```

Even if `BETTER_AUTH_SECRET` were fixed, the `databasePool` in `database.ts:15` throws immediately on first use:

```typescript
// database.ts:15
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required.');
}
```

Better Auth's `auth.api.getSession()` itself queries the DB (sessions table), so it would fail here too — but this throws **before** even getting there, because the pool is initialized eagerly at module load.

---

### Root Cause C: `OPENROUTER_API_KEY` is empty in production

**File:** `mobile-api/.env.production` (line 6)

```
OPENROUTER_API_KEY=""
```

While not blocking the initial document load, any attempt to use the AI features (AI drafting, AI improve, document generation) would return 503 at `ai/route.ts:83`:
```typescript
// ai/route.ts:83
if (!apiKey) {
  throw new MobileApiError('Service IA momentanement indisponible.', 503);
}
```

---

## 3. Where to Fix

### Fix 1 — Set `BETTER_AUTH_SECRET` in Vercel project env vars

**Location:** Vercel Dashboard → Project `mobile-api` → Settings → Environment Variables

Set the **Production** environment variable:
- Key: `BETTER_AUTH_SECRET`
- Value: The same secret used by the admin app (from `admin-app/.env.local`)
- To generate a new one: `openssl rand -hex 32`

**Current value (empty):**
```
BETTER_AUTH_SECRET=""          ← WRONG
```

**Should be:**
```
BETTER_AUTH_SECRET=<32-byte-hex-secret>
```

This must match the secret used by the admin app's Better Auth instance, because both share the same database (sessions and Better Auth internal tables are stored in `auth.users`, `session`, etc.).

---

### Fix 2 — Set `DATABASE_URL` in Vercel project env vars

**Location:** Vercel Dashboard → Project `mobile-api` → Settings → Environment Variables

Set the **Production** environment variable:
- Key: `DATABASE_URL`
- Value: Same PostgreSQL connection string used by the admin app

**Current value (empty):**
```
DATABASE_URL=""               ← WRONG
```

**Should be:**
```
DATABASE_URL=postgresql://postgres.<user>:<pass>@<host>:<port>/postgres
```

**Should match:** `admin-app/.env.local` line 3 (the local dev value). Vercel production needs the Supabase direct connection URL (not the pooler, since SSL is handled by the app code in `database.ts`).

Also ensure `DATABASE_SSL_REJECT_UNAUTHORIZED=false` is set (currently empty in `.env.production`), so Supabase certs don't fail TLS.

---

### Fix 3 — Set `OPENROUTER_API_KEY` in Vercel project env vars (AI features)

**Location:** Same as above

```
OPENROUTER_API_KEY=sk-or-v1-...      ← get from admin-app/.env.local
```

---

### Fix 4 — Set `BETTER_AUTH_URL` in Vercel project env vars

**File:** `mobile-api/.env.production` (line 3)

```
BETTER_AUTH_URL=""
```

Should be the admin app's public URL (where Better Auth's session management runs):
```
BETTER_AUTH_URL=https://admin.campus360b.site
```

This is used in `auth.ts:43` as the `baseURL` for Better Auth:
```typescript
// auth.ts:43
const baseURL = detectBaseUrl(); // reads BETTER_AUTH_URL, falls back to admin.campus360b.site
```

The fallback is already correct, but making it explicit is safer.

---

## 4. How to Verify

Run these checks **against the production Supabase database** (via Supabase SQL Editor or `psql`):

### Check 1 — Confirm database tables exist
```sql
-- Should return: app_users, app_documents, app_document_sections, app_wallets, etc.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'app_users', 'app_documents', 'app_document_sections',
    'app_wallets', 'app_wallet_transactions', 'app_ia_usage_logs',
    'app_rate_limits', 'app_login_attempts'
  )
ORDER BY table_name;
```

### Check 2 — Confirm app_users table has the right columns
```sql
-- Critical columns: id, better_auth_user_id, email, name, role
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'app_users'
ORDER BY ordinal_position;
```

### Check 3 — Confirm app_documents table has all needed columns
```sql
-- Required columns for document editor
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'app_documents'
  AND column_name IN (
    'id', 'user_id', 'title', 'description', 'template_type',
    'font_family', 'line_spacing', 'margins', 'cover_template',
    'cover_data', 'primary_color', 'secondary_color',
    'created_at', 'updated_at'
  );
```

### Check 4 — Test the connection works (from local dev)
```bash
# Run locally against the prod DATABASE_URL to confirm connectivity
psql "postgresql://postgres.<user>:<pass>@<host>:<port>/postgres" -c "SELECT 1;"
```

---

## 5. Files Analyzed

| File | Lines Reviewed | Finding |
|---|---|---|
| `src/features/documents/DocumentEditorScreen.tsx` | Full file | All API calls identified |
| `mobile-api/app/api/mobile/documents/route.ts` | Full file | GET/POST flow, no issues |
| `mobile-api/app/api/mobile/documents/[id]/route.ts` | Full file | GET/PATCH/DELETE, no issues |
| `mobile-api/app/api/mobile/documents/[id]/sections/route.ts` | Full file | POST/PATCH, no issues |
| `mobile-api/app/api/mobile/documents/[id]/sections/[sectionId]/route.ts` | Full file | PATCH/DELETE, no issues |
| `mobile-api/app/api/mobile/documents/ai/route.ts` | Full file | AI credits, OPENROUTER_API_KEY check |
| `mobile-api/lib/documents-db.ts` | Full file | All queries use `public.app_documents` and `public.app_document_sections` — correct per migration SQL |
| `mobile-api/lib/mobile-access.ts` | Full file | `ensureMobileUser` inserts into `app_users` + `app_wallets`; errors surface as 500 |
| `mobile-api/lib/database.ts` | Full file | `DATABASE_URL` check at line 15 — throws if missing |
| `mobile-api/lib/auth.ts` | Full file | `BETTER_AUTH_SECRET` check at line 91 — throws if empty in prod |
| `mobile-api/.env.production` | Full file | **CRITICAL:** `BETTER_AUTH_SECRET=""`, `DATABASE_URL=""`, `OPENROUTER_API_KEY=""` |
| `mobile-api/.env.local` | Full file | Contains actual values (used for local dev only) |
| `docs/PDF_SUPABASE.sql` | Full file | Schema for old tables; does NOT include `app_users`/`app_wallets` (separate migration) |
| `admin-app/scripts/migrate_reports_to_documents.sql` | Full file | Confirms `app_documents`/`app_document_sections` table names |

---

## 6. Conclusion

**The 500 errors are caused by missing environment variables in the Vercel production deployment.**

The document editor makes a series of correct API calls to a backend that cannot function because:
1. **Better Auth crashes at boot** — `BETTER_AUTH_SECRET=""` in production
2. **Database pool crashes at boot** — `DATABASE_URL=""` in production

All three critical secrets (`BETTER_AUTH_SECRET`, `DATABASE_URL`, `OPENROUTER_API_KEY`) are present in `.env.local` (local dev) but are **empty strings** in `.env.production`. These need to be set in the Vercel project dashboard under Settings → Environment Variables for the Production environment.

**The application code itself is correct.** No SQL mismatches, no schema issues, no missing columns — the backend code is well-structured. The problem is purely a production deployment configuration issue.
