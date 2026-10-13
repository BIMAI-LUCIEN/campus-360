## 2026-10-08T06:34:09Z

You are Worker M3 for Milestone M3: Immersive Stage Detail Screen & Clean White Feed in the Campus 360 React Native application.

Your working directory is: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_m3_1\
Ensure you maintain your progress.md and handoff.md in that directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read the user request at:
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md (§R3, §R4, and §R5)
and read the explorer reports at:
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m3_1\handoff.md
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m3_1\analysis.md
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m3_2\handoff.md
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m3_2\analysis.md

WRITE OWNERSHIP:
You have exclusive write ownership of:
- `src/ui/screens/StagesScreen.tsx`
- (Optional, if needed for typing): `src/types.ts`

YOUR OBJECTIVE:
Implement the complete Milestone M3 according to §R3 and §R4:
1. **Clean White Feed Cards (§R4)**:
   - Aired white cards (`stitchColors.paper: #FFFFFF`), subtle borders (`stitchColors.paperSoft: #F1F5F9`), soft elevation shadows (`stitchShadows.card`).
   - Job banner cover photo, AI Match rating badge (`★ 95% Match`), domain pill (`Stage Pré-embauche`, `Informatique`), deep slate title (`#0F172A`), company name (`#64748B`), location, and stipend pill.
   - Tapping any card immediately opens the Immersive Stage Detail Screen.

2. **Screen 2: Immersive Stage Detail Screen (§R3)**:
   - Implemented as a full-bleed modal (`<Modal visible={!!selectedDetailJob} animationType="slide" statusBarTranslucent>`).
   - Feature 1: Full-bleed hero image header (height: 280-290, curved bottom corners: 32px) with floating circular action buttons: Back (`ChevronLeft`), Share (`Share2`), Favorite (`Heart`).
   - Feature 2: Horizontal thumbnail photo strip peeking into company workspaces/offices with "+N photos" badge on the last photo (using `getWorkspacePhotos(job)`).
   - Feature 3: Domain pill badge (`Stage Pré-embauche` / `Informatique`) + AI Match rating badge (`★ 95% Match`).
   - Feature 4: Prominent job title (`#0F172A`, bold) and company location with direction action button (`Itinéraire ↗`).
   - Feature 5: Segmented tabs with purple underline indicators: `[ À propos ]`, `[ Entreprise ]`, `[ Conseils IA ]`. Switching tabs shows the respective tab content.
   - Feature 6: Quick metadata pill row: Duration (`🏃 3 à 6 mois`), Location mode (`📍 Présentiel`), Status (`🕒 Ouvert`).
   - Feature 7: Rich description block with expandable "Voir plus" / "Voir moins" toggle and required skills tag chips.
   - Feature 8: Recruiter / Company info card with direct WhatsApp (`MessageCircle`) and Email (`Mail`) contact buttons (opening WhatsApp and mailto).
   - Feature 9: Fixed sticky bottom bar displaying estimated stipend on the left (`75 000 FCFA /mois` or mention) and large rounded Royal Violet CTA on the right (`Postuler en 1 Clic`).

3. **1-Click Apply Flow Wiring**:
   - Tapping `Postuler en 1 Clic` from the sticky bottom bar triggers `setApplyingJob(selectedDetailJob)`, opening `AiApplyModal.tsx` for automated background dispatch via Evolution API & N8N.
   - On iOS/general modal stacking: safely handle modal transition as detailed in explorer handoffs.

4. **Preserve APIs & Zero Type Errors**:
   - Preserve all existing exports (`BANNER_POOLS`, `getRotatingJobBanner`) and props `StagesScreenProps`.
   - Run typecheck: `npm run typecheck` and `cd mobile-api && npm run typecheck`. Ensure 0 errors.

Document your commands, diffs, and verification in `handoff.md` and send a message back when completed.
