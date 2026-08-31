# Deployment Plan — mobile-api (api.campus360b.site)

## Current Status

✅ Health check: `GET /api/health` → 200 OK  
✅ Database: all `app_*` tables and columns verified present  
⚠️  Auth-capabilities: returns `{passwordReset:true}` only (no `google` key — see note below)  
❌ `/api/auth/sign-in/email`: **TIMES OUT** — blocks on first request  
⚠️  `.env.production` has empty `BETTER_AUTH_SECRET` and `DATABASE_URL` (Vercel env vars must override)

---

## Environment Variables (Vercel Dashboard)

All must be set in **Vercel Dashboard → mobile-api project → Settings → Environment Variables**.

| Variable | Value Source | Required | Notes |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | Generate: `openssl rand -hex 32` | ✅ Yes | **Critical.** Must be set in Vercel. Empty in `.env.production` is a placeholder. |
| `BETTER_AUTH_URL` | `https://api.campus360b.site` | ✅ Yes | Session cookies are issued with this as the base URL. Must match the deployed domain. |
| `DATABASE_URL` | Supabase → Project Settings → Connection Pooling → Standard connection string | ✅ Yes | Format: `postgresql://postgres.XXXX:YYYY@aws-N-eu-north-1.pooler.supabase.com:6543/postgres` |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `false` | Recommended | Supabase pooler certs may not verify with default CA |
| `RESEND_API_KEY` | resend.com API keys | ✅ Yes | For password reset emails |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | Optional | Enables Google OAuth sign-in |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Optional | Enables Google OAuth sign-in |
| `OPENROUTER_API_KEY` | openrouter.ai | Optional | AI document generation |
| `OPENROUTER_MODEL` | e.g. `meta-llama/llama-3.3-70b-instruct:free` | Optional | |

### NOTCHPAY_* — NOT USED
The mobile-api does **not** use NotchPay. Payment is handled via wallet coins (MTN MoMo topup is a placeholder; real integration via CinetPay/Fapshi would be needed for Cameroon).

### SUPABASE_* — NOT USED
No Supabase env vars needed. The connection uses the raw PostgreSQL connection string via Supabase's pooler (not the Supabase JS SDK).

---

## Deployment Steps

### 1. Verify Vercel env vars are set

```bash
# Check via Vercel CLI
vercel env pull mobile-api/.env.local
# or manually at: https://vercel.com/dashboard → mobile-api → Settings → Environment Variables
```

**Critical checks:**
- `BETTER_AUTH_SECRET` must NOT be empty
- `DATABASE_URL` must NOT be empty and must be a valid PostgreSQL connection string

### 2. Force-redeploy after env var changes

Any time env vars change, a redeploy is required:

```bash
cd "C:\Users\migue\Desktop\mes projets\campus 360\mobile-api"
vercel --prod --yes
```

Or via dashboard: **Deployments → latest → ⋮ → Redeploy**

### 3. Verify the deployment

```bash
# Health check
curl https://api.campus360b.site/api/health

# Auth capabilities (may take ~10s on cold start)
curl https://api.campus360b.site/api/mobile/auth-capabilities
# Expected: {"passwordReset":true,"google":false}

# Sign-in (test with a known account)
curl -X POST https://api.campus360b.site/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"miguel1142007@gmail.com","password":"YOUR_PASSWORD"}'
# Expected: 200 + Set-Cookie header
```

### 4. Run integration tests

```bash
cd "C:\Users\migue\Desktop\mes projets\campus 360\mobile-api"

# Set test credentials
$env:TEST_EMAIL = "miguel1142007@gmail.com"
$env:TEST_PASSWORD = "YOUR_PASSWORD"
$env:BETTER_AUTH_URL = "https://api.campus360b.site"

node tests/documents.test.mjs
```

---

## Critical Issue: BETTER_AUTH_URL Mismatch

**This is likely the root cause of 500 errors in the document editor.**

### The Problem
- `mobile-api` is deployed at `api.campus360b.site`
- `auth.ts` defaults `baseURL` to `admin.campus360b.site` when `BETTER_AUTH_URL` is not set or points to localhost
- Session cookies are issued with `Domain=admin.campus360b.site`
- Mobile app (`authBaseUrl`) uses `api.campus360b.site` → cookies are NOT sent to the auth API
- Session validation fails → `requireMobileUser` returns 401 or 500 depending on where it fails

### The Fix
Set `BETTER_AUTH_URL=https://api.campus360b.site` in Vercel env vars. This makes:
- Session cookies issued with `Domain=api.campus360b.site`
- Better-auth validates sessions at the same origin
- Mobile app `authBaseUrl` matches the auth server

```bash
vercel env add BETTER_AUTH_URL production
# Enter: https://api.campus360b.site

vercel --prod --yes
```

### Alternative (if BETTER_AUTH_URL can't be changed)
Set the session cookie domain explicitly in `auth.ts`:

```typescript
// In sessionCookieConfig.cookie:
cookie: {
  // ...
  domain: '.campus360b.site', // shares cookie across all subdomains
}
```

---

## Rollback Plan

If the deployment breaks:
```bash
vercel rollback production
```
Or via dashboard: **Deployments → previous working deployment → Deploy**

---

## Database Schema Verification

Run the included schema check:
```bash
cd "C:\Users\migue\Desktop\mes projets\campus 360\mobile-api"
node tests/db-check.cjs
```

Expected output: all `app_*` tables ✅ with all expected columns.

If any table/column is missing, run the migration SQL:
```bash
# admin-app/scripts/migrate_reports_to_documents.sql renames app_reports → app_documents
# The full schema is in docs/PDF_SUPABASE.sql (note: this creates the legacy 'documents' table, NOT app_documents)
```

---

## Custom Domain Configuration

Ensure `api.campus360b.site` is configured as a Vercel custom domain for the mobile-api project:
- **Vercel Dashboard → mobile-api → Settings → Domains**
- `api.campus360b.site` → must show ✅ Valid configuration
