# E2E Test Infra: Campus 360 Mobile Redesign

## Test Philosophy
- Opaque-box, requirement-driven verification of UI/UX redesign and functional integrity.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Workload Testing.

## Feature Inventory & Test Coverage
| # | Feature | Requirement | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Workload) |
|---|---------|-------------|:-----------------:|:-----------------:|:----------------------:|:-----------------:|
| 1 | Light Design Tokens | ORIGINAL_REQUEST §R1 | 5 cases | 5 cases | ✓ | ✓ |
| 2 | High-Contrast Typography | ORIGINAL_REQUEST §R1 | 5 cases | 5 cases | ✓ | ✓ |
| 3 | Soft Elevation Shadows | ORIGINAL_REQUEST §R1 | 5 cases | 5 cases | ✓ | ✓ |
| 4 | Backward-Compatible Theme | Explorer 1 Survey | 5 cases | 5 cases | ✓ | ✓ |
| 5 | Curved Violet TopBar | ORIGINAL_REQUEST §R2 | 5 cases | 5 cases | ✓ | ✓ |
| 6 | Floating White BottomNav | ORIGINAL_REQUEST §R2 | 5 cases | 5 cases | ✓ | ✓ |
| 7 | Circular CategoryGrid | ORIGINAL_REQUEST §R2 | 5 cases | 5 cases | ✓ | ✓ |
| 8 | Clean White Cards & Buttons | ORIGINAL_REQUEST §R2 | 5 cases | 5 cases | ✓ | ✓ |
| 9 | Full-Bleed Stage Hero Header | ORIGINAL_REQUEST §R3 | 5 cases | 5 cases | ✓ | ✓ |
| 10 | Workspace Thumbnail Strip | ORIGINAL_REQUEST §R3 | 5 cases | 5 cases | ✓ | ✓ |
| 11 | Domain & AI Match Badges | ORIGINAL_REQUEST §R3 | 5 cases | 5 cases | ✓ | ✓ |
| 12 | Stage Header & Direction Action | ORIGINAL_REQUEST §R3 | 5 cases | 5 cases | ✓ | ✓ |
| 13 | Segmented Underline Tabs | ORIGINAL_REQUEST §R3 | 5 cases | 5 cases | ✓ | ✓ |
| 14 | Quick Metadata Pill Row | ORIGINAL_REQUEST §R3 | 5 cases | 5 cases | ✓ | ✓ |
| 15 | Expandable Description & Skills | ORIGINAL_REQUEST §R3 | 5 cases | 5 cases | ✓ | ✓ |
| 16 | Recruiter / Company Card | ORIGINAL_REQUEST §R3 | 5 cases | 5 cases | ✓ | ✓ |
| 17 | Sticky Bottom Bar & 1-Click CTA | ORIGINAL_REQUEST §R3 | 5 cases | 5 cases | ✓ | ✓ |
| 18 | 1-Click Apply Flow Wiring | ORIGINAL_REQUEST §R3 | 5 cases | 5 cases | ✓ | ✓ |
| 19 | Stages Feed Cards Redesign | ORIGINAL_REQUEST §R4 | 5 cases | 5 cases | ✓ | ✓ |
| 20 | HomeScreen Harmonization | ORIGINAL_REQUEST §R4 | 5 cases | 5 cases | ✓ | ✓ |
| 21 | ProfileScreen Harmonization | ORIGINAL_REQUEST §R4 | 5 cases | 5 cases | ✓ | ✓ |
| 22 | DocumentsScreen Harmonization | ORIGINAL_REQUEST §R4 | 5 cases | 5 cases | ✓ | ✓ |
| 23 | Library & Explore Harmonization | ORIGINAL_REQUEST §R4 | 5 cases | 5 cases | ✓ | ✓ |
| 24 | Applications Timeline Harmonization | ORIGINAL_REQUEST §R4 | 5 cases | 5 cases | ✓ | ✓ |
| 25 | Auth & Onboarding Harmonization | ORIGINAL_REQUEST §R4 | 5 cases | 5 cases | ✓ | ✓ |
| 26 | Non-Breaking Integration & Typecheck | ORIGINAL_REQUEST §R5 | 5 cases | 5 cases | ✓ | ✓ |

## Test Architecture
- Test Runner: `npm run typecheck` and `node scripts/test-ui-redesign-suite.mjs`
- Exit Code Semantics: 0 = PASS, non-zero = FAIL
- Verifies:
  1. Full TypeScript compilation across root and mobile-api.
  2. AST / module export validation of design tokens in `stitch.ts` (all 42 keys, light colors, shadows, radiuses).
  3. Master shared component contract validation in `GlassComponents.tsx` (TopBar props, BottomNav, CategoryGrid, Card, Button).
  4. Immersive Stage Detail screen component integration in `StagesScreen.tsx` (all 9 elements present, connection to `AiApplyModal`).
  5. Harmonization of all secondary screens (`HomeScreen`, `ProfileScreen`, `DocumentsScreen`, `LibraryScreen`, `ApplicationsTimelineScreen`, `AuthScreen`).
