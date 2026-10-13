# Forensic Audit Handoff Report — auditor_m5_it2_1
**Target**: Milestone M5 Iteration 2 (Schema Hardening, Storage Lean Persistence, and Client Security)
**Date**: 2026-10-07T11:39:00Z
**Integrity Mode**: Development (as specified in `.agents/teamwork/ORIGINAL_REQUEST.md`)

---

## Forensic Audit Report

**Work Product**: Milestone M5 Iteration 2 (`mobile-api/app/api/mobile/stages/dispatch/route.ts`, `src/features/stages/stagesApi.ts`, client code secrets)  
**Profile**: General Project  
**Verdict**: CLEAN  

### Phase Results
- **Hardcoded test results**: PASS — No hardcoded test responses, strings, or fixed outputs detected in implementation logic.
- **Facade detection**: PASS — Full genuine implementation of preprocessing, field pruning, dynamic UTF-8 budget calculation, and backend proxy routing.
- **Pre-populated artifact detection**: PASS — No pre-populated test artifacts, logs, or attestation files found in the workspace.
- **Input sanitization & validation integrity (`route.ts`)**: PASS — `z.preprocess` converts empty/whitespace strings to `undefined` without bypassing email format checks; `"invalid-email"` is strictly rejected.
- **Storage pruning & budget capping (`stagesApi.ts`)**: PASS — Bulky fields are genuinely stripped, reducing payload sizes by >94%, and `fitSecureStoreBudget` enforces a strict 1,800-byte cap.
- **Client secret leakage**: PASS — Zero secret API keys or backend tokens leaked in `src/`.
- **Static type safety (`tsc`)**: PASS — 0 diagnostics across root project and `mobile-api`.

---

## 1. Observation

### 1.1 Backend Route Sanitization (`mobile-api/app/api/mobile/stages/dispatch/route.ts`)
- In lines 33 and 36:
  ```typescript
  cvPdfUrl: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().url().optional()),
  studentNotes: z.string().trim().max(5_000).optional(),
  studentName: z.string().trim().max(200).optional(),
  studentEmail: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().email().optional()),
  ```
- Empirical validation test execution:
  ```
  PASS: studentEmail with empty string -> success = true
  PASS: studentEmail with spaces only -> success = true
  PASS: studentEmail with undefined -> success = true
  PASS: studentEmail with valid email -> success = true
  PASS: studentEmail with invalid-email -> success = false
  PASS: studentEmail with foo@ -> success = false
  PASS: studentEmail with @bar.com -> success = false
  PASS: studentEmail with test@domain (invalid domain) -> success = false
  PASS: studentEmail with not_an_email.com -> success = false
  PASS: cvPdfUrl with empty url -> success = true
  PASS: cvPdfUrl with whitespace url -> success = true
  PASS: cvPdfUrl with undefined url -> success = true
  PASS: cvPdfUrl with valid url -> success = true
  PASS: cvPdfUrl with not-a-url -> success = false
  ```

### 1.2 Storage Pruning & Byte Budget Fitting (`src/features/stages/stagesApi.ts`)
- In lines 1159–1192:
  ```typescript
  function pruneBulkyApplicationFields(app: StageApplication): StageApplication {
    const { officialCv, generatedCvText, generatedLetterText, ...lean } = app;
    return lean as StageApplication;
  }

  function getUtf8ByteLength(str: string): number {
    if (typeof Buffer !== 'undefined') {
      return Buffer.byteLength(str, 'utf8');
    }
    let s = str.length;
    for (let i = str.length - 1; i >= 0; i--) {
      const code = str.charCodeAt(i);
      if (code > 0x7f && code <= 0x7ff) s++;
      else if (code > 0x7ff && code <= 0xffff) s += 2;
      if (code >= 0xdc00 && code <= 0xdfff) i--;
    }
    return s;
  }

  function fitSecureStoreBudget(apps: StageApplication[], maxBytes = 1800): string {
    let list = apps.map(pruneBulkyApplicationFields);
    while (list.length > 0) {
      const raw = JSON.stringify(list);
      if (getUtf8ByteLength(raw) <= maxBytes) {
        return raw;
      }
      list.pop();
    }
    return '[]';
  }
  ```
- Empirical stress test on 30 realistic applications:
  ```
  Bulky app raw byte size: 5,265 bytes
  Pruned app byte size: 272 bytes (reduction: 94.8%)
  Pruned app has officialCv?: false
  Pruned app has generatedCvText?: false
  Pruned app has generatedLetterText?: false
  Total 30 bulky apps byte size: 158,021 bytes
  Capped JSON byte size: 1,639 bytes (<= 1,800 bytes limit)
  Number of applications kept in budget: 6
  Huge single app fallback capped result: []
  ```

### 1.3 Follow-up Eligibility & Persistence (`src/features/stages/stagesApi.ts`)
- In lines 1316–1339:
  ```typescript
  export function isEligibleForFollowup(app: StageApplication): boolean {
    if (app.status !== 'PENDING' && app.status !== 'SENT_PENDING' && app.status !== 'DELIVERED') return false;
    return getDaysSinceApplication(app.appliedAt) >= 7;
  }

  export async function recordApplicationReminder(applicationId: string): Promise<boolean> {
    const app = localApplications.find((a) => a.id === applicationId);
    if (app) {
      app.lastRemindedAt = new Date().toISOString();
      persistApplicationsLocally(localApplications);
      return true;
    }
    return false;
  }
  ```
- Empirical test verified:
  - `PENDING`, `SENT_PENDING`, `DELIVERED` with `daysElapsed >= 7` evaluate to `true`.
  - Applications with `daysElapsed < 7` evaluate to `false`.
  - Terminal statuses (`REJECTED`, `ACCEPTED`, `FAILED`) evaluate to `false` regardless of days elapsed.
  - Calling `recordApplicationReminder` triggers `persistApplicationsLocally(localApplications)`, persisting reminder timestamps to persistent storage.

### 1.4 Client-Side Secret Leak Audit
- Grep queries for API keys, bearer tokens, passwords, and sensitive backend environment variables across `src/`:
  - `(api_key|apikey|secret|password|bearer|authorization).*['"][a-zA-Z0-9_\-]{8,}['"]` -> 0 hardcoded secrets found.
  - `EVOLUTION_API_KEY`, `N8N_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` -> 0 occurrences in `src/`.
  - `wa.blackcompany.site` -> 0 occurrences in `src/`.
  - All Evolution API communications in client code are brokered through backend endpoints `/api/mobile/whatsapp/instance` via `authFetchRaw`.

### 1.5 Typecheck & Script Execution Results
- `npm run typecheck` in project root:
  `node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit` -> Exited with code `0`, 0 diagnostics.
- `cd mobile-api && npm run typecheck`:
  `tsc --noEmit` -> Exited with code `0`, 0 diagnostics.
- `cd recruiter-web && npm run typecheck`:
  `tsc --noEmit` -> Exited with code `0`, 0 diagnostics.
- `node scripts/test-modules-11-12.mjs`: Exited with code `0` (4/4 tests passed).

---

## 2. Logic Chain

1. **Input Sanitization Without Validation Bypass**:
   - `route.ts` uses `z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), ...)` on `studentEmail` and `cvPdfUrl`.
   - When an empty string `""` or whitespace string `"   "` is passed, it is converted to `undefined`. Because the underlying schema uses `.optional()`, `undefined` is accepted.
   - When a malformed string such as `"invalid-email"` is passed, `val.trim() === ''` evaluates to `false`, so the string is passed as-is to `z.string().trim().email()`. Zod rejects it with an `invalid_string` error.
   - Therefore, the preprocessing does not bypass validation on malformed inputs, providing genuine input hygiene without weakening security.

2. **Genuine Storage Budget Management**:
   - The native `SecureStore` key-value limit on Android and iOS is 2,048 bytes per entry.
   - Unpruned applications with full CV structures consume >5 KB each, which would fail silently on mobile devices.
   - `pruneBulkyApplicationFields` selectively removes only large reconstructible fields (`officialCv`, `generatedCvText`, `generatedLetterText`), reducing record size to ~270 bytes.
   - `fitSecureStoreBudget` calculates the actual UTF-8 byte length and iteratively removes older entries until the payload is strictly <= 1,800 bytes.
   - The implementation is dynamic, calculates byte lengths accurately across platforms, and uses no facade or dummy hardcoding.

3. **Lifecycle Synchronization for Follow-up**:
   - 1-Click applications enter state `SENT_PENDING` and transition to `DELIVERED`.
   - By updating `isEligibleForFollowup` to accept `SENT_PENDING` and `DELIVERED`, the J+7 follow-up workflow functions seamlessly for 1-Click applications.
   - Adding `persistApplicationsLocally` ensures that `lastRemindedAt` is saved immediately to device storage.

4. **Zero Client Secret Exposure**:
   - The client application interacts solely with the backend proxy (`/api/mobile/whatsapp/instance` and `/api/mobile/stages/dispatch`).
   - All Evolution API tokens and N8N webhook targets are isolated in backend environment variables (`mobile-api/lib/evolution-api.ts`), ensuring zero secret exposure in client bundles.

---

## 3. Caveats

- No caveats. All investigated areas meet both functional requirements and forensic integrity criteria under Development Mode.

---

## 4. Conclusion

The work products delivered in Milestone M5 Iteration 2 are **CLEAN**.
- There are no hardcoded shortcuts, facades, or fabricated outputs.
- `z.preprocess` cleans blank strings while strictly maintaining email and URL format validations.
- `stagesApi.ts` implements authentic data pruning and budget capping within native storage constraints.
- No secret keys are leaked in client code.
- All TypeScript compiler checks pass with zero diagnostics across the entire workspace.

---

## 5. Verification Method

### 5.1 Independent Commands to Reproduce Verification
1. **Schema & Email Validation Check**:
   ```powershell
   node -e "import { z } from 'zod'; const s = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().email().optional()); console.log('Empty string:', s.safeParse('').success); console.log('Invalid email:', s.safeParse('invalid-email').success);"
   ```
   *Expected output*: `Empty string: true`, `Invalid email: false`.

2. **Root TypeScript Check**:
   ```powershell
   npm run typecheck
   ```
   *Expected result*: Exit code `0`, zero errors.

3. **Backend API TypeScript Check**:
   ```powershell
   cd mobile-api; npm run typecheck; cd ..
   ```
   *Expected result*: Exit code `0`, zero errors.

4. **Secret Scan in Client Source**:
   ```powershell
   git grep -i "EVOLUTION_API_KEY" -- src/
   ```
   *Expected result*: Zero matches found.

### 5.2 Invalidation Conditions
- Any edit allowing malformed email strings (e.g. `"bad-email"`) to pass schema parsing without error.
- Any edit causing unpruned applications to exceed 2,048 bytes when persisted via `SecureStore`.
- Any introduction of hardcoded Evolution API tokens or N8N API keys into `src/`.
