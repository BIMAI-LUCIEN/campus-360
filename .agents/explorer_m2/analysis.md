# Milestone 2 Investigation: Live Catalog and Packs Integration Analysis

## Executive Summary
The live catalog and pack listings are bound to the `pdfApi.ts` endpoints, falling back to local suggestion generation if no packs are found in the database. However, the 'Explorer' and 'Library' view separation is not properly implemented: in Library mode, segment tabs do not exist, search and filters are completely hidden, and all owned packs and documents are displayed together on a single screen in violation of the design specification.

---

## Detailed Findings

### 1. Catalog and Pack Listing Bindings
- **API Bindings**: The listings are fully bound to the async state loaded in `App.tsx` via `listPublishedPdfDocuments()` and `listPublishedPdfPacks()` (defined in `src/features/pdf/pdfApi.ts`).
  - `pdfDocuments` is loaded in `App.tsx:522` via `listPublishedPdfDocuments()`.
  - `pdfPacks` is loaded in `App.tsx:524` via `listPublishedPdfPacks(documents)`.
- **Local Fallback / Mock Data**:
  - If Supabase is unconfigured (i.e. `isSupabaseConfigured()` is false), both API functions return `[]` directly. There is no mock data override of document listings or pack listings in `pdfApi.ts` or in `PdfStudentSection.tsx` properties.
  - However, `PdfStudentSection.tsx` defines hardcoded default filter option lists (e.g. `subjects` in `170-176`, `universities` in `179-188`, `faculties` in `190-201`, `levels` in `203-210`). These defaults are prepended to the extracted options, meaning they will be visible in the filter sheet even if the API returns 0 documents.
  - For packs, if `listPublishedPdfPacks()` returns an empty list, `App.tsx:525` falls back to calling `buildSuggestedPacks(documents)` to generate suggestions locally.

---

### 2. Explorer and Library View Separation
The current implementation diverges significantly from the design specification in `docs/superpowers/specs/2026-06-20-explorer-library-separation-design.md`:
- **Segment Tabs in Library Mode**: 
  - **Do not exist**. In `PdfStudentSection.tsx:484-491`, when `isLibraryView` is true (i.e., `externalTab === 'library'`), only `libraryHeadingSection` is rendered. The entire `controls` block (lines `492-560`), which contains the segment tabs, search input, and filter toolbar, is omitted.
  - Consequently, there are no tabs labeled **'Mes packs'** and **'Mes PDF'** in Library mode, and the user has no way to toggle or filter between the two datasets.
- **Data Rendering & Filtering**:
  - Under `activeTab === 'library'`, the component evaluates `activeTab !== 'catalog'` to true (rendering all owned packs) and `activeTab !== 'packs'` to true (rendering all owned documents).
  - As a result, both lists are rendered one after another on the same screen. While the lists themselves are correctly filtered by ownership, this does not match the tab-separated UX requested.
- **Explorer Mode Tab Issues**:
  - In `App.tsx:1837`, navigating to the "Explorer" section passes `externalTab='catalog'`, which overrides the default tab of `PdfStudentSection.tsx` and forces it to open the PDF (catalog) tab, rather than letting it naturally default to the Packs tab first.
  - The segment labels in Explorer mode are hardcoded as `"Packs (X)"` and `"PDF"` rather than adjusting dynamically.

---

### 3. Behavior of `buildSuggestedPacks`
- **Logic**: In `src/features/pdf/pdfApi.ts:263-303`, this helper groups published documents by matching `[university, faculty, level, subject]`.
- **Filtering**: It strictly filters for groups having `items.length >= 2`.
- **No Packs Fallback**:
  - If no packs exist in the database, `App.tsx` calls `buildSuggestedPacks(documents)`.
  - If documents are found and can be grouped in pairs or larger, up to 6 local pack suggestions (with IDs starting with `local-pack-`) are created and displayed.
  - If the database returns 0 published documents, or if none of the documents share the same `university`, `faculty`, `level`, and `subject` (groups of size `< 2`), then `buildSuggestedPacks` returns `[]`.
  - Under this condition, the packs list is set to `[]` and the component renders the empty state: `"Aucun pack. Essaie une autre recherche ou regarde les PDF."`

---

### 4. Bugs, Missing Features, and UX Inconsistencies
1. **Critical Bug (Specification Violation)**: In Library mode, segment tabs are completely missing, meaning there is no way to view "Mes packs" and "Mes PDF" separately.
2. **Missing Feature (Search and Filter in Library)**: Hiding the entire `controls` block in Library mode prevents the user from searching or filtering their owned documents.
3. **UX Inconsistency (Tab Locking)**: Navigating to Explorer forces the tab to "PDF" (`'catalog'`), ignoring the segment tabs' natural default.
4. **Strict Suggestion Logic**: The grouping key in `buildSuggestedPacks` is very strict (requiring four exact matches). It is highly likely to fail and return an empty array if the document corpus has high variety and low density.
