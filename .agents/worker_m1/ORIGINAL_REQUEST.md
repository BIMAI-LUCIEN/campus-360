## 2026-06-26T22:11:43Z
You are the Worker for Milestone 1: DB Schema & Auth Integration.
Your working directory is `c:/Users/migue/Desktop/mes projets/campus 360/.agents/worker_m1`.

Please implement the following tasks:
1. **DB Security Hotfix**: Write and execute a database migration script to enable Row Level Security (RLS) on core Better Auth tables in Supabase Postgres: `public.user`, `public.session`, `public.account`, `public.verification`, and `public.rateLimit`. (Block anonymous REST access, but preserve database owner server pool connection).
2. **Google Sign-In Mobile Client**:
   - In `src/features/auth/betterAuth.ts`, implement and export a Google sign-in trigger using `authClient.signIn.social({ provider: 'google', callbackURL: 'campus-bordes://' })`.
   - In `App.tsx`, render the "Se connecter avec Google" button (using the styles already defined in the CSS layout if any, e.g. `styles.googleButton`) and connect it to handle social login.
3. **Email Redirect Link Deliverability**:
   - In `src/features/auth/betterAuth.ts`, check the password reset flow. Make sure we use redirect URLs that mail clients can deliver. If needed, bridge links back to `campus-bordes://`.
4. **Fix Typecheck Stack Overflow**:
   - Analyze why `npm.cmd run typecheck` fails with `RangeError: Maximum call stack size exceeded`. Fix the root cause (e.g. adjust `tsconfig.json` exclude settings like adding `"dist"` or look for circular/infinite typescript declarations).
5. **Verification**:
   - Verify that `npm.cmd run typecheck` runs and passes successfully.
   - Verify that your changes resolve the RLS vulnerability and auth flows correctly.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please write your implementation report to `.agents/worker_m1/handoff.md` and notify the parent orchestrator with a message when done.
