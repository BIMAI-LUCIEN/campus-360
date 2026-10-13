# Handoff Report — Explorer 3 (explorer_m5_it2_3)
**Milestone M5 Iteration 2: Follow-up Eligibility & J+7 Reminders Investigation**

---

## 1. Observation

### 1.1 Status Definition & Lifecycle in 1-Click Apply
1. **Application Statuses declared in `src/types.ts` (lines 13–22)**:
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

2. **1-Click Dispatch creates status `SENT_PENDING` (`src/features/stages/stagesApi.ts` lines 1067–1068, 1107, 1126–1132)**:
   ```typescript
   let status: AppStatus = 'SENT_PENDING';
   ...
   if (payload?.applicationId) {
     status = payload.status || 'SENT_PENDING';
   }
   ...
   const newApplication: StageApplication = {
     id: appId,
     studentId: 'student-current',
     jobId: params.jobId,
     status,
     appliedAt: new Date().toISOString(),
     ...
   };
   ```

3. **Backend API records initial status `SENT_PENDING` (`mobile-api/app/api/mobile/stages/dispatch/route.ts` lines 135–144)**:
   ```typescript
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

4. **N8N callback updates status to `DELIVERED` (`mobile-api/app/api/mobile/stages/dispatch/route.ts` lines 238–264)**:
   ```typescript
   export async function PATCH(request: NextRequest) {
     ...
     const updated = await updateApplicationDispatchStatus(
       parsed.data.applicationId,
       parsed.data.status, // 'DELIVERED'
     );
   ```

5. **Receipt UI in `src/features/stages/AiApplyModal.tsx` promises J+7 follow-up (lines 1047–1059)**:
   ```typescript
   <View style={styles.receiptRow}>
     <Text style={styles.receiptLabel}>Statut :</Text>
     <View style={styles.receiptStatusBadge}>
       <Text style={styles.receiptStatusBadgeText}>
         {dispatchReceipt?.status === 'DELIVERED'
           ? 'Délivrée'
           : "En cours d'acheminement · SENT_PENDING"}
       </Text>
     </View>
   </View>
   <View style={styles.receiptRow}>
     <Text style={styles.receiptLabel}>Relance :</Text>
     <Text style={styles.receiptValueMuted}>Prévue à J+7 en l'absence de réponse</Text>
   </View>
   ```

### 1.2 `isEligibleForFollowup` in `src/features/stages/stagesApi.ts` (lines 1263–1266)
```typescript
export function isEligibleForFollowup(app: StageApplication): boolean {
  if (app.status !== 'PENDING') return false;
  return getDaysSinceApplication(app.appliedAt) >= 7;
}
```
Direct observation:
- If `app.status === 'SENT_PENDING'`, `app.status !== 'PENDING'` is `true`, so it returns `false`.
- If `app.status === 'DELIVERED'`, `app.status !== 'PENDING'` is `true`, so it returns `false`.
- Consequently, for any 1-click application (whether freshly dispatched in `SENT_PENDING` or confirmed delivered in `DELIVERED`), `isEligibleForFollowup` evaluates to `false` even after 7, 10, or 30 days!

### 1.3 `ApplicationsTimelineScreen.tsx` (lines 168–171, 203–219, 281–296)
1. **Eligibility & Pending Flags (lines 168–170)**:
   ```typescript
   const daysElapsed = getDaysSinceApplication(app.appliedAt);
   const isPending = app.status === 'PENDING';
   const isEligibleReminder = isEligibleForFollowup(app);
   ```
2. **Urgent J+7 Banner (lines 204–211)**:
   ```typescript
   {isEligibleReminder && (
     <View style={styles.urgentBanner} testID={`urgent-banner-${app.id}`}>
       <Clock size={12} color="#F59E0B" />
       <Text style={styles.urgentBannerText}>
         Relance J+7 recommandée ({daysElapsed}j sans réponse)
       </Text>
     </View>
   )}
   ```
3. **Card Footer Action & Countdown Badge (lines 281–296)**:
   ```typescript
   {isEligibleReminder ? (
     <Pressable
       testID={`btn-relance-j7-${app.id}`}
       style={styles.reminderBtn}
       onPress={() => handleSendReminder(app)}
     >
       <MessageSquare size={13} color="#FFFFFF" />
       <Text style={styles.reminderBtnText}>💬 Relancer sur WhatsApp (J+7)</Text>
     </Pressable>
   ) : isPending ? (
     <View style={styles.waitingBadge}>
       <Clock size={11} color="#94A3B8" />
       <Text style={styles.waitingBadgeText}>Dépôt il y a {daysElapsed}j (relance à J+7)</Text>
     </View>
   ) : null}
   ```
Direct observation:
- When `daysElapsed >= 7` for 1-click apps (`SENT_PENDING` or `DELIVERED`):
  `isEligibleReminder` is `false` (due to `stagesApi.ts:1264`).
  `urgent-banner-${app.id}` is NEVER rendered.
  `btn-relance-j7-${app.id}` is NEVER rendered.
- When `daysElapsed < 7` for 1-click apps (`SENT_PENDING` or `DELIVERED`):
  `isEligibleReminder` is `false`.
  `isPending` is `false` (because `app.status === 'PENDING'` is false).
  The ternary evaluates to `null`.
  The waiting badge `Dépôt il y a {daysElapsed}j (relance à J+7)` is completely hidden, leaving an empty spot next to "Modifier le statut".

### 1.4 `ApplicationDetailModal.tsx` (lines 105, 398–416)
```typescript
const eligibleReminder = isEligibleForFollowup(application);
...
{eligibleReminder && (
  <View style={styles.urgentBanner}>
    <Clock size={14} color="#F59E0B" />
    <View style={{ flex: 1 }}>
      <Text style={styles.urgentBannerTitle}>
        Relance J+7 recommandée ({daysElapsed} jours sans réponse)
      </Text>
      <Text style={styles.urgentBannerSub}>
        Confirmez votre motivation par un message courtois direct sur WhatsApp.
      </Text>
    </View>
    <Pressable
      style={styles.urgentRelanceBtn}
      onPress={handleSendReminderWhatsapp}
    >
      <Text style={styles.urgentRelanceBtnText}>Relancer</Text>
    </Pressable>
  </View>
)}
```
Direct observation:
- In the full detail modal (Tab 3: "Suivi & Contact"), the urgent banner and "Relancer" button are also gated directly by `isEligibleForFollowup(application)`.

### 1.5 Persistence Omission in `recordApplicationReminder` (`src/features/stages/stagesApi.ts` lines 1279–1286)
```typescript
export async function recordApplicationReminder(applicationId: string): Promise<boolean> {
  const app = localApplications.find((a) => a.id === applicationId);
  if (app) {
    app.lastRemindedAt = new Date().toISOString();
    return true;
  }
  return false;
}
```
Direct observation:
- `updateApplicationStatus` (line 1244) and `updateApplicationNotes` (line 1252) explicitly call `persistApplicationsLocally(localApplications)`.
- `recordApplicationReminder` updates `app.lastRemindedAt` in memory, but NEVER calls `persistApplicationsLocally(localApplications)`.
- On page refresh or app reload, `fetchStudentApplications()` (lines 1220–1226) restores `stored` applications from `getStoredApplicationsAsync()`, discarding the in-memory `lastRemindedAt`.

---

## 2. Logic Chain

1. **Origin of the `PENDING`-only check**:
   - `contexte.md` line 375 and `scripts/test-modules-11-12.mjs` confirm that Module 12 ("Suivi des candidatures & Relance J+7") was created on 2026-09-29 when all applications were submitted manually via `submitStageApplication` and had status `PENDING`.
   - Milestone M5 introduced 1-Click background dispatch with Evolution API and N8N SMTP, which creates applications with status `SENT_PENDING` (dispatched / in-transit / offline fallback) and `DELIVERED` (received by recruiter).
   - `isEligibleForFollowup` was not updated to reflect these two new lifecycle statuses.

2. **Semantic Meaning of `SENT_PENDING` and `DELIVERED` vs Other Statuses**:
   - `DELIVERED`: The recruiter has received the student's CV and pitch on WhatsApp or Email. If 7 days elapse without an answer, this is the prime candidate for a polite J+7 reminder as promised in `AiApplyModal.tsx` ("Prévue à J+7 en l'absence de réponse").
   - `SENT_PENDING`: Dispatched in background. If an application remains in `SENT_PENDING` after 7 days (e.g., student in offline mode, local mock environment, or N8N callback was not received), 7 days have still elapsed since application. The student must have the ability to contact the recruiter directly via WhatsApp to unblock their application.
   - `PENDING`: Standard manual application awaiting response.
   - `FAILED`: Dispatch failed; cannot follow up on an undelivered message (student needs retry/fix).
   - `INTERVIEW`, `ACCEPTED`, `REJECTED`: Decision reached or in active interview; J+7 initial reminder is inapplicable.

3. **Impact on `ApplicationsTimelineScreen.tsx`**:
   - When `isEligibleForFollowup` is updated to include `PENDING`, `SENT_PENDING`, and `DELIVERED`:
     - The urgent reminder banner (`testID="urgent-banner-${app.id}"`) and the WhatsApp reminder button (`testID="btn-relance-j7-${app.id}"`) will render whenever `daysElapsed >= 7`.
   - In addition, updating line 169 in `ApplicationsTimelineScreen.tsx`:
     ```typescript
     const isAwaitingResponse =
       app.status === 'PENDING' ||
       app.status === 'SENT_PENDING' ||
       app.status === 'DELIVERED';
     ```
     ensures that while `daysElapsed < 7`, the countdown badge `Dépôt il y a {daysElapsed}j (relance à J+7)` renders for 1-click applications instead of rendering `null`.

4. **Impact on `recordApplicationReminder`**:
   - Adding `persistApplicationsLocally(localApplications)` inside `recordApplicationReminder` guarantees that `app.lastRemindedAt` is persisted to `localStorage` / `SecureStore`, so the UI pill `Dernière relance envoyée le ...` remains visible after navigation or reload.

---

## 3. Caveats

1. **Recruiter Web Portal Metrics**: In `recruiter-web/lib/admin-platform-service.ts` line 705, `isEligible` is calculated as `row.status === 'PENDING' && diffDays >= 7 && !row.last_reminded_at`. If the admin metrics query is not also updated in a future iteration, 1-click applications will not increment the admin `relanceJ7` counter. This does not impact mobile student functionality.
2. **Frequency of Reminders**: `isEligibleForFollowup` does not currently check whether `app.lastRemindedAt` was set within the last 24 hours. The UI currently displays both the urgent banner and the "Dernière relance envoyée le [date]" pill. This matches the current product design in `ApplicationsTimelineScreen.tsx`.

---

## 4. Conclusion

### Required Code Modifications

#### 1. In `src/features/stages/stagesApi.ts` (lines 1263–1266)
**Change `isEligibleForFollowup`**:
```typescript
// BEFORE:
export function isEligibleForFollowup(app: StageApplication): boolean {
  if (app.status !== 'PENDING') return false;
  return getDaysSinceApplication(app.appliedAt) >= 7;
}

// AFTER:
export function isEligibleForFollowup(app: StageApplication): boolean {
  if (
    app.status !== 'PENDING' &&
    app.status !== 'SENT_PENDING' &&
    app.status !== 'DELIVERED'
  ) {
    return false;
  }
  return getDaysSinceApplication(app.appliedAt) >= 7;
}
```

#### 2. In `src/features/stages/stagesApi.ts` (lines 1279–1286)
**Persist reminder timestamp in `recordApplicationReminder`**:
```typescript
// BEFORE:
export async function recordApplicationReminder(applicationId: string): Promise<boolean> {
  const app = localApplications.find((a) => a.id === applicationId);
  if (app) {
    app.lastRemindedAt = new Date().toISOString();
    return true;
  }
  return false;
}

// AFTER:
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

#### 3. In `src/ui/screens/ApplicationsTimelineScreen.tsx` (lines 169 & 290)
**Update pending countdown flag**:
```typescript
// BEFORE (line 169):
const isPending = app.status === 'PENDING';
...
// Line 290:
) : isPending ? (
  <View style={styles.waitingBadge}>
    <Clock size={11} color="#94A3B8" />
    <Text style={styles.waitingBadgeText}>Dépôt il y a {daysElapsed}j (relance à J+7)</Text>
  </View>
) : null}

// AFTER (line 169):
const isAwaitingResponse =
  app.status === 'PENDING' ||
  app.status === 'SENT_PENDING' ||
  app.status === 'DELIVERED';
...
// Line 290:
) : isAwaitingResponse ? (
  <View style={styles.waitingBadge}>
    <Clock size={11} color="#94A3B8" />
    <Text style={styles.waitingBadgeText}>Dépôt il y a {daysElapsed}j (relance à J+7)</Text>
  </View>
) : null}
```

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Root Typecheck**:
   ```powershell
   npm run typecheck
   ```
   *Expected outcome*: Exits with code 0 (`tsc --noEmit` passes with 0 errors).

2. **Mobile API Typecheck**:
   ```powershell
   cd mobile-api; npm run typecheck; cd ..
   ```
   *Expected outcome*: Exits with code 0.

3. **Follow-up Eligibility Unit Test**:
   Execute the following inline script to verify eligibility for all 8 statuses across days 1 to 10:
   ```powershell
   node -e "
   const statuses = ['PENDING', 'SENT_PENDING', 'DELIVERED', 'FAILED', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];
   function isEligible(status, days) {
     if (status !== 'PENDING' && status !== 'SENT_PENDING' && status !== 'DELIVERED') return false;
     return days >= 7;
   }
   statuses.forEach(s => {
     const day2 = isEligible(s, 2);
     const day8 = isEligible(s, 8);
     console.log(s + ': day 2=' + day2 + ', day 8=' + day8);
   });
   "
   ```
   *Expected outcome*:
   - `PENDING`: day 2=false, day 8=true
   - `SENT_PENDING`: day 2=false, day 8=true
   - `DELIVERED`: day 2=false, day 8=true
   - `FAILED`: day 2=false, day 8=false
   - `REVIEWING`: day 2=false, day 8=false
   - `INTERVIEW`: day 2=false, day 8=false
   - `ACCEPTED`: day 2=false, day 8=false
   - `REJECTED`: day 2=false, day 8=false

4. **Integration with `scripts/test-modules-11-12.mjs`**:
   ```powershell
   node scripts/test-modules-11-12.mjs
   ```
   *Expected outcome*: Exits with code 0.

### 5.2 Invalidation Conditions
- If `isEligibleForFollowup` still rejects `SENT_PENDING` or `DELIVERED` when `daysElapsed >= 7`.
- If `isPending` in `ApplicationsTimelineScreen.tsx` is left as `app.status === 'PENDING'`, hiding the countdown badge for 1-click applications prior to day 7.
- If `recordApplicationReminder` fails to call `persistApplicationsLocally`.
