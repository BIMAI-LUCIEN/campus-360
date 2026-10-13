# Empirical Challenge & Verification Report: Milestone M3

**Challenger:** Challenger 1 (Milestone M3)  
**Target:** `src/ui/screens/StagesScreen.tsx`  
**Interface Contracts:** `ORIGINAL_REQUEST.md` (§R3 lines 96–107, §R4 lines 108–110, §R5 lines 117–120), `worker_m3_1/handoff.md`  
**Verdict:** **CONFIRMED CORRECT**

---

## 1. Observation

### 1.1 Automated Test Execution
We authored and executed the empirical test suite in `scripts/test-m3-stages-detail.mjs`.

- **Command:** `node scripts/test-m3-stages-detail.mjs`
- **Exit Code:** `0`
- **Output Summary:**
  ```text
  ==============================================================================
  📊 CHALLENGER M3 TEST EXECUTION SUMMARY
  ==============================================================================
  Total Suites:   9
  Total Tests:    52
  Passed Tests:   52 ✅
  Failed Tests:   0 
  Total Duration: 3278ms
  ==============================================================================

  🟢 VERDICT: CONFIRMED CORRECT
  ```

### 1.2 TypeScript Compilation Checks
We executed strict compiler checks across all workspaces:

1. **Root Expo App Typecheck:**
   - **Command:** `npm run typecheck`
   - **Exit Code:** `0`
   - **Verbatim Output:**
     ```text
     > campus-360@1.0.0 typecheck
     > node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit
     ```
2. **Mobile API Backend Typecheck:**
   - **Command:** `cd mobile-api; npm run typecheck; cd ..`
   - **Exit Code:** `0`
   - **Verbatim Output:**
     ```text
     > campus-360-mobile-api@1.0.0 typecheck
     > tsc --noEmit
     ```
3. **Recruiter Web Portal Typecheck:**
   - **Command:** `cd recruiter-web; npm run typecheck; cd ..`
   - **Exit Code:** `0`
   - **Verbatim Output:**
     ```text
     > campus-360-admin@0.1.0 typecheck
     > tsc --noEmit
     ```

### 1.3 Code Inspection & AST Structure of Screen 2 (§R3 — 9 Features)
In `src/ui/screens/StagesScreen.tsx`:

1. **Modal Isolation (Lines 616–623):**
   `<Modal visible={!!selectedDetailJob} animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedDetailJob(null)}>`
   renders Screen 2 as an isolated full-bleed modal with transparent status bar.
2. **Feature 1 — Hero Image Header (Lines 630–673, 1505–1540):**
   - Container has `height: 290`, `borderBottomLeftRadius: 32`, `borderBottomRightRadius: 32`.
   - Banner renders `getRotatingJobBanner(selectedDetailJob)`.
   - Floating circular action buttons (42x42px, radius 21, `stitchShadows.md`): Back (`btn-detail-back`), Share (`btn-detail-share` invoking `handleShareJob`), Favorite (`btn-detail-favorite` with red toggle fill).
3. **Feature 2 — Workspace Photo Strip (Lines 678–714, 1550–1590):**
   - Horizontal `ScrollView` displays company workspace photos.
   - First 3 slots (74x74px, radius 14) render `getWorkspacePhotos(selectedDetailJob).slice(0, 3)`.
   - 4th slot renders photo thumbnail with dark overlay and badge `+${Math.max(1, getWorkspacePhotos(selectedDetailJob).length - 3)} photos`.
   - Clicking any photo opens a high-res photo preview modal (`selectedPreviewPhoto`, lines 1086–1112).
4. **Feature 3 — Domain & AI Match Badges (Lines 717–731, 1592–1626):**
   - Lavender domain pill (`Briefcase`, `contractType` fallback `Stage Pré-embauche`, `industry` fallback `Informatique`).
   - Emerald AI Match pill (`Star`, `★ ${matchScore}% Match`).
5. **Feature 4 — Prominent Job Title & Direction Action (Lines 734–775, 1628–1675):**
   - High-contrast title (`fontSize: 22, fontWeight: '800', color: stitchColors.ink, lineHeight: 28`).
   - Company avatar with logo or initials fallback (`CP`), verified check badge (`CheckCircle2`), and location.
   - Direction button `Itinéraire ↗` (`directionBtn`, calling `handleOpenDirections` with map fallbacks).
6. **Feature 5 — Segmented Tabs with Underline Indicator (Lines 778–832, 1678–1708):**
   - 3 tabs: `À propos` (`tab-about`), `Entreprise` (`tab-company`), `Conseils IA` (`tab-aiAdvice` with `Sparkles`).
   - Active indicator `activeTabUnderline` in Royal Violet (`backgroundColor: stitchColors.sienna`, height 3, radius 2).
   - Toggles dynamic tab blocks: description & skills, company details & KYB compliance (lines 940–952), AI affinity analysis (lines 969–1016).
7. **Feature 6 — Quick Metadata Pill Row (Lines 835–857, 1710–1737):**
   - 3 cards: Duration (`Clock`, `🏃 3 à 6 mois`), Mode (`MapPin`, `📍 Présentiel`), Status (`CheckCircle2`, `🕒 Ouvert`).
8. **Feature 7 — Rich Description & Skills Chips (Lines 864–926, 1740–1780):**
   - Description with `numberOfLines={isDescExpanded ? undefined : 4}`.
   - Expandable toggle button (`btn-toggle-description`) switching between `Voir plus` and `Voir moins` with `ChevronDown` / `ChevronUp` when `description.length > 180`.
   - Required skills chips highlighting matching skills from `studentProfile.skills` in Royal Violet with `CheckCircle2`.
9. **Feature 8 — Recruiter / Company Info Card (Lines 1020–1055, 1916–1989):**
   - Recruiter card with avatar (`Building2`), verified check, quick response guarantee note.
   - WhatsApp direct action (`recruiterWhatsAppBtn`, calling `handleRecruiterWhatsapp` via `wa.me/<cleanPhone>`).
   - Email direct action (`recruiterEmailBtn`, calling `handleRecruiterEmail` via `mailto:<email>`).
10. **Feature 9 — Fixed Sticky Bottom Bar (Lines 1063–1082, 1991–2030):**
    - Rendered outside the inner `ScrollView` with `position: 'absolute'`, `bottom: 0`, left 0, right 0, and `...stitchShadows.floating`.
    - Left side: `INDEMNITÉ ESTIMÉE` with amount and `/mois` unit (cleans parenthesized notes or falls back to `75 000 FCFA`).
    - Right side: Large rounded Royal Violet button (`stickyApplyBtn`, `stitchColors.sienna`, `stitchShadows.primary`) with text `Postuler en 1 Clic`.
    - Invokes `handleApplyFromDetail` with a 350ms (iOS) / 200ms (Android) transition delay to dismiss the detail modal and open `AiApplyModal` without modal collision.

### 1.4 Code Inspection & AST Structure of Screen 1 (§R4 — Clean White Feed Cards)
In `src/ui/screens/StagesScreen.tsx` (Lines 492–612, 1290–1360):
- Feed cards render on clean white surfaces (`backgroundColor: stitchColors.paper`, `...stitchShadows.card`, `borderRadius: 20`, `borderColor: '#F1F5F9'`).
- Cover image banner with `getRotatingJobBanner(job, index)`.
- Floating contract pill (`floatingContractBadge`) and AI match rating pill (`floatingMatchBadge` with `Star`).
- Company avatar with logo or initials, verified check badge, location, and requirements tags.
- Tapping any card triggers `setSelectedDetailJob(job)`, opening the Immersive Stage Detail Modal.
- The `Postuler` button on the feed card calls `e.stopPropagation()` and triggers `setApplyingJob(job)` directly.

---

## 2. Logic Chain

1. **Empirical AST & Contract Verification (Observation 1.1, 1.3, 1.4):**
   - All 9 required features of Screen 2 (§R3) are verifiably present in `StagesScreen.tsx` with exact testIDs, handlers, and visual styles matching the specification.
   - The feed card redesign (§R4) adheres strictly to the Clean White & Royal Violet design system with proper click isolation (`e.stopPropagation()` for direct apply, card click for detail view).
2. **Pure Functions Robustness (Observation 1.1, Suite 4, 5, 6):**
   - `BANNER_POOLS` defines 9 distinct industry pools, each containing 3+ valid HTTPS Unsplash URLs (total > 30 unique URLs).
   - `getRotatingJobBanner` prioritizes authentic flyers, filters out placeholders, correctly classifies jobs across 8+ sector regexes, and rotates deterministically based on character hashing and index.
   - `getWorkspacePhotos` preserves explicit workspace photo arrays and falls back to generating 4 to 5 rich workspace photos from industry pools when missing, ensuring the `+N photos` badge always functions as intended.
3. **Adversarial Edge Case Handling (Observation 1.1, Suite 7):**
   - Jobs with missing or null companies fall back safely (`CP` initials, `Entreprise Partenaire` title, `Douala, Cameroun` address, `237690123456` recruiter phone, `recrutement@campus360.app` email).
   - Jobs with missing stipends fall back to `75 000 FCFA` in the detail modal and `Gratification` in the feed card.
   - Jobs with missing descriptions display a polite fallback message, and the `Voir plus` button is safely suppressed when description length is under 180 characters.
   - Student profiles with undefined or empty skills arrays do not cause crashes during requirements matching due to optional chaining (`studentProfile.skills?.some(...)`).
4. **Theme Token Conformance (Observation 1.1, Suite 8):**
   - `StagesScreen.tsx` imports and consumes the canonical tokens: `stitchColors.paper` (#FFFFFF), `stitchColors.paperDeep` (#F8FAFC), `stitchColors.paperSoft`, `stitchColors.sienna` (#7C3AED), `stitchColors.ink` (#0F172A), `stitchShadows.card`, `stitchShadows.primary`, and `stitchShadows.floating`.
   - Legacy obsidian dark container backgrounds (`#090714`, `#120E22`) have been removed from the active view hierarchy.
5. **Type Safety & Non-Breaking Architecture (Observation 1.2):**
   - Running `npm run typecheck` across root (`campus-360`), `mobile-api`, and `recruiter-web` produced 0 errors.

---

## 3. Caveats

1. **Regex Word Boundary on `/com/` in Sector Classification:**
   In line 133 of `StagesScreen.tsx`:
   ```ts
   } else if (/market|com|vente|commercial|publicité|brand|événement|cosmét/.test(text)) {
     poolKey = 'marketing';
   ```
   The shorthand `com` (intended for "communication") acts as a substring match for words like "commerce". Consequently, jobs with industry "Commerce Général" map to the `marketing` pool rather than `default`. This is visually appropriate as marketing photos suit commercial jobs, and does not cause runtime issues, but could be refined to `\bcom\b` or `communicat` in a future enhancement.
2. **Native Map Intent Schemes on Physical Devices:**
   `handleOpenDirections` attempts to invoke platform-specific URI schemes (`maps:0,0?q=...` on iOS and `geo:0,0?q=...` on Android) with a fallback to `https://maps.google.com/?q=...`. We verified URL construction and fallbacks in code and simulation; execution on real physical devices depends on whether a native navigation app is installed.

---

## 4. Conclusion

Milestone M3 implementation in `src/ui/screens/StagesScreen.tsx` has been empirically tested, challenged with adversarial edge cases, and confirmed to meet all requirements of §R3, §R4, and §R5 in `ORIGINAL_REQUEST.md`.

- **All 9 features of Screen 2** (Curved Hero Header, Workspace Photo Strip with +N indicator, Badges, Title & Directions, Segmented Underline Tabs, Quick Metadata Row, Rich Description & Skills Chips, Recruiter Card with WhatsApp/Email, Fixed Sticky Bottom Bar) are fully implemented and structurally verified.
- **Screen 1 Feed Cards** render in Clean White with hero covers and instant detail modal opening.
- **Pure functions** `getWorkspacePhotos`, `getRotatingJobBanner`, and `BANNER_POOLS` are fully exported, operational, and resilient to empty/missing data.
- **Zero TypeScript compilation errors** across all project workspaces.

**Final Verdict: CONFIRMED CORRECT**

---

## 5. Verification Method

To independently reproduce the empirical verification:

1. **Run the Challenger M3 Automated Test Suite:**
   ```powershell
   node scripts/test-m3-stages-detail.mjs
   ```
   *Expected outcome: 52 tests across 9 suites pass with exit code 0.*

2. **Verify Expo Root Application Typecheck:**
   ```powershell
   npm run typecheck
   ```
   *Expected outcome: Exits with code 0 (zero errors).*

3. **Verify Mobile API Backend Typecheck:**
   ```powershell
   cd mobile-api; npm run typecheck; cd ..
   ```
   *Expected outcome: Exits with code 0 (zero errors).*

4. **Verify Recruiter Web Typecheck:**
   ```powershell
   cd recruiter-web; npm run typecheck; cd ..
   ```
   *Expected outcome: Exits with code 0 (zero errors).*
