# Technical Investigation & Handoff Report — Explorer 3
## Milestone M5: WhatsApp Session Management, Profile Integration & Native Fallback

**Working Directory:** `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m5_3`  
**Target Milestone:** M5 (Mobile 1-Click Apply Flow & Fallback)  
**Author:** Explorer 3 (Session & Fallback Explorer)  

---

## 1. Observation

### O1. WhatsApp Client Service (`src/features/whatsapp/whatsappService.ts`)
- **Storage key & persistence mechanism (lines 23–30, 108–170):**
  - Storage key: `STORAGE_KEY = 'campus360_whatsapp_status'`.
  - Native (iOS/Android): uses `expo-secure-store` (`SecureStore.getItemAsync`, `SecureStore.setItemAsync`, `SecureStore.deleteItemAsync`).
  - Web: uses `localStorage` (`getItem`, `setItem`, `removeItem`).
  - Schema (`StoredWhatsAppStatus`):
    ```ts
    export interface StoredWhatsAppStatus {
      phone: string;
      connected: boolean;
      instanceName?: string;
      linkedAt?: string | null;
    }
    ```
- **Phone number cleaning & pairing code formatting (lines 35–54):**
  - `cleanPhoneNumber(rawPhone)` strips non-digits and automatically prepends Cameroon country code `237` if a 9-digit number starting with `6` is passed (e.g., `690123456` -> `237690123456`).
  - `formatPairingCode(code)` formats 8-character codes into `"XXXX - YYYY"` pattern.
  - `generateDeterministicPairingCode(phone)` provides an 8-digit deterministic hash fallback for offline resilience.
- **Session query function (lines 248–299):**
  - `checkConnectionStatus(phone: string): Promise<ConnectionStatusResponse>`
  - Dispatches `GET /api/mobile/whatsapp/instance?phone=${encodeURIComponent(cleanPhone)}` via `authFetchRaw`.
  - If `data.connected || data.isConnected || data.state === 'open'`, automatically updates local cache via `saveWhatsAppStatus(cleanPhone, true, { instanceName: data.instanceName })`.
  - Offline fallback: if network is unreachable, reads `getStoredWhatsAppStatus()`. If stored phone matches and was connected, returns `connected: true, state: 'open', offline: true`.

### O2. WhatsApp Pairing Modal (`src/features/whatsapp/WhatsAppPairingModal.tsx`)
- **Component Props & State Machine (lines 39–56):**
  ```ts
  export interface WhatsAppPairingModalProps {
    visible: boolean;
    onClose: () => void;
    initialPhone?: string;
    onPairingSuccess?: (phone: string) => void;
    onStatusChange?: (connected: boolean) => void;
  }
  type PairingStep = 'idle' | 'requesting' | 'pairing' | 'connected' | 'error';
  ```
- **Lifecycle & Polling (lines 75–135):**
  - On mount/open: hydrates `phone` and `linkedAt` from `getStoredWhatsAppStatus()`. If already connected, sets step to `'connected'`.
  - On requesting code (`handleRequestCode`): calls `requestPairingCode(cleanPhone)`.
  - When step enters `'pairing'`: triggers `startPolling(clean)` running `setInterval` every **3500ms** calling `verifyConnection(phoneToPoll)`.
  - When connection state becomes `connected`: stops polling interval, sets step to `'connected'`, fires `onStatusChange?.(true)` and `onPairingSuccess?.(phoneToCheck)`.
- **UI Elements & Actions:**
  - 1-tap code copy with clipboard helper (`handleCopyCode`, lines 166–177).
  - Manual verification refresh button (`handleManualCheck`, lines 180–190).
  - Disconnect action (`handleDisconnect`, lines 193–201) calling `clearWhatsAppStatus()`.
  - Connected badge: `testID="badge-whatsapp-connected"` displaying `✅ WhatsApp connecté`.

### O3. Profile Screen Integration (`src/ui/screens/ProfileScreen.tsx`)
- **State & Storage Synchronization (lines 148–162):**
  - Tracks `isWhatsAppModalOpen: boolean` and `isWhatsAppConnected: boolean`.
  - Hydrates `isWhatsAppConnected` on mount and whenever `studentProfile` changes via `getStoredWhatsAppStatus()`.
- **Menu Row & Visual Badge (lines 198–226):**
  - Item in `settingsRows` under "PARAMÈTRES & SÉCURITÉ":
    - `testID="menu-whatsapp-settings"`
    - Label: `"Liaison WhatsApp (Candidatures automatiques)"`
    - Badge: shows `✅ WhatsApp connecté` (emerald) if connected, or `Non associé` if disconnected.
    - `onPress: () => setIsWhatsAppModalOpen(true)`
- **Modal Rendering (lines 392–398):**
  ```tsx
  <WhatsAppPairingModal
    visible={isWhatsAppModalOpen}
    onClose={() => setIsWhatsAppModalOpen(false)}
    initialPhone={studentProfile?.whatsappPhone || studentProfile?.phone || ''}
    onStatusChange={(connected) => setIsWhatsAppConnected(connected)}
  />
  ```

### O4. Student Profile & Phone Retrieval Architecture
- **In `src/features/auth/betterAuth.ts`:**
  - `authStorage` uses `SecureStore` (native) and `localStorage` (web).
  - Keys: `'campus-bordes_user'` stores serialized JSON `user` containing `phone` and `whatsappPhone`.
  - `loadStudentSession()` restores the active session from Better Auth server or from `'campus-bordes_user'`.
  - Offline default (`getOfflineStudentAccount`): returns `{ phone: '+237 672 36 41 24', whatsappPhone: '+237 672 36 41 24', ... }`.
- **In `src/AppShell.tsx`:**
  - `const [studentProfile, setStudentProfile] = React.useState<StudentProfile | null>(null);` (line 389).
  - Hydrated on app start in `restoreSession()` (lines 501–516) and synchronized via `syncStudentAccount()` calling `getStudentAccount()` (lines 640–677).
  - Profile propagation: passed to `ProfileScreen`, `HomeScreen`, `DashboardScreen`, and `StagesScreen`.
- **In `src/features/stages/StudentProfileExpressModal.tsx`:**
  - Field `phoneWhatsapp` captures/updates the student's WhatsApp number.

### O5. Current State of `src/features/stages/AiApplyModal.tsx`
- **Current Modal Architecture (lines 398–758):**
  - Implements a `<Modal visible={visible} animationType="slide" transparent ...>` that renders inside a fragment `<> ... </>` alongside sibling modals `<StudentProfileExpressModal>` and `<PaymentModal>`.
  - Channel buttons currently present in `actionsBox` (lines 653–684):
    - `In-App`: calls `handleInAppApply` which calls `submitStageApplication` (currently targeting `/api/mobile/stages/apply`).
    - `WhatsApp RH`: calls `handleOpenWhatsapp` which opens `result.whatsappUrl` (`https://wa.me/...`).
    - `Email RH`: calls `handleOpenEmail` (`mailto:...`).
- **Deficiencies against R5:**
  - Does NOT check whether the student's WhatsApp is linked (`getStoredWhatsAppStatus` / `checkConnectionStatus`).
  - Does NOT offer in-flow 30s pairing (`WhatsAppPairingModal`).
  - Does NOT invoke background dispatch (`/api/mobile/stages/dispatch`).
  - Does NOT distinguish between automatic 1-click dispatch and manual fallback.

### O6. Baseline Quality Assurance
- Commande `npm run typecheck` à la racine : code de retour `0`.
- Commande `cd mobile-api && npm run typecheck` : code de retour `0`.

---

## 2. Logic Chain

### L1. Student Phone Number Resolution Chain
1. When checking or initiating WhatsApp pairing or dispatch, the student's phone number can come from multiple sources.
2. In order of specificity and user intent:
   1. `(await getStoredWhatsAppStatus()).phone`: Phone number explicitly verified or linked during WhatsApp pairing.
   2. `studentProfile.phoneWhatsapp`: Phone number saved in the student profile or express onboarding.
   3. `studentProfile.phone`: General phone number saved in the user session.
   4. Fallback user input prompt in `WhatsAppPairingModal`.
3. In all cases, numbers must be passed through `cleanPhoneNumber(phone)` to ensure standard international format without spaces, leading zeros, or missing country code (default `237` for 9-digit Cameroonian mobile numbers starting with `6`).

### L2. WhatsApp Instance Connection Querying Chain
1. To verify whether a student can postuler en 1-clic sans ouvrir d'application externe, the frontend must check the session connection state.
2. `whatsappService.ts` implements `checkConnectionStatus(phone: string)`:
   - Queries `GET /api/mobile/whatsapp/instance?phone=${cleanPhone}`.
   - The backend proxy (`mobile-api/app/api/mobile/whatsapp/instance/route.ts`) resolves instance name `student-${cleanPhone}` and calls `getConnectionState(instanceName)` against Evolution API v2 (`GET /instance/connectionState/:instance`).
   - If state is `'open'`, backend returns `{ success: true, instanceName, state: 'open', connected: true }`.
   - `checkConnectionStatus` receives this, automatically calls `saveWhatsAppStatus(cleanPhone, true, { instanceName })`, and resolves `{ connected: true, state: 'open' }`.
3. For local responsiveness without unnecessary network roundtrips on every render, `getStoredWhatsAppStatus()` returns `{ connected: boolean, phone: string, instanceName?: string }` directly from `SecureStore` (native) or `localStorage` (web).
4. Recommendation: Export aliases `checkSessionStatus` and `getInstanceStatus` in `whatsappService.ts` mapping to `checkConnectionStatus` to maintain compatibility with varying naming conventions across modules.

### L3. In-Flow 30s Pairing Integration Chain in `AiApplyModal.tsx`
1. To implement Requirement R5 ("If WhatsApp not linked: Offer 30s pairing or fallback button"), `AiApplyModal.tsx` must be able to launch `WhatsAppPairingModal` seamlessly without losing application draft state.
2. Because `AiApplyModal` is structured with sibling modals (`StudentProfileExpressModal`, `PaymentModal`) inside a React fragment `<> ... </>`, `WhatsAppPairingModal` can be mounted as an additional sibling modal:
   ```tsx
   <WhatsAppPairingModal
     visible={showPairingModal}
     initialPhone={currentProfile.phoneWhatsapp || ''}
     onClose={() => setShowPairingModal(false)}
     onStatusChange={(connected) => {
       setIsWhatsAppConnected(connected);
       if (connected) setShowPairingModal(false);
     }}
     onPairingSuccess={(linkedPhone) => {
       setIsWhatsAppConnected(true);
       setShowPairingModal(false);
       setCurrentProfile((prev) => ({
         ...prev,
         phoneWhatsapp: linkedPhone || prev.phoneWhatsapp,
       }));
     }}
   />
   ```
3. When `isWhatsAppConnected === false`:
   - In `step === 'preview'`, the action box highlights:
     - Button `[ ⚡ Associer mon WhatsApp (30s) ]` -> triggers `setShowPairingModal(true)`.
     - Button `[ 💬 Ouvrir WhatsApp Manuellement ]` -> triggers native deep-link fallback.
     - Button `[ ✉️ Expédier ma Candidature par Email ]` -> email dispatch.
4. When `isWhatsAppConnected === true`:
   - The action box highlights:
     - Primary Action: `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]` -> triggers background dispatch calling `/api/mobile/stages/dispatch` with `channel: 'whatsapp'`, without opening external apps.
     - Button `[ ✉️ Expédier ma Candidature par Email ]`.
     - Fallback: `[ 💬 Ouvrir WhatsApp Manuellement ]`.

### L4. Native WhatsApp Deep-Link Fallback Chain
1. For manual dispatch when the student chooses not to pair or when Evolution API is unreachable, a native deep-link must be executed.
2. The recipient phone is the recruiter's contact: `job.company?.contactWhatsapp`.
3. The message is the pre-composed pitch: `buildWhatsAppPitch(...)` or `result.whatsappUrl`.
4. Protocol hierarchy:
   1. Native mobile scheme: `whatsapp://send?phone=${cleanTarget}&text=${encodedText}`
      - Direct app launch on Android and iOS without browser redirection.
      - Tested via `Linking.canOpenURL(nativeUrl)`.
   2. Universal web URL: `https://wa.me/${cleanTarget}?text=${encodedText}`
      - Safe fallback if `canOpenURL` is false, or on web desktop.
5. In all manual dispatch actions:
   - The application must also be recorded locally via `submitStageApplication` or `persistApplication()` so that the student's timeline immediately tracks the application as `PENDING` with 7-day follow-up reminder.

---

## 3. Caveats

1. **Evolution API Instance Name Convention:** The backend proxy enforces `student-<phone>` naming (e.g., `student-237672364124`). Any client-side request must pass numbers stripped of `+`, spaces, and dashes to prevent instance name mismatches.
2. **Deep-Link URL Encoding:** In `whatsapp://send?text=...`, special characters (such as accents, emojis, and newlines) must be properly encoded using `encodeURIComponent` to avoid link truncation on older Android devices.
3. **Modal Stacking on iOS:** React Native iOS can warn if two native modals with `transparent: false` attempt to present at the same time. Since `AiApplyModal` and `WhatsAppPairingModal` both use `transparent={true}`, they render cleanly as overlay sheets. Closing `WhatsAppPairingModal` upon pairing success cleanly returns the user to the active `AiApplyModal` draft.

---

## 4. Conclusion

All components and contracts required for Milestone M5 are verified and ready for implementation:
1. **Session Management:** `whatsappService.ts` provides robust, cross-platform (`SecureStore`/`localStorage`) methods `getStoredWhatsAppStatus()`, `checkConnectionStatus()`, `requestPairingCode()`, and `saveWhatsAppStatus()`.
2. **Profile Integration:** The student's phone number is retrieved seamlessly from `studentProfile.phoneWhatsapp`, `studentProfile.phone`, or `getStoredWhatsAppStatus().phone`.
3. **Modal Integration:** `AiApplyModal.tsx` can embed `WhatsAppPairingModal` as a sibling modal in its render tree to offer 30s in-flow pairing.
4. **Primary Action:** When connected, `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]` calls the backend dispatch endpoint (`POST /api/mobile/stages/dispatch`).
5. **Fallback Action:** `[ 💬 Ouvrir WhatsApp Manuellement ]` uses `whatsapp://send?phone=...&text=...` with universal fallback `https://wa.me/...`.

---

## 5. Verification Method

To independently verify the architecture and readiness:
1. **Type Safety Check:**
   ```bash
   npm run typecheck
   cd mobile-api && npm run typecheck
   ```
   Both commands must exit with code 0.
2. **Code Inspection:**
   - Inspect `src/features/whatsapp/whatsappService.ts` lines 108–170 (`getStoredWhatsAppStatus`, `saveWhatsAppStatus`) and 248–299 (`checkConnectionStatus`).
   - Inspect `src/features/whatsapp/WhatsAppPairingModal.tsx` lines 39–56 (props) and 107–135 (polling logic).
   - Inspect `src/ui/screens/ProfileScreen.tsx` lines 198–226 (menu item) and 392–398 (modal wiring).
   - Inspect `mobile-api/app/api/mobile/stages/dispatch/route.ts` lines 27–39 (schema) and 65–184 (dispatch handler).
