# Handoff Report: Stage Application Dispatch Endpoint & Database Storage Analysis (Milestone M6)

## 1. Observation

### 1.1 Requirements & Specifications Context
- **`ORIGINAL_REQUEST.md` (lines 18-23 & 45-48)**:
  - R2 mandates: `POST /api/mobile/stages/dispatch` in `mobile-api/app/api/mobile/stages/dispatch/route.ts`, upload generated official CV PDF in Supabase Storage (`cvs/` bucket) or base64 payload to provide a stable URL for Evolution API and N8N, forward payload to N8N webhook (`https://n8n.blackcompany.site/webhook/send-stage-application`), and record application status in Supabase PostgreSQL `stage_applications` with status tracking (`SENT_PENDING`, `DELIVERED`, `FAILED`).
  - R6 mandates: Zero TypeScript errors (`npm run typecheck` in project root and in `mobile-api`), automated test script `scripts/test-stage-dispatch.mjs` verifying pairing code initiation and dispatch payload generation, zero exposed secrets in client-side code, and exit code 0.
- **`PROJECT.md` (lines 35-40 & 44-53)**:
  - Interface Contract: `POST /api/mobile/stages/dispatch` expects `{ jobId: string, channel: 'whatsapp' | 'email', whatsappPitch?: string, letterText?: string, cvPdfBase64?: string, studentNotes?: string }` and returns `{ success: true, applicationId: string, status: 'SENT_PENDING', cvUrl?: string, message: string }`.
  - Backend forward contract to N8N webhook: `{ applicationId, studentId, studentName, studentEmail, studentPhone, companyName, targetPhone?, targetEmail?, channel, whatsappPitch?, letterText?, cvPdfUrl?, cvPdfBase64?, instanceName, timestamp }`.

### 1.2 Inspection of `mobile-api/app/api/mobile/stages/dispatch/route.ts`
- **Line 27-39**: Validation Schema for Dispatch:
  ```ts
  const dispatchSchema = z.object({
    jobId: z.string().trim().min(1, 'jobId requis'),
    channel: z.enum(['whatsapp', 'email']),
    whatsappPitch: z.string().trim().max(10_000).optional(),
    letterText: z.string().trim().max(50_000).optional(),
    cvPdfBase64: z.string().trim().optional(),
    cvPdfUrl: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().url().optional()),
    studentNotes: z.string().trim().max(5_000).optional(),
    studentName: z.string().trim().max(200).optional(),
    studentEmail: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().email().optional()),
    studentPhone: z.string().trim().max(30).optional(),
    phoneNumber: z.string().trim().max(30).optional(),
  });
  ```
- **Line 41-53**: Status Patch Schema (`PATCH /api/mobile/stages/dispatch`):
  ```ts
  const patchSchema = z.object({
    applicationId: z.string().min(1),
    status: z.enum([
      'PENDING',
      'SENT_PENDING',
      'DELIVERED',
      'FAILED',
      'REVIEWING',
      'INTERVIEW',
      'ACCEPTED',
      'REJECTED',
    ]),
  });
  ```
- **Line 67-76**: Authentication handling:
  ```ts
  const access = await requireMobileUser(request, { readBudgetPerMinute: 30 });
  const isStrictProd =
    process.env.NODE_ENV === 'production' &&
    process.env.VERCEL_ENV === 'production';

  if (access.response && isStrictProd) {
    return withCors(access.response, request);
  }
  ```
- **Line 80-91**: 400 Validation Error Response:
  ```ts
  if (!parsed.success) {
    return withCors(
      NextResponse.json(
        {
          error: 'Requête invalide.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      ),
      request,
    );
  }
  ```
- **Line 96-107**: Dev/Offline user fallback:
  ```ts
  const user = access.user ?? {
    id: 'student-offline',
    betterAuthUserId: 'auth-student-offline',
    email: input.studentEmail || 'dave.kameni@polytechnique.cm',
    name: input.studentName || 'Dave Lionel Kameni',
    role: 'student',
    phone: input.studentPhone || input.phoneNumber || '237672364124',
    whatsappPhone: input.studentPhone || input.phoneNumber || '237672364124',
    university: 'Polytechnique Yaoundé',
    faculty: 'Génie Logiciel',
    level: 'Master 1',
  };
  ```
- **Line 128-132**: PDF Upload Trigger:
  ```ts
  let cvPdfUrl = input.cvPdfUrl;
  if (input.cvPdfBase64) {
    const uploadResult = await uploadStageApplicationCvPdf(studentId, input.cvPdfBase64);
    cvPdfUrl = uploadResult.url;
  }
  ```
- **Line 135-145**: Database Application Record Insertion:
  ```ts
  const appRecord = await dispatchStageApplicationRecord({
    studentId,
    jobId: input.jobId,
    channel: input.channel,
    status: 'SENT_PENDING',
    cvFileUrl: cvPdfUrl,
    letterText: input.letterText,
    whatsappPitch: input.whatsappPitch,
    studentNotes: input.studentNotes,
  });
  ```
- **Line 149-184**: Dual Format N8N Payload Construction (Flat + Nested Objects):
  Contains root fields (`applicationId`, `studentId`, `studentName`, `studentEmail`, `studentPhone`, `companyName`, `targetPhone`, `targetEmail`, `channel`, `whatsappPitch`, `letterText`, `cvPdfUrl`, `cvPdfBase64`, `instanceName`, `timestamp`) and nested objects (`student`, `job`, `dossier`).
- **Line 192-209**: N8N Webhook Call with 10s AbortController:
  Wraps fetch in `try/catch` and logs warning if N8N is unreachable or times out, ensuring student HTTP response succeeds even if webhook fails.
- **Line 216-225**: Success HTTP 200 Response:
  ```json
  {
    "success": true,
    "applicationId": "...",
    "status": "SENT_PENDING",
    "cvUrl": "...",
    "message": "Candidature expédiée avec succès via WhatsApp." // or "Candidature expédiée avec succès par Email."
  }
  ```

### 1.3 Inspection of `mobile-api/lib/stages-db.ts`
- **Lines 561-672 (`uploadStageApplicationCvPdf`)**:
  - Targets Supabase Storage `${baseUrl}/storage/v1/object/cvs/cv-${cleanStudentId}-${timestamp}.pdf`.
  - Sets headers: `Authorization: Bearer ${serviceKey}`, `apikey: ${serviceKey}`, `x-upsert: true`.
  - Auto Bucket Creation: If bucket returns 404 or "bucket not found", automatically attempts `POST /storage/v1/bucket` with `{ id: 'cvs', name: 'cvs', public: true }` and retries upload.
  - Fallback: If credentials are missing or network request fails, returns `{ url: "data:application/pdf;base64,...", filePath, fallback: true }` without crashing.
- **Lines 699-824 (`dispatchStageApplicationRecord`)**:
  - DDL Alter: Proactively runs `ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'SENT_PENDING'`, `'DELIVERED'`, `'FAILED'`.
  - Insert Query: Inserts into `public.stage_applications` with `on conflict (student_id, job_id) do update set status = excluded.status... returning id, student_id, job_id, status, applied_at, cv_file_url`.
  - Enum Fallback: If enum constraint rejects `'SENT_PENDING'`, catches error and falls back to inserting `status = 'PENDING'` with `notes = '[Status: SENT_PENDING] ...'`.
  - Total Offline Fallback: If database pool throws any error (unreachable DB), logs warning and returns:
    ```ts
    {
      id: 'app-offline-' + Date.now(),
      studentId: input.studentId,
      jobId: input.jobId,
      status: desiredStatus,
      appliedAt: new Date().toISOString(),
      cvFileUrl: input.cvFileUrl,
    }
    ```
- **Lines 829-865 (`updateApplicationDispatchStatus`)**:
  - Updates `public.stage_applications set status = $1 where id = $2`.
  - Handles enum error fallback to `'PENDING'` with status annotated in notes.
  - Returns `{ id: applicationId, status }`.

### 1.4 Inspection of WhatsApp Pairing Code Initiation
- **`mobile-api/app/api/mobile/whatsapp/instance/route.ts`**:
  - `postSchema`: `phone` (string, 6-25 chars, optional), `action` (`'create' | 'connect'`, optional, default `'connect'`).
  - Calls `normalizePhoneNumber(phone)` -> Cameroon numbers (9 digits starting with 6) prefixed with 237.
  - Instance name generated via `getInstanceName(phone)` -> `student-<phone>`.
  - Calls `createInstance(instanceName)` and `requestPairingCode(instanceName, phone)`.
  - When Evolution API is unconfigured or unreachable:
    - Calls `generateFallbackPairingCode(phone)` which produces a deterministic, realistic 8-digit code formatted as `XXXX - XXXX`.
    - Returns `{ success: true, pairingCode: "XXXX - XXXX", instanceName: "student-...", state: "connecting", offline: true }`.

### 1.5 TypeScript Compilation Baseline Check
- Project root: `npm run typecheck` executed and passed with code 0 (0 errors).
- Backend `mobile-api`: `npm run typecheck` executed and passed with code 0 (0 errors).

---

## 2. Logic Chain

1. **Endpoint & Contract Coherence**:
   - The route handler in `mobile-api/app/api/mobile/stages/dispatch/route.ts` implements both `POST` (application submission) and `PATCH` (status callback).
   - In non-production environments (`process.env.NODE_ENV !== 'production'`), requests do not require active session cookies because `access.response` is bypassed and resilient offline student data is constructed.
   - When a valid request arrives, the payload passes through `dispatchSchema.safeParse`.
   - `cvPdfUrl` and `studentEmail` use Zod preprocessors that convert empty string `""` and whitespace `"   "` to `undefined`, preventing false validation rejections from optional form inputs that send empty strings.

2. **Storage and Webhook Resiliency**:
   - `uploadStageApplicationCvPdf` handles CV uploads with zero risk of crashing: if Supabase credentials are not present or the network is offline, it safely converts the payload into a base64 Data URL.
   - `dispatchStageApplicationRecord` handles PostgreSQL persistence with triple-tier safety:
     1. Tries primary upsert with desired status (`SENT_PENDING`).
     2. If PostgreSQL enum lacks the value, catches the error and retries with `PENDING` while recording the requested status in `notes`.
     3. If PostgreSQL is entirely disconnected, falls back to generating a synthetic offline record (`app-offline-${timestamp}`).
   - The N8N forward uses a 10s timeout AbortController and non-fatal try/catch. Whether N8N responds with 200, 500, or network timeout, the client receives HTTP 200 with `{ success: true, applicationId, status: 'SENT_PENDING' }`.

3. **Status Update Loop**:
   - When N8N finishes dispatching (via Evolution API WhatsApp document message or SMTP email), it calls `PATCH /api/mobile/stages/dispatch` with `{ applicationId, status: 'DELIVERED' }` or `{ applicationId, status: 'FAILED' }`.
   - The `PATCH` handler parses the body with `patchSchema` and invokes `updateApplicationDispatchStatus`.

4. **Requirements for Milestone M6 Test Automation**:
   - Milestone M6 requires `scripts/test-stage-dispatch.mjs` to execute and exit with code 0, validating pairing code initiation and dispatch payload generation.
   - To be robust and comprehensive, `test-stage-dispatch.mjs` must test:
     1. WhatsApp pairing code initiation and helpers (`normalizePhoneNumber`, `getInstanceName`, `formatPairingCode`, `generateFallbackPairingCode`, and `postSchema`).
     2. `dispatchSchema` happy paths (WhatsApp, Email, minimal vs full dossier).
     3. `dispatchSchema` edge cases (empty strings coerced to undefined, whitespace coercion).
     4. `dispatchSchema` validation errors (empty `jobId`, invalid channel, invalid email, invalid URL, length overflow).
     5. `patchSchema` status transitions and invalid status rejections.
     6. N8N webhook payload generation conforming to `docs/N8N_APPLICATION_DISPATCH.md` and `scripts/n8n/send_stage_application_workflow.json`.
     7. Database and cloud storage offline resilience fallback verification.
     8. Zero exposed secrets verification.

---

## 3. Caveats

1. **Live External Services vs Offline Resilience**:
   - External services (`https://wa.blackcompany.site`, `https://n8n.blackcompany.site`, Supabase PostgreSQL) may be offline or firewalled during automated test runs.
   - The test suite must therefore verify that all local schemas, transformation functions, fallback generators, and resilient handler branches operate deterministically without requiring live external internet connections.
2. **PostgreSQL Enum State in Staging**:
   - In production databases where `ALTER TYPE` has already run, status `SENT_PENDING` is natively accepted by PostgreSQL. In unmigrated databases, the fallback safely records `PENDING` with status annotation in `notes`.
3. **Execution Safety**:
   - In accordance with explorer subagent instructions, no project code or test files were created or modified during this investigation.

---

## 4. Conclusion & Recommended Test Architecture for `scripts/test-stage-dispatch.mjs`

### 4.1 Dispatch Payload Specification Table

| Field | Type | Required? | Constraints / Formats | Behavior if Missing / Empty |
|---|---|---|---|---|
| `jobId` | `string` | **Yes** | Trimmed, min 1 char | Returns 400 (`"jobId requis"`) |
| `channel` | `enum` | **Yes** | Strictly `'whatsapp'` \| `'email'` | Returns 400 (`"Invalid enum value"`) |
| `whatsappPitch` | `string` | No | Trimmed, max 10,000 chars | Defaults to `""` in N8N payload |
| `letterText` | `string` | No | Trimmed, max 50,000 chars | Defaults to `""` in N8N payload |
| `cvPdfBase64` | `string` | No | Base64 string | If omitted and no URL, CV omitted |
| `cvPdfUrl` | `string` | No | Valid URL (`http://` or `https://`) | Preprocessed: `""` or `" "` $\rightarrow$ `undefined` |
| `studentNotes` | `string` | No | Trimmed, max 5,000 chars | Joined in DB notes column |
| `studentName` | `string` | No | Trimmed, max 200 chars | Fallback to user session name or default |
| `studentEmail` | `string` | No | Valid email format | Preprocessed: `""` or `" "` $\rightarrow$ `undefined` |
| `studentPhone` | `string` | No | Trimmed, max 30 chars | Normalized to international digits |
| `phoneNumber` | `string` | No | Trimmed, max 30 chars | Alias for `studentPhone` |

### 4.2 Exact Recommended Test Cases for `scripts/test-stage-dispatch.mjs`

The test script should be structured into 6 distinct assertion groups:

```
======================================================================
  CAMPUS 360: STAGE APPLICATION DISPATCH & PAIRING TEST SUITE (M6)
======================================================================
```

#### Group 1: WhatsApp Session Management & Pairing Code Initiation (R1)
- **TC 1.1: Phone Normalization**:
  - `+237 672 36 41 24` $\rightarrow$ `237672364124`
  - `672364124` (Cameroon 9-digit starting with 6) $\rightarrow$ `237672364124`
  - `00237 690 11 22 33` $\rightarrow$ `237690112233`
- **TC 1.2: Instance Naming Convention**:
  - `getInstanceName('237672364124')` $\rightarrow$ `'student-237672364124'`
  - `getInstanceName('student-237672364124')` $\rightarrow$ `'student-237672364124'`
- **TC 1.3: Pairing Code Formatting**:
  - `formatPairingCode('78429012')` $\rightarrow$ `'7842 - 9012'`
- **TC 1.4: Fallback Pairing Code Generation**:
  - `generateFallbackPairingCode('237672364124')` generates an 8-digit string formatted as `XXXX - XXXX`.
  - Code contains only digits and separator (`/^\d{4} - \d{4}$/`).
- **TC 1.5: WhatsApp Post Schema Validation**:
  - Accepts valid phone `{ phone: '+237672364124', action: 'connect' }`.
  - Rejects phone length < 6 or > 25.
  - Action defaults to `'connect'` if omitted.

#### Group 2: Stage Application Dispatch Input Schema (`dispatchSchema`) (R2)
- **TC 2.1: Happy Path WhatsApp Minimal**:
  - `{ jobId: 'job-1', channel: 'whatsapp' }` $\rightarrow$ `safeParse().success === true`.
- **TC 2.2: Happy Path WhatsApp Complete**:
  - Valid `jobId`, `channel: 'whatsapp'`, `whatsappPitch`, `cvPdfBase64`, `studentName`, `studentEmail`, `studentPhone`, `studentNotes`.
- **TC 2.3: Happy Path Email Complete**:
  - Valid `jobId`, `channel: 'email'`, `letterText`, `cvPdfUrl`, `studentEmail`.
- **TC 2.4: Empty String Preprocessor Sanitization**:
  - `studentEmail: ""` $\rightarrow$ parsed as `undefined` (accepted).
  - `cvPdfUrl: ""` $\rightarrow$ parsed as `undefined` (accepted).
  - `studentEmail: "   "` $\rightarrow$ parsed as `undefined` (accepted).
  - `cvPdfUrl: "   "` $\rightarrow$ parsed as `undefined` (accepted).
- **TC 2.5: Negative Test - Missing or Empty jobId**:
  - `{ channel: 'whatsapp' }` $\rightarrow$ Rejected (jobId required).
  - `{ jobId: '', channel: 'whatsapp' }` $\rightarrow$ Rejected (`"jobId requis"`).
  - `{ jobId: '   ', channel: 'whatsapp' }` $\rightarrow$ Rejected (`"jobId requis"`).
- **TC 2.6: Negative Test - Invalid Channel**:
  - `{ jobId: 'job-1', channel: 'sms' }` $\rightarrow$ Rejected.
  - `{ jobId: 'job-1', channel: 'WHATSAPP' }` (uppercase) $\rightarrow$ Rejected.
- **TC 2.7: Negative Test - Malformed Email or URL**:
  - `{ jobId: 'job-1', channel: 'email', studentEmail: 'not-an-email' }` $\rightarrow$ Rejected.
  - `{ jobId: 'job-1', channel: 'email', cvPdfUrl: 'not-a-url' }` $\rightarrow$ Rejected.
- **TC 2.8: Negative Test - Field Length Overflow Boundaries**:
  - `whatsappPitch` 10,001 chars $\rightarrow$ Rejected (max 10,000).
  - `letterText` 50,001 chars $\rightarrow$ Rejected (max 50,000).
  - `studentNotes` 5,001 chars $\rightarrow$ Rejected (max 5,000).
  - `studentName` 201 chars $\rightarrow$ Rejected (max 200).
  - `studentPhone` 31 chars $\rightarrow$ Rejected (max 30).

#### Group 3: Status Patch Schema (`patchSchema`) (R2)
- **TC 3.1: All Valid Statuses Accepted**:
  - `PENDING`, `SENT_PENDING`, `DELIVERED`, `FAILED`, `REVIEWING`, `INTERVIEW`, `ACCEPTED`, `REJECTED`.
- **TC 3.2: Invalid Status Rejected**:
  - `{ applicationId: 'app-1', status: 'UNKNOWN' }` $\rightarrow$ Rejected.
- **TC 3.3: Missing ApplicationId Rejected**:
  - `{ status: 'DELIVERED' }` $\rightarrow$ Rejected.

#### Group 4: N8N Webhook Payload Structure Compatibility (R3)
- **TC 4.1: Flat Root Fields Presence**:
  - `applicationId`, `studentId`, `channel`, `whatsappPitch`, `letterText`, `cvPdfUrl`, `instanceName`, `timestamp`.
- **TC 4.2: Nested Student Object**:
  - `fullName`, `phoneWhatsapp`, `email`, `instanceName`.
- **TC 4.3: Nested Job Object**:
  - `title` / `companyName`, `recruiterWhatsapp`, `recruiterEmail`.
- **TC 4.4: Nested Dossier Object**:
  - `cvPdfUrl`, `cvPdfBase64`, `letterText`, `whatsappPitch`.
- **TC 4.5: Simulation of N8N Code Node & Jitter**:
  - Anti-ban jitter calculated between 15 and 30 seconds (`jitter >= 15 && jitter <= 30`).
  - Responsive HTML template contains candidate details, company name, and Reply-To explanation.
  - WhatsApp pitch formatted with emojis and application reference ID.

#### Group 5: Storage and Database Offline Fallbacks (R2)
- **TC 5.1: CV Storage Fallback**:
  - In absence of Supabase credentials, returns base64 data URI fallback without throwing.
- **TC 5.2: Database Offline Record Fallback**:
  - Generates synthetic `app-offline-*` record with status `SENT_PENDING` when database is unavailable.
- **TC 5.3: Status Update Fallback**:
  - Gracefully falls back when database or enum is unmigrated.

#### Group 6: Verification & Clean Exit (R6)
- **TC 6.1: Zero Exposed Secrets**:
  - Asserts that no sensitive credentials or keys are hardcoded in test payloads.
- **TC 6.2: Clean Exit**:
  - Script logs all assertions and exits with `process.exit(0)`.

---

## 5. Verification Method

To independently verify this analysis:

1. **Verify Backend Dispatch Route Implementation**:
   ```powershell
   Get-Content mobile-api\app\api\mobile\stages\dispatch\route.ts
   ```
   Confirm presence of `dispatchSchema`, `patchSchema`, `requireMobileUser`, `uploadStageApplicationCvPdf`, `dispatchStageApplicationRecord`, and N8N webhook forwarding.

2. **Verify Database and Storage Functions**:
   ```powershell
   Get-Content mobile-api\lib\stages-db.ts
   ```
   Confirm `uploadStageApplicationCvPdf` (lines 561-672), `dispatchStageApplicationRecord` (lines 699-824), and `updateApplicationDispatchStatus` (lines 829-865).

3. **Verify Existing Edge-Case Script Precedent**:
   ```powershell
   node scripts\test-challenger-m5-it2-edge-cases.mjs
   ```
   Returns exit code 0 and verifies schema validation behavior with empty string vs null vs undefined.

4. **Verify Zero TypeScript Errors**:
   ```powershell
   npm run typecheck
   cd mobile-api; npm run typecheck; cd ..
   ```
   Both must complete with zero errors (exit code 0).
