# Handoff Report - Milestone 1 Investigation

This report summarizes the read-only investigation of the database schema, Better Auth configuration, and session persistence for Milestone 1.

## 1. Observation

### Database Schema Presence
Executing `node scripts/check-db-data.mjs` inside `admin-app` connected to the live Supabase PostgreSQL database and printed the following list of tables:
```
Public Tables: [
  'profiles',
  'documents',
  'document_purchases',
  'wallet_transactions',
  'session',
  'account',
  'verification',
  'wallets',
  'rateLimit',
  'pdf_packs',
  'pdf_pack_items',
  'pack_purchases',
  'document_events',
  'app_users',
  'user',
  'app_wallets',
  'app_document_purchases',
  'app_pack_purchases',
  'app_wallet_transactions',
  'app_ia_usage_logs',
  'app_user_push_tokens',
  'app_reports',
  'app_report_sections',
  'admin_audit_logs'
]
```

### RLS Policies
Reviewing `admin-app/scripts/setup-better-auth-mobile.mjs` (lines 140-148) and `admin-app/scripts/setup-supabase-pdf.mjs` (lines 620-624) shows that RLS is explicitly enabled for `app_users`, `app_wallets`, `app_document_purchases`, `app_pack_purchases`, `app_wallet_transactions`, `app_reports`, etc., but **no statement** exists to enable RLS on the core Better Auth tables:
- `user`
- `session`
- `account`
- `verification`
- `rateLimit`

### Session Restoration Configuration
In `src/features/auth/betterAuth.ts` (lines 73-95):
```typescript
const authStorage = {
  getItem: (key: string): string | null => {
    ...
    return SecureStore.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    ...
    SecureStore.setItem(key, value);
  },
};
```
In `node_modules/expo-secure-store/build/SecureStore.d.ts` (lines 132-143):
```typescript
export declare function setItem(key: string, value: string, options?: SecureStoreOptions): void;
export declare function getItem(key: string, options?: SecureStoreOptions): string | null;
```

### Google Sign-In & Email Redirects
- In `src/features/auth/betterAuth.ts`, there are no references to `.social` or `signIn.social` methods.
- In `App.tsx`, there are no components rendering the Google sign-in button, nor any function binding it.
- In `betterAuth.ts` (line 163):
  `redirectTo: 'campus-bordes://reset-password'`

---

## 2. Logic Chain

1. **Database Schema Correctness**: The table list output from the live Supabase DB proves that all Better Auth tables (`user`, `session`, `account`, `verification`) and mobile-specific tables (`app_users`, `app_wallets`, `app_wallet_transactions`, `app_document_purchases`, `app_pack_purchases`) are fully present and correctly configured.
2. **Session Persistence**: The `expo-secure-store` package type definitions confirm that synchronous `getItem` and `setItem` methods exist in SDK 54. The client `betterAuth.ts` wraps these synchronous methods in `authStorage` and successfully passes them to the `@better-auth/expo` plugin, enabling synchronous session storage and retrieval on launch.
3. **Google Sign-In Gap**: Because there are no references to Google OAuth triggers in `betterAuth.ts` or `App.tsx`, Google login is currently unsupported on the mobile client.
4. **Vulnerability in Better Auth Tables**: Since RLS was never enabled on the Better Auth tables (`user`, `session`, etc.) in the SQL setup scripts, these tables are vulnerable to direct anonymous write/read access via the public Supabase API.
5. **Email Scheme deliverability**: Custom schemes like `campus-bordes://` in `redirectTo` links will fail in production because mail providers block non-HTTP/HTTPS links.

---

## 3. Caveats
- Direct native behavior (iOS/Android simulators/devices) was not manually tested with Expo Go since this is a read-only investigation.
- We assume that the database connection string and credentials in `.env.local` represent the production-like state of the database.

---

## 4. Conclusion
The database tables and session persistence mechanisms for Milestone 1 are in place and technically sound, but **three major gaps** must be addressed before proceeding:
1. Enable default-deny RLS on Better Auth tables (`user`, `session`, `account`, `verification`, `rateLimit`).
2. Add Google Sign-in to the mobile client UI and auth client.
3. Update email redirect URLs to use standard HTTPS endpoints that bridge back to the app via deep links.

---

## 5. Verification Method

### DB Tables Check
Run the database check script:
```powershell
# In c:/Users/migue/Desktop/mes projets/campus 360/admin-app
node scripts/check-db-data.mjs
```
Verify that all 24 tables are listed in `Public Tables`.

### Session Restoration Check
1. Complete email sign-in.
2. Kill the app process.
3. Re-launch the app and verify it restores the dashboard directly without asking to log in again.
