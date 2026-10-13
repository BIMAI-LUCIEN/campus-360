# Handoff Report — Challenger 2 (challenger_m5_2)
**Milestone M5: Mobile 1-Click Apply Flow & Native Fallback — Adversarial Empirical Review**

---

## 1. Observation

### 1.1 Typechecks
- **Root Typecheck**:
  Command: `npm run typecheck`
  Exit Code: 0
  Tool Output:
  ```
  > campus-360@1.0.0 typecheck
  > node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit
  ```
- **Mobile API Typecheck**:
  Command: `cd mobile-api && npm run typecheck`
  Exit Code: 0
  Tool Output:
  ```
  > campus-360-mobile-api@1.0.0 typecheck
  > tsc --noEmit
  ```

### 1.2 `dispatchSchema` vs Client Payload Edge Case Defect
1. **Schema Definition in `mobile-api/app/api/mobile/stages/dispatch/route.ts`** (Lines 27–39):
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
2. **Client Implementation in `src/features/stages/stagesApi.ts`** (Lines 1082–1095):
   ```typescript
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
3. **Empirical Failure Output from `scripts/test-challenger-m5-stress.mjs`**:
   ```
   Client scenario B (profile WITHOUT email): REJECTED by Zod!
     -> Zod Rejection Details: {"studentEmail":["Invalid email address"]}
     -> Vulnerability confirmed: Client transmits studentEmail: '' which causes Zod invalid_format error!
   ```
   When `params.studentEmail` is empty or undefined, `stagesApi.ts` evaluates `params.studentEmail || ''` and sends `{"studentEmail": ""}` in the JSON body. Because `dispatchSchema` defines `studentEmail: z.string().trim().email().optional()`, Zod does not treat `""` as undefined, but rather validates `""` against `.email()`, throwing `ZodError: Invalid email address`. Consequently, `route.ts` line 80 returns HTTP 400 Bad Request, aborting the server dispatch and N8N forward.

### 1.3 `AppStatus` Exhaustiveness & Codebase Branching
- **Type Declaration in `src/types.ts`** (Lines 13–21):
  ```typescript
  export type AppStatus =
    | 'PENDING'
    | 'SENT_PENDING'
    | 'DELIVERED'
    | 'FAILED'
    | 'REVIEWING'
    | 'INTERVIEW'
    | 'ACCEPTED'
    | 'REJECTED';
  ```
- **UI Screen Mappings**:
  - `src/ui/screens/ApplicationsTimelineScreen.tsx` (Lines 46–58): `const STATUS_CONFIG: Record<AppStatus, ...>` exhaustively maps all 8 statuses with distinct labels, background colors, text colors, borders, and icons.
  - `src/features/stages/ApplicationDetailModal.tsx` (Lines 54–66): `const STATUS_CONFIG: Record<AppStatus, ...>` exhaustively maps all 8 statuses identically.
  - Both components feature a safe fallback: `STATUS_CONFIG[status] || STATUS_CONFIG.PENDING`.
- **Database & Route Enums**:
  - `mobile-api/app/api/mobile/stages/dispatch/route.ts` (Lines 43–52): `patchSchema` includes all 8 statuses.
  - `mobile-api/lib/stages-db.ts` (Lines 3–11): `StageStatus` includes all 8 statuses.
  - Proactive PostgreSQL enum update via `ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'SENT_PENDING'` (lines 713–715) with fallback to `PENDING` (line 767) if DDL permissions are absent.
- **Switch Statements**:
  A codebase-wide search across `src/` yielded 0 `switch` statements on `AppStatus`. All mappings are handled via TypeScript-checked `Record<AppStatus, ...>`.

### 1.4 Follow-up Reminders Semantic Limitation
- In `src/features/stages/stagesApi.ts` (Line 1264):
  ```typescript
  export function isEligibleForFollowup(app: StageApplication): boolean {
    if (app.status !== 'PENDING') return false;
    return getDaysSinceApplication(app.appliedAt) >= 7;
  }
  ```
  In `AiApplyModal.tsx` (Line 1058), the receipt indicates: `"Relance : Prévue à J+7 en l'absence de réponse"`. However, because 1-click applications start with `SENT_PENDING` and transition to `DELIVERED`, `isEligibleForFollowup` returns `false` unless the status is manually changed to `PENDING`.

---

## 2. Logic Chain

1. **Client-Backend Contract Discrepancy (Observation 1.2)**:
   - `stagesApi.ts` line 1091 specifies `studentEmail: params.studentEmail || ''`.
   - If a student creates an application without an email in profile (e.g. phone-only registration, offline session, or missing email field), `params.studentEmail` is `undefined` or `''`.
   - The payload sent over HTTP contains `"studentEmail": ""`.
   - On the backend, `dispatchSchema` specifies `z.string().trim().email().optional()`.
   - In Zod, `.optional()` only allows `undefined`. Passing an empty string `""` causes Zod to execute `.email()`, which fails with `Invalid email address`.
   - As observed in `route.ts` (lines 79–90), any validation failure halts execution and responds with HTTP 400.
   - Consequently, `stagesApi.ts` logs HTTP 400 and falls back to local storage, failing the backend 1-Click dispatch and N8N workflow execution for students without an email address.
   - Similarly, if `cvPdfUrl` is passed as `""`, it fails with `Invalid URL`.

2. **Exhaustiveness Assessment (Observation 1.3)**:
   - Every single status of `AppStatus` is accounted for in UI configurations and backend schemas.
   - TypeScript compiles cleanly without unhandled union members or type errors.

3. **Severity Assessment**:
   - Although the happy path (where `AppShell.tsx` injects a fallback email `'etudiant@campus360.app'`) functions, the interface contract between `stagesApi.ts` and `route.ts` is fragile and breaks whenever an optional email is omitted or empty.
   - Because this impacts 1-Click application reliability in edge cases, a change request is warranted to solidify the contract.

---

## 3. Caveats

1. In the default Expo mock environment with full profile loaded from `AppShell.tsx`, `currentProfile.email` is populated, so users with full profiles would not trigger the bug immediately.
2. External N8N webhook and Evolution API were verified via mock and offline branches; live delivery depends on external microservice availability.

---

## 4. Conclusion & Gate Verdict

### **Gate Verdict**: `REQUEST_CHANGES`

**Required Fixes**:
1. **Client-side (`src/features/stages/stagesApi.ts` line 1088 & line 1091)**:
   Change:
   ```typescript
   cvPdfUrl: params.cvPdfUrl ? params.cvPdfUrl.trim() : undefined,
   studentEmail: params.studentEmail ? params.studentEmail.trim() : undefined,
   ```
   So that empty strings are sent as `undefined` (which `JSON.stringify` omits).
2. **Backend-side (`mobile-api/app/api/mobile/stages/dispatch/route.ts` line 33 & line 36)**:
   Change `dispatchSchema` to gracefully accept empty strings:
   ```typescript
   cvPdfUrl: z.string().trim().url().optional().or(z.literal('')),
   studentEmail: z.string().trim().email().optional().or(z.literal('')),
   ```
3. *(Optional Recommendation)* In `src/features/stages/stagesApi.ts` line 1264, update `isEligibleForFollowup` to:
   ```typescript
   export function isEligibleForFollowup(app: StageApplication): boolean {
     if (app.status !== 'PENDING' && app.status !== 'SENT_PENDING' && app.status !== 'DELIVERED') return false;
     return getDaysSinceApplication(app.appliedAt) >= 7;
   }
   ```

---

## 5. Verification Method

1. Run the empirical stress test suite:
   ```powershell
   node scripts/test-challenger-m5-stress.mjs
   ```
   *Expected outcome*: Shows 24/24 stress assertions passing and exposes the exact failure on Client scenario B (`studentEmail: ""`).
2. Run root TypeScript typecheck:
   ```powershell
   npm run typecheck
   ```
   *Expected outcome*: Exits with code 0.
3. Run mobile-api TypeScript typecheck:
   ```powershell
   cd mobile-api; npm run typecheck; cd ..
   ```
   *Expected outcome*: Exits with code 0.
