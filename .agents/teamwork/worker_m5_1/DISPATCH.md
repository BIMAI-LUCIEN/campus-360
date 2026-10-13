## 2026-10-07T10:31:50Z
You are Worker 1 (worker_m5_1) for Milestone M5: Mobile 1-Click Apply Flow & Native Fallback.
Your working directory is: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_m5_1
All your reports, briefing, progress, and handoff must be written in your working directory.

MANDATORY FIRST STEP:
Read the authoritative requirements file at:
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the project architecture file at:
c:\Users\DELL\Desktop\mes projet\campus-360\PROJECT.md
Read the reports from the 3 Explorers:
- c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m5_1\handoff.md
- c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m5_2\handoff.md
- c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m5_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP:
You own and may edit the following files:
- `src/types.ts`
- `src/features/stages/pdfExportService.ts`
- `src/features/stages/stagesApi.ts`
- `src/features/stages/AiApplyModal.tsx`
- `src/ui/screens/ApplicationsTimelineScreen.tsx`
- `src/features/stages/ApplicationDetailModal.tsx`

YOUR TASK:
Implement Milestone M5 according to Requirement R5 and the Explorers' blueprints:
1. In `src/types.ts`: Extend `AppStatus` to include `'SENT_PENDING' | 'DELIVERED' | 'FAILED'`.
2. In `src/features/stages/pdfExportService.ts`: Implement `generateCvPdfBase64`.
3. In `src/features/stages/stagesApi.ts`:
   - Implement `dispatchStageApplication` calling `POST /api/mobile/stages/dispatch` with all required parameters (`jobId`, `channel`, `whatsappPitch`, `letterText`, `cvPdfBase64`, `studentNotes`, `studentName`, `studentEmail`, `studentPhone`).
   - Implement cross-platform local persistence (`SecureStore` on native, `localStorage` on web) and update `localApplications`.
4. In `src/features/stages/AiApplyModal.tsx`:
   - Check WhatsApp session via `getStoredWhatsAppStatus()`.
   - If WhatsApp linked & channel is WhatsApp: Primary action button "[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]" triggering background dispatch without opening external apps.
   - If Email chosen: Action button "[ ✉️ Expédier ma Candidature par Email ]" triggering background email dispatch.
   - If WhatsApp not linked: Offer 30s pairing "[ 🔗 Associer mon WhatsApp en 30s ]" (opening `WhatsAppPairingModal` as sibling modal) or fallback button "[ 💬 Ouvrir WhatsApp Manuellement ]" (native deep-link).
   - Immediate visual feedback and rich receipt confirmation view (`step === 'sent'`) with Reference, Job, Company, Channel, Status, J+7 follow-up reminder, and button "[ 📋 Voir dans mon Suivi de Candidatures ]" triggering `onApplicationComplete?.()` and closing modal.
5. In `src/ui/screens/ApplicationsTimelineScreen.tsx` and `src/features/stages/ApplicationDetailModal.tsx`:
   - Update `STATUS_CONFIG` to include `'SENT_PENDING'`, `'DELIVERED'`, and `'FAILED'`.
6. Run build / typecheck verification:
   - Run `npm run typecheck` at project root. Verify 0 errors.
   - Run `npm run typecheck` in `mobile-api` (`cd mobile-api && npm run typecheck`). Verify 0 errors.

Deliver a complete handoff report in `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_m5_1\handoff.md`.
Include build and typecheck commands and results.
Report back via send_message when done.
