## 2026-10-05T20:27:49Z
You are a Worker subagent (teamwork_preview_worker).
Your working directory is: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_mobile_m4_1
Authoritative request: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md (YOU MUST READ THIS FIRST)
Project roadmap: c:\Users\DELL\Desktop\mes projet\campus-360\PROJECT.md
Survey findings: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_survey_mobile_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own and may edit ONLY these files:
- `src/features/whatsapp/WhatsAppPairingModal.tsx`
- `src/features/whatsapp/whatsappService.ts`
- `src/ui/screens/ProfileScreen.tsx`
Do NOT modify any other files.

TASK REQUIREMENTS (Milestone 4 - R4: Mobile UI: WhatsApp Pairing Modal):
1. Create `src/features/whatsapp/whatsappService.ts`:
   - Service to communicate with `mobile-api/app/api/mobile/whatsapp/instance`.
   - Functions:
     - `requestPairingCode(phone: string)`
     - `checkConnectionStatus(phone: string)`
     - `getStoredWhatsAppStatus()`, `saveWhatsAppStatus(phone: string, connected: boolean)`
   - Uses mobile storage (SecureStore or localStorage fallback) to persist paired status.
2. Create `src/features/whatsapp/WhatsAppPairingModal.tsx`:
   - Follows calm anti-saturation design system (`src/theme/stitch.ts` tokens: `stitchColors`, `fontFamilies`).
   - Phone entry/confirmation input.
   - Generates 8-digit code (e.g. `7842 - 9012` in large monospace text `fontFamilies.mono`).
   - 1-tap copy button with instant feedback (using `navigator.clipboard` on web, `Clipboard.setString` from `react-native` on native).
   - Clear 3-step visual instruction guide for WhatsApp "Link with phone number".
   - Polling connection state every 3-5 seconds.
   - When connected, displays green connected badge `✅ WhatsApp connecté` (`stitchColors.emeraldBg`, `stitchColors.emerald`).
3. Update `src/ui/screens/ProfileScreen.tsx`:
   - Add entry in settings/account rows: "Liaison WhatsApp (Candidatures automatiques)" showing status badge (`✅ WhatsApp connecté` or `Non associé`).
   - Clicking opens `WhatsAppPairingModal`.
4. Verification:
   - Run `npm run typecheck` in project root to verify 0 errors.
5. Output: Write `progress.md` and complete with `handoff.md`. Send a message when finished.
