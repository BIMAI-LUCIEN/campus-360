# Handoff Report — Explorer 1 (explorer_m5_it2_1)
**Milestone M5 Iteration 2: API Schema & Payload Fix Investigation**

---

## 1. Observation

### 1.1 Baseline Status
- **Root Typecheck**:
  Command: `npm run typecheck` (Root)
  Exit code: `0`
  Tool Output:
  ```
  > campus-360@1.0.0 typecheck
  > node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit
  ```
- **Mobile API Backend Typecheck**:
  Command: `npm run typecheck` (`mobile-api/`)
  Exit code: `0`
  Tool Output:
  ```
  > campus-360-mobile-api@1.0.0 typecheck
  > tsc --noEmit
  ```

### 1.2 Client-Side Payload Defect in `src/features/stages/stagesApi.ts`
- **Location**: `src/features/stages/stagesApi.ts` (lines 1076–1095)
- **Verbatim Code**:
  ```typescript
  const phone = params.studentPhone || params.phoneNumber || '';

  try {
    const response = await authFetchRaw('/api/mobile/stages/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: params.jobId,
        channel: params.channel,
        whatsappPitch: params.whatsappPitch || '',
        letterText: params.letterText || '',
        cvPdfBase64: params.cvPdfBase64 || '',
        cvPdfUrl: params.cvPdfUrl,
        studentNotes: params.studentNotes || '',
        studentName: params.studentName || '',
        studentEmail: params.studentEmail || '',
        studentPhone: phone,
        phoneNumber: phone,
      }),
    });
  ```
- **Direct Observation**:
  - Line 1091 specifies `studentEmail: params.studentEmail || ''`. Whenever `params.studentEmail` is `undefined`, `null`, or `""`, it resolves to `""`.
  - When passed into `JSON.stringify`, properties with value `""` are serialized as `"studentEmail": ""`.
  - Line 1088 specifies `cvPdfUrl: params.cvPdfUrl`. If `params.cvPdfUrl` is passed as `""` (e.g. from an empty input field or default state), it serializes as `"cvPdfUrl": ""`.

### 1.3 Backend-Side Schema Trap in `mobile-api/app/api/mobile/stages/dispatch/route.ts`
- **Location**: `mobile-api/app/api/mobile/stages/dispatch/route.ts` (lines 27–39)
- **Verbatim Code**:
  ```typescript
  const dispatchSchema = z.object({
    jobId: z.string().trim().min(1, 'jobId requis'),
    channel: z.enum(['whatsapp', 'email']),
    whatsappPitch: z.string().trim().max(10_000).optional(),
    letterText: z.string().trim().max(50_000).optional(),
    cvPdfBase64: z.string().trim().optional(),
    cvPdfUrl: z.string().trim().url().optional(),
    studentNotes: z.string().trim().max(5_000).optional(),
    studentName: z.string().trim().max(200).optional(),
    studentEmail: z.string().trim().email().optional(),
    studentPhone: z.string().trim().max(30).optional(),
    phoneNumber: z.string().trim().max(30).optional(),
  });
  ```
- **Direct Observation**:
  - In Zod, `.optional()` permits `undefined` but does NOT permit empty strings `""` when chained with format validators (`.email()` and `.url()`).
  - When `{"studentEmail": ""}` is received, Zod trims `""` and validates against `.email()`, throwing `ZodError: Invalid email address`.
  - When `{"cvPdfUrl": ""}` is received, Zod trims `""` and validates against `.url()`, throwing `ZodError: Invalid URL`.
  - At line 80–91, `route.ts` halts and returns HTTP 400 Bad Request:
    ```typescript
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
  - Consequently, `stagesApi.ts` logs a warning and falls back to offline storage (`appId = app-dispatch-${Date.now()}`), preventing the application from reaching the PostgreSQL database or the N8N webhook.

### 1.4 Empirical Reproduction Results
1. Executing existing test suite `scripts/test-challenger-m5-schema.mjs`:
   ```
   ❌ FAILED: TC11: Client dispatch when studentEmail is empty string ("")
      Expected success: true, Got: false
      Zod errors: {"studentEmail":["Invalid email address"]}
   ❌ FAILED: TC12: Client dispatch when cvPdfUrl is empty string ("")
      Expected success: true, Got: false
      Zod errors: {"cvPdfUrl":["Invalid URL"]}
   === SUMMARY: 11/13 tests matching expectations ===
   ```
2. Executing empirical schema test suite `.agents/teamwork/explorer_m5_it2_1/test-schema-verify.mjs`:
   - Pure union `.or(z.literal(''))`: Passes on `""`, but fails on whitespace `"   "` and `null`.
   - Preprocessing `sanitizeEmptyStringToUndefined`: Passes on `undefined`, `""`, `"   "`, and `null`, safely returning `undefined`, while preserving strict rejection for invalid formats (`"notanemail"`).

### 1.5 Existing Codebase Precedent
In `mobile-api/app/api/mobile/stages/ingest/route.ts` (lines 22–25), the codebase already addressed this pattern for partner job ingestion:
```typescript
flyerUrl: z.string().url().optional().or(z.literal('')),
videoUrl: z.string().url().optional().or(z.literal('')),
contactWhatsapp: z.string().trim().optional(),
contactEmail: z.string().trim().email('Email invalide').optional().or(z.literal('')),
```

---

## 2. Logic Chain

1. **Root Cause**:
   - `stagesApi.ts` line 1091 applies `params.studentEmail || ''`. For students whose profiles lack an email address (e.g. phone-only registration, offline session), `params.studentEmail` is `undefined`. The expression evaluates to `""`.
   - `JSON.stringify` includes `"studentEmail": ""` in the request payload.
   - `dispatchSchema` specifies `studentEmail: z.string().trim().email().optional()`. Because `"" !== undefined`, Zod executes `.email()`. The regex check fails because an empty string is not a valid email address.
   - The same issue exists on `cvPdfUrl: params.cvPdfUrl` when caller provides an empty string, failing `.url()`.

2. **Downstream Consequences**:
   - `route.ts` rejects the request with HTTP 400 Bad Request.
   - `stagesApi.ts` aborts server synchronization and falls back to generating a local offline ID (`app-dispatch-${Date.now()}`).
   - The application record is never stored in Supabase PostgreSQL, no CV is uploaded to Supabase Storage, and no webhook event reaches N8N.
   - The user sees a local offline receipt instead of a real background dispatch.

3. **Analysis of Candidate Fix Strategies**:
   - **Candidate 1: Client-Only Fix** (`params.studentEmail?.trim() || undefined`):
     If `studentEmail` is `undefined`, `JSON.stringify` omits the key entirely. The backend receives `undefined`, which passes `z.string().email().optional()`. However, this violates Postel's Law (Robustness Principle) because third-party API clients, tests, or legacy versions sending `""` will still fail with HTTP 400.
   - **Candidate 2: Backend-Only Union** (`.or(z.literal(''))`):
     Fixes `""`, but leaves `""` in `parsed.data`, which might get saved as `""` in the database or forwarded to N8N. Furthermore, whitespace-only strings `"   "` or `null` still fail validation.
   - **Candidate 3: Dual-Sided Resilient Fix (Recommended)**:
     - **Client-Side**: Clean optional fields with `?.trim() || undefined`. `JSON.stringify` omits undefined keys, saving bandwidth and transmitting canonical payloads.
     - **Backend-Side**: Apply a preprocessor helper that maps `""`, whitespace `"   "`, and `null` to `undefined`, chained with `z.string().trim().email().optional().or(z.literal(''))`. This guarantees complete backwards-compatibility, defense-in-depth, and transforms empty inputs into clean `undefined` values.

---

## 3. Caveats

1. **Happy Path Masking**: In standard app flows, `AppShell.tsx` injects a fallback email `'etudiant@campus360.app'`, which masked this edge-case defect during normal UI testing.
2. **Follow-Up Eligibility (`isEligibleForFollowup`)**: In `src/features/stages/stagesApi.ts` line 1264, `isEligibleForFollowup` checks `if (app.status !== 'PENDING') return false`. Because 1-Click applications use `SENT_PENDING` and transition to `DELIVERED`, follow-up reminders at J+7 will evaluate to `false` unless `SENT_PENDING` and `DELIVERED` are included.

---

## 4. Conclusion & Actionable Specifications

### **Definitive Fix Specifications for Implementer**

#### A. Client-Side Fix: `src/features/stages/stagesApi.ts`
At lines 1088–1094, replace:
```typescript
<<<< BEFORE
        cvPdfUrl: params.cvPdfUrl,
        studentNotes: params.studentNotes || '',
        studentName: params.studentName || '',
        studentEmail: params.studentEmail || '',
        studentPhone: phone,
        phoneNumber: phone,
====
>>>> AFTER
        cvPdfUrl: params.cvPdfUrl?.trim() || undefined,
        studentNotes: params.studentNotes?.trim() || undefined,
        studentName: params.studentName?.trim() || undefined,
        studentEmail: params.studentEmail?.trim() || undefined,
        studentPhone: phone?.trim() || undefined,
        phoneNumber: phone?.trim() || undefined,
====
```
*Rationale*: If any optional field is empty or undefined, evaluating `?.trim() || undefined` produces `undefined`. In `JSON.stringify`, properties with value `undefined` are automatically omitted, producing a clean payload without empty string traps.

#### B. Backend-Side Fix: `mobile-api/app/api/mobile/stages/dispatch/route.ts`
1. Define the sanitization helper above `dispatchSchema`:
```typescript
const emptyStringToUndefined = (val: unknown) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return val === null ? undefined : val;
};
```
2. Update `cvPdfUrl` and `studentEmail` in `dispatchSchema` (lines 33 & 36):
```typescript
<<<< BEFORE
  cvPdfUrl: z.string().trim().url().optional(),
  studentNotes: z.string().trim().max(5_000).optional(),
  studentName: z.string().trim().max(200).optional(),
  studentEmail: z.string().trim().email().optional(),
====
>>>> AFTER
  cvPdfUrl: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().url().optional().or(z.literal(''))
  ),
  studentNotes: z.string().trim().max(5_000).optional(),
  studentName: z.string().trim().max(200).optional(),
  studentEmail: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().email().optional().or(z.literal(''))
  ),
====
```

#### C. Companion Fix: `src/features/stages/stagesApi.ts` (`isEligibleForFollowup`)
At line 1264, update:
```typescript
<<<< BEFORE
export function isEligibleForFollowup(app: StageApplication): boolean {
  if (app.status !== 'PENDING') return false;
  return getDaysSinceApplication(app.appliedAt) >= 7;
}
====
>>>> AFTER
export function isEligibleForFollowup(app: StageApplication): boolean {
  if (app.status !== 'PENDING' && app.status !== 'SENT_PENDING' && app.status !== 'DELIVERED') return false;
  return getDaysSinceApplication(app.appliedAt) >= 7;
}
====
```

---

## 5. Verification Method

To independently verify this specification and its resolution:

1. **Verify All Interoperability Scenarios**:
   Run the empirical simulation suite:
   ```powershell
   node .agents/teamwork/explorer_m5_it2_1/test-client-backend-simulation.mjs
   ```
   *Expected Result*: All 6 scenarios pass (`Old client sending ""`, `New client with undefined email`, `New client with empty email string`, `New client with spaces email`, `New client with valid email`, `Invalid email rejected`).

2. **Verify Challenger Schema Test**:
   Run the adversarial test script:
   ```powershell
   node scripts/test-challenger-m5-schema.mjs
   ```
   *Expected Result*: After implementing the backend schema fix, tests TC11 and TC12 pass, yielding `13/13 tests matching expectations`.

3. **Verify Root TypeScript Typecheck**:
   ```powershell
   npm run typecheck
   ```
   *Expected Result*: Exits with code `0`.

4. **Verify Mobile API TypeScript Typecheck**:
   ```powershell
   cd mobile-api; npm run typecheck; cd ..
   ```
   *Expected Result*: Exits with code `0`.

### Invalidation Conditions
- Any change that allows malformed emails (e.g. `"not-an-email"`) or malformed URLs (e.g. `"invalid-url"`) to pass validation with HTTP 200.
- Any change that results in TypeScript compilation errors in either project.
