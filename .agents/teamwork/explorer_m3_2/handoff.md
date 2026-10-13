# Handoff Report: Explorer M3-2 (StagesScreen.tsx Integration & Blueprint)

**Milestone:** M3 (Immersive Stage Detail Screen & White Feed)  
**Agent:** Explorer M3-2  
**Date:** 2026-10-08  
**Working Directory:** `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m3_2\`  
**Target File for Worker M3:** `src/ui/screens/StagesScreen.tsx`

---

## 1. Observation

1. **Authoritative Specification:**
   - In `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\ORIGINAL_REQUEST.md` lines 96–107:
     > `### R3. Immersive Stage Detail Screen (src/ui/screens/StagesScreen.tsx)`  
     > `1. Full-bleed hero image header with curved bottom corners and floating circular action buttons (Back ←, Share, Favorite ♥).`  
     > `2. Horizontal thumbnail photo strip peeking into company workspaces/offices with "+N photos" indicator.`  
     > `3. Domain pill badge (Stage Pré-embauche / Informatique) + AI Match rating badge (★ 95% Match).`  
     > `4. Prominent job title and company location with direction button.`  
     > `5. Segmented tabs with purple underline indicators: [ À propos ], [ Entreprise ], [ Conseils IA ].`  
     > `6. Quick metadata pill row: Duration (🏃 3 à 6 mois), Location mode (📍 Présentiel), Status (🕒 Ouvert).`  
     > `7. Rich description block with expandable "Voir plus" and required skills chips.`  
     > `8. Recruiter / Company info card with direct WhatsApp and email contact buttons.`  
     > `9. Fixed sticky bottom bar displaying estimated stipend on the left (75 000 FCFA /mois or mention) and a large rounded Royal Violet CTA on the right (Postuler en 1 Clic).`  
     > `### R4. Global Screen Harmonization`  
     > `- StagesScreen Feed: Feed d'offres en cartes blanches aérées avec photo de couverture, badges de match IA, et ouverture instantanée de la vue détaillée immersive.`

2. **Existing Application Wiring:**
   - In `src/ui/screens/StagesScreen.tsx` (lines 28, 47–101, 155–169, 665–671):
     - `AiApplyModal` is imported from `../../features/stages/AiApplyModal`.
     - `applyingJob` state controls modal visibility: `<AiApplyModal visible={!!applyingJob} job={applyingJob} studentProfile={studentProfile} onClose={() => setApplyingJob(null)} />`.
     - `BANNER_POOLS` and `getRotatingJobBanner(job, index)` are exported and actively used.
     - The existing detail view (lines 508–661) was a dark modal bottom sheet with background `#120E22` rather than the required full-bleed Clean White & Royal Violet screen.

3. **AiApplyModal Flow & 1-Click Dispatch:**
   - In `src/features/stages/AiApplyModal.tsx` (lines 46–63, 406–465, 867–955):
     - When `job` is passed, it triggers `generateIaApplication` to generate the official CV & pitch.
     - When WhatsApp is paired (`isWhatsAppLinked`), the primary button is `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]` which calls `dispatchStageApplication` with generated CV PDF base64.
     - When Email is chosen, it sends via SMTP N8N.
     - When unlinked, it offers 30-second WhatsApp pairing modal (`WhatsAppPairingModal`) or manual native WhatsApp fallback.
     - It displays an official confirmation receipt card with reference ID `CAMPUS-XXXXX` and timeline sync.

4. **Design Tokens & Theme Foundation:**
   - In `src/theme/stitch.ts`:
     - Clean White & Royal Violet tokens: `stitchColors.paper` (`#FFFFFF`), `stitchColors.paperDeep` (`#F8FAFC`), `stitchColors.paperSoft` (`#F1F5F9`), `stitchColors.ink` (`#0F172A`), `stitchColors.inkMuted` (`#64748B`), `stitchColors.sienna` (`#7C3AED`), `stitchColors.siennaBg` (`rgba(124, 58, 237, 0.08)`), `stitchColors.emeraldTone` (`#059669`).
     - Radiuses: `stitchRadius.card` (`20`), `stitchRadius.button` (`16`), `stitchRadius.full` (`9999`).
     - Shadows: `stitchShadows.card`, `stitchShadows.floating`, `stitchShadows.primary`.

5. **Typecheck Baseline:**
   - Ran `npm run typecheck` in project root:
     > `campus-360@1.0.0 typecheck`  
     > `node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit`  
     > Exit code 0 (zero errors).
   - Ran `cd mobile-api && npm run typecheck`:
     > `campus-360-mobile-api@1.0.0 typecheck`  
     > `tsc --noEmit`  
     > Exit code 0 (zero errors).

---

## 2. Logic Chain

1. **Why Full-Bleed Modal is the optimal container for Immersive Detail Screen:**
   - In `src/AppShell.tsx`, `StagesScreen` is mounted inside a top-level `ScrollView` and underneath `TopBar`, with `BottomNav` floating at the bottom.
   - If the detail screen were an inline `<View>`, the sticky bottom bar would scroll out of view inside `AppShell`'s `ScrollView`, and `TopBar` would prevent the hero image from being full-bleed (0px from screen top).
   - Using `<Modal visible={!!selectedDetailJob} animationType="slide" statusBarTranslucent>` allows:
     a) Full-bleed hero image header reaching the top of the display.
     b) Circular action buttons floating with safe-area top inset.
     c) Fixed sticky bottom bar with safe-area bottom inset.
     d) Seamless slide-down exit back to the feed upon clicking Back `←`.

2. **Why 1-Click Apply works directly from the sticky bottom CTA:**
   - From the detail screen, clicking `[ Postuler en 1 Clic ]` calls `setApplyingJob(selectedDetailJob)`.
   - On iOS, closing the detail modal briefly (`setSelectedDetailJob(null)`) with a 350ms delay before setting `applyingJob` ensures native modal presentation does not encounter UIViewController hierarchy conflicts.
   - On Android and Web, `AiApplyModal` mounts cleanly on top.
   - `AiApplyModal` handles background dispatch through `dispatchStageApplication` via Evolution API & N8N webhook, closing the loop seamlessly.

3. **Why workspace photos can be enriched without backend changes:**
   - `BANNER_POOLS` in `StagesScreen.tsx` provides pools of 4–5 Unsplash workspace photos keyed by industry (tech, finance, btp, marketing, logistics, health, law, admin).
   - The pure helper `getWorkspacePhotos(job)` extracts 4 photos for the horizontal strip, and overlays `+N photos` on the 4th thumbnail, fulfilling requirement §R3.2 with zero backend modifications or DB migrations.

4. **Why Recruiter Direct Contact actions are safe and fully functional:**
   - `job.company?.contactWhatsapp` and `contactEmail` exist in `StageCompany`.
   - The WhatsApp button triggers `Linking.openURL('https://wa.me/' + phone)` and email triggers `Linking.openURL('mailto:' + email)`.

---

## 3. Caveats

- **No Caveats regarding type safety:** The contract for `StagesScreenProps` remains identical: `{ studentProfile: ..., onSelectJob?: ..., onOpenWallet?: ... }`.
- **Preserved Exports:** `BANNER_POOLS` and `getRotatingJobBanner` must remain exported because they may be referenced across the workspace.
- **Safe Area Inset Handling:** Worker M3 must use `Platform.OS === 'ios'` padding conditionals (`paddingTop: 48`, `paddingBottom: 32`) to ensure buttons do not collide with iOS notches or home indicators.

---

## 4. Conclusion

The integration surface, styling tokens, component tree, and application flow for `src/ui/screens/StagesScreen.tsx` are fully mapped and detailed in:
`c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_m3_2\analysis.md`.

Worker M3 has an exact, copy-pasteable blueprint containing:
1. Clean White feed cards with cover photos, match score badges, and instant transition to detail screen.
2. Immersive Stage Detail Screen featuring:
   - Full-bleed hero image (height: 290, curved bottom corners: 32px) with floating Back `←`, Share, and Favorite `♥` buttons.
   - Horizontal workspace photo strip with "+N photos" badge.
   - Domain pill & AI match rating badge.
   - Prominent job title and company location with "Itinéraire ↗" direction button.
   - Segmented underline tabs (`[ À propos ]`, `[ Entreprise ]`, `[ Conseils IA ]`).
   - Quick metadata pill row (Duration, Location, Status).
   - Expandable description block with "Voir plus" toggle and skill chips.
   - Recruiter info card with direct WhatsApp and Email contact buttons.
   - Fixed sticky bottom bar with estimated stipend and large Royal Violet `Postuler en 1 Clic` CTA.
3. 1-Click apply flow connected directly to `AiApplyModal.tsx`.

---

## 5. Verification Method

To verify the implementation once Worker M3 finishes coding:
1. **Typecheck verification:**
   ```powershell
   npm run typecheck
   ```
   Must exit with code 0 (zero errors).
2. **Backend API typecheck verification:**
   ```powershell
   cd mobile-api; npm run typecheck; cd ..
   ```
   Must exit with code 0 (zero errors).
3. **Visual & Behavioral Verification:**
   - Inspect `src/ui/screens/StagesScreen.tsx` to verify all 9 components of §R3 are present.
   - Verify that clicking any job card in the feed opens the immersive detail view with full-bleed hero.
   - Verify that clicking Back `←` dismisses the detail view cleanly.
   - Verify that clicking `Postuler en 1 Clic` triggers `AiApplyModal`.
   - Invalidation condition: Any TypeScript compiler error or missing props in `StagesScreenProps`.
