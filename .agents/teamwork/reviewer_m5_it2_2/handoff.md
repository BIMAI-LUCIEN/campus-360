# Handoff Report — Reviewer 2 (reviewer_m5_it2_2)
**Milestone M5 Iteration 2: Quality & Adversarial Review of SecureStore Storage Lean Persistence and Applications Timeline UI**

---

## 1. Observation

### 1.1 Verified File Paths & Line Locations
1. **`src/features/stages/stagesApi.ts`**:
   - Lines 1159–1162: `pruneBulkyApplicationFields` extracts `{ officialCv, generatedCvText, generatedLetterText, ...lean }` and returns `lean as StageApplication`.
   - Lines 1164–1176: `getUtf8ByteLength` accurately computes UTF-8 byte length with environment detection (`Buffer.byteLength` in Node/polyfill, bit-level loop in Hermes/JSC handling 1-byte, 2-byte, 3-byte and 4-byte surrogate pair sequences).
   - Lines 1182–1192: `fitSecureStoreBudget(apps, maxBytes = 1800)` prunes bulky fields and performs FIFO/LRU eviction of oldest entries until serialized JSON byte length is strictly `<= 1800`.
   - Lines 1243–1258: `persistApplicationsLocally(apps)` persists `safePayload = fitSecureStoreBudget(apps, 1800)` via `SecureStore.setItemAsync(APPLICATIONS_STORAGE_KEY, safePayload)` on native (`Platform.OS !== 'web'`) and `localStorage` on web.
   - Lines 1316–1319: `isEligibleForFollowup(app)` accepts `'PENDING'`, `'SENT_PENDING'`, and `'DELIVERED'` statuses with condition `getDaysSinceApplication(app.appliedAt) >= 7`.
   - Lines 1332–1340: `recordApplicationReminder(applicationId)` updates `app.lastRemindedAt` and immediately triggers `persistApplicationsLocally(localApplications)`.

2. **`src/ui/screens/ApplicationsTimelineScreen.tsx`**:
   - Line 169: `const isPending = app.status === 'PENDING' || app.status === 'SENT_PENDING' || app.status === 'DELIVERED';`
   - Line 170: `const isEligibleReminder = isEligibleForFollowup(app);`
   - Lines 204–211: Urgent banner `<View style={styles.urgentBanner} testID={`urgent-banner-${app.id}`}>` renders when `isEligibleReminder` is `true`.
   - Lines 281–295: When `isEligibleReminder` is `true`, renders `<Pressable testID={`btn-relance-j7-${app.id}`} style={styles.reminderBtn} onPress={() => handleSendReminder(app)}>`.
   - When `isEligibleReminder` is `false` and `isPending` is `true` (i.e. `daysElapsed < 7`), renders `<View style={styles.waitingBadge}><Text style={styles.waitingBadgeText}>Dépôt il y a {daysElapsed}j (relance à J+7)</Text></View>`.
   - Lines 212–219: When `app.lastRemindedAt` is present, renders `<View style={styles.lastRemindedPill}>` showing the last reminder dispatch date.

3. **`mobile-api/app/api/mobile/stages/dispatch/route.ts`**:
   - Lines 33, 36: `cvPdfUrl` and `studentEmail` use `z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), ...)` to sanitize empty strings before URL/email formatting checks.

### 1.2 Independent Verification Tool Commands & Results
- `npm run typecheck` in project root: Exit code `0` (Zero TypeScript diagnostics across entire mobile app).
- `npm run typecheck` in `mobile-api`: Exit code `0` (Zero TypeScript diagnostics across backend API).
- `npm run typecheck` in `recruiter-web`: Exit code `0` (Zero TypeScript diagnostics across recruiter portal).
- `node scripts/test-challenger-m5-it2-persistence-followup.mjs`: Exit code `0` (All 30/30 status/timeline tests pass, 50-item large payload stress test capped safely to 1,556 bytes `<= 1800`).
- `node scripts/test-challenger-m5-it2-edge-cases.mjs`: Exit code `0` (All 18 schema tests pass, client serialization 7/7 pass).
- `node scripts/test-modules-11-12.mjs`: Exit code `0` (All 4 integration modules pass).

---

## 2. Logic Chain

1. **Storage Budget Capping & Native Quota Safety**:
   - Native mobile storage mechanisms (Android `EncryptedSharedPreferences` and iOS `Keychain` accessed via Expo `SecureStore`) strictly enforce a 2,048-byte quota per entry. Uncapped serialization of applications containing complete CV objects and cover letters creates payloads between 12 KB and 300+ KB, triggering unhandled exceptions.
   - By implementing `pruneBulkyApplicationFields`, optional large properties (`officialCv`, `generatedCvText`, `generatedLetterText`) are omitted, reducing memory footprint per application from >5,000 bytes to ~500–760 bytes.
   - `fitSecureStoreBudget` measures exact UTF-8 byte length (handling multi-byte characters and surrogate pairs) and iteratively evicts oldest applications if the serialized array exceeds 1,800 bytes. This provides a guaranteed safety margin of 248 bytes below the 2,048-byte native limit.
   - Missing fields are safely rehydrated on-the-fly: `getStoredApplicationsAsync` reattaches `seedJob` by `jobId`, and `ApplicationDetailModal` generates fallback CV and cover letter views when `officialCv` is omitted.

2. **Timeline Lifecycle Synchronization for 1-Click Applications**:
   - 1-Click applications initiated through WhatsApp or Email are assigned status `SENT_PENDING` (and transition to `DELIVERED`).
   - Prior to this change, only `PENDING` was considered pending or follow-up eligible, leaving 1-Click applications in an inconsistent UI state without countdowns or reminder capabilities.
   - Expanding `isPending` and `isEligibleForFollowup` to encompass `['PENDING', 'SENT_PENDING', 'DELIVERED']` establishes a coherent lifecycle:
     - For days 0 to 6 (`daysElapsed < 7`): Displays the waiting countdown pill (`Dépôt il y a Xj (relance à J+7)`).
     - At and after day 7 (`daysElapsed >= 7`): Displays the urgent warning banner (`urgent-banner-${app.id}`) and enables the primary action button (`btn-relance-j7-${app.id}`) to trigger a WhatsApp follow-up via `wa.me` deep link.
   - Invoking `persistApplicationsLocally` inside `recordApplicationReminder` guarantees that the reminder timestamp (`lastRemindedAt`) is committed immediately to storage and persists across application restarts.

3. **Integrity & Code Quality Review**:
   - No hardcoded test responses, fake mock facades, or shortcuts were found in source files.
   - Implementation logic is complete, type-safe, and backed by comprehensive adversarial stress tests.

---

## 3. Caveats

1. **Local Eviction Horizon**: Because native `SecureStore` caps storage at 1,800 bytes, a student offline will only see their 2 to 4 most recent applications cached locally. Full historical records require an active network connection to fetch from `/api/mobile/stages/applications`. This is an acceptable trade-off given native Keychain/SharedPreferences size limitations.
2. **Clock Skew Handling**: `getDaysSinceApplication` calculates `Date.now() - appliedDate`. In `stagesApi.ts`, `Math.max(0, now - appliedDate)` prevents negative elapsed days in the event of local device clock skew.

---

## 4. Conclusion

**Verdict: APPROVE**

The Iteration 2 implementation fulfills all requirements:
1. `persistApplicationsLocally` effectively prunes bulky fields and guarantees that SecureStore payloads remain strictly `< 1800` bytes on native platforms.
2. `ApplicationsTimelineScreen.tsx` properly renders countdown badges (`Dépôt il y a Xj (relance à J+7)`) and follow-up triggers (`Relance J+7 recommandée` and `💬 Relancer sur WhatsApp (J+7)`) for 1-Click applications in `SENT_PENDING` and `DELIVERED` states.
3. Both `npm run typecheck` (root) and `npm run typecheck` (`mobile-api`) execute with 0 errors.

No integrity violations were found.

---

## 5. Verification Method

To independently re-verify this assessment:
1. Run root typecheck:
   ```powershell
   npm run typecheck
   ```
   *Expected: Exit code 0, 0 errors.*
2. Run mobile-api typecheck:
   ```powershell
   cd mobile-api; npm run typecheck; cd ..
   ```
   *Expected: Exit code 0, 0 errors.*
3. Run persistence and follow-up adversarial stress test:
   ```powershell
   node scripts/test-challenger-m5-it2-persistence-followup.mjs
   ```
   *Expected: All 30/30 status checks pass, payload <= 1800 bytes.*
4. Invalidation conditions:
   - Any scenario where `SecureStore.setItemAsync` receives a payload `>= 1800` bytes.
   - Any regression where `SENT_PENDING` or `DELIVERED` applications fail to show countdown badges before day 7 or follow-up triggers after day 7.
