## 2026-10-05T20:27:49Z
You are a Worker subagent (teamwork_preview_worker).
Your working directory is: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_backend_m2_1
Authoritative request: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md (YOU MUST READ THIS FIRST)
Project roadmap: c:\Users\DELL\Desktop\mes projet\campus-360\PROJECT.md
Survey findings: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_survey_backend_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own and may edit ONLY these files:
- `mobile-api/app/api/mobile/stages/dispatch/route.ts`
- `mobile-api/lib/stages-db.ts`
Do NOT modify any other files.

TASK REQUIREMENTS (Milestone 2 - R2: Backend Application Dispatch & PDF Cloud Storage):
1. In `mobile-api/lib/stages-db.ts`:
   - Expand `StageStatus` type to include: `'PENDING' | 'SENT_PENDING' | 'DELIVERED' | 'FAILED' | 'REVIEWING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED'`.
   - Implement `uploadStageApplicationCvPdf(studentId: string, pdfBase64: string)`: Uploads to `${SUPABASE_URL}/storage/v1/object/cvs/cv-${studentId}-${Date.now()}.pdf` via fetch with headers `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` and `apikey: ${SUPABASE_SERVICE_ROLE_KEY}`. If bucket creation or upload fails, falls back gracefully (e.g. data URL or base64 storage).
   - Implement `dispatchStageApplicationRecord(...)` or update SQL queries: When inserting into `stage_applications`, handle status gracefully with fallback if enum type in PostgreSQL hasn't been altered yet (e.g., execute `ALTER TYPE stage_app_status ADD VALUE IF NOT EXISTS 'SENT_PENDING'` if possible or fall back to `'PENDING'` if enum rejects).
2. Create `mobile-api/app/api/mobile/stages/dispatch/route.ts`:
   - Next.js 15 Route handler supporting `POST` and `OPTIONS`.
   - Zod validation for body:
     - `jobId`: string (uuid)
     - `channel`: z.enum(['whatsapp', 'email'])
     - `whatsappPitch`: optional string
     - `letterText`: optional string
     - `cvPdfBase64`: optional string
     - `studentNotes`: optional string
   - Authenticate with `requireMobileUser(request)` (with dev fallback if unauthenticated).
   - Resolve student details (name, email, phone) and job details (company, target WhatsApp / recruiter email).
   - Upload CV PDF to Supabase Storage `cvs/` bucket.
   - Forward payload to N8N webhook:
     `POST https://n8n.blackcompany.site/webhook/send-stage-application`
     Payload: `{ applicationId, studentId, studentName, studentEmail, studentPhone, companyName, targetPhone, targetEmail, channel, whatsappPitch, letterText, cvPdfUrl, cvPdfBase64, instanceName, timestamp }`.
     Use AbortController with 10s timeout, graceful handling if N8N is offline.
   - Record application in Supabase table `stage_applications` with status tracking.
   - Return JSON `{ success: true, applicationId: string, status: 'SENT_PENDING', cvUrl?: string, message: string }`.
   - Support CORS preflight with `withCors`.
3. Verification:
   - Run `cd mobile-api && npm run typecheck` to verify 0 errors.
   - Run a Node test script to verify imports and Zod schema.
4. Output: Write `progress.md` and complete with `handoff.md`. Send a message when finished.
