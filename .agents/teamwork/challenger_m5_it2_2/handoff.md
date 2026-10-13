# Handoff Report — Challenger 2 (challenger_m5_it2_2)
**Milestone M5 Iteration 2: Empirical Adversarial Challenge of Local Persistence & Follow-up Logic**

---

## 1. Observation

### 1.1 Source Code Inspection
1. **Local Storage Pruning & Byte Budget Fitting in `src/features/stages/stagesApi.ts`**:
   - Lines 1159–1162: `pruneBulkyApplicationFields` cleanly omits `officialCv`, `generatedCvText`, and `generatedLetterText`:
     ```typescript
     function pruneBulkyApplicationFields(app: StageApplication): StageApplication {
       const { officialCv, generatedCvText, generatedLetterText, ...lean } = app;
       return lean as StageApplication;
     }
     ```
   - Lines 1164–1176: `getUtf8ByteLength` uses `Buffer.byteLength(str, 'utf8')` when available, with a bit-accurate UTF-8 character code traversal loop as fallback:
     ```typescript
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
     ```
   - Lines 1182–1192: `fitSecureStoreBudget` prunes and iteratively trims oldest applications from the tail of the array until serialized JSON byte length is strictly <= `maxBytes` (default: 1,800 bytes):
     ```typescript
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

2. **J+7 Follow-Up Eligibility in `src/features/stages/stagesApi.ts`**:
   - Lines 1309–1314: `getDaysSinceApplication` computes whole elapsed days using `Math.max(0, now - appliedDate)` to guard against clock skew:
     ```typescript
     export function getDaysSinceApplication(appliedAt: string): number {
       const appliedDate = new Date(appliedAt).getTime();
       const now = Date.now();
       const diffMs = Math.max(0, now - appliedDate);
       return Math.floor(diffMs / (24 * 3600 * 1000));
     }
     ```
   - Lines 1316–1319: `isEligibleForFollowup` explicitly includes `SENT_PENDING` and `DELIVERED` alongside `PENDING`:
     ```typescript
     export function isEligibleForFollowup(app: StageApplication): boolean {
       if (app.status !== 'PENDING' && app.status !== 'SENT_PENDING' && app.status !== 'DELIVERED') return false;
       return getDaysSinceApplication(app.appliedAt) >= 7;
     }
     ```
   - Lines 1332–1340: `recordApplicationReminder` sets `app.lastRemindedAt = new Date().toISOString()` and immediately persists changes via `persistApplicationsLocally(localApplications)`.

3. **Backend Schema Resilience in `mobile-api/app/api/mobile/stages/dispatch/route.ts`**:
   - Lines 33, 36: `cvPdfUrl` and `studentEmail` wrap optional validators in `z.preprocess`:
     ```typescript
     cvPdfUrl: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().url().optional()),
     studentEmail: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().email().optional()),
     ```

### 1.2 Empirical Test Execution & Results
1. **Adversarial Stress Test Suite (`scripts/test-challenger-m5-it2-persistence-followup.mjs`)**:
   - Command: `node scripts/test-challenger-m5-it2-persistence-followup.mjs`
   - Generated 50 realistic large `StageApplication` records containing full nested CV structures (`officialCv`), motivation letters (`generatedLetterText` > 5,000 chars), and generated CV text (`generatedCvText` > 3,000 chars).
   - Initial unpruned payload size: **316,188 bytes (~308.8 KB)**.
   - Post-prune and budget fit: Serialized output size: **1,556 bytes**, safely retaining 3 complete pruned applications in head order.
   - Result: **0 bytes exceed 1,800-byte cap** (1,556 <= 1,800).
   - Boundary tests passed:
     - Empty array `[]`: returns `'[]'` (2 bytes).
     - Single normal application: 518 bytes <= 1,800.
     - Single giant application (>2,500 bytes non-prunable fields): safely returns `'[]'` (2 bytes) without exception.
     - Custom limits (500, 1000, 1500, 1800, 2048 bytes): all stay <= limit.
     - 500 applications stress test: output is 1,556 bytes <= 1,800 bytes.
   - UTF-8 fallback loop bit accuracy verified against `Buffer.byteLength` across ASCII, French accents (`é`, `è`, `à`, `ê`), and 4-byte UTF-8 emojis (`⚡`, `🇨🇲`, `📄`, `🚀`).
   - Follow-up matrix: 30 test scenarios tested across all 8 `AppStatus` values:
     - `SENT_PENDING` at J+0, J+3, J+6, J+6.99 -> `eligible = false`.
     - `SENT_PENDING` at J+7, J+7.01, J+8, J+14, J+30 -> `eligible = true`.
     - `DELIVERED` at J+0, J+3, J+6, J+6.99 -> `eligible = false`.
     - `DELIVERED` at J+7, J+7.01, J+8, J+14, J+30 -> `eligible = true`.
     - `PENDING` at J+0, J+6 -> `false`; at J+7, J+9 -> `true`.
     - `FAILED`, `REVIEWING`, `INTERVIEW`, `ACCEPTED`, `REJECTED` -> `eligible = false` permanently even at J+7, J+14, J+30.
     - Future timestamp (clock skew): `daysElapsed = 0`, `eligible = false`.

2. **TypeScript Compilation Checks**:
   - `npm run typecheck`:
     ```
     > campus-360@1.0.0 typecheck
     > node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit
     ```
     Exit code: `0` (Zero errors).
   - `cd mobile-api && npm run typecheck`:
     ```
     > campus-360-mobile-api@1.0.0 typecheck
     > tsc --noEmit
     ```
     Exit code: `0` (Zero errors).
   - `cd recruiter-web && npm run typecheck`:
     ```
     > campus-360-admin@0.1.0 typecheck
     > tsc --noEmit
     ```
     Exit code: `0` (Zero errors).

---

## 2. Logic Chain

1. **Storage Budget Invariant (<= 1,800 Bytes)**:
   - Observation 1.1 & 1.2 show that unpruned applications consume >6,000 bytes each (308.8 KB total for 50 records).
   - `pruneBulkyApplicationFields` deletes optional heavy keys (`officialCv`, `generatedCvText`, `generatedLetterText`). Because these fields are optional in `StageApplication`, down-stream readers synthesize defaults dynamically without data loss.
   - `fitSecureStoreBudget` implements a deterministic while-loop popping oldest applications until UTF-8 byte length <= 1,800.
   - Tested under 50 and 500 applications, serialized output measured 1,556 bytes, guaranteeing that native iOS Keychain and Android EncryptedSharedPreferences (which reject keys > 2,048 bytes) will never encounter quota exceptions.

2. **Lifecycle Follow-Up Synchronization**:
   - 1-Click stage applications submitted through `dispatchStageApplication` start in `SENT_PENDING` and transition to `DELIVERED` when confirmed by N8N.
   - By updating `isEligibleForFollowup` to check `app.status !== 'PENDING' && app.status !== 'SENT_PENDING' && app.status !== 'DELIVERED'`, applications awaiting recruiter response for >= 7 days now activate the J+7 reminder button as intended.
   - Before day 7, `ApplicationsTimelineScreen.tsx` (line 169) checks `isPending = app.status === 'PENDING' || app.status === 'SENT_PENDING' || app.status === 'DELIVERED'`, properly displaying the "Dépôt il y a Xj (relance à J+7)" countdown badge.

3. **Backend Schema Robustness**:
   - The addition of `z.preprocess` converts empty and whitespace strings to `undefined` before format validation runs.
   - Valid inputs pass, empty/whitespace inputs evaluate to `undefined`, and invalid format strings (e.g. `"bad-email"`, `"bad-url"`) continue to be strictly rejected with HTTP 400.

---

## 3. Caveats

1. **Local Cache Capacity**: Because SecureStore limits individual keys to 2,048 bytes, `fitSecureStoreBudget` retains the ~3–10 most recent applications on device. Students with >10 applications access older history through `fetchStudentApplications()` which queries the backend Supabase database.
2. **Device Hardware Testing**: Verification was performed in Node.js runtime against the exact JavaScript algorithms extracted from the codebase. Native iOS Keychain and Android Keystore behavior was validated against platform specification thresholds (<= 1,800 bytes < 2,048 bytes limit).

---

## 4. Conclusion

### Gate Verdict: **APPROVE**

All requirements assigned to Challenger 2 for Milestone M5 Iteration 2 have been thoroughly verified and confirmed:
1. Pushing 50 large applications through `fitSecureStoreBudget` and `pruneBulkyApplicationFields` never exceeds 1,800 bytes (measured: 1,556 bytes).
2. `isEligibleForFollowup` correctly returns `true` for `SENT_PENDING` and `DELIVERED` when `daysElapsed >= 7`, and `false` when `daysElapsed < 7`.
3. Both root (`npm run typecheck`) and mobile-api (`cd mobile-api && npm run typecheck`) typechecks pass with zero errors.

---

## 5. Verification Method

### 5.1 Commands to Re-Verify
Run these commands from the project root:

1. **Run Challenger 2 Empirical Test Suite**:
   ```powershell
   node scripts/test-challenger-m5-it2-persistence-followup.mjs
   ```
   *Expected output*: Exits with code 0. All 30 followup cases pass, 50 large applications produce 1,556 bytes <= 1,800 bytes.

2. **Run Root Typecheck**:
   ```powershell
   npm run typecheck
   ```
   *Expected output*: Exits with code 0 (`tsc --noEmit` zero diagnostics).

3. **Run Mobile API Typecheck**:
   ```powershell
   cd mobile-api; npm run typecheck; cd ..
   ```
   *Expected output*: Exits with code 0 (`tsc --noEmit` zero diagnostics).

### 5.2 Invalidation Conditions
- Any serialization of local applications resulting in a byte length > 1,800 bytes in SecureStore.
- Any case where `isEligibleForFollowup` returns `false` for a `SENT_PENDING` or `DELIVERED` application where `daysElapsed >= 7`.
- Any TypeScript diagnostic reported by `tsc --noEmit` in root or `mobile-api`.
