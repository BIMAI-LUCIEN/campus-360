## 2026-10-08T07:54:01Z
You are Worker M4 (Replacement) for Milestone M4: Global Screen Harmonization in Campus 360 React Native application.

Working directory: c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\worker_m4_rep1\
Ensure you create and maintain your progress.md and handoff.md in that directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read the user request at:
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md (§R4 & §R5)
and read the explorer handoff report and step-by-step implementation recipes at:
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m4_1\handoff.md
c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m4_1\analysis.md

WRITE OWNERSHIP:
You have exclusive write ownership of:
- `src/ui/screens/HomeScreen.tsx`
- `src/ui/screens/ProfileScreen.tsx`
- `src/features/documents/DocumentsScreen.tsx`
- `src/ui/screens/ResourcesScreen.tsx`
- `src/ui/screens/ExploreScreen.tsx`
- `src/ui/screens/LibraryScreen.tsx`
- `src/ui/screens/ApplicationsTimelineScreen.tsx`
- `src/ui/screens/AuthScreen.tsx`
- `src/ui/screens/OnboardingScreen.tsx`

YOUR OBJECTIVE:
Harmonize all target screens to the Clean White & Royal Violet design system following the recipes in `analysis.md`:
1. `src/ui/screens/HomeScreen.tsx`:
   - Curved violet gradient hero banner (`brandGradient` or `#7C3AED` with bottom radius 24-30).
   - `#RecommandéPourToi` horizontal carousel with company workspace photo banners.
   - Circular filières (integrate `CategoryGrid` or circular 56x56 avatars).
   - Feed of top offers on Clean White cards (`stitchColors.paper: #FFFFFF`, `#F1F5F9`, `stitchShadows.card`).
2. `src/ui/screens/ProfileScreen.tsx`:
   - Virtual neobank wallet card in Royal Violet gradient (`brandGradient`) showing balance, IA credits, and recharge CTA (`onRecharge`).
   - Clean white card for WhatsApp pairing status with direct access to `WhatsAppPairingModal`.
   - Clean white settings list with high-contrast text and purple accents.
3. `src/features/documents/DocumentsScreen.tsx`:
   - Clean white workspace (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`).
   - 2-column HR official CV preview section/modal using `OfficialCvView`.
   - Royal Violet action buttons (`#7C3AED`).
4. `src/ui/screens/ResourcesScreen.tsx` & `ExploreScreen.tsx` & `LibraryScreen.tsx`:
   - Clean white background (`#F8FAFC`, `#FFFFFF`), purple tag pills, clean PDF grid cards.
5. `src/ui/screens/ApplicationsTimelineScreen.tsx`:
   - Boarding-pass ticket style with clean white cards, perforated punch cutouts on light background (`#F8FAFC`), and crisp violet/emerald status badges.
6. `src/ui/screens/AuthScreen.tsx` & `OnboardingScreen.tsx`:
   - Modern clean white login and onboarding cards, inputs, and Royal Violet buttons.

VERIFICATION:
- Zero TypeScript errors: run `npm run typecheck`, `cd mobile-api && npm run typecheck`, and `cd recruiter-web && npm run typecheck`.
- Preserve all existing props on each screen so `AppShell.tsx` and all parent components experience zero breaking changes.

Document your work in `handoff.md` and send a message back when completed.

## 2026-10-08T08:31:29Z
**Context**: Milestone M4 Screen Harmonization
**Content**: Checking in on progress across the 6 screen harmonization steps. Which screens have been completed and what are you currently editing?
**Action**: Please update progress.md or send a brief status update.
