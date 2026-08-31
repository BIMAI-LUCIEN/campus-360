# Milestone 1 - Database Schema, Better Auth, and Session Persistence Analysis

## 1. Database Schema Verification

### Summary of Findings
All requested tables are **present and correctly structured** in the Supabase PostgreSQL database. This was verified by executing the schema inspector script (`node scripts/check-db-data.mjs`).

### Table Presence & Schema Details
- **Better Auth Tables**:
  - `public.user`: Stores core credentials, name, email, role, and custom mobile fields (`phone`, `whatsappPhone`, `university`, `faculty`, `level`).
  - `public.session`: Stores active user session tokens, IP addresses, and user-agent details.
  - `public.account`: Manages provider connections (e.g., email-password credentials, Google OAuth credentials).
  - `public.verification`: Handles temporary tokens for email verification and password reset.
  - `public.rateLimit`: Tracks rate limits per IP/user.
- **Mobile-Specific Tables**:
  - `public.app_users`: Serves as the stable, internal user identity linking Better Auth accounts to transactional data.
  - `public.app_wallets`: Stores student coin balances (defaulting to 5000) and AI credits.
  - `public.app_wallet_transactions`: Records transactions (top-ups, purchases, subscriptions, packs).
  - `public.app_document_purchases`: Stores individual document access logs.
  - `public.app_pack_purchases`: Stores package purchase details (allowing bulk document access).
  - `public.app_ia_usage_logs`: Logs AI assistant usage.
  - `public.app_user_push_tokens`: Stores registered Expo push notification tokens.
  - `public.app_reports` & `public.app_report_sections`: Stores student report builder data.

### Verification Evidence
```json
Public Tables: [
  "profiles",
  "documents",
  "document_purchases",
  "wallet_transactions",
  "session",
  "account",
  "verification",
  "wallets",
  "rateLimit",
  "pdf_packs",
  "pdf_pack_items",
  "pack_purchases",
  "document_events",
  "app_users",
  "user",
  "app_wallets",
  "app_document_purchases",
  "app_pack_purchases",
  "app_wallet_transactions",
  "app_ia_usage_logs",
  "app_user_push_tokens",
  "app_reports",
  "app_report_sections",
  "admin_audit_logs"
]
```

---

## 2. Session Restoration & Persistence

### Secure Store Configuration
In `src/features/auth/betterAuth.ts`, the custom `authStorage` is configured to wrap `expo-secure-store`'s synchronous API:
- `getItem` wraps `SecureStore.getItem`
- `setItem` wraps `SecureStore.setItem`

This storage adapter is passed to the `@better-auth/expo/client` plugin:
```typescript
export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [
    ...(Platform.OS === 'web'
      ? []
      : [
          expoClient({
            scheme: 'campus-bordes',
            storagePrefix: 'campus-bordes',
            storage: authStorage,
          }),
        ]),
  ],
});
```

### Analysis & Technical Details
1. **Key Compatibility**: `expo-secure-store` has strict limitations under the hood—it does not support colons in keys (throwing errors if present). However, the `@better-auth/expo` client package implements an internal `normalizeCookieName` utility that replaces colons with underscores (`name.replace(/:/g, "_")`) before writing to the custom storage adapter. Therefore, keys like `campus-bordes_cookie` and `campus-bordes_session_data` are perfectly safe.
2. **Synchronous Behavior**: Expo SecureStore exports both async (`getItemAsync`/`setItemAsync`) and sync (`getItem`/`setItem`) methods. Using the synchronous variants blocks the JavaScript thread briefly but matches the synchronous interface requirements of the Better Auth storage plugin.
3. **Session Restoration Flow**: On startup, `App.tsx` calls `restoreSession` which invokes `loadStudentSession()` (which executes `authClient.getSession()`). Since `@better-auth/expo` populates the session atom synchronously inside its `getActions` phase using the cached data from storage, the session is restored instantly on launch without wait times if the cache is valid and unexpired.

---

## 3. Authentication Flow Review

### Step-by-Step Flow Inspection

#### A. Sign-Up Flow
1. User enters name, email, password, WhatsApp number, university, faculty, and level.
2. `signUpStudent` is called, forwarding the request to the Next.js server `/api/auth/signup/email` along with the additional fields.
3. Since `requireEmailVerification` is enabled on the server, the server creates the user but does not return a session. Instead, it sends a verification mail.
4. `signUpStudent` returns `null` on session check, which sets `authMode` to `'verify-email'` in the UI.
5. **Issue/Gap**: If the signup flow returns `null` because verification is required, the client-side profile sync (`updateStudentProfile`) is never reached. Instead, it is deferred.
6. **Mitigation**: Fortunately, the server implements `ensureMobileUser` lazily. When the user successfully verifies and logs in for the first time, any API request to `/api/mobile/*` (like fetching account details) will trigger `requireMobileUser` which creates the `public.app_users` entry and populates it using the `additionalFields` saved on the Better Auth `user` record.

#### B. Sign-In Flow
1. User submits email and password.
2. `signInStudent` calls `authClient.signIn.email`.
3. If successful, session tokens are written to `expo-secure-store` and `loadStudentSession` returns the active user session.
4. `App.tsx` calls `syncStudentAccount(session)`, which fetches `/api/mobile/account` to sync the wallet balance, subscription status, and transaction history.

#### C. Sign-Out Flow
1. `signOutStudent` clears client-side memory states.
2. Calls `clearStudentSession` which executes `authClient.signOut()`.
3. The client plugin deletes session records in `expo-secure-store` (setting `campus-bordes_cookie` and `campus-bordes_session_data` to `{}`).

---

## 4. Remaining Gaps & Security Issues

### Critical Security Issue: Better Auth Tables Lack RLS
While RLS is correctly enabled on `public.app_users`, `public.app_wallets`, and other transactional tables, it has **not been enabled** on the internal Better Auth tables:
- `public.user`
- `public.session`
- `public.account`
- `public.verification`
- `public.rateLimit`

**Consequence**: Anyone with the public anon key can perform SELECT, UPDATE, or DELETE operations on these sensitive tables via the Supabase REST/PostgREST API (e.g., stealing session tokens or modifying credentials).
**Resolution**: Enable RLS on these tables without adding any policies (which defaults to a deny-all rule for the `anon` and `authenticated` roles, while still allowing database-owner level server connections to read/write).

### Deliverability Issue: Custom Schemes in Verification Emails
The password reset request uses:
```typescript
const result = await authClient.requestPasswordReset({
  email,
  redirectTo: 'campus-bordes://reset-password',
});
```
**Consequence**: The reset link is generated as `campus-bordes://reset-password?token=...`. Most email providers (like Gmail or Outlook) strip custom schemes from links or prevent them from being clicked for security reasons.
**Resolution**: The `redirectTo` parameter must point to a standard HTTPS web page on the server. That page can then either handle the password reset on the web or trigger a deep link back into the mobile app.

### Gap: Missing Google Sign-In Implementation on Client
Although the server declares support for Google OAuth, the mobile client is completely missing the implementation:
- No Google button is rendered in the UI (only stylesheet classes exist).
- No helper function (e.g. `signInWithGoogle`) exists in `betterAuth.ts`.
- **Resolution**: Need to expose a Google login button and map it to `authClient.signIn.social({ provider: 'google', callbackURL: 'campus-bordes://' })`.

### Minor Gap: Autocorrect on Password Fields
The password input field in `App.tsx` is missing standard React Native attributes `autoCapitalize="none"` and `autoCorrect={false}`, which can cause login failures if the keyboard autocorrects input.

---

## 5. Step-by-Step Implementation & Verification Strategy

### Step 1: Secure Better Auth Tables (Database Hotfix)
Execute the following SQL queries to activate default-deny RLS on Better Auth tables in Supabase:
```sql
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rateLimit ENABLE ROW LEVEL SECURITY;
```
*Note: Since the server-side Next.js app connects via a direct PostgreSQL connection pool (`databasePool` as the database owner `postgres`), this change will block anonymous API users but will not disrupt the Better Auth server.*

### Step 2: Implement Google Sign-In on Mobile Client
1. In `src/features/auth/betterAuth.ts`, implement the social login trigger:
```typescript
export const signInWithGoogle = async () => {
  const result = await authClient.signIn.social({
    provider: 'google',
    callbackURL: 'campus-bordes://',
  });
  if (result.error) throw new Error(errorMessage(result.error));
  return loadSession();
};
```
2. In `App.tsx`, render the Google login button inside the auth card when `authCapabilities.google` is true:
```typescript
{authCapabilities.google ? (
  <Pressable style={styles.googleButton} onPress={handleGoogleSignIn}>
    <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
  </Pressable>
) : null}
```

### Step 3: Implement Web-Based Deep Link Redirect for Emails
Update the `redirectTo` parameters for password reset and email verification to use the web domain (e.g. `https://campus-360-hi97.vercel.app/auth/reset-redirect`) instead of the custom scheme directly.

### Step 4: Verification Strategy
1. **RLS Verification**: Query `user` or `session` tables using a custom script that uses the public anonymous key. Verify that it returns `401 Unauthorized` or empty results instead of raw data.
2. **Session Persistence Verification**: Log in via email/password, close the app completely, reopen it, and confirm the home screen loads immediately without prompting for login.
3. **Lazy Profile Sync Verification**: Create a new account with custom fields. Complete verification on a mockup server or SMTP portal. Log in for the first time, and inspect the `public.app_users` table to ensure university, faculty, level, and wallet balance are correctly populated.
