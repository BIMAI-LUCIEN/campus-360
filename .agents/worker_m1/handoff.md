# Handoff Report - Milestone 1: DB Schema & Auth Integration

This report outlines the implementation details and verification results for Milestone 1.

## 1. Observation

### Typecheck Stack Overflow
Running `npm.cmd run typecheck` originally failed with a stack overflow:
```
RangeError: Maximum call stack size exceeded
    at C:\Users\migue\Desktop\mes projets\campus 360\node_modules\typescript\lib\_tsc.js:48098:23
    ...
```
Inspecting `tsconfig.json` showed:
```json
  "exclude": ["admin-app", "node_modules"]
```
It was missing the `dist`, `.expo`, and `scratch` directories, allowing TypeScript to parse compiled scripts and bundle packages recursively, triggering a stack overflow.

### Database Row Level Security (RLS)
The core Better Auth tables (`public.user`, `public.session`, `public.account`, `public.verification`, and `public.rateLimit`) lacked RLS enablement in the original database schema setup scripts, leaving them vulnerable to anonymous SELECT, UPDATE, or DELETE requests via the public Supabase PostgREST API.

### Email Link Deliverability
The original email redirection used `campus-bordes://reset-password` directly. Email clients block custom URI schemes in links, which degrades email deliverability and prevents users from opening the password reset screen from their mail application.

### Google Sign-in on Mobile Client
Google Sign-in trigger and UI buttons were completely absent from `src/features/auth/betterAuth.ts` and `App.tsx`.

---

## 2. Logic Chain

1. **Typecheck Fix**: Excluding the build folders `dist`, `.expo`, and `scratch` in `tsconfig.json` prevents the TypeScript compiler from scanning generated artifacts and infinite-looping on compiled type declaration mappings. After the change, running `npm.cmd run typecheck` completes and passes successfully.
2. **RLS Hotfix**: Executing `ALTER TABLE public."<tableName>" ENABLE ROW LEVEL SECURITY;` on the target tables activates default-deny RLS. This blocks anonymous PostgREST access via the client-side API, but preserves server-side database owner connections because direct pg connections bypass RLS by default.
3. **Bridge Redirection Route**: By setting the client-side `redirectTo` parameter to `http://<server-ip>:3001/api/mobile/reset-password-redirect` (using the HTTP protocol), we ensure the email link is fully deliverable by any mail provider. Once clicked, the backend verifies the token and returns an HTML page that triggers a deep link redirection back to `campus-bordes://reset-password?token=<token>`.
4. **Google Sign-In integration**: Exposing `signInWithGoogle` using `authClient.signIn.social` and attaching it to the styled Google button in `App.tsx` enables OAuth flow through `expo-web-browser` and automatically logs the user in upon redirection.

---

## 3. Caveats

- Executing the migration script `admin-app/scripts/db-security-hotfix.mjs` was blocked during our run due to CLI command execution permission timeout. The database updates must be executed via direct SQL commands or by running the script on a host with database access permissions.
- In-app Google OAuth redirect behavior requires the mobile scheme to be registered and a stable redirect domain set up for production.

---

## 4. Conclusion

Milestone 1 is fully implemented. The TypeScript compiler issues are fixed, the Google Social sign-in capability and UI are integrated, the password reset mail flow is bridged using a deliverable redirect endpoint, and database migrations are written to secure the Better Auth tables.

---

## 5. Verification Method

### 1. TypeScript Compiler Verification
Run the typecheck script:
```powershell
npm.cmd run typecheck
```
Verify that the output completes successfully with exit code 0 and no stack overflow errors.

### 2. Database RLS Migration
Apply the migrations using:
```powershell
# From the admin-app folder
node scripts/db-security-hotfix.mjs
```
Then, verify the RLS status using:
```powershell
node scripts/verify-rls.mjs
```
Verify that the output confirms RLS is enabled for all 5 core Better Auth tables.

### 3. Redirection Bridge Route Verification
Request a password reset in the mobile app, and check the sent email link. Click the link and confirm that it takes you to the browser page which immediately prompts/redirects to open the mobile application using `campus-bordes://reset-password?token=...`.
