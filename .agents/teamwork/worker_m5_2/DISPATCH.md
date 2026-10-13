## 2026-10-07T11:17:20Z
You are Worker 2 (worker_m5_2) for Milestone M5 Iteration 2: Schema Hardening, Storage Lean Persistence, and J+7 Follow-up Sync.
Your working directory is: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_m5_2
All your reports, briefing, progress, and handoff must be written in your working directory.

MANDATORY FIRST STEP:
Read the authoritative requirements file at:
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the project architecture file at:
c:\Users\DELL\Desktop\mes projet\campus-360\PROJECT.md
Read the reports from the 3 Iteration 2 Explorers:
- c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m5_it2_1\handoff.md
- c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m5_it2_2\handoff.md
- c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m5_it2_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP:
You own and may edit the following files:
- `src/features/stages/stagesApi.ts`
- `mobile-api/app/api/mobile/stages/dispatch/route.ts`
- `src/ui/screens/ApplicationsTimelineScreen.tsx`

YOUR TASK:
Implement the targeted refinements from Iteration 2:
1. In `src/features/stages/stagesApi.ts`:
   - In `dispatchStageApplication` (lines 1088-1094), do not send empty strings `""` for optional email or url. Use:
     `cvPdfUrl: params.cvPdfUrl?.trim() || undefined,`
     `studentEmail: params.studentEmail?.trim() || undefined,`
     `studentNotes: params.studentNotes?.trim() || undefined,`
   - In `persistApplicationsLocally` / `getStoredApplicationsAsync`, ensure that for native `SecureStore` (which has a 2048-byte limit per key), bulky optional fields (`officialCv`, `generatedCvText`, `generatedLetterText`) are omitted/pruned so the serialized array never exceeds quota.
   - In `isEligibleForFollowup` (line 1264), update eligibility to include `'SENT_PENDING'` and `'DELIVERED'`:
     `if (app.status !== 'PENDING' && app.status !== 'SENT_PENDING' && app.status !== 'DELIVERED') return false;`
   - In `recordApplicationReminder`, call `persistApplicationsLocally(localApplications)` so the reminder timestamp is saved.
2. In `mobile-api/app/api/mobile/stages/dispatch/route.ts`:
   - In `dispatchSchema` (lines 27-39), make `cvPdfUrl` and `studentEmail` gracefully accept empty strings or undefined:
     ```typescript
     cvPdfUrl: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().url().optional()),
     studentEmail: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().email().optional()),
     ```
3. In `src/ui/screens/ApplicationsTimelineScreen.tsx`:
   - Update `isPending` (line 169) so that `'SENT_PENDING'` and `'DELIVERED'` also display the active countdown / J+7 reminder badge:
     `const isPending = app.status === 'PENDING' || app.status === 'SENT_PENDING' || app.status === 'DELIVERED';`
4. Verification & Testing:
   - Run `node scripts/test-challenger-m5-stress.mjs` and confirm all tests pass including the empty email scenario.
   - Run `npm run typecheck` (root) -> exit code 0.
   - Run `cd mobile-api && npm run typecheck` -> exit code 0.

Deliver a complete handoff report in `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_m5_2\handoff.md`.
Report back via send_message when done.
