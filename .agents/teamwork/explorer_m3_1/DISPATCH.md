## 2026-10-08T06:19:54Z
You are Explorer 1 for Milestone M3: Immersive Stage Detail Screen & White Feed in Campus 360 React Native app.

Working directory: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m3_1\
Ensure you create your working directory metadata files there (progress.md, handoff.md, analysis.md).
MANDATORY: You MUST read the authoritative user request at:
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md (specifically §R3 and §R4)
and the project plan at:
c:\Users\DELL\Desktop\mes projet\campus-360\PROJECT.md.

YOUR MISSION:
Perform a deep technical investigation of `src/ui/screens/StagesScreen.tsx`:
1. Analyze the current implementation: imports, state management (selected stage, filters, search, modal state, active tab, etc.), data structures (`StageJob` or equivalent items, photos, recruiter info, skills, badges, stipend).
2. Examine how the feed is currently rendered (cards, cover photos, AI match badge, interactions) and how selecting a job triggers the detail view or modal.
3. Detail the exact technical requirements to implement Screen 2 (R3 of ORIGINAL_REQUEST.md):
   - Full-bleed hero image header with curved bottom corners and floating circular action buttons (Back, Share, Favorite).
   - Horizontal thumbnail photo strip peeking into company workspaces with "+N photos" badge.
   - Domain pill badge + AI Match rating badge.
   - Prominent job title and company location with direction action.
   - Segmented tabs with purple underline indicators: `[ À propos ]`, `[ Entreprise ]`, `[ Conseils IA ]`.
   - Quick metadata pill row: Duration, Location mode, Status.
   - Rich description block with expandable "Voir plus" and required skills chips.
   - Recruiter / Company info card with direct WhatsApp and email contact buttons.
   - Fixed sticky bottom bar with estimated stipend and large Royal Violet CTA (`Postuler en 1 Clic`).
   - Aired white feed cards with cover photo and AI match badges.
4. Verify all icons available from `lucide-react-native` (e.g., `ChevronLeft`, `Share2`, `Heart`, `MapPin`, `Clock`, `Briefcase`, `Sparkles`, `ExternalLink`, `MessageCircle`, `Mail`, `Compass`, etc.).
5. Check type safety: ensure all properties on jobs/stages match existing TypeScript interfaces or define non-breaking extensions so `npm run typecheck` will pass with 0 errors.

Write your findings to:
`c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m3_1\analysis.md`
and a structured handoff report in:
`c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m3_1\handoff.md`.
Send a message back when completed. You are READ-ONLY — DO NOT MODIFY application code.
