## 2026-10-05T21:43:44Z
You are a Worker subagent (teamwork_preview_worker).
Your working directory is: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_mobile_m5_1
Authoritative request: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md (YOU MUST READ THIS FIRST)
Project roadmap: c:\Users\DELL\Desktop\mes projet\campus-360\PROJECT.md
Survey findings: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_survey_mobile_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own and may edit ONLY these files:
- `src/features/stages/AiApplyModal.tsx`
- `src/features/stages/stagesApi.ts`
Do NOT modify any other files.

TASK REQUIREMENTS (Milestone 5 - R5: Mobile UI: 1-Click Apply Flow & Native Fallback):
1. In `src/features/stages/stagesApi.ts`:
   - Implement `dispatchStageApplication(params: { jobId: string; channel: 'whatsapp' | 'email'; whatsappPitch?: string; letterText?: string; cvPdfBase64?: string; studentNotes?: string; })`.
   - Calls backend `POST /api/mobile/stages/dispatch` via `authFetchRaw`.
   - Records the application locally in `persistApplicationsLocally` so `ApplicationsTimelineScreen.tsx` reflects the application with status `'PENDING'` or `'SENT_PENDING'`.
2. In `src/features/stages/AiApplyModal.tsx`:
   - Import `getStoredWhatsAppStatus` from `src/features/whatsapp/whatsappService` and `WhatsAppPairingModal` from `src/features/whatsapp/WhatsAppPairingModal`.
   - Track WhatsApp pairing state (`isWhatsAppConnected: boolean`, `whatsappPhone?: string`).
   - Refactor the sending step (`preview` / actions box):
     - If WhatsApp linked: Primary action button `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]` (`testID="btn-apply-one-click"`).
       - Clicking triggers background dispatch via `dispatchStageApplication` without opening external apps.
       - Immediately shows visual feedback (loading/sending) and transitions to confirmation receipt step (`step === 'sent'`).
     - If Email chosen: Action button `[ ✉️ Expédier ma Candidature par Email ]` (`testID="btn-apply-email"`), triggering background dispatch via email.
     - If WhatsApp not linked:
       - Button `[ 🔗 Lier mon WhatsApp en 30s ]` (`testID="btn-open-pairing-modal"`), opening `WhatsAppPairingModal`. Once paired, automatically enables the 1-Click button.
       - Fallback button `[ 💬 Ouvrir WhatsApp Manuellement ]` (`testID="btn-apply-manual-whatsapp"`), using native deep-link.
     - In the confirmation step (`step === 'sent'`), display receipt confirmation and sync with timeline.
3. Verification:
   - Run `npm run typecheck` in project root to verify 0 errors.
   - Run `cd mobile-api && npm run typecheck` to verify 0 errors.
4. Output: Write `progress.md` and complete with `handoff.md`. Send a message when finished.
