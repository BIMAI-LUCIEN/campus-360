## 2026-10-07T15:27:43Z

You are a Worker subagent (worker_m6_1).
Working directory: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_m6_1
Project root: c:\Users\DELL\Desktop\mes projet\campus-360
Mandatory requirements file: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md
Architecture specification: c:\Users\DELL\Desktop\mes projet\campus-360\PROJECT.md
Explorer handoffs:
- Explorer 1 (Evolution API): c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m6_1\handoff.md
- Explorer 2 (Stage Dispatch): c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m6_2\handoff.md
- Explorer 3 (Project Finalization): c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m6_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You own exclusively:
- `scripts/test-stage-dispatch.mjs`
- `plan.md`
- `PROJECT.md`
Do NOT modify any other files unless strictly necessary to fix a typecheck or test error.

YOUR TASKS:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and the three explorer handoff reports.
2. Implement `scripts/test-stage-dispatch.mjs` as a comprehensive ESM test suite (`.mjs`).
   It must be self-contained using Node.js built-ins (`assert`, `fs`, `path`, `crypto`, `url`) and `zod` (available in node_modules).
   It must cover:
   - Suite 1: WhatsApp Session Management & Evolution API (Phone normalization for Cameroon/international, instance naming `student-<phone>`, 8-digit pairing code generation and formatting `XXXX - XXXX`, postSchema validation).
   - Suite 2: Stage Application Dispatch Input Schema (`dispatchSchema` and `patchSchema` from `mobile-api/app/api/mobile/stages/dispatch/route.ts`): happy paths, preprocessor empty string / whitespace sanitization, negative rejection tests (missing/empty jobId, invalid channel, invalid email, field length overflows).
   - Suite 3: N8N Webhook Payload Compatibility & Workflow Integrity (verify `scripts/n8n/send_stage_application_workflow.json` nodes, anti-ban jitter 15-30s, WhatsApp and Email branch routing).
   - Suite 4: Mobile Client Contracts & DevSecOps Secret Leak Audit (verify exports and contracts in `src/features/whatsapp/` and `src/features/stages/`, assert zero client-side leaks of `EVOLUTION_API_KEY`, `N8N_API_KEY`, or Supabase service keys in `src/`).
   - Suite 5: Cloud Storage & Database Offline Resilience Simulation (verify non-crashing base64 URI fallback and synthetic offline record generation).
   - Suite 6: Full E2E Simulation of an application lifecycle (pairing -> connected -> dispatch -> sent pending -> callback delivered).
   - Ensure the runner logs clear, structured pass/fail indicators and terminates with `process.exit(0)` on pass or `process.exit(1)` on failure.
3. Run the automated test script and verify clean exit code 0:
   `node scripts/test-stage-dispatch.mjs`
4. Run strict TypeScript checks across the repository and verify 0 errors:
   - Root: `npm run typecheck`
   - Backend: `cd mobile-api && npm run typecheck`
5. Update `plan.md`:
   - Check off all Module 14 tasks (14.1 through 14.6: `[X]`).
   - Update header progress to `45/45 tâches validées (100%)`.
6. Update `PROJECT.md`:
   - In the Milestones table, update M1 through M6 status to `COMPLETED`.
7. Write your detailed handoff report to `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_m6_1\handoff.md`.
8. When complete, use `send_message` to notify orchestrator_3.
