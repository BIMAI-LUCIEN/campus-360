# Test Report — Document Editor (Rédaction) Bug Investigation
**Date:** 2026-07-18  
**Agent:** TEST & PRODUCTION (Agent 3)  
**Scope:** Backend smoke test, DB schema verification, integration tests, deployment readiness

---

## Executive Summary

| Check | Status | Notes |
|---|---|---|
| `/api/health` | ✅ PASS | 200, `{"status":"ok"}` |
| `/api/mobile/auth-capabilities` | ⚠️ SLOW | 200, but ~10s cold-start; missing `google` key |
| `/api/auth/sign-in/email` | ❌ TIMEOUT | First request hangs — blocks indefinitely |
| DB tables (all `app_*`) | ✅ PASS | 11 tables, all columns present |
| Document CRUD API (unauthenticated) | ✅ PASS | Returns 401 as expected |
| `.env.production` secrets | ❌ EMPTY | `BETTER_AUTH_SECRET` and `DATABASE_URL` are empty strings |
| Integration test file | ✅ WRITTEN | `mobile-api/tests/documents.test.mjs` |

**Root cause likely identified:** `BETTER_AUTH_URL` mismatch between where sessions are created (`admin.campus360b.site` fallback) and where they're validated (`api.campus360b.site`). Session cookies from the mobile app may not be recognized by the production API.

---

## Part 1: Backend Smoke Tests

### 1.1 Health Check
```
GET https://api.campus360b.site/api/health
→ 200 OK
→ {"status":"ok","timestamp":"2026-07-18T14:30:46.452Z"}
```
✅ **PASS** — The Next.js app is running and responding.

### 1.2 Auth Capabilities
```
GET https://api.campus360b.site/api/mobile/auth-capabilities
→ 200 OK  (cold start: ~10s)
→ {"passwordReset":true}
```
⚠️ **PARTIAL** — Missing `google` key in response (should be `{"passwordReset":true,"google":false}`). This indicates `AUTH_CONFIG.googleEnabled` is `undefined` at runtime, suggesting the auth module may not be fully initialized in production. Not blocking, but worth investigating.

### 1.3 Sign-In Endpoint (Critical Finding)
```
POST https://api.campus360b.site/api/auth/sign-in/email
→ TIMEOUT (15s) — socket hang up
```
❌ **FAIL** — The sign-in endpoint **hangs on the first request** after a cold start. This is a serious issue. Likely cause: better-auth module initialization blocks on DB connection when rate-limiting storage is set up.

**Impact:** Any user who hasn't been active recently (cold start scenario) will experience timeouts on sign-in, which the mobile app might surface as a 500 error.

### 1.4 Document API (Unauthenticated)
```
GET https://api.campus360b.site/api/mobile/documents
→ 401 Unauthorized
→ {"error":"Session requise."}
```
✅ **CORRECT** — Returns 401 for unauthenticated requests. The route handlers are working.

---

## Part 2: Database Schema Verification

Tested against: Supabase PostgreSQL via connection pooling (from `.env.local` credentials)

### Tables Verified Present (11/11)
| Table | Status |
|---|---|
| `app_users` | ✅ |
| `app_wallets` | ✅ |
| `app_documents` | ✅ |
| `app_document_sections` | ✅ |
| `app_document_purchases` | ✅ |
| `app_pack_purchases` | ✅ |
| `app_wallet_transactions` | ✅ |
| `app_ia_usage_logs` | ✅ (bonus, not in schema doc) |
| `app_login_attempts` | ✅ (bonus) |
| `app_rate_limits` | ✅ (bonus) |
| `app_user_push_tokens` | ✅ (bonus) |

### Columns Verified (key tables)
**`app_documents` (14/14):** `id, user_id, title, description, template_type, font_family, line_spacing, margins, cover_template, cover_data, primary_color, secondary_color, created_at, updated_at` — all present ✅

**`app_document_sections` (9/9):** `id, document_id, title, content_html, content_json, sort_order, is_system, created_at, updated_at` — all present ✅

**`app_users` (13/13):** `id, better_auth_user_id, legacy_supabase_user_id, email, name, role, phone, whatsapp_phone, university, faculty, level, created_at, updated_at` — all present ✅

### Existing Users in DB
| Email | Name | Role | Created |
|---|---|---|---|
| `admin@campus360.local` | Admin Campus 360 | admin | 2026-06-20 |
| `miguel1142007@gmail.com` | BIM | admin | 2026-06-21 |

---

## Part 3: Integration Tests

**File:** `C:\Users\migue\Desktop\mes projets\campus 360\mobile-api\tests\documents.test.mjs`

**Status:** Written, not yet executed (requires real user credentials)

### Test Coverage
| Test | Endpoint | Method |
|---|---|---|
| Create document | `/api/mobile/documents` | POST |
| List documents | `/api/mobile/documents` | GET |
| Fetch one with sections | `/api/mobile/documents/[id]` | GET |
| Update settings | `/api/mobile/documents/[id]` | PATCH |
| Add section | `/api/mobile/documents/[id]/sections` | POST |
| Update section content | `/api/mobile/documents/[id]/sections/[sid]` | PATCH |
| Delete section | `/api/mobile/documents/[id]/sections/[sid]` | DELETE |
| Delete document | `/api/mobile/documents/[id]` | DELETE |

### Running the Tests
```bash
cd "C:\Users\migue\Desktop\mes projets\campus 360\mobile-api"
$env:TEST_EMAIL = "miguel1142007@gmail.com"
$env:TEST_PASSWORD = "YOUR_ACTUAL_PASSWORD"
$env:BETTER_AUTH_URL = "https://api.campus360b.site"
node tests/documents.test.mjs
```

**Helper scripts also created:**
- `tests/db-check.cjs` — Verifies all DB tables/columns (already run, ✅ all pass)
- `tests/query-users.cjs` — Lists existing app_users

---

## Part 4: Root Cause Analysis — 500 Errors on Document Write/Edit

### Hypothesis 1: BETTER_AUTH_URL mismatch (HIGH probability)

**How the auth flow works:**
1. Mobile app (`betterAuth.ts`) calls `createAuthClient({ baseURL: authBaseUrl })`
2. `authBaseUrl` → `getAuthBaseUrl()` → in production: `https://api.campus360b.site` (from `publicEnv.authUrl`)
3. Sign-in calls `POST /api/auth/sign-in/email` → better-auth creates session cookie
4. Cookie is stored in Expo SecureStore
5. `authFetch()` reads cookie via `authClient.getCookie()` → sends as `Cookie` header to API
6. `requireMobileUser()` calls `auth.api.getSession({ headers })` → validates session

**The problem:**
`auth.ts` has this logic:
```typescript
const detectBaseUrl = (): string => {
  const envUrl = process.env.BETTER_AUTH_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  return 'https://admin.campus360b.site'; // ← FALLBACK
};
```

If `BETTER_AUTH_URL` is not set in Vercel env vars, the fallback `admin.campus360b.site` is used. Sessions are then created with `admin.campus360b.site` as the cookie domain.

But the mobile app uses `api.campus360b.site` → the cookie domain doesn't match → session validation fails → 500.

**Fix:** Set `BETTER_AUTH_URL=https://api.campus360b.site` in Vercel dashboard.

### Hypothesis 2: Cold-start DB timeout (MEDIUM probability)

The `/api/auth/sign-in/email` endpoint times out on first request. This suggests the better-auth module takes too long to initialize (possibly because the rate-limiting DB table `app_rate_limits` needs to be created on first use).

**Fix:** Run a dummy authenticated request shortly after deployment to "warm up" the function. Or pre-create the `app_rate_limits` table.

### Hypothesis 3: .env.production placeholder values (LOW probability, but dangerous)

`.env.production` has:
```
BETTER_AUTH_SECRET=""
DATABASE_URL=""
```

If Vercel's env var override doesn't work (e.g., Vercel dashboard vars not set, or a build-time vs runtime issue), the app would run with empty secrets and empty DB URL → total failure.

**Fix:** Verify in Vercel dashboard that both vars are set correctly.

---

## Part 5: Deployment Readiness Checklist

### Must Fix Before Production
- [ ] **`BETTER_AUTH_URL=https://api.campus360b.site`** set in Vercel env vars (Environment: Production)
- [ ] **`BETTER_AUTH_SECRET`** set in Vercel env vars (not the empty string from `.env.production`)
- [ ] **`DATABASE_URL`** verified in Vercel env vars
- [ ] Sign-in endpoint doesn't time out — warm up the function after deploy
- [ ] Test with real mobile app credentials (miguel1142007@gmail.com)

### Should Verify
- [ ] Custom domain `api.campus360b.site` is configured in Vercel (not just DNS — Vercel domain config)
- [ ] `RESEND_API_KEY` is valid (password reset emails)
- [ ] `app_rate_limits` table is created (needed by better-auth rate limiting)

### Nice to Have
- [ ] Add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for Google OAuth
- [ ] Add monitoring / Sentry for 500 error tracking
- [ ] Add Vercel Analytics to track API response times

---

## Files Produced

| File | Purpose |
|---|---|
| `mobile-api/tests/documents.test.mjs` | Full CRUD integration tests |
| `mobile-api/tests/db-check.cjs` | DB schema verification script |
| `mobile-api/tests/query-users.cjs` | User listing utility |
| `.claude/output/apex/01-redaction-bug/deployment.md` | Deployment plan |
| `.claude/output/apex/01-redaction-bug/test-report.md` | This report |

---

## Recommended Next Steps

1. **Immediate:** Set `BETTER_AUTH_URL=https://api.campus360b.site` in Vercel dashboard → Redeploy
2. **Verify:** Test sign-in at `https://api.campus360b.site/api/auth/sign-in/email` with Miguel's credentials
3. **Test:** Run `node tests/documents.test.mjs` with real credentials
4. **Monitor:** Watch Vercel function logs for 500 errors after redeploy
5. **Fix cold-start:** Add a Vercel Cron job or healthcheck that hits an authenticated endpoint every 5 min to keep the function warm
