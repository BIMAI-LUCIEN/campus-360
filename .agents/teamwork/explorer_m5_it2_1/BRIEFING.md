# BRIEFING — 2026-10-07T11:16:30Z

## Mission
Investigate empty-string validation trap on studentEmail and cvPdfUrl across client (stagesApi.ts) and backend (mobile-api dispatch route), and formulate exact, resilient fix specifications.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m5_it2_1
- Original parent: a9fc51f9-5dbe-4675-80a6-6375f438e9eb
- Milestone: M5 Iteration 2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Deliver report in handoff.md in own directory
- Must use send_message to notify parent upon completion

## Current Parent
- Conversation ID: a9fc51f9-5dbe-4675-80a6-6375f438e9eb
- Updated: 2026-10-07T11:03:30Z

## Investigation State
- **Explored paths**:
  - `src/features/stages/stagesApi.ts` (lines 1076–1095, 1170–1225, 1260–1275)
  - `mobile-api/app/api/mobile/stages/dispatch/route.ts` (lines 27–40, 66–236)
  - `mobile-api/app/api/mobile/stages/ingest/route.ts` (lines 22–25)
  - `mobile-api/lib/stages-db.ts` (lines 670–730)
  - `scripts/test-challenger-m5-stress.mjs` & `scripts/test-challenger-m5-schema.mjs`
- **Key findings**:
  - `stagesApi.ts:1091` forces `studentEmail: params.studentEmail || ''`. In `JSON.stringify`, this yields `{"studentEmail": ""}`.
  - `dispatchSchema:36` has `studentEmail: z.string().trim().email().optional()`. Empty string `""` fails `.email()`, triggering HTTP 400 and local offline rollback.
  - Same vulnerability on `cvPdfUrl: params.cvPdfUrl` failing `.url()`.
  - Codebase precedent in `stages/ingest/route.ts` uses `.optional().or(z.literal(''))`.
  - Preprocessing with `emptyStringToUndefined` guarantees clean conversion of `""`, `"   "`, and `null` to `undefined`, while preserving strict rejection of invalid emails.
  - Follow-up check `isEligibleForFollowup` in `stagesApi.ts:1264` only allows `'PENDING'`, blocking J+7 reminders for `'SENT_PENDING'` and `'DELIVERED'`.
- **Unexplored areas**: None. Complete evidence chain established.

## Key Decisions Made
- Confirmed dual-sided fix (Postel's Law): client omits undefined/empty keys via `?.trim() || undefined`, backend sanitizes empty strings with `emptyStringToUndefined` preprocessor and `.optional().or(z.literal(''))`.
- Documented exact before/after code blocks in `handoff.md`.

## Artifact Index
- `DISPATCH.md` — incoming dispatch instructions
- `progress.md` — liveness heartbeat
- `BRIEFING.md` — persistent memory and identity
- `test-schema-verify.mjs` — empirical schema test script
- `test-client-backend-simulation.mjs` — empirical client-backend interoperability test script
- `typecheck-test.ts` — TypeScript compiler verification
- `handoff.md` — final 5-component report
