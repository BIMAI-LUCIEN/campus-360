# Handoff Report: Milestone 2 — Live Catalog and Packs Integration

## 1. Observation
From analyzing `src/features/pdf/PdfStudentSection.tsx`, `App.tsx`, and `src/features/pdf/pdfApi.ts`, the following exact code behaviors were observed:

- **Library View Rendering logic in `PdfStudentSection.tsx`**:
  ```typescript
  484:       {isLibraryView ? (
  485:         <View style={styles.libraryHeadingSection}>
  486:           <Text style={styles.libraryHeadingTitle}>Mes Achats</Text>
  487:           <Text style={styles.libraryHeadingSubtitle}>
  488:             Retrouve ici tous les PDF et Packs que tu as débloqués.
  489:           </Text>
  540:         </View>
  491:       ) : (
  492:         <View style={styles.controls}>
  ...
  504:           <View style={styles.segment}>
  505:             {([
  506:               ['packs', `Packs (${publishedPacks.length})`],
  507:               ['catalog', 'PDF'],
  508:             ] as Array<[TabKey, string]>).map(([key, label]) => {
  ...
  560:         </View>
  561:       )}
  ```
  This shows that when `isLibraryView` is true (i.e. `externalTab === 'library'`), only the `libraryHeadingSection` (lines 485-489) is rendered, and the entire `controls` block (lines 492-560) containing search input, filter toolbar, and segment tabs is omitted.

- **Tab Segment Labels**:
  The segment tabs are hardcoded at line 506-507 to `['packs', 'Packs']` and `['catalog', 'PDF']` in Explorer/Catalog mode, with no dynamic label mapping for Library mode (e.g. `Mes packs` or `Mes PDF`).

- **List Rendering Condition**:
  - Packs list condition (line 667): `{!loading && !error && activeTab !== 'catalog' ? ( visiblePacks.map(...) ) : null}`
  - Documents list condition (line 755): `{!loading && !error && activeTab !== 'packs' ? ( visibleDocuments.map(...) ) : null}`
  Because `activeTab` is initialized/updated to `'library'` when in Library mode, both `activeTab !== 'catalog'` and `activeTab !== 'packs'` evaluate to `true`. Thus, both owned packs and owned documents are displayed simultaneously on the screen.

- **Suggested Packs Grouping Logic in `src/features/pdf/pdfApi.ts`**:
  ```typescript
  263: export const buildSuggestedPacks = (documents: CampusDocument[]): CampusPdfPack[] => {
  264:   const published = documents.filter((document) => document.status === 'published');
  265:   const groups = new Map<string, CampusDocument[]>();
  266: 
  267:   for (const document of published) {
  268:     const key = [document.university, document.faculty, document.level, document.subject].join('|');
  269:     groups.set(key, [...(groups.get(key) ?? []), document]);
  270:   }
  271: 
  272:   return Array.from(groups.entries())
  273:     .filter(([, items]) => items.length >= 2)
  ...
  ```
  This groups documents under the exact combination of `university`, `faculty`, `level`, and `subject`, requiring at least 2 matching documents to form a pack group. If `documents` is empty or has no groups matching this criterion, `buildSuggestedPacks` returns `[]`.

---

## 2. Logic Chain
1. Since the `controls` wrapper is nested inside the `else` branch of the `isLibraryView` ternary operator in `PdfStudentSection.tsx`, the segment tabs, search input, and filter toolbar are completely hidden from the user in Library mode.
2. Because the segment tabs are hidden, the user cannot switch tabs, and the segment labels `'Mes packs'` and `'Mes PDF'` cannot be shown.
3. Because the `activeTab` state is set to `'library'` in Library mode, the two list render conditions (`activeTab !== 'catalog'` and `activeTab !== 'packs'`) are both satisfied. Therefore, both owned packs and owned documents are rendered together in a single continuous view.
4. If no packs are returned from the database, the system attempts to run `buildSuggestedPacks`. However, if the database also has no documents, or if documents don't share the same `[university, faculty, level, subject]` metadata in groups of size `>= 2`, `buildSuggestedPacks` returns an empty array.
5. In this case, `visiblePacks` is empty, causing the Packs view (in Explorer) to fall back to showing the `"Aucun pack"` empty state.

---

## 3. Caveats
- No caveats. We performed a full static analysis of all relevant parts in the codebase, and did not find any conflicting configuration or routing that overrides this behavior.

---

## 4. Conclusion
The codebase does not comply with the design specification in `docs/superpowers/specs/2026-06-20-explorer-library-separation-design.md`:
1. The Library view does not have segment tabs, preventing separate views for packs and documents.
2. The segment labels `'Mes packs'` and `'Mes PDF'` are missing.
3. The search and filter utilities are missing in Library view.
4. Explorer mode defaults to the PDF tab instead of letting the user land on Packs.
5. `buildSuggestedPacks` fallback is too strict and will return empty results if documents do not share the exact same combination of university, faculty, level, and subject.

---

## 5. Verification Method
- **Static verification**: Inspect `src/features/pdf/PdfStudentSection.tsx` at line 484. Note that `isLibraryView ? ( ... ) : ( ... )` splits rendering so that the entire `controls` container (with segment tabs and search input) is bypassed when `isLibraryView` is true.
- **Compilation verification**: Run `npm run typecheck` or `npx tsc --noEmit` from the root directory to verify type soundness of the React Native files.
- **Layout verification**: Open `App.tsx` and check line 1837: `externalTab={activeSection === 'explore' ? 'catalog' : 'library'}`.
