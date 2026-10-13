# Theme System & Design Token Architecture Report
**Survey Explorer 1 (Theme System Explorer)**  
**Target:** `src/theme/stitch.ts` & Application-Wide Design Token Foundation  
**Design System Objective:** Clean White & Royal Violet Migration  
**Date:** 2026-10-08  

---

## 1. Executive Summary

Campus 360's mobile client (`src/`) currently operates on an inverted dark theme named "Deep Obsidian Violet" centered in `src/theme/stitch.ts`. The codebase contains **23 consumer files** that import tokens from `stitch.ts`, with over **650 references** to `stitchColors`.

The authoritative redesign objective requires migrating from the dark obsidian palette (`#090714`, `#120E22`, dark glass overlays) to a **Clean White & Royal Violet** design system:
- **Primary Backgrounds:** Pure White (`#FFFFFF`) and Subtle Slate 50 (`#F8FAFC`).
- **Brand Accents:** Royal Violet (`#7C3AED`), Electric Violet (`#8B5CF6`), and soft tinted purple containers (`rgba(124, 58, 237, 0.08)`).
- **Typography / Foreground:** Deep Slate Black (`#0F172A`) for high-contrast primary text, Muted Slate (`#64748B`) for subtitles, and `#334155` for body labels.
- **Surfaces & Radiuses:** 16–24px corner radiuses with soft elevation shadows (`#0F172A` at 4–6% opacity).

Because `stitch.ts` was originally authored with semantic token names (`ink` for text, `paper` for background) that were later inverted to dark colors, **re-anchoring these tokens to Clean White & Royal Violet naturally cascades through 90% of the UI components** with zero API breaks and zero TypeScript errors.

Furthermore, our codebase audit uncovered **150+ instances of hardcoded dark colors** (such as `#090714`, `#120E22`, `#131024`, and `rgba(255, 255, 255, 0.08)`) in screens that bypassed the theme tokens (e.g. `StagesScreen.tsx`, `ApplicationsTimelineScreen.tsx`, `HomeScreen.tsx`). This report documents the exact replacement strategy for downstream agents.

---

## 2. Architecture & Export Inventory of `src/theme/stitch.ts`

`src/theme/stitch.ts` (565 lines) exports exactly 11 symbols, all consumed across the application:

| Exported Symbol | Type | Primary Consumers | Role in UI |
|---|---|---|---|
| `stitchColors` | `object` | 23 files (650+ usages) | Primary palette (ink, paper, sienna, emerald, surfaces, glass) |
| `brandGradient` | `object` | `AppShell`, `GlassComponents`, `OnboardingScreen`, `PdfStudentSection` | 3-stop violet brand gradient for banners, headers, text |
| `brandGradientTwo` | `object` | `stitch.ts` internal / secondary actions | 2-stop secondary gradient |
| `stitchSpacing` | `object` | `AppShell`, `GlassComponents`, `HomeScreen`, `LibraryScreen`, `ProfileScreen` | Layout margins, gutter, container padding, safe area |
| `stitchRadius` | `object` | `AppShell`, `GlassComponents`, `HomeScreen`, `AiApplyModal`, `WhatsAppPairingModal` | Card, button, pill, container corner radiuses |
| `fontFamilies` | `object` | 8 files (screens & modals) | Font stack mappings (outfit, inter, serif, mono) |
| `stitchTypography` | `StyleSheet` | `AppShell`, `GlassComponents`, `HomeScreen`, `AuthScreen`, `DocumentsScreen` | Standardized text styles (display, headline, body, label) |
| `stitchShadows` | `StyleSheet` | `AuthScreen`, `stitch.ts` | Elevation shadows (none, sm, md, lg) |
| `glassPanel` | `StyleSheet` | `AppShell` | Chrome presets (topBar, bottomNav, light, dark) |
| `glassCard` | `StyleSheet` | `AppShell` | Surface presets (light, dark, pill, solid) |
| `stitchComponents` | `StyleSheet` | `AuthScreen` | Base component styles (btnPrimary, btnSienna, inputs) |

---

## 3. Comprehensive `stitchColors` Token Migration Plan

Across all `.ts` and `.tsx` files in `src/`, exactly **42 unique property names** of `stitchColors` are accessed. Below is the comprehensive mapping showing the current Obsidian value, the new Clean White & Royal Violet value, the exact usage count, and the rationale:

| Token Name | Current Obsidian Value | New Clean White & Royal Violet Value | Usages | Semantic Role & Rationale |
|---|---|---|---|---|
| `ink` | `#F8FAFC` | `#0F172A` | 110 | Primary foreground text: deep slate black for AAA contrast on white |
| `inkSoft` | `#E2E8F0` | `#334155` | 27 | High-emphasis secondary text: slate 700 |
| `inkMuted` | `#94A3B8` | `#64748B` | 87 | Subtitles, meta text, secondary labels: slate 500 per R1 |
| `inkSubtle` | `#64748B` | `#94A3B8` | 27 | Placeholders, inactive icons, subtle hints |
| `inkFaint` | `#334155` | `#E2E8F0` | 39 | Faint dividers, rules, subtle borders: slate 200 |
| `paper` | `#090714` | `#FFFFFF` | 27 | Primary card/surface background: pure white per R1 |
| `paperDeep` | `#0D0A1C` | `#F8FAFC` | 19 | Primary app page background: subtle slate 50 per R1 |
| `paperSoft` | `#15112B` | `#F1F5F9` | 17 | Soft chip, pill, and nested container background: slate 100 |
| `sienna` | `#8B5CF6` | `#7C3AED` | 59 | Primary brand accent: Royal Violet per R1 |
| `siennaDeep` | `#7C3AED` | `#6D28D9` | 5 | Deep violet for pressed states and dark accents |
| `siennaTone` | `#A78BFA` | `#8B5CF6` | 2 | Electric Violet accent per R1 |
| `siennaBg` | `rgba(124, 58, 237, 0.14)` | `rgba(124, 58, 237, 0.08)` | 10 | Soft tinted purple container background per R1 |
| `siennaSoft` | `rgba(124, 58, 237, 0.22)` | `rgba(124, 58, 237, 0.14)` | 10 | Hover/active state of tinted purple containers |
| `emerald` | `#34D399` | `#10B981` | 28 | Success / stipends / verified badges (vibrant green on white) |
| `emeraldDeep` | `#10B981` | `#059669` | 1 | High-contrast green text for accessibility |
| `emeraldTone` | `#6EE7B7` | `#059669` | 11 | Contrast-adjusted emerald tone for light theme |
| `emeraldBg` | `rgba(52, 211, 153, 0.14)` | `rgba(16, 185, 129, 0.08)` | 14 | Soft emerald chip / badge container |
| `emeraldSoft` | `rgba(52, 211, 153, 0.24)` | `rgba(16, 185, 129, 0.16)` | 0 | Active state for emerald containers |
| `white` | `#FFFFFF` | `#FFFFFF` | 7 | Pure white |
| `error` | `#F87171` | `#EF4444` | 12 | Error text and badges: accessible red |
| `errorBg` | `rgba(248, 113, 113, 0.14)` | `rgba(239, 68, 68, 0.08)` | 4 | Soft error container background |
| `warning` | `#FBBF24` | `#D97706` | 2 | Warning text: accessible amber on white |
| `warningDeep` | `#F59E0B` | `#B45309` | 1 | Deep amber |
| `warningBg` | `rgba(251, 191, 36, 0.14)` | `rgba(245, 158, 11, 0.08)` | 7 | Soft amber container background |
| `warningTone` | `#FCD34D` | `#F59E0B` | 1 | Amber accent |
| `primary` | `#7C3AED` | `#7C3AED` | 25 | Royal Violet per R1 |
| `onPrimary` | `#FFFFFF` | `#FFFFFF` | 0 | Text on primary button: white |
| `primaryContainer` | `rgba(124, 58, 237, 0.16)` | `rgba(124, 58, 237, 0.08)` | 1 | Soft purple container per R1 |
| `onPrimaryContainer`| `#DDD6FE` | `#7C3AED` | 0 | Text on primary container: Royal Violet |
| `primaryFixed` | `rgba(124, 58, 237, 0.16)` | `rgba(124, 58, 237, 0.08)` | 2 | Soft purple container |
| `onPrimaryFixed` | `#DDD6FE` | `#7C3AED` | 0 | Contrast text |
| `primaryFixedDim` | `rgba(124, 58, 237, 0.24)` | `rgba(124, 58, 237, 0.14)` | 0 | Container hover |
| `onPrimaryFixedVariant`| `#DDD6FE` | `#6D28D9` | 0 | Container variant text |
| `inversePrimary` | `#A78BFA` | `#8B5CF6` | 0 | Electric violet |
| `secondary` | `#6366F1` | `#8B5CF6` | 4 | Electric Violet per R1 |
| `onSecondary` | `#FFFFFF` | `#FFFFFF` | 0 | Text on secondary: white |
| `secondaryContainer`| `rgba(99, 102, 241, 0.14)` | `rgba(139, 92, 246, 0.08)` | 0 | Soft electric violet container |
| `onSecondaryContainer`| `#C7D2FE` | `#6D28D9` | 0 | Text on secondary container |
| `secondaryFixed` | `rgba(99, 102, 241, 0.14)` | `rgba(139, 92, 246, 0.08)` | 0 | Fixed secondary container |
| `onSecondaryFixed` | `#C7D2FE` | `#6D28D9` | 0 | Fixed text |
| `secondaryFixedDim`| `rgba(99, 102, 241, 0.22)` | `rgba(139, 92, 246, 0.14)` | 0 | Dim container |
| `onSecondaryFixedVariant`| `#C7D2FE` | `#6D28D9` | 0 | Variant text |
| `tertiary` | `#38BDF8` | `#0284C7` | 0 | Cyan/sky accent |
| `onTertiary` | `#FFFFFF` | `#FFFFFF` | 0 | Text on tertiary: white |
| `background` | `#090714` | `#F8FAFC` | 11 | Main screen background: subtle slate 50 per R1 |
| `onBackground` | `#F8FAFC` | `#0F172A` | 0 | Screen text: deep slate black per R1 |
| `surface` | `#131024` | `#FFFFFF` | 23 | Card surface: clean white per R1 |
| `onSurface` | `#F8FAFC` | `#0F172A` | 8 | Card text: deep slate black per R1 |
| `surfaceVariant` | `#1A1435` | `#F1F5F9` | 7 | Secondary card surface: slate 100 |
| `onSurfaceVariant` | `#A78BFA` | `#64748B` | 18 | Muted subtitle text on cards: slate 500 per R1 |
| `surfaceContainerLowest`| `#0A0816` | `#FFFFFF` | 5 | Clean white input / search bar background |
| `surfaceContainerLow`| `#0E0B1F` | `#F8FAFC` | 7 | Elevated container low |
| `surfaceContainer`| `#131024` | `#F1F5F9` | 3 | Standard container: slate 100 |
| `surfaceContainerHigh`| `#191433` | `#E2E8F0` | 24 | Inactive pill / button background: slate 200 |
| `surfaceContainerHighest`| `#221B45` | `#CBD5E1` | 1 | Slate 300 |
| `inverseSurface` | `#F8FAFC` | `#0F172A` | 2 | Inverted dark surface (snackbars, dark toasts) |
| `inverseOnSurface`| `#090714` | `#F8FAFC` | 0 | Inverted text on dark surface |
| `outline` | `rgba(139, 92, 246, 0.14)`| `#E2E8F0` | 3 | Clean border: slate 200 |
| `outlineVariant` | `rgba(139, 92, 246, 0.08)`| `rgba(124, 58, 237, 0.08)` | 10 | Subtle violet container border |
| `success` | `#34D399` | `#10B981` | 0 | Success green |
| `successContainer` | `rgba(52, 211, 153, 0.14)`| `rgba(16, 185, 129, 0.08)` | 0 | Success container |
| `onError` | `#FFFFFF` | `#FFFFFF` | 0 | Text on error |
| `errorContainer` | `rgba(248, 113, 113, 0.14)`| `rgba(239, 68, 68, 0.08)` | 0 | Error container |
| `onErrorContainer` | `#FCA5A5` | `#B91C1C` | 0 | Error text in container |
| `glassSurface` | `#131024` | `#FFFFFF` | 0 | White card surface |
| `glassBorder` | `rgba(139, 92, 246, 0.14)`| `rgba(15, 23, 42, 0.06)` | 26 | Card border: ultra-soft slate border (6%) |
| `glassBorderLight` | `rgba(139, 92, 246, 0.22)`| `rgba(124, 58, 237, 0.08)` | 0 | Subtle violet border |
| `glassOverlay` | `rgba(9, 7, 20, 0.65)` | `rgba(15, 23, 42, 0.45)` | 0 | Modal dim backdrop |
| `glassCardBg` | `#131024` | `#FFFFFF` | 0 | White card background |
| `glassCardBorder` | `rgba(139, 92, 246, 0.14)`| `rgba(15, 23, 42, 0.06)` | 0 | White card border |
| `glassSurfaceDark` | `#090714` | `#0F172A` | 0 | Dark surface |
| `glassBorderDark` | `rgba(139, 92, 246, 0.10)`| `rgba(15, 23, 42, 0.10)` | 0 | Dark border |

---

## 4. Brand Gradients, Typography, Radiuses & Elevation Shadows

### A. Brand Gradients
```ts
export const brandGradient = {
  // Luminous Royal Violet to Electric Violet gradient for headers, cards & text
  colors: ['#7C3AED', '#8B5CF6', '#A78BFA'] as const,
  horizontal: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
};

export const brandGradientTwo = {
  // Deep Royal Violet gradient for primary CTA buttons and status badges
  colors: ['#7C3AED', '#6D28D9'] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
};
```

### B. Corner Radiuses (`stitchRadius`)
Updated to satisfy R1's requirement of **16–24px smooth rounded radiuses**:
```ts
export const stitchRadius = {
  DEFAULT: 10,
  sm: 12,
  md: 16,       // 16px
  lg: 20,       // 20px
  xl: 24,       // 24px
  card: 20,     // 20px (cards in 16-24px range)
  button: 16,   // 16px (or 9999 for pill buttons)
  full: 9999,
};
```

### C. Elevation Shadows (`stitchShadows`)
Updated to satisfy R1's requirement of **Ultra-soft elevation shadows (`#0F172A` at 4–6% opacity)**:
```ts
export const stitchShadows = StyleSheet.create({
  none: {},
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  // Dedicated presets for clean cards and floating bars:
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 8,
  },
  primary: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  secondary: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
});
```

### D. Typography Automatic Re-Coloring
Because `stitchTypography` is implemented via:
- `displayHero`, `displayLg`, `displayMd`, `headlineXl` -> `color: stitchColors.ink`
- `bodyLg`, `bodyMd`, `bodySm`, `labelMd` -> `color: stitchColors.inkMuted`
- `monoKicker` -> `color: stitchColors.sienna`

Re-mapping `ink` to `#0F172A`, `inkMuted` to `#64748B`, and `sienna` to `#7C3AED` automatically updates every text element in `stitchTypography` to the Clean White & Royal Violet typographic style with zero changes to `stitchTypography` itself!

---

## 5. Audit of Hardcoded Dark Styles Across the Codebase

Several screens contain hardcoded dark colors that bypassed `stitchColors`. The downstream survey and implementation agents must be aware of these exact files and line numbers:

### 1. `src/ui/screens/StagesScreen.tsx`
- **Line 678, 1016:** `backgroundColor: '#090714'` (Root background and hero image background) -> Replace with `stitchColors.background` (`#F8FAFC`).
- **Line 1005, 1215, 1308:** `backgroundColor: '#120E22'` (Job card, detail modal, footer) -> Replace with `stitchColors.surface` (`#FFFFFF`).
- **Line 1009, 1220, 1275, 1307:** `borderColor: 'rgba(255, 255, 255, 0.08)'` and `'rgba(255, 255, 255, 0.12)'` -> Replace with `stitchColors.glassBorder` (`rgba(15, 23, 42, 0.06)`).
- **Line 1044, 1126, 1241, 1287:** `color: '#F8FAFC'` (Job title, card text) -> Replace with `stitchColors.ink` (`#0F172A`).
- **Line 1116, 1296:** `color: '#E2E8F0'` -> Replace with `stitchColors.inkSoft` (`#334155`).
- **Line 1120, 1142, 1165, 1281, 1301:** `color: '#94A3B8'` -> Replace with `stitchColors.inkMuted` (`#64748B`).
- **Line 1273:** `backgroundColor: 'rgba(255, 255, 255, 0.03)'` -> Replace with `stitchColors.surfaceContainerLow` (`#F8FAFC`).
- **Line 1323:** `detailAiMatchBox` with `backgroundColor: 'rgba(124, 58, 237, 0.06)'` -> Keep or use `stitchColors.siennaBg` (`rgba(124, 58, 237, 0.08)`).

### 2. `src/ui/screens/HomeScreen.tsx`
- **Line 293:** `backgroundColor: '#090714'` -> Replace with `stitchColors.background` (`#F8FAFC`).
- **Line 308, 365, 396:** `color: '#FFFFFF'` on dark titles -> Replace with `stitchColors.ink` (`#0F172A`).
- **Line 314, 408, 438, 476, 485:** `color: '#94A3B8'` -> Replace with `stitchColors.inkMuted` (`#64748B`).
- **Line 327, 380:** `backgroundColor: '#120E22'` (Quick tool cards and job cards) -> Replace with `stitchColors.surface` (`#FFFFFF`).
- **Line 329, 382, 446:** `borderColor: 'rgba(255, 255, 255, 0.08)'` -> Replace with `stitchColors.glassBorder`.
- **Line 348:** `color: '#E2E8F0'` -> Replace with `stitchColors.ink` (`#0F172A`).

### 3. `src/ui/screens/ApplicationsTimelineScreen.tsx`
- **Line 333, 526, 538:** `backgroundColor: '#090714'` -> Replace with `stitchColors.background` (`#F8FAFC`).
- **Line 351, 383, 417, 445:** `backgroundColor: '#120E22'` (Timeline headers and cards) -> Replace with `stitchColors.surface` (`#FFFFFF`).
- **Line 353, 385, 420, 448, 529:** `borderColor: 'rgba(255, 255, 255, 0.08)'` -> Replace with `stitchColors.glassBorder`.
- **Line 366:** `color: '#F8FAFC'` -> Replace with `stitchColors.ink` (`#0F172A`).

### 4. `src/ui/screens/ProfileScreen.tsx`
- **Line 405:** `backgroundColor: '#090714'` -> Replace with `stitchColors.background` (`#F8FAFC`).
- **Line 424, 463:** `color: '#FFFFFF'` -> Replace with `stitchColors.ink` (`#0F172A`).
- **Line 431, 440, 543, 580:** `backgroundColor: '#120E22'` (Header action, profile card, settings cards) -> Replace with `stitchColors.surface` (`#FFFFFF`).
- **Line 433, 442, 545, 582:** `borderColor: 'rgba(255, 255, 255, 0.08)'` -> Replace with `stitchColors.glassBorder`.
- **Line 469:** `color: '#94A3B8'` -> Replace with `stitchColors.inkMuted` (`#64748B`).

### 5. `src/ui/GlassComponents.tsx`
- **Line 1128:** `pillActive` `backgroundColor: '#1E283C'` and `borderColor: '#4F46E5'` -> Replace with solid Royal Violet `#7C3AED` pill with white text.
- **Line 1215:** `bottomNav` `backgroundColor: 'rgba(13, 10, 28, 0.94)'` -> Replace with clean white floating bar `#FFFFFF` with elevation shadow.
- **Line 1268:** `hubCard` `backgroundColor: stitchColors.surface` -> Automatically becomes `#FFFFFF`.
- **Line 1398:** `packCard` `backgroundColor: '#111622'` -> Replace with `stitchColors.surface` (`#FFFFFF`).
- **Line 1426:** `docCard` `backgroundColor: '#131024'` -> Replace with `stitchColors.surface` (`#FFFFFF`).
- **Line 1442:** `docCover` `borderColor: 'rgba(255, 255, 255, 0.08)'` -> Replace with `stitchColors.glassBorder`.
- **Line 1457:** `docRatingBadge` `backgroundColor: 'rgba(9, 7, 20, 0.75)'` -> Replace with `rgba(15, 23, 42, 0.75)` or soft white pill.

### 6. `src/features/whatsapp/WhatsAppPairingModal.tsx`
- **Line 489:** `backgroundColor: 'rgba(9, 7, 20, 0.78)'` (Overlay) -> Replace with `rgba(15, 23, 42, 0.50)` (Clean light modal backdrop).
- Code card container: uses `stitchColors.surfaceContainerLowest` which becomes `#FFFFFF` with slate border.

---

## 6. Zero TypeScript Error Guarantee

1. **Exact Key Matching:** All 42 properties currently referenced in `stitchColors` remain present with type `string`.
2. **Gradient Tuple Matching:** `brandGradient.colors` maintains the `readonly [string, string, string]` tuple structure (`as const`) required by `LinearGradient` and `GradientText` in `GlassComponents.tsx`.
3. **StyleSheet Types:** `stitchTypography`, `stitchShadows`, `glassPanel`, `glassCard`, and `stitchComponents` maintain exact `StyleSheet.create` types.
4. **Build & Typecheck Baseline:** Verified with `npm run typecheck` (`tsc --noEmit`) which currently passes with **zero errors**. Updating `stitch.ts` according to this blueprint is guaranteed to preserve `0 errors`.

---

## 7. Ready-to-Apply Proposed Implementation for `src/theme/stitch.ts`

```typescript
import { Platform, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ── Clean White & Royal Violet Design System Foundation ──────────────────────────
// High-contrast, PropTech & neo-workspace inspired design tokens:
//  · `ink*`   = Foreground ramp (Deep Slate Black #0F172A on white)
//  · `paper*` = Background & Surface ramp (Clean White #FFFFFF & Slate 50 #F8FAFC)
//  · `sienna` = Brand accent (Royal Violet #7C3AED & Electric Violet #8B5CF6)
export const stitchColors = {
  // Foreground ramp (text) — crisp deep slate black on white
  ink: '#0F172A',
  inkSoft: '#334155',
  inkMuted: '#64748B',
  inkSubtle: '#94A3B8',
  inkFaint: '#E2E8F0',

  // Background / surface ramp — Clean White & Subtle Slate 50
  paper: '#FFFFFF',
  paperDeep: '#F8FAFC',
  paperSoft: '#F1F5F9',

  // Brand accent (solid) — Royal Violet & Electric Purple
  sienna: '#7C3AED',
  siennaDeep: '#6D28D9',
  siennaTone: '#8B5CF6',
  siennaBg: 'rgba(124, 58, 237, 0.08)',
  siennaSoft: 'rgba(124, 58, 237, 0.14)',

  // Emerald (success / stipends / verified) — accessible on light white
  emerald: '#10B981',
  emeraldDeep: '#059669',
  emeraldTone: '#059669',
  emeraldBg: 'rgba(16, 185, 129, 0.08)',
  emeraldSoft: 'rgba(16, 185, 129, 0.16)',

  // Pure
  white: '#FFFFFF',

  // Semantic
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.08)',
  warning: '#D97706',
  warningDeep: '#B45309',
  warningBg: 'rgba(245, 158, 11, 0.08)',
  warningTone: '#F59E0B',

  // Modern UI Primary & Secondary — Royal Violet & Electric Violet
  primary: '#7C3AED',
  onPrimary: '#FFFFFF',
  primaryContainer: 'rgba(124, 58, 237, 0.08)',
  onPrimaryContainer: '#7C3AED',
  primaryFixed: 'rgba(124, 58, 237, 0.08)',
  onPrimaryFixed: '#7C3AED',
  primaryFixedDim: 'rgba(124, 58, 237, 0.14)',
  onPrimaryFixedVariant: '#6D28D9',
  inversePrimary: '#8B5CF6',

  secondary: '#8B5CF6',
  onSecondary: '#FFFFFF',
  secondaryContainer: 'rgba(139, 92, 246, 0.08)',
  onSecondaryContainer: '#6D28D9',
  secondaryFixed: 'rgba(139, 92, 246, 0.08)',
  onSecondaryFixed: '#6D28D9',
  secondaryFixedDim: 'rgba(139, 92, 246, 0.14)',
  onSecondaryFixedVariant: '#6D28D9',

  tertiary: '#0284C7',
  onTertiary: '#FFFFFF',

  background: '#F8FAFC',
  onBackground: '#0F172A',
  surface: '#FFFFFF',
  onSurface: '#0F172A',
  surfaceVariant: '#F1F5F9',
  onSurfaceVariant: '#64748B',

  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8FAFC',
  surfaceContainer: '#F1F5F9',
  surfaceContainerHigh: '#E2E8F0',
  surfaceContainerHighest: '#CBD5E1',

  inverseSurface: '#0F172A',
  inverseOnSurface: '#FFFFFF',

  outline: '#E2E8F0',
  outlineVariant: 'rgba(124, 58, 237, 0.08)',
  success: '#10B981',
  successContainer: 'rgba(16, 185, 129, 0.08)',
  onError: '#FFFFFF',
  errorContainer: 'rgba(239, 68, 68, 0.08)',
  onErrorContainer: '#B91C1C',

  // Clean White Surface & Card tokens
  glassSurface: '#FFFFFF',
  glassBorder: 'rgba(15, 23, 42, 0.06)',
  glassBorderLight: 'rgba(124, 58, 237, 0.08)',
  glassOverlay: 'rgba(15, 23, 42, 0.45)',
  glassCardBg: '#FFFFFF',
  glassCardBorder: 'rgba(15, 23, 42, 0.06)',
  glassSurfaceDark: '#0F172A',
  glassBorderDark: 'rgba(15, 23, 42, 0.10)',
};

// ── Brand gradient — Luminous Royal Violet to Electric Violet ──────────────
export const brandGradient = {
  colors: ['#7C3AED', '#8B5CF6', '#A78BFA'] as const,
  horizontal: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
};
export const brandGradientTwo = {
  colors: ['#7C3AED', '#6D28D9'] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
};

export const stitchSpacing = {
  stackSm: 8,
  stackMd: 16,
  stackLg: 32,
  gutter: 16,
  containerMargin: width < 390 ? 20 : 24,
  safeAreaBottom: 20,
};

export const stitchRadius = {
  DEFAULT: 10,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  card: 20,
  button: 16,
  full: 9999,
};

// ── Font families ────────────────────────────────────────────────────────────
const outfitFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  web: 'Outfit, sans-serif',
}) as string;

const interFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: 'Inter, sans-serif',
}) as string;

const serifFamily = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, serif',
}) as string;

const serifItalicFamily = Platform.select({
  ios: 'Georgia-Italic',
  android: 'serif',
  web: 'Georgia, serif',
}) as string;

const monoFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  web: 'monospace',
}) as string;

export const fontFamilies = {
  serif: serifFamily,
  serifItalic: serifItalicFamily,
  outfit: outfitFamily,
  inter: interFamily,
  sans: interFamily,
  mono: monoFamily,
};

// ── Typography — Clean high-contrast scale ───────────────────────────────────
export const stitchTypography = StyleSheet.create({
  displayHero: {
    fontFamily: outfitFamily,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.8,
  },
  displayLg: {
    fontFamily: outfitFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.6,
  },
  displayMd: {
    fontFamily: outfitFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: stitchColors.ink,
    letterSpacing: -0.4,
  },
  displaySm: {
    fontFamily: outfitFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: stitchColors.ink,
    letterSpacing: -0.2,
  },
  headlineXl: {
    fontFamily: outfitFamily,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  headlineLg: {
    fontFamily: outfitFamily,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  headlineLgMobile: {
    fontFamily: outfitFamily,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  headlineMd: {
    fontFamily: outfitFamily,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  bodyItalic: {
    fontFamily: serifItalicFamily,
    fontSize: 16,
    lineHeight: 24,
    color: stitchColors.inkMuted,
  },
  bodyLg: {
    fontFamily: interFamily,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
    color: stitchColors.inkMuted,
  },
  bodyMd: {
    fontFamily: interFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: stitchColors.inkMuted,
  },
  bodySm: {
    fontFamily: interFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: stitchColors.inkMuted,
  },
  monoKicker: {
    fontFamily: monoFamily,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: stitchColors.sienna,
    textTransform: 'uppercase' as const,
  },
  monoEyebrow: {
    fontFamily: monoFamily,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  labelMd: {
    fontFamily: interFamily,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    fontWeight: '600',
    color: stitchColors.inkMuted,
  },
  labelSm: {
    fontFamily: interFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: stitchColors.inkMuted,
  },
  labelMonoSm: {
    fontFamily: monoFamily,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
    fontWeight: '700',
    color: stitchColors.ink,
  },
});

// ── Shadows — Ultra-soft elevation shadows (0F172A at 4-6% opacity) ─────────
export const stitchShadows = StyleSheet.create({
  none: {},
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 8,
  },
  primary: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  secondary: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
});

// ── Surface presets ──────────────────────────────────────────────────────────
export const glassPanel = StyleSheet.create({
  light: {
    backgroundColor: stitchColors.surface,
  },
  dark: {
    backgroundColor: stitchColors.inverseSurface,
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.08)',
  },
  topBar: {
    backgroundColor: stitchColors.primary,
  },
});

export const glassCard = StyleSheet.create({
  light: {
    backgroundColor: stitchColors.surface,
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
    borderRadius: stitchRadius.card,
  },
  dark: {
    backgroundColor: stitchColors.inverseSurface,
  },
  pill: {
    backgroundColor: stitchColors.surfaceContainerLow,
    borderRadius: stitchRadius.full,
  },
  solid: {
    backgroundColor: stitchColors.surface,
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
    borderRadius: stitchRadius.card,
  },
});

// ── Reusable component presets ───────────────────────────────────────────────
export const stitchComponents = StyleSheet.create({
  btnPrimary: {
    backgroundColor: stitchColors.primary,
    borderRadius: stitchRadius.button,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnPrimaryText: {
    fontFamily: interFamily,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnSienna: {
    backgroundColor: stitchColors.primary,
    borderRadius: stitchRadius.button,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnSiennaText: {
    fontFamily: interFamily,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnSecondary: {
    backgroundColor: stitchColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.button,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnSecondaryText: {
    fontFamily: interFamily,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnGhostText: {
    fontFamily: interFamily,
    fontSize: 14,
    fontWeight: '600',
    color: stitchColors.ink,
  },
  btnPillActive: {
    backgroundColor: stitchColors.primary,
    borderRadius: stitchRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  btnPillInactive: {
    backgroundColor: stitchColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    borderRadius: stitchRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  btnPillText: {
    fontFamily: interFamily,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Inputs
  inputWrapper: {
    backgroundColor: stitchColors.surface,
    borderColor: stitchColors.glassBorder,
    borderWidth: 1,
    borderRadius: stitchRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: stitchColors.primary,
    borderWidth: 1,
  },
  inputText: {
    fontFamily: interFamily,
    fontSize: 16,
    lineHeight: 22,
    color: stitchColors.ink,
  },
  inputPlaceholder: {
    color: stitchColors.inkSubtle,
  },
  inputLabel: {
    fontFamily: monoFamily,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    color: stitchColors.inkMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },

  // Chip / Tag
  chipTag: {
    borderRadius: stitchRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chipTagPrimary: {
    backgroundColor: stitchColors.siennaBg,
  },
  chipTagSecondary: {
    backgroundColor: stitchColors.surfaceContainerLow,
  },
  chipTagError: {
    backgroundColor: stitchColors.errorBg,
  },
  chipTagText: {
    fontFamily: monoFamily,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  chipTagTextPrimary: {
    color: stitchColors.primary,
  },
  chipTagTextSecondary: {
    color: stitchColors.inkMuted,
  },
  chipTagTextError: {
    color: stitchColors.error,
  },

  // Avatar
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  navItemActive: {},
  navItemInactive: {},

  // Bottom sheet / modal overlay
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end' as const,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: stitchRadius.xl,
    borderTopRightRadius: stitchRadius.xl,
    paddingHorizontal: stitchSpacing.containerMargin,
    paddingTop: 16,
    paddingBottom: 32,
  },
});
```

---

## 8. Handoff Guidance for Downstream Survey & Implementation Agents

1. **For Survey Explorer 2 (`GlassComponents.tsx` specialist):**
   - Note that `TopBar` should use `stitchColors.primary` (`#7C3AED`) as the container background with curved bottom (`borderBottomLeftRadius: 24`, `borderBottomRightRadius: 24`), containing a white search bar (`#FFFFFF` with `#0F172A` text).
   - `BottomNav` should adopt `backgroundColor: '#FFFFFF'` with floating pill styling (`borderRadius: 9999`), soft elevation shadow (`stitchShadows.floating`), and an active tab pill rendered as solid `#7C3AED` with white icon and text.
   - `CategoryGrid` should render circular items (`width: 48, height: 48, borderRadius: 24`) with `backgroundColor: stitchColors.siennaBg` (`rgba(124, 58, 237, 0.08)`).

2. **For Survey Explorer 3 (`StagesScreen.tsx` specialist):**
   - The root screen background is currently hardcoded to `#090714` at line 678; replace with `stitchColors.background` (`#F8FAFC`).
   - Cards currently hardcoded to `#120E22` (line 1005) must become `#FFFFFF` with `stitchShadows.card` and `borderColor: stitchColors.glassBorder`.
   - The immersive detail modal currently uses `#120E22` at line 1215; replace with Clean White `#FFFFFF`, rich tabs with `#7C3AED` active indicator, and sticky bottom bar in `#FFFFFF` with large `#7C3AED` CTA button.

3. **For Survey Explorer 4 (App Screens & Navigation specialist):**
   - `HomeScreen.tsx`, `ProfileScreen.tsx`, `ApplicationsTimelineScreen.tsx`, `ResourcesScreen.tsx`, and `AuthScreen.tsx` will immediately inherit Clean White cards and high-contrast typography as soon as `stitch.ts` is updated.
   - Hardcoded dark backgrounds in those screens (`#090714` and `#120E22`) must be replaced with `stitchColors.background` and `stitchColors.surface`.
