## 2026-10-05T20:15:26Z
You are a Worker subagent (teamwork_preview_worker).
Your working directory is: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_backend_m1_1
Authoritative request: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md (YOU MUST READ THIS FIRST)
Project roadmap: c:\Users\DELL\Desktop\mes projet\campus-360\PROJECT.md
Survey findings: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_survey_backend_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own and may edit ONLY these files:
- `mobile-api/lib/evolution-api.ts`
- `mobile-api/app/api/mobile/whatsapp/instance/route.ts`
Do NOT modify any other files.

TASK REQUIREMENTS (Milestone 1 - R1: WhatsApp Session Management via Evolution API):
1. Create `mobile-api/lib/evolution-api.ts`:
   - TypeScript client for Evolution API (`https://wa.blackcompany.site`).
   - Normalizes phone numbers (e.g. `+237 672 36 41 24` -> `237672364124`).
   - Instance naming pattern: `student-<phone>`.
   - Methods:
     - `createInstance(instanceName: string)`: `POST /instance/create`
     - `requestPairingCode(instanceName: string, phoneNumber: string)`: `POST /instance/connect/:instance`
     - `getConnectionState(instanceName: string)`: `GET /instance/connectionState/:instance`
   - Include secure error handling and graceful fallback if Evolution API is offline or unconfigured.
2. Create `mobile-api/app/api/mobile/whatsapp/instance/route.ts`:
   - Next.js 15 Route handler supporting POST and GET.
   - Respect existing patterns in `mobile-api/app/api/mobile/` (CORS headers via `withCors`, user session check, error handling).
   - POST handler: receives `{ phone: string, action?: 'create' | 'connect' }`, validates with Zod, ensures instance exists, requests 8-digit pairing code, returns JSON `{ success: true, pairingCode: string, instanceName: string, state: string, offline?: boolean }`.
   - GET handler: receives query param `phone`, checks connection state, returns JSON `{ success: true, instanceName: string, state: 'open' | 'close' | 'connecting', connected: boolean }`.
   - OPTIONS handler for CORS preflight.
3. Verification:
   - Run `cd mobile-api && npm run typecheck` to verify 0 errors.
   - Run a node test check to verify the module imports cleanly.
4. Output: Write your progress in `progress.md` and complete with `handoff.md`. Send a message when finished.
