# Dispatch: Survey Explorer 3 (Stages & Screen Architectures)

## Role & Mission
Investigate `src/ui/screens/StagesScreen.tsx`, stage details presentation, and overall screen layout architecture across the app.
Authoritative user request: `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically ## 2026-10-08T01:55:15Z).
Consult `GEMINI.md` and `graphify-out/GRAPH_REPORT.md` first before reading code.

## Key Investigation Targets
1. Current implementation of `StagesScreen.tsx` (feed mode vs detail modal/view).
2. How the stage detail view is currently rendered and structured.
3. Current integration with `AiApplyModal.tsx`, WhatsApp 1-click dispatch, recruiter contact, and how they connect to the stage detail view.
4. Exact components and layout needed to match the Immersive Stage Detail Screen (Screen 2 reference):
   - Full-bleed hero image header with curved bottom corners and floating circular action buttons (Back `←`, Share, Favorite `♥`).
   - Horizontal thumbnail photo strip peeking into company workspaces/offices with "+N photos" indicator.
   - Domain pill badge + AI Match rating badge (`★ 95% Match`).
   - Prominent job title and company location with direction button.
   - Segmented tabs with purple underline indicators: `[ À propos ]`, `[ Entreprise ]`, `[ Conseils IA ]`.
   - Quick metadata pill row: Duration, Location mode, Status.
   - Rich description block with expandable "Voir plus" and required skills chips.
   - Recruiter / Company info card with direct WhatsApp and email contact buttons.
   - Fixed sticky bottom bar displaying estimated stipend and large Royal Violet CTA (`Postuler en 1 Clic`).
5. Survey `HomeScreen.tsx`, `DocumentsScreen.tsx`, `ProfileScreen.tsx`, `LibraryScreen.tsx`, `ApplicationsTimelineScreen.tsx`, and `AuthScreen.tsx` for required harmonization with Clean White & Royal Violet.

## Output
Write your findings to `.agents/teamwork/teamwork_preview_explorer_survey_3/report.md` and summarize in your handoff.
