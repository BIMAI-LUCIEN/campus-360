# Project: Campus 360 — Royal Violet & Clean White Mobile Redesign

## Architecture
- **Framework:** Expo SDK 54, React Native 0.81.5, React 19, TypeScript
- **Styling Architecture:** Design tokens defined in `src/theme/stitch.ts` (`stitchColors`, `stitchTypography`, `stitchRadius`, `stitchShadows`, `brandGradient`) consumed across 23+ components and screens.
- **Master UI Library:** `src/ui/GlassComponents.tsx` (TopBar, BottomNav, CategoryGrid, Card, Button, Input, Pill, Badges).
- **Primary Screens:**
  - `src/ui/screens/HomeScreen.tsx` — Main portal feed, carousels, categories
  - `src/ui/screens/StagesScreen.tsx` — Stages feed & Immersive Stage Detail view
  - `src/ui/screens/ProfileScreen.tsx` — User profile, neobank wallet card, WhatsApp pairing
  - `src/features/documents/DocumentsScreen.tsx` — CV generation & document workspace
  - `src/ui/screens/LibraryScreen.tsx` & `ExploreScreen.tsx` — Academic resources & PDF library
  - `src/ui/screens/ApplicationsTimelineScreen.tsx` — Application tracking & status timeline
  - `src/ui/screens/AuthScreen.tsx` & `OnboardingScreen.tsx` — Authentication & onboarding flows
- **App Shell Navigation:** `src/AppShell.tsx` hosting `TopBar` and `BottomNav`.

## Code Layout
```
src/
├── theme/
│   └── stitch.ts                # [M1] Royal Violet & Clean White tokens, shadows, radiuses
├── ui/
│   ├── GlassComponents.tsx      # [M2] Master shared components (TopBar, BottomNav, CategoryGrid, etc.)
│   └── screens/
│       ├── StagesScreen.tsx     # [M3] Immersive Stage Detail Screen & White Feed
│       ├── HomeScreen.tsx       # [M4] Curved violet header, circular categories, #RecommandéPourToi
│       ├── ProfileScreen.tsx    # [M4] Neobank virtual wallet, clean settings
│       ├── LibraryScreen.tsx    # [M4] Clean white document grid
│       ├── ExploreScreen.tsx    # [M4] Academic resource catalog
│       ├── ApplicationsTimelineScreen.tsx # [M4] Boarding-pass application tracking
│       └── AuthScreen.tsx       # [M4] Modern white auth & onboarding
├── features/
│   ├── documents/
│   │   └── DocumentsScreen.tsx  # [M4] Clean white CV preview & actions
│   └── stages/
│       ├── AiApplyModal.tsx     # 1-Click WhatsApp & Email application flow
│       └── stagesApi.ts         # Backend stage dispatch API
└── AppShell.tsx                 # [M2] App container wiring TopBar and BottomNav
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Light Design Tokens | Replace dark obsidian with Clean White (#FFFFFF, #F8FAFC) and Royal Violet (#7C3AED, #8B5CF6) | M1 | ORIGINAL_REQUEST §R1 |
| 2 | High-Contrast Typography | Deep Slate Black (#0F172A) for body/headings, Muted Slate (#64748B) for subtitles | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Soft Elevation Shadows & Radiuses | 16–24px border radiuses, ultra-soft #0F172A shadows at 4–6% opacity | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Backward-Compatible Theme API | Preserve all 42 accessed keys of `stitchColors` for 100% TS safety | M1 | Explorer 1 Survey |
| 5 | Curved Violet TopBar | Curved bottom header (#7C3AED), location pill dropdown, unread bell, integrated search pill | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Floating White BottomNav | Clean white floating capsule, 5 tabs, solid Royal Violet active pill, slate inactive icons | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Circular CategoryGrid | Horizontal circular categories (56x56, r:28) with soft lavender tint and purple icons | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Clean White Foundation Cards & Buttons | White cards (#FFFFFF, #F1F5F9 border), solid violet primary buttons, clean inputs and pills | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Full-Bleed Stage Hero Header | Hero image header (H:280, R:32 curved corners) with circular Back, Share, and Favorite buttons | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Workspace Thumbnail Strip | Horizontal 4-photo strip peeking into company offices with "+N photos" badge | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Domain & AI Match Badges | `Stage Pré-embauche` / `Informatique` domain pill + `★ 95% Match` rating badge | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Stage Header & Direction Action | Deep Slate title, company name, location with `Itinéraire ↗` action | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Segmented Underline Tabs | `[ À propos ]`, `[ Entreprise ]`, `[ Conseils IA ]` with violet underline indicator | M3 | ORIGINAL_REQUEST §R3 |
| 14 | Quick Metadata Pill Row | Duration (`🏃 3 à 6 mois`), Location (`📍 Présentiel`), Status (`🕒 Ouvert`) | M3 | ORIGINAL_REQUEST §R3 |
| 15 | Expandable Description & Skills | Rich text block with "Voir plus" toggle and required skills tag chips | M3 | ORIGINAL_REQUEST §R3 |
| 16 | Recruiter / Company Card | Recruiter info card with direct WhatsApp and email contact buttons | M3 | ORIGINAL_REQUEST §R3 |
| 17 | Sticky Bottom Bar & 1-Click CTA | Fixed bottom bar displaying stipend and large Royal Violet `Postuler en 1 Clic` CTA | M3 | ORIGINAL_REQUEST §R3 |
| 18 | 1-Click Apply Flow Wiring | Seamless trigger of `AiApplyModal.tsx` background dispatch from sticky bottom CTA | M3 | ORIGINAL_REQUEST §R3 |
| 19 | Stages Feed Cards Redesign | Aired white cards with cover photo, AI match badge, and instant detail view transition | M3 | ORIGINAL_REQUEST §R4 |
| 20 | HomeScreen Harmonization | Curved violet top, `#RecommandéPourToi` photo banner carousel, circular filières, white feed | M4 | ORIGINAL_REQUEST §R4 |
| 21 | ProfileScreen Harmonization | Royal Violet gradient virtual neobank card, WhatsApp pairing integration, clean settings | M4 | ORIGINAL_REQUEST §R4 |
| 22 | DocumentsScreen Harmonization | Clean white 2-column CV preview and Royal Violet action buttons | M4 | ORIGINAL_REQUEST §R4 |
| 23 | Library & Explore Harmonization | Modern clean white PDF cards with purple tags and search filtering | M4 | ORIGINAL_REQUEST §R4 |
| 24 | Applications Timeline Harmonization | Boarding-pass ticket style with clear violet & green status badges on white background | M4 | ORIGINAL_REQUEST §R4 |
| 25 | Auth & Onboarding Harmonization | Modern clean white login and signup surfaces | M4 | ORIGINAL_REQUEST §R4 |
| 26 | Non-Breaking Integration & Typecheck | Zero TypeScript compilation errors (`tsc --noEmit`), full API & auth preservation | M5 | ORIGINAL_REQUEST §R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design System & Theme Foundation | `src/theme/stitch.ts` | None | DONE |
| M2 | Master Shared Components & Navigation | `src/ui/GlassComponents.tsx`, `src/AppShell.tsx` | M1 | DONE |
| M3 | Immersive Stage Detail Screen & Stages Feed | `src/ui/screens/StagesScreen.tsx` | M1, M2 | DONE |
| M4 | Global Screen Harmonization | `HomeScreen.tsx`, `ProfileScreen.tsx`, `DocumentsScreen.tsx`, `LibraryScreen.tsx`, `TimelineScreen.tsx`, `AuthScreen.tsx` | M1, M2 | IN_PROGRESS |
| M5 | Quality Assurance, E2E Verification & Typecheck | Codebase-wide `tsc --noEmit`, visual fidelity check | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### `src/theme/stitch.ts` ↔ Codebase
- `stitchColors`: All 42 accessed keys preserved. `paper` = `#FFFFFF`, `paperDeep` = `#F8FAFC`, `ink` = `#0F172A`, `inkMuted` = `#64748B`, `sienna` = `#7C3AED`, `siennaTone` = `#8B5CF6`, `siennaBg` = `'rgba(124, 58, 237, 0.08)'`.
- `stitchRadius`: `md: 16`, `lg: 20`, `xl: 24`, `card: 20`, `button: 16`.
- `stitchShadows`: Soft `#0F172A` elevation presets at 4-6% opacity (`card`, `floating`, `primary`).
- `brandGradient`: `colors: ['#7C3AED', '#8B5CF6', '#A78BFA']`.

### `src/ui/GlassComponents.tsx` ↔ `AppShell.tsx` & Screens
- `TopBar`: Preserves `appName`, `onBellPress`, `hasUnread`, `onAvatarPress`, `avatarInitials`. Adds optional `locationName`, `onLocationPress`, `searchValue`, `onSearchChange`, `onFilterPress`, `showSearch`, `showLocation`.
- `BottomNav`: Preserves `activeSection` and `onPress`. Renders floating white bar with solid violet active pill.
- `CategoryGrid`: Preserves `categories`, `activeId`, `onSelectCategory`, `onSeeAllPress`. Renders circular 56x56 avatars with soft lavender container and high contrast label.
- `Card` / `GlassCard`: White surface (`#FFFFFF`), 20px radius, subtle border (`#F1F5F9`).
- `PrimaryButton` / `GradientButton`: Royal Violet gradient with white bold label.

### `src/ui/screens/StagesScreen.tsx` ↔ `AiApplyModal.tsx`
- Detail view triggers `setApplyingJob(selectedDetailJob)` when clicking `Postuler en 1 Clic`.
- `AiApplyModal` performs 1-Click WhatsApp background dispatch or email dispatch with generated official CV PDF base64.
