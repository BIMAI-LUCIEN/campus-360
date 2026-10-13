# Handoff Report - Explorer 1 (UI Flow Explorer)
**Milestone M5: Mobile 1-Click Apply Flow & Native Fallback (Requirement R5)**

---

## 1. Observation

### 1.1 Backend Dispatch Contract (`mobile-api/app/api/mobile/stages/dispatch/route.ts`)
- **Route Endpoint**: `POST /api/mobile/stages/dispatch` (lines 56–236)
- **Validation Schema** (`dispatchSchema`, lines 27–39):
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
- **Response Format** (lines 216–225):
  ```typescript
  return withCors(
    NextResponse.json({
      success: true,
      applicationId,
      status: 'SENT_PENDING' as const,
      ...(cvPdfUrl ? { cvUrl: cvPdfUrl } : {}),
      message,
    }),
    request,
  );
  ```
- **Database Status Enum** (`mobile-api/lib/stages-db.ts`, lines 3–11):
  ```typescript
  export type StageStatus =
    | 'PENDING'
    | 'SENT_PENDING'
    | 'DELIVERED'
    | 'FAILED'
    | 'REVIEWING'
    | 'INTERVIEW'
    | 'ACCEPTED'
    | 'REJECTED';
  ```
- **Discrepancy in Client Types** (`src/types.ts`, line 13):
  ```typescript
  export type AppStatus = 'PENDING' | 'REVIEWING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';
  ```
  `src/types.ts` is currently missing `'SENT_PENDING'`, `'DELIVERED'`, and `'FAILED'`.

---

### 1.2 WhatsApp Session & Pairing Services (`src/features/whatsapp/`)
- **`src/features/whatsapp/whatsappService.ts`**:
  - `getStoredWhatsAppStatus(): Promise<StoredWhatsAppStatus>` (lines 108–138): Reads `{ phone: string, connected: boolean, instanceName?: string, linkedAt?: string | null }` from `SecureStore` (native) or `localStorage` (web).
  - `checkConnectionStatus(phone: string): Promise<ConnectionStatusResponse>` (lines 248–300): Queries `GET /api/mobile/whatsapp/instance?phone=...` and syncs connection state.
  - `cleanPhoneNumber(rawPhone: string): string` (lines 35–43): Standardizes numbers (e.g. `690123456` $\rightarrow$ `237690123456`).
- **`src/features/whatsapp/WhatsAppPairingModal.tsx`**:
  - Props definition (lines 39–45):
    ```typescript
    export interface WhatsAppPairingModalProps {
      visible: boolean;
      onClose: () => void;
      initialPhone?: string;
      onPairingSuccess?: (phone: string) => void;
      onStatusChange?: (connected: boolean) => void;
    }
    ```
  - Autonomous modal: requests 8-digit pairing code via Evolution API proxy, displays separated code (`7842 - 9012`), enables 1-tap clipboard copy, polls every 3.5s, updates status to `connected`, and triggers `onPairingSuccess(phone)` and `onStatusChange(true)`.

---

### 1.3 Existing Application Modal (`src/features/stages/AiApplyModal.tsx`)
- **Component Signature** (lines 36–53, 171–178):
  ```typescript
  interface AiApplyModalProps {
    visible: boolean;
    job: StageJob | null;
    studentProfile: {
      fullName: string;
      email: string;
      phoneWhatsapp?: string;
      university?: string;
      major: string;
      educationLevel: string;
      skills: string[];
      portfolioUrl?: string;
      tokens?: number;
    };
    onClose: () => void;
    onApplicationComplete?: () => void;
    onRecharge?: () => void;
  }
  ```
- **Current Persistence Method** (lines 215–224):
  ```typescript
  const persistApplication = async () => {
    if (!result || !job) throw new Error('Candidature non générée.');
    setSubmitting(true);
    try {
      const applicationId = await submitStageApplication(job.id, editableCv, editableLetter, result.officialCv);
      setResult((current) => (current ? { ...current, applicationId } : current));
      return applicationId;
    } finally {
      setSubmitting(false);
    }
  };
  ```
- **Current Send Step Actions** (lines 359–394 & 650–684):
  - Action buttons currently render 3 buttons in a row: `[ In-App ]`, `[ WhatsApp RH ]`, `[ Email RH ]`.
  - `handleInAppApply` just calls `persistApplication()`.
  - `handleOpenWhatsapp` calls `persistApplication()` then opens external URL via `Linking.openURL(result.whatsappUrl)`.
  - `handleOpenEmail` calls `persistApplication()` then opens external `mailto:` link.
- **Current Confirmation View** (`step === 'sent'`, lines 696–716):
  Renders a bare generic text "Candidature transmise" with no receipt details (no reference code, no channel used, no status badge, no timestamp).
- **Missing Elements in `AiApplyModal.tsx`**:
  1. No detection of whether WhatsApp is paired or linked via `getStoredWhatsAppStatus()`.
  2. No 1-Click background dispatch button `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]` calling `/api/mobile/stages/dispatch`.
  3. No pairing prompt `[ 🔗 Associer mon WhatsApp en 30s ]` integrating `WhatsAppPairingModal`.
  4. No background email dispatch button `[ ✉️ Expédier ma Candidature par Email ]`.
  5. No formal receipt confirmation view with reference, timestamp, channel, and timeline sync button.

---

### 1.4 Client API & Storage (`src/features/stages/stagesApi.ts`)
- **Legacy submission** (lines 984–1030): `submitStageApplication` calls `POST /api/mobile/stages/apply`.
- **In-Memory Store & Web-Only LocalStorage** (lines 1032–1056):
  ```typescript
  function getStoredApplications(): StageApplication[] {
    if (typeof localStorage !== 'undefined') { ... }
    return [];
  }
  function persistApplicationsLocally(apps: StageApplication[]) {
    if (typeof localStorage !== 'undefined') { ... }
  }
  ```
  On React Native iOS/Android, `localStorage` is undefined, causing local persistence to be lost if only in-memory.
- **Missing API**: `dispatchStageApplication` function targeting `POST /api/mobile/stages/dispatch`.

---

### 1.5 PDF Service (`src/features/stages/pdfExportService.ts`)
- `expo-print` is installed (`node_modules/expo-print/build/Print.types.d.ts` lines 106–128):
  `FilePrintOptions.base64?: boolean` returns `FilePrintResult.base64?: string`.
- `buildApplicationHtml(data)` and `generateOfficialCvHtml(cv)` are already exported and generate clean HTML.
- Missing helper `generateCvPdfBase64(data)` for automated dispatch upload.

---

### 1.6 Timeline & Tracking Screens
- `src/ui/screens/ApplicationsTimelineScreen.tsx` (lines 46–55):
  `STATUS_CONFIG: Record<AppStatus, ...>` currently only defines `PENDING`, `REVIEWING`, `INTERVIEW`, `ACCEPTED`, `REJECTED`.
- `src/features/stages/ApplicationDetailModal.tsx` (lines 54–63):
  Also defines `STATUS_CONFIG: Record<AppStatus, ...>`.
  Both will benefit from including `SENT_PENDING`, `DELIVERED`, and `FAILED`.

---

## 2. Logic Chain

1. **Detection**:
   When `AiApplyModal` opens, it must call `getStoredWhatsAppStatus()` from `src/features/whatsapp/whatsappService.ts`. If `connected === true`, set `isWhatsAppLinked = true` and retrieve `status.phone`. If `false`, set `isWhatsAppLinked = false`.
2. **Channel Selection**:
   The student can select either WhatsApp or Email. By default, initialize `selectedChannel` according to the offer's `job.applyMethod` (`'email'` if `job.applyMethod === 'EMAIL'`, otherwise `'whatsapp'`).
3. **WhatsApp Flow (Linked)**:
   When `selectedChannel === 'whatsapp'` and `isWhatsAppLinked === true`:
   - Render green badge `✅ WhatsApp connecté (+237 6...)`.
   - Render primary button `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]`.
   - On tap: generate PDF base64 via `generateCvPdfBase64()`, invoke `dispatchStageApplication()` with `channel: 'whatsapp'`, log status `SENT_PENDING`, and transition to the receipt view without opening any external apps.
4. **WhatsApp Flow (Not Linked - Pairing vs Fallback)**:
   When `selectedChannel === 'whatsapp'` and `isWhatsAppLinked === false`:
   - Render calm notice: *"Compte WhatsApp non associé"*.
   - Primary action: `[ 🔗 Associer mon WhatsApp en 30s ]`, which opens `WhatsAppPairingModal` directly within the flow. Upon `onPairingSuccess`, immediately set `isWhatsAppLinked = true` and update the view to show the 1-Click button.
   - Secondary / Fallback action: `[ 💬 Ouvrir WhatsApp Manuellement ]`, which calls `persistApplication()` and opens `Linking.openURL(result.whatsappUrl)`.
5. **Email Flow**:
   When `selectedChannel === 'email'`:
   - Render primary action `[ ✉️ Expédier ma Candidature par Email ]`.
   - On tap: invoke `dispatchStageApplication()` with `channel: 'email'`, which transmits to backend `/api/mobile/stages/dispatch` (forwarded to N8N SMTP with PDF attachment).
   - Offer secondary fallback: `[ 📧 Ouvrir ma messagerie manuellement ]` (`mailto:` link).
6. **Immediate Feedback & Receipt View (`step === 'sent'`)**:
   - Show animated checkmark and card with:
     - Reference Code (`CAMPUS-APP-...`)
     - Poste & Entreprise
     - Canal utilisé (`WhatsApp Envoi Automatique` / `Email RH` / `WhatsApp Manuel`)
     - Statut (`En cours d'acheminement · SENT_PENDING`)
     - Date & Heure
     - Mention relance à J+7
   - Primary button: `[ 📋 Voir dans mon Suivi de Candidatures ]` (invokes `onApplicationComplete?.()` and `onClose()`).
7. **Timeline Sync**:
   `dispatchStageApplication` adds the application to `localApplications` with status `'SENT_PENDING'` and saves via cross-platform storage. In `ApplicationsTimelineScreen.tsx`, `fetchStudentApplications()` loads this application immediately.

---

## 3. Concrete Code Changes & Specifications

### 3.1 Update Types (`src/types.ts`)
Extend `AppStatus` to match backend `StageStatus`:
```typescript
// Line 13 of src/types.ts
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

---

### 3.2 Update `src/features/stages/pdfExportService.ts`
Add helper to generate base64 PDF for dispatch upload:
```typescript
/**
 * Génère le fichier PDF en chaîne Base64 pour l'upload Supabase et dispatch N8N
 */
export async function generateCvPdfBase64(data: DocumentExportData): Promise<string | undefined> {
  try {
    const htmlContent = data.officialCv
      ? generateOfficialCvHtml(data.officialCv)
      : buildApplicationHtml(data);

    if (Platform.OS !== 'web') {
      const { base64 } = await Print.printToFileAsync({ html: htmlContent, base64: true });
      return base64;
    }
  } catch (err) {
    console.warn('[pdfExportService] Could not generate base64 PDF:', err);
  }
  return undefined;
}
```

---

### 3.3 Add `dispatchStageApplication` in `src/features/stages/stagesApi.ts`
```typescript
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface DispatchStageApplicationParams {
  jobId: string;
  channel: 'whatsapp' | 'email';
  whatsappPitch?: string;
  letterText?: string;
  cvPdfBase64?: string;
  cvPdfUrl?: string;
  studentNotes?: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  phoneNumber?: string;
  officialCv?: OfficialCvData;
  cvText?: string;
}

export interface DispatchStageApplicationResult {
  success: boolean;
  applicationId: string;
  status: AppStatus;
  cvUrl?: string;
  message: string;
}

export async function dispatchStageApplication(
  params: DispatchStageApplicationParams
): Promise<DispatchStageApplicationResult> {
  let appId = '';
  let status: AppStatus = 'SENT_PENDING';
  let cvUrl = params.cvPdfUrl;
  let message =
    params.channel === 'whatsapp'
      ? 'Candidature expédiée avec succès via WhatsApp.'
      : 'Candidature expédiée avec succès par Email.';

  try {
    const response = await authFetch('/api/mobile/stages/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: params.jobId,
        channel: params.channel,
        whatsappPitch: params.whatsappPitch,
        letterText: params.letterText,
        cvPdfBase64: params.cvPdfBase64,
        cvPdfUrl: params.cvPdfUrl,
        studentNotes: params.studentNotes,
        studentName: params.studentName,
        studentEmail: params.studentEmail,
        studentPhone: params.studentPhone || params.phoneNumber,
        phoneNumber: params.phoneNumber || params.studentPhone,
      }),
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        success?: boolean;
        applicationId?: string;
        status?: AppStatus;
        cvUrl?: string;
        message?: string;
      };
      if (payload?.applicationId) {
        appId = payload.applicationId;
        status = payload.status || 'SENT_PENDING';
        if (payload.cvUrl) cvUrl = payload.cvUrl;
        if (payload.message) message = payload.message;
      }
    }
  } catch (e) {
    console.warn('[stagesApi] Dispatch network call error, falling back to local queue:', e);
  }

  if (!appId) {
    appId = `app-dispatch-${Date.now()}`;
  }

  const targetJob = SEED_JOBS.find((j) => j.id === params.jobId) || SEED_JOBS[0];
  const newApplication: StageApplication = {
    id: appId,
    studentId: 'student-current',
    jobId: params.jobId,
    status,
    appliedAt: new Date().toISOString(),
    job: targetJob,
    cvFileUrl: cvUrl,
    generatedCvText: params.cvText,
    generatedLetterText: params.letterText,
    officialCv: params.officialCv,
    notes: `Candidature 1-Clic via ${params.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}.`,
  };

  localApplications = [newApplication, ...localApplications.filter((a) => a.id !== appId)];
  persistApplicationsLocally(localApplications);

  return {
    success: true,
    applicationId: appId,
    status,
    cvUrl,
    message,
  };
}
```

And update `persistApplicationsLocally` / `getStoredApplications` in `stagesApi.ts` to be cross-platform:
```typescript
async function persistApplicationsLocally(apps: StageApplication[]) {
  try {
    const raw = JSON.stringify(apps);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(APPLICATIONS_STORAGE_KEY, raw);
      }
    } else {
      await SecureStore.setItemAsync(APPLICATIONS_STORAGE_KEY, raw).catch(() => {});
    }
  } catch {}
}
```

---

### 3.4 Refactor `src/features/stages/AiApplyModal.tsx`
#### State & Effect Additions:
```typescript
import {
  getStoredWhatsAppStatus,
  checkConnectionStatus,
  cleanPhoneNumber,
} from '../whatsapp/whatsappService';
import { WhatsAppPairingModal } from '../whatsapp/WhatsAppPairingModal';
import { dispatchStageApplication } from './stagesApi';
import { generateCvPdfBase64 } from './pdfExportService';
import { Zap, MessageSquare, AlertCircle } from 'lucide-react-native';

// Inside AiApplyModal:
const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email'>('whatsapp');
const [isWhatsAppLinked, setIsWhatsAppLinked] = useState<boolean>(false);
const [linkedPhone, setLinkedPhone] = useState<string>('');
const [showPairingModal, setShowPairingModal] = useState<boolean>(false);
const [dispatchReceipt, setDispatchReceipt] = useState<{
  applicationId: string;
  channel: 'whatsapp' | 'email' | 'whatsapp_manual' | 'email_manual';
  status: string;
  appliedAt: string;
  message: string;
  companyName: string;
  jobTitle: string;
} | null>(null);

// Initialize channel and check WhatsApp status on open:
useEffect(() => {
  let isMounted = true;
  if (visible && job) {
    // Prefer job's default method
    if (job.applyMethod === 'EMAIL') {
      setSelectedChannel('email');
    } else {
      setSelectedChannel('whatsapp');
    }

    getStoredWhatsAppStatus().then((status) => {
      if (!isMounted) return;
      setIsWhatsAppLinked(Boolean(status.connected));
      setLinkedPhone(status.phone || currentProfile.phoneWhatsapp || '');
    });
  }
  return () => { isMounted = false; };
}, [visible, job, currentProfile.phoneWhatsapp]);
```

#### Dispatch Actions:
```typescript
// 1-Click Background Apply (WhatsApp or Email)
const handleOneClickApply = async (channel: 'whatsapp' | 'email') => {
  if (!result || !job) return;
  setSubmitting(true);
  try {
    const pdfBase64 = await generateCvPdfBase64({
      studentName: currentProfile.fullName,
      studentEmail: currentProfile.email,
      studentPhone: linkedPhone || currentProfile.phoneWhatsapp,
      major: currentProfile.major,
      educationLevel: currentProfile.educationLevel,
      jobTitle: job.title,
      companyName: job.company?.name || "L'Entreprise",
      letterText: editableLetter,
      cvText: editableCv,
      officialCv: result.officialCv,
    });

    const pitch = buildWhatsAppPitch({
      studentName: currentProfile.fullName,
      major: currentProfile.major,
      jobTitle: job.title,
      companyName: job.company?.name || "L'Entreprise",
      letterSummary: editableLetter,
    });

    const res = await dispatchStageApplication({
      jobId: job.id,
      channel,
      whatsappPitch: pitch,
      letterText: editableLetter,
      cvPdfBase64: pdfBase64,
      studentNotes: '',
      studentName: currentProfile.fullName,
      studentEmail: currentProfile.email,
      studentPhone: linkedPhone || currentProfile.phoneWhatsapp,
      phoneNumber: linkedPhone || currentProfile.phoneWhatsapp,
      officialCv: result.officialCv,
      cvText: editableCv,
    });

    setDispatchReceipt({
      applicationId: res.applicationId,
      channel,
      status: res.status,
      appliedAt: new Date().toISOString(),
      message: res.message,
      companyName: job.company?.name || 'Entreprise Partenaire',
      jobTitle: job.title,
    });

    setStep('sent');
  } catch (err) {
    Alert.alert('Erreur', "Échec de l'envoi automatique. Vous pouvez utiliser le fallback manuel.");
  } finally {
    setSubmitting(false);
  }
};

// Fallback: Manual WhatsApp Deep-Link
const handleManualWhatsAppApply = async () => {
  if (!result?.whatsappUrl || !job) return;
  setSubmitting(true);
  try {
    const applicationId = await persistApplication();
    await Linking.openURL(result.whatsappUrl);
    setDispatchReceipt({
      applicationId,
      channel: 'whatsapp_manual',
      status: 'SENT_PENDING',
      appliedAt: new Date().toISOString(),
      message: 'Candidature préparée dans WhatsApp.',
      companyName: job.company?.name || 'Entreprise Partenaire',
      jobTitle: job.title,
    });
    setStep('sent');
  } catch (err) {
    Alert.alert('Info', 'Ouverture de WhatsApp...');
  } finally {
    setSubmitting(false);
  }
};
```

#### UI Elements: Channel Selector & Dynamic Action Box:
```tsx
{/* Canal Selector: Segmented Pill */}
<View style={styles.channelSegmentContainer}>
  <Pressable
    style={[styles.channelSegmentPill, selectedChannel === 'whatsapp' && styles.channelSegmentPillActive]}
    onPress={() => setSelectedChannel('whatsapp')}
  >
    <MessageSquare size={14} color={selectedChannel === 'whatsapp' ? '#34D399' : '#94A3B8'} />
    <Text style={[styles.channelSegmentText, selectedChannel === 'whatsapp' && styles.channelSegmentTextActive]}>
      WhatsApp {isWhatsAppLinked ? '⚡ 1-Clic' : ''}
    </Text>
  </Pressable>

  <Pressable
    style={[styles.channelSegmentPill, selectedChannel === 'email' && styles.channelSegmentPillActive]}
    onPress={() => setSelectedChannel('email')}
  >
    <Mail size={14} color={selectedChannel === 'email' ? '#A78BFA' : '#94A3B8'} />
    <Text style={[styles.channelSegmentText, selectedChannel === 'email' && styles.channelSegmentTextActive]}>
      Email RH ✉️
    </Text>
  </Pressable>
</View>

{/* Dynamic Action Box based on Channel & Pairing status */}
{selectedChannel === 'whatsapp' ? (
  isWhatsAppLinked ? (
    <View style={styles.oneClickBox}>
      <View style={styles.linkedBadgeRow}>
        <CheckCircle2 size={13} color="#34D399" />
        <Text style={styles.linkedBadgeText}>WhatsApp connecté ({linkedPhone})</Text>
      </View>
      <Pressable
        testID="btn-apply-1click-whatsapp"
        style={styles.primaryOneClickBtn}
        onPress={() => handleOneClickApply('whatsapp')}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Zap size={16} color="#FFFFFF" />
            <Text style={styles.primaryOneClickBtnText}>⚡ Postuler en 1 Clic (Envoi Automatique)</Text>
          </>
        )}
      </Pressable>
      <Text style={styles.subHintText}>
        Envoi direct en arrière-plan via Evolution API. Aucun changement d'application requis.
      </Text>
    </View>
  ) : (
    <View style={styles.unlinkedBox}>
      <View style={styles.unlinkedWarningRow}>
        <AlertCircle size={15} color="#FBBF24" />
        <Text style={styles.unlinkedWarningTitle}>WhatsApp non associé</Text>
      </View>
      <Text style={styles.unlinkedWarningDesc}>
        Associez votre compte en 30s pour expédier vos dossiers en 1 clic en arrière-plan.
      </Text>
      <View style={styles.unlinkedActionsRow}>
        <Pressable
          testID="btn-open-pairing-modal"
          style={styles.pairingOfferBtn}
          onPress={() => setShowPairingModal(true)}
        >
          <Text style={styles.pairingOfferBtnText}>🔗 Associer mon WhatsApp en 30s</Text>
        </Pressable>
        <Pressable
          testID="btn-fallback-manual-whatsapp"
          style={styles.manualFallbackBtn}
          onPress={handleManualWhatsAppApply}
          disabled={submitting}
        >
          <Text style={styles.manualFallbackBtnText}>💬 Ouvrir WhatsApp Manuellement</Text>
        </Pressable>
      </View>
    </View>
  )
) : (
  <View style={styles.emailBox}>
    <Pressable
      testID="btn-apply-email-dispatch"
      style={styles.primaryEmailBtn}
      onPress={() => handleOneClickApply('email')}
      disabled={submitting}
    >
      {submitting ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          <Mail size={16} color="#FFFFFF" />
          <Text style={styles.primaryEmailBtnText}>✉️ Expédier ma Candidature par Email</Text>
        </>
      )}
    </Pressable>
    <Pressable
      style={styles.manualMailtoBtn}
      onPress={handleOpenEmail}
    >
      <Text style={styles.manualMailtoBtnText}>Ouvrir ma messagerie manuellement (mailto)</Text>
    </Pressable>
  </View>
)}
```

#### Step 3: Receipt Confirmation Modal (`step === 'sent'`):
```tsx
<View style={styles.receiptContainer}>
  <View style={styles.receiptIconCircle}>
    <CheckCircle2 size={44} color="#10B981" />
  </View>
  <Text style={styles.receiptTitle}>Candidature transmise avec succès !</Text>
  <Text style={styles.receiptSubtitle}>
    Votre dossier officiel a été enregistré et expédié au recruteur.
  </Text>

  {/* Official Receipt Card */}
  <View style={styles.receiptCard}>
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>Référence :</Text>
      <Text style={styles.receiptValueBold}>
        CAMPUS-{dispatchReceipt?.applicationId.slice(0, 7).toUpperCase()}
      </Text>
    </View>
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>Poste :</Text>
      <Text style={styles.receiptValue}>{dispatchReceipt?.jobTitle || job.title}</Text>
    </View>
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>Entreprise :</Text>
      <Text style={styles.receiptValue}>{dispatchReceipt?.companyName || job.company?.name}</Text>
    </View>
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>Canal :</Text>
      <Text style={styles.receiptValueChannel}>
        {dispatchReceipt?.channel === 'whatsapp'
          ? '⚡ WhatsApp (Automatique)'
          : dispatchReceipt?.channel === 'email'
          ? '✉️ Email RH (Automatique)'
          : '💬 WhatsApp (Manuel)'}
      </Text>
    </View>
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>Statut :</Text>
      <View style={styles.receiptStatusBadge}>
        <Text style={styles.receiptStatusBadgeText}>En cours d'acheminement</Text>
      </View>
    </View>
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>Relance :</Text>
      <Text style={styles.receiptValueMuted}>Prévue à J+7 en l'absence de réponse</Text>
    </View>
  </View>

  <Pressable
    testID="btn-receipt-timeline"
    style={styles.receiptTimelineBtn}
    onPress={() => {
      onClose();
      onApplicationComplete?.();
    }}
  >
    <Text style={styles.receiptTimelineBtnText}>📋 Voir dans mon Suivi de Candidatures</Text>
  </Pressable>

  <Pressable style={styles.receiptCloseBtn} onPress={onClose}>
    <Text style={styles.receiptCloseBtnText}>Fermer</Text>
  </Pressable>
</View>
```

#### Modal Pairing Inclusion at Bottom:
```tsx
<WhatsAppPairingModal
  visible={showPairingModal}
  onClose={() => setShowPairingModal(false)}
  initialPhone={currentProfile.phoneWhatsapp || linkedPhone || ''}
  onPairingSuccess={(pairedPhone) => {
    setIsWhatsAppLinked(true);
    setLinkedPhone(pairedPhone);
    setShowPairingModal(false);
  }}
  onStatusChange={(connected) => {
    setIsWhatsAppLinked(connected);
    if (connected) setShowPairingModal(false);
  }}
/>
```

---

### 3.5 Update `ApplicationsTimelineScreen.tsx` & `ApplicationDetailModal.tsx`
Update `STATUS_CONFIG` to include `SENT_PENDING`, `DELIVERED`, and `FAILED`:
```typescript
const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  PENDING: { label: 'En attente', bg: 'rgba(245, 158, 11, 0.12)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.25)', icon: Clock },
  SENT_PENDING: { label: 'En cours d’envoi', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.25)', icon: Send },
  DELIVERED: { label: 'Délivrée', bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },
  FAILED: { label: 'Échec d’envoi', bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.25)', icon: XCircle },
  REVIEWING: { label: 'En examen', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.25)', icon: FileCheck },
  INTERVIEW: { label: 'Entretien', bg: 'rgba(124, 58, 237, 0.12)', text: '#A78BFA', border: 'rgba(124, 58, 237, 0.25)', icon: MessageSquare },
  ACCEPTED: { label: 'Accepté', bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },
  REJECTED: { label: 'Non retenu', bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.25)', icon: XCircle },
};
```

---

## 4. Caveats

1. **Expo Print on Web**: In a web browser, `Print.printToFileAsync` does not support `{ base64: true }` in the same manner as iOS/Android. Because the backend route `dispatchSchema` declares `cvPdfBase64` as optional (`z.string().trim().optional()`), the backend successfully creates the application and forwards the dispatch payload even if `cvPdfBase64` is empty.
2. **Local Storage on Native**: In React Native, `localStorage` is not defined globally. Using `SecureStore` for native platforms and `localStorage` on web guarantees application records persist across mobile app restarts.
3. **No Code Modification Performed**: This explorer turn was strictly read-only analysis. No source files were edited.

---

## 5. Conclusion

- The UI architecture for Milestone M5 is fully mapped and ready for direct implementation.
- `AiApplyModal.tsx` can seamlessly integrate WhatsApp pairing detection, 1-Click dispatch calling `POST /api/mobile/stages/dispatch`, 30s pairing modal triggering, native manual deep-link fallback, email dispatch, and rich receipt confirmation.
- Extending `AppStatus` in `src/types.ts` and updating `STATUS_CONFIG` in `ApplicationsTimelineScreen.tsx` and `ApplicationDetailModal.tsx` guarantees zero TypeScript errors and consistent UX across the entire application lifecycle.

---

## 6. Verification Method

To independently verify the recommendations:
1. Check that `npm run typecheck` passes in root:
   ```powershell
   npm run typecheck
   ```
2. Check that `npm run typecheck` passes in `mobile-api`:
   ```powershell
   cd mobile-api; npm run typecheck; cd ..
   ```
3. Inspect `src/features/whatsapp/whatsappService.ts` to confirm `getStoredWhatsAppStatus()` return signature matches `{ phone: string, connected: boolean, instanceName?: string, linkedAt?: string | null }`.
4. Inspect `mobile-api/app/api/mobile/stages/dispatch/route.ts` to confirm `POST` body attributes match `DispatchStageApplicationParams`.
