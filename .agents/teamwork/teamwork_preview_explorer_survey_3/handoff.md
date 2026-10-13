# Handoff Report: Survey Explorer 3 (Stages & Screens Explorer)

## 1. Observation
- **`src/ui/screens/StagesScreen.tsx`**:
  - Contains 1,393 lines.
  - Line 677: `container: { flex: 1, backgroundColor: '#090714' }`.
  - Line 1005: `jobCard: { backgroundColor: '#120E22', borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.08)' }`.
  - Line 508–661: Detail view rendered inside a bottom sheet modal `<Modal visible={!!selectedDetailJob} ...>` with `detailContainer: { backgroundColor: '#120E22', maxHeight: '85%' }`.
  - Missing Screen 2 reference features: full-bleed hero banner with curved bottom corners, workspace thumbnail strip with "+N photos", segmented tabs with purple underline, recruiter contact card with direct WhatsApp and email buttons, and fixed sticky bottom bar with stipend and large Royal Violet `Postuler en 1 Clic` CTA.
- **`src/features/stages/AiApplyModal.tsx`**:
  - Line 406–465: Handles 1-Click apply via `handleOneClickApply(channel)` invoking `dispatchStageApplication` and `generateCvPdfBase64`.
  - Line 234–239: Synchronizes WhatsApp session connection via `getStoredWhatsAppStatus()`.
  - Connects to backend `POST /api/mobile/stages/dispatch` and N8N webhook `https://n8n.blackcompany.site/webhook/send-stage-application`.
- **Other Core Screens**:
  - `src/ui/screens/HomeScreen.tsx` (lines 380–466): Uses dark job cards (`#120E22`) and lacks the curved Royal Violet header and company photo carousel.
  - `src/ui/screens/ProfileScreen.tsx` (lines 405–446): Uses dark background (`#090714`) and simple dark card (`#120E22`); lacks the virtual neobank card in Royal Violet gradient.
  - `src/features/documents/DocumentsScreen.tsx` (lines 1152–1229): Uses dark background `stitchColors.paper` (`#090714`) and dark poster cards (`#131024`).
  - `src/ui/screens/ApplicationsTimelineScreen.tsx` (lines 526–539): Ticket perforation cutouts use dark background `#090714`.
- **TypeScript Health**:
  - `npm run typecheck` in project root: Exited with code 0.
  - `npm run typecheck` in `mobile-api`: Exited with code 0.

## 2. Logic Chain
1. From Observation 1, `StagesScreen.tsx` is currently trapped in the legacy obsidian dark theme with a basic 85% bottom-sheet modal.
2. The user requirement specifically demands matching Screen 2 of the reference image: an immersive stage detail screen featuring a full-bleed hero image with curved bottom corners, circular floating buttons (`←`, `Share`, `♥`), a 4-photo workspace strip with `+N photos`, domain and match rating badges, segmented tabs (`À propos`, `Entreprise`, `Conseils IA`), quick metadata pills, a recruiter card with WhatsApp/email buttons, and a sticky bottom bar with stipend and `Postuler en 1 Clic`.
3. From Observation 2, `AiApplyModal.tsx` already contains the complete 1-Click dispatch logic and WhatsApp session integration. Therefore, connecting the sticky bottom bar CTA to `AiApplyModal` requires only triggering `setApplyingJob(selectedDetailJob)`.
4. From Observation 3, all other primary screens (`HomeScreen`, `ProfileScreen`, `DocumentsScreen`, `ApplicationsTimelineScreen`, etc.) currently have hardcoded dark colors and require systematic harmonization with the Clean White (`#FFFFFF`, `#F8FAFC`) and Royal Violet (`#7C3AED`) design system.
5. From Observation 4, all existing types and compilation contracts are clean (exit code 0), meaning these UI refactorings can proceed without breaking backend or auth contracts.

## 3. Caveats
- This investigation is read-only. No source files have been modified.
- Photo URLs for workspaces use curated Unsplash pools defined in `BANNER_POOLS`; for production, companies can upload custom office galleries.
- Direction button (`Itinéraire`) will open native maps via `Linking.openURL('https://www.google.com/maps/search/?api=1&query=...')`.

## 4. Conclusion
The architectural survey and design blueprints are complete and fully documented in `.agents/teamwork/teamwork_preview_explorer_survey_3/report.md`. The design faithfully captures all 9 elements of Screen 2 and establishes the exact harmonization requirements across all core screens, preserving zero TypeScript errors.

## 5. Verification Method
1. Read the comprehensive report:
   `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\teamwork_preview_explorer_survey_3\report.md`
2. Run project typechecks to verify baseline integrity:
   - `npm run typecheck` (in root)
   - `cd mobile-api && npm run typecheck`
3. Inspect `src/ui/screens/StagesScreen.tsx` and `src/features/stages/AiApplyModal.tsx` against the specifications in `report.md`.
