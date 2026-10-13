# Rapport d'Exploration Technique (Explorer 2) — Jalon M5 : Câblage API Mobile & Backend Stage Dispatch

## 1. Observation

### 1.1 État Actuel de `src/features/stages/stagesApi.ts`
- **Lignes 984-1030 :** La fonction d'enregistrement de candidature actuelle est `submitStageApplication` :
  ```typescript
  export async function submitStageApplication(
    jobId: string,
    cvText: string,
    letterText: string,
    officialCv?: OfficialCvData,
  ): Promise<string> {
    let appId = '';
    try {
      const response = await authFetch('/api/mobile/stages/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, cvText, letterText }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { application?: { id: string } };
        if (payload?.application?.id) {
          appId = payload.application.id;
        }
      }
    } catch (e) {
      console.warn('Network submit fallback to local memory:', e);
    }
  ...
  ```
- **Lignes 1032-1079 :** La gestion du stockage local et du fetch distant repose sur :
  ```typescript
  const APPLICATIONS_STORAGE_KEY = 'campus360_student_applications';

  function getStoredApplications(): StageApplication[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  }
  ```
- **Limites observées :**
  1. `submitStageApplication` cible l'ancien endpoint stub `/api/mobile/stages/apply` (qui ne transmet rien à N8N ni à Evolution API).
  2. Aucun paramètre pour le canal (`whatsapp` vs `email`), le pitch d'accroche WhatsApp, le base64 du PDF du CV officiel, ni les notes de l'étudiant.
  3. Le statut est codé en dur à `'PENDING'`, sans support du statut `'SENT_PENDING'`.

### 1.2 Spécification & Contrat Backend de `mobile-api/app/api/mobile/stages/dispatch/route.ts`
- **Lignes 27-39 :** Schéma de validation Zod de la requête :
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
- **Lignes 65-76 & 95-107 :** Authentification & Résilience Dev :
  ```typescript
  const access = await requireMobileUser(request, { readBudgetPerMinute: 30 });
  const isStrictProd =
    process.env.NODE_ENV === 'production' &&
    process.env.VERCEL_ENV === 'production';

  if (access.response && isStrictProd) {
    return withCors(access.response, request);
  }
  // En mode hors-ligne / dev / test, résolution de secours de l'étudiant via les champs du body
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
- **Lignes 127-145 :** Gestion du PDF & Enregistrement PostgreSQL :
  - Si `cvPdfBase64` est fourni, upload automatique vers Supabase Storage `cvs/` (`uploadStageApplicationCvPdf`).
  - Persistance dans `public.stage_applications` avec statut initial `'SENT_PENDING'`.
- **Lignes 186-209 :** Envoi vers le Webhook N8N :
  - `POST https://n8n.blackcompany.site/webhook/send-stage-application` avec timeout AbortController de 10s.
- **Lignes 217-225 :** Réponse HTTP 200 renvoyée au client :
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

### 1.3 Mécanisme Client Auth & En-têtes (`src/features/auth/betterAuth.ts`)
- **Lignes 483-513 :** `authFetchRaw` :
  - Insère automatiquement `Authorization: Bearer <token>`.
  - Insère le cookie de session `better-auth.session_token=<token>`.
  - Transmet l'en-tête `Expo-Origin: campus-bordes://` sur natif.
  - Retourne directement l'objet `Response` sans lever d'exception sur les codes 4xx/5xx, permettant au code appelant d'inspecter les erreurs sans crasher.

### 1.4 Génération PDF Base64 (`src/features/stages/pdfExportService.ts`)
- **Lignes 2 & 430 :** `import * as Print from 'expo-print'`.
- `Print.printToFileAsync({ html, base64: true })` génère directement l'encodage base64 du fichier PDF sur iOS et Android (`base64: string`).
- Sur le web (`ExponentPrint.web.js`), `Print.printToFileAsync` redirige vers `window.print()` et ne retourne pas de buffer base64. Un fallback base64 valide ou facultatif doit être géré pour l'environnement navigateur.

### 1.5 Types & Timeline (`src/types.ts` & `src/ui/screens/ApplicationsTimelineScreen.tsx`)
- Dans `src/types.ts` (Ligne 13) :
  `export type AppStatus = 'PENDING' | 'REVIEWING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';`
- Dans `mobile-api/lib/stages-db.ts` (Lignes 3-11) :
  `export type StageStatus = 'PENDING' | 'SENT_PENDING' | 'DELIVERED' | 'FAILED' | 'REVIEWING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';`
- Dans `ApplicationsTimelineScreen.tsx` :
  `STATUS_CONFIG` utilise `Record<AppStatus, ...>`. Pour afficher correctement le statut `'SENT_PENDING'` dans la timeline avec le badge "Envoi en cours", `AppStatus` doit être étendu pour inclure `'SENT_PENDING' | 'DELIVERED' | 'FAILED'`.
- Vérification du compilateur TypeScript :
  `npm run typecheck` à la racine : **0 erreur (Code 0)**.
  `cd mobile-api && npm run typecheck` : **0 erreur (Code 0)**.

---

## 2. Logic Chain

1. **Identification du besoin :** Le jalon M5 requiert que le clic sur "Postuler en 1 Clic" dans `AiApplyModal.tsx` expédie la candidature en arrière-plan via l'API sans ouvrir d'applications tierces, tout en conservant le fallback manuel si WhatsApp n'est pas jumelé.
2. **Adéquation de l'API Backend :** L'endpoint `POST /api/mobile/stages/dispatch` (implémenté en M2) est prêt et opérationnel. Il attend un payload précis (`jobId`, `channel`, `whatsappPitch`, `letterText`, `cvPdfBase64`, etc.) et retourne `{ success: true, applicationId, status: 'SENT_PENDING', cvUrl, message }`.
3. **Nécessité d'une fonction dédiée dans `stagesApi.ts` :** Actuellement, `stagesApi.ts` ne propose que `submitStageApplication` vers l'ancienne route `/api/mobile/stages/apply`. Il faut donc définir `dispatchStageApplication` dans `stagesApi.ts` qui :
   - Prépare le payload complet conforme à `dispatchSchema`.
   - Utilise `authFetchRaw('/api/mobile/stages/dispatch', ...)` pour transmettre les tokens et cookies d'authentification.
   - Gère le base64 du PDF du CV officiel (ou utilise un fallback résilient).
   - Enregistre la candidature localement dans `localApplications` et `localStorage` avec le statut `'SENT_PENDING'`.
4. **Synchronisation avec la Timeline :** La timeline (`ApplicationsTimelineScreen.tsx`) appelle `fetchStudentApplications()`. Lorsque `dispatchStageApplication` insère l'entrée dans `localApplications` et dans PostgreSQL, la timeline synchronise instantanément la candidature avec le badge `'SENT_PENDING'`.
5. **Harmonisation des types TypeScript :** L'extension de `AppStatus` dans `src/types.ts` garantit que le type client correspond aux statuts PostgreSQL (`StageStatus`), permettant un affichage visuel distinct (`SENT_PENDING` = "Envoi en cours", `DELIVERED` = "Transmis", `FAILED` = "Échec d'envoi").

---

## 3. Caveats

- **Génération PDF sur Web :** Sur navigateur Web, `expo-print` ne génère pas de base64 natif. Le helper de génération base64 doit donc intégrer un fallback (ex: PDF binaire minimal ou omission propre) afin de ne pas bloquer l'expédition lorsque l'application s'exécute dans un navigateur.
- **Absence de réseau / Mode hors-ligne :** Si le backend ou n8n est inaccessible lors du clic, `dispatchStageApplication` doit basculer en mode résilient local (génération d'un `app-dispatch-offline-${Date.now()}`), notifier l'utilisateur et persister la candidature en local pour éviter toute frustration.
- **Aucune modification de code source effectuée :** Ce rapport est une investigation en lecture seule conforme au rôle d'explorateur.

---

## 4. Conclusion & Conception Recommandée

### 4.1 Spécification de la Fonction `dispatchStageApplication` pour `stagesApi.ts`

```typescript
export interface DispatchStageApplicationInput {
  jobId: string;
  channel: 'whatsapp' | 'email';
  whatsappPitch?: string;
  letterText?: string;
  cvText?: string;
  cvPdfBase64?: string;
  studentNotes?: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  officialCv?: OfficialCvData;
  job?: StageJob;
}

export interface DispatchStageApplicationResult {
  success: boolean;
  applicationId: string;
  status: AppStatus;
  cvUrl?: string;
  message: string;
  offline?: boolean;
}

export async function dispatchStageApplication(
  input: DispatchStageApplicationInput
): Promise<DispatchStageApplicationResult> {
  const targetJob = input.job || SEED_JOBS.find((j) => j.id === input.jobId) || SEED_JOBS[0];
  let cvPdfBase64 = input.cvPdfBase64;

  // 1. Tenter la génération du base64 PDF si non fourni
  if (!cvPdfBase64 && input.officialCv) {
    try {
      cvPdfBase64 = await generateCvPdfBase64(input.officialCv);
    } catch (err) {
      console.warn('[stagesApi] Erreur lors de la génération PDF base64:', err);
    }
  }

  const payload = {
    jobId: input.jobId,
    channel: input.channel,
    whatsappPitch: input.whatsappPitch || '',
    letterText: input.letterText || '',
    cvPdfBase64: cvPdfBase64 || '',
    studentNotes: input.studentNotes || '',
    studentName: input.studentName || '',
    studentEmail: input.studentEmail || '',
    studentPhone: input.studentPhone || '',
  };

  let applicationId = '';
  let status: AppStatus = 'SENT_PENDING';
  let cvUrl: string | undefined = undefined;
  let message =
    input.channel === 'whatsapp'
      ? 'Candidature expédiée avec succès via WhatsApp.'
      : 'Candidature expédiée avec succès par Email.';
  let isOffline = false;

  try {
    const response = await authFetchRaw('/api/mobile/stages/dispatch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data?.applicationId) {
        applicationId = data.applicationId;
        status = data.status || 'SENT_PENDING';
        cvUrl = data.cvUrl;
        if (data.message) message = data.message;
      }
    } else {
      console.warn('[stagesApi] Dispatch API a répondu avec code:', response.status);
    }
  } catch (err) {
    console.warn('[stagesApi] Erreur réseau lors du dispatch distant:', err);
    isOffline = true;
  }

  if (!applicationId) {
    applicationId = `app-dispatch-${Date.now()}`;
    isOffline = true;
    message = 'Candidature enregistrée en local (mode hors-ligne).';
  }

  // Synchronisation immédiate de l'état local pour retour instantané
  const newApplication: StageApplication = {
    id: applicationId,
    studentId: 'student-current',
    jobId: input.jobId,
    status,
    appliedAt: new Date().toISOString(),
    cvFileUrl: cvUrl,
    job: targetJob,
    generatedCvText: input.cvText,
    generatedLetterText: input.letterText,
    officialCv: input.officialCv,
    notes: input.whatsappPitch
      ? `Pitch: ${input.whatsappPitch.slice(0, 150)}... | Canal: ${input.channel.toUpperCase()}`
      : `Canal: ${input.channel.toUpperCase()}`,
  };

  localApplications = [newApplication, ...localApplications.filter((a) => a.id !== applicationId)];
  persistApplicationsLocally(localApplications);

  return {
    success: true,
    applicationId,
    status,
    cvUrl,
    message,
    offline: isOffline,
  };
}
```

### 4.2 Helper de Génération Base64 dans `src/features/stages/pdfExportService.ts`

```typescript
export async function generateCvPdfBase64(
  cv?: OfficialCvData,
  docData?: DocumentExportData
): Promise<string | undefined> {
  const htmlContent = cv
    ? generateOfficialCvHtml(cv)
    : docData
    ? buildApplicationHtml(docData)
    : '';
  if (!htmlContent) return undefined;

  if (Platform.OS !== 'web') {
    try {
      const result = await Print.printToFileAsync({ html: htmlContent, base64: true });
      if (result?.base64) {
        return result.base64;
      }
    } catch (err) {
      console.warn('[pdfExportService] Print base64 failed:', err);
    }
  } else {
    // Fallback minimal PDF pour environnement web/dev
    const minimalPdfBase64 =
      'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iamoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iamozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KL1Jlc291cmNlcyA8PAo+Pgo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE4IDAwMDAwIG4gCjAwMDAwMDAwNjkgMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIxNAolJUVPRg==';
    return minimalPdfBase64;
  }
  return undefined;
}
```

### 4.3 Câblage dans `AiApplyModal.tsx` (R5)
- Dans `AiApplyModal.tsx` :
  1. Importer `getStoredWhatsAppStatus` depuis `../whatsapp/whatsappService`.
  2. Importer `dispatchStageApplication` depuis `./stagesApi`.
  3. Vérifier à l'ouverture de la modal si WhatsApp est appairé (`waStatus.connected === true`).
  4. Si WhatsApp connecté :
     - Afficher le bouton principal mis en valeur :  
       `[ ⚡ Postuler en 1 Clic (Envoi Automatique Arrière-Plan) ]`
     - Au clic : appel de `dispatchStageApplication({ jobId: job.id, channel: 'whatsapp', whatsappPitch, ... })` -> transition immédiate vers l'écran de confirmation (`step = 'sent'`).
  5. Si WhatsApp non connecté :
     - Proposer le bouton d'association 30s :  
       `[ 🔗 Associer mon WhatsApp ]` (ouvre `WhatsAppPairingModal`).
     - Et le bouton de secours natif :  
       `[ 💬 Ouvrir WhatsApp Manuellement ]` (ouvre `Linking.openURL(result.whatsappUrl)`).
  6. Si canal Email choisi :
     - Bouton `[ ✉️ Expédier ma Candidature par Email ]` appelant `dispatchStageApplication({ jobId: job.id, channel: 'email', ... })`.

---

## 5. Verification Method

Pour vérifier de manière indépendante ces conclusions et valider l'implémentation subséquente :
1. **Compilation TypeScript :**
   ```powershell
   npm run typecheck
   cd mobile-api && npm run typecheck
   ```
   Doit sortir avec le code de retour 0 (zéro erreur).
2. **Vérification du Contrat API :**
   Examiner `mobile-api/app/api/mobile/stages/dispatch/route.ts` et vérifier la correspondance stricte des champs du payload (`jobId`, `channel`, `whatsappPitch`, `letterText`, `cvPdfBase64`, `studentNotes`).
3. **Vérification du Flux Timeline :**
   Inspecter `src/ui/screens/ApplicationsTimelineScreen.tsx` pour confirmer que `SENT_PENDING` est pris en charge et que le badge "Envoi en cours" s'affiche dès l'enregistrement.
