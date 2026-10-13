# Master Shared UI Components Redesign Report: Royal Violet & Clean White

**Author:** Survey Explorer 2 (Shared UI Components Explorer)  
**Date:** 2026-10-08  
**Scope:** `src/ui/GlassComponents.tsx`, Navigation Chrome (`TopBar`, `BottomNav`), `CategoryGrid`, and Foundation Components (`GlassCard`, `GlassButton`, `GlassInput`, `GlassPill`, etc.) across Campus 360 React Native Mobile App.  
**Mode:** Read-only Architectural Investigation & Implementation Blueprint  

---

## 1. Executive Summary

Campus 360's mobile client (`src/ui/GlassComponents.tsx`) currently renders an "AI Analyzer" obsidian dark theme (`#090714`, `#131024`, `#1A1435`) with dark translucent cards and hairline purple borders.

This investigation defines the exact, non-breaking architectural transformation into the high-converting **"Clean White & Royal Violet"** design system inspired by modern PropTech/workspace mobile references.

### Key Redesign Deliverables:
1. **Curved Royal Violet Header (`TopBar`):**
   - Transformed into a convex curved bottom container (`borderBottomLeftRadius: 28-30`, `borderBottomRightRadius: 28-30`) in Royal Violet (`#7C3AED` to `#6D28D9` gradient).
   - Features an integrated frosted white location dropdown pill (`📍 Ville / Université ∨`), a notification bell with red unread counter badge, and an integrated pure white search pill (`#FFFFFF`) with search input and purple filter slider icon (`SlidersHorizontal`).
2. **Floating Curved Bottom Navigation (`BottomNav`):**
   - Redesigned into a floating clean white capsule (`#FFFFFF`, soft elevation shadow `0 8px 20px rgba(15,23,42,0.10)`) with 5 permanent destinations (`Accueil`, `Stages`, `Créer`, `Ressources`, `Profil`).
   - Active tab rendered as an energetic solid Royal Violet pill (`#7C3AED`) with white icon and bold label; inactive tabs rendered with slate contrast (`#64748B`).
3. **Circular Category Architecture (`CategoryGrid`):**
   - Shifted from dark squared cards (`22.5%` width, dark bg) to horizontal-scrollable circular icon badges (`width: 56`, `height: 56`, `borderRadius: 28`).
   - Soft lavender/purple container tint (`rgba(124, 58, 237, 0.08)` or `#F5F3FF`) with Royal Violet icon (`#7C3AED`), active state highlighting, and high-contrast typography (`#0F172A`).
4. **Foundation Components Harmonization:**
   - `GlassCard` / `Card`: Pure white surfaces (`#FFFFFF`), rounded radii (18-20px), subtle border (`#F1F5F9`), ultra-soft elevation shadows.
   - `GlassButton` / `PrimaryButton` / `GradientButton`: Solid Royal Violet (`#7C3AED`) and Electric Violet (`#8B5CF6`) with white bold typography.
   - `GlassInput` / `EditorialInput`: Clean off-white surface (`#F8FAFC`), crisp border (`#E2E8F0`), Royal Violet focus ring (`#7C3AED`).
   - `GlassPill` / `Pill`: Active solid violet pill (`#7C3AED`), inactive light pill (`#F8FAFC`).
5. **Zero Breaking Changes:**
   - 100% backward-compatible prop signatures across all existing callers (`AppShell.tsx`, `HomeScreen.tsx`, `StagesScreen.tsx`, `AuthScreen.tsx`, etc.).
   - Full baseline verification completed: `npm run typecheck` exits with 0 errors.

---

## 2. Current State Analysis (`src/ui/GlassComponents.tsx`)

### 2.1 File Metrics & Architecture
- **Location:** `src/ui/GlassComponents.tsx` (1,765 lines, 53.5 KB)
- **Role in Graph:** God Community Hub (`Community 3` in `GRAPH_REPORT.md`, 60 nodes)
- **Current Aesthetic:** "AI Analyzer" dark system (`#090714` background, `#131024` surface, `#1A1435` surfaceVariant).
- **Core Dependencies:**
  - `react-native`: `View`, `Text`, `TextInput`, `Pressable`, `StyleSheet`, `Platform`
  - `expo-linear-gradient`: `LinearGradient`
  - `lucide-react-native`: 26+ icons (`Bell`, `Home`, `Briefcase`, `FileText`, `BookOpen`, `User`, `Search`, `SlidersHorizontal`, `MapPin`, `ChevronDown`, `ChevronRight`, etc.)
  - `../theme/stitch`: `stitchColors`, `stitchSpacing`, `stitchRadius`, `stitchTypography`, `brandGradient`, `fontFamilies`

### 2.2 Export Inventory in `GlassComponents.tsx`

| Component Export | Type | Current Purpose | Usage Locations |
| :--- | :--- | :--- | :--- |
| `TopBar` | Function | App-level top header | `AppShell.tsx:1156` |
| `BottomNav` | Function | App-level floating 5-tab bar | `AppShell.tsx:1361` |
| `CategoryGrid` | Function | Grid of student academic filières / categories | `GlassComponents.tsx`, `HomeScreen.tsx` |
| `Card` / `GlassCard` / `GlassPanel` | Function + Aliases | Surface card container | `AuthScreen.tsx`, `HomeScreen.tsx`, etc. |
| `Pill` / `GlassPill` | Function + Alias | Pill toggle / selection tag | `AuthScreen.tsx`, `ExploreScreen.tsx` |
| `EditorialInput` / `GlassInput` | Function + Alias | Form text field | `AuthScreen.tsx`, `ExploreScreen.tsx` |
| `GradientButton` / `PrimaryButton` | Function + Alias | Primary gradient CTA | `AuthScreen.tsx`, `GlassComponents.tsx` |
| `SiennaButton` | Function | Secondary solid CTA | `GlassComponents.tsx` |
| `SecondaryButton` | Function | Outlined / subtle CTA | `AuthScreen.tsx`, `GlassComponents.tsx` |
| `IconButton` | Const | Circular icon button | `GlassComponents.tsx`, modals |
| `SearchFilterBar` | Function | Pill search bar with filter sliders | `HomeScreen.tsx:131`, `StagesScreen.tsx:243`, `ExploreScreen.tsx:18` |
| `LocationHeader` | Function | Header with university location & coins | `GlassComponents.tsx` |
| `DashboardHubCard` | Function | Large square action card | `DashboardScreen.tsx` |
| `DashboardGrid` | Function | 2x2 grid of hub cards | `DashboardScreen.tsx` |
| `WalletCard` | Function | Digital wallet virtual card | `ProfileScreen.tsx` |
| `MetricCard` | Function | Numeric KPI stat box | `ProfileScreen.tsx` |
| `PackCard` | Function | Course / pack catalog card | `ExploreScreen.tsx`, `ResourcesScreen.tsx` |
| `DocumentGridCard` | Function | PDF document cover card | `ExploreScreen.tsx`, `LibraryScreen.tsx`, `DocumentsScreen.tsx` |
| `TransactionRow` | Function | Transaction history item | `ProfileScreen.tsx` |
| `ScreenMasthead` | Function | Page header with eyebrow & kicker | `DocumentsScreen.tsx`, `LibraryScreen.tsx`, `ExploreScreen.tsx` |
| `SectionHeading` | Function | Section title with action link | `HomeScreen.tsx`, `GlassComponents.tsx` |
| `EmptyState` | Function | Zero-state placeholder | `DocumentsScreen.tsx`, `LibraryScreen.tsx`, `ExploreScreen.tsx` |
| `TrustBadgeStrip` | Function | 4-item horizontal security badge | `HomeScreen.tsx`, `DashboardScreen.tsx`, `ExploreScreen.tsx` |
| `GradientText` | Function | SVG gradient text | `DocumentsScreen.tsx` |
| `InkRule` | Function | Subtle divider line | `GlassComponents.tsx` |

---

## 3. Deep Dive 1: TopBar Transformation

### 3.1 Current Implementation & Shortcomings
Currently in `src/ui/GlassComponents.tsx:541-588`:
```tsx
export function TopBar({
  appName = 'Campus 360',
  onBellPress,
  hasUnread = false,
  onAvatarPress,
  avatarInitials,
}: {
  appName?: string;
  onBellPress: () => void;
  hasUnread?: boolean;
  onAvatarPress?: () => void;
  avatarInitials?: string;
})
```
- **Styling:** `backgroundColor: stitchColors.background` (`#090714`), flat horizontal bar, no bottom curve, square logo mark, no location dropdown, no integrated search bar.
- **Problem:** Look & feel is austere and dark. In the reference image (Screen 1), the top header is a lush Royal Violet curved banner integrating location, notifications, and a floating white search pill with filter options.

### 3.2 Redesigned Architecture & Extended Interface
To maintain 100% backward compatibility with `AppShell.tsx` while satisfying R2 of the specification, `TopBar` must be extended with optional props:

```tsx
export interface TopBarProps {
  // Existing props (preserved)
  appName?: string;
  onBellPress?: () => void;
  hasUnread?: boolean;
  unreadCount?: number;
  onAvatarPress?: () => void;
  avatarInitials?: string;

  // New location pill props
  locationName?: string;         // e.g. "Yaoundé • Univ. Ydé I"
  universityName?: string;       // alternative alias
  onLocationPress?: () => void;
  showLocation?: boolean;        // default: true

  // New search & filter props
  showSearch?: boolean;          // default: true
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  searchPlaceholder?: string;    // default: "Rechercher un stage, entreprise..."
  onFilterPress?: () => void;
  onSearchPress?: () => void;    // tap on search bar if non-editable
  hasActiveFilters?: boolean;

  // Wallet / token pill (optional)
  iaCredits?: number;
  onWalletPress?: () => void;

  style?: ViewStyle;
}
```

### 3.3 Visual Hierarchy & Layout Structure
```
┌──────────────────────────────────────────────────────────────┐
│  LinearGradient ['#7C3AED', '#6D28D9']                       │
│  borderBottomLeftRadius: 28, borderBottomRightRadius: 28     │
│                                                              │
│  [📍 Yaoundé • Univ. Ydé I ∨]          [🔔(•)] [💰 10 cr]   │
│  (Semi-translucent white pill)          (Circular action btns)│
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🔍 Rechercher un stage, entreprise...      [ ⚙️ Filtres]│  │
│  └────────────────────────────────────────────────────────┘  │
│  (Pure white curved search pill with Royal Violet filter)     │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 Detailed StyleSheet Specification for `TopBar`
- **Container (`topBarCurved`):**
  - Gradient: `colors={['#7C3AED', '#6D28D9']}`, start `{ x: 0, y: 0 }`, end `{ x: 1, y: 1 }`.
  - Radii: `borderBottomLeftRadius: 28`, `borderBottomRightRadius: 28`.
  - Insets: `paddingTop: Platform.OS === 'ios' ? 52 : 40`, `paddingBottom: 20`, `paddingHorizontal: 20`.
  - Shadow: `shadowColor: '#7C3AED'`, `shadowOffset: { width: 0, height: 10 }`, `shadowOpacity: 0.25`, `shadowRadius: 18`, `elevation: 8`.
- **Top Row (`topBarHeaderRow`):**
  - `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, `marginBottom: 16`.
- **Location Pill (`topBarLocPill`):**
  - Background: `'rgba(255, 255, 255, 0.18)'`, `borderWidth: 1`, `borderColor: 'rgba(255, 255, 255, 0.28)'`.
  - `borderRadius: 9999`, `paddingHorizontal: 12`, `paddingVertical: 7`, `flexDirection: 'row'`, `alignItems: 'center'`, `gap: 6`.
  - Text: `fontFamily: INTER`, `fontSize: 12.5`, `fontWeight: '600'`, `color: '#FFFFFF'`.
  - Icons: `<MapPin size={14} color="#FFFFFF" strokeWidth={2.2} />`, `<ChevronDown size={13} color="rgba(255, 255, 255, 0.85)" />`.
- **Action Icons (`topBarActions`):**
  - Bell Button: 38x38 circle, `backgroundColor: 'rgba(255, 255, 255, 0.18)'`, `borderRadius: 19`, `borderWidth: 1`, `borderColor: 'rgba(255, 255, 255, 0.25)'`.
  - Unread Badge: 8x8 dot, `backgroundColor: '#EF4444'`, `borderRadius: 4`, positioned at `top: 7, right: 7`, with 1.5px white border.
  - Optional Credits Pill: `backgroundColor: 'rgba(255, 255, 255, 0.20)'`, `borderRadius: 9999`, `paddingHorizontal: 10`, `paddingVertical: 6`, `flexDirection: 'row'`, `alignItems: 'center'`, `gap: 4`.
- **Integrated White Search Pill (`topBarSearchPill`):**
  - Background: Pure White `'#FFFFFF'`, `borderRadius: 9999`.
  - Shadow: `shadowColor: '#0F172A'`, `shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.10`, `shadowRadius: 12`, `elevation: 4`.
  - Padding: `paddingHorizontal: 14`, `paddingVertical: 6`, `flexDirection: 'row'`, `alignItems: 'center'`, `gap: 10`.
  - Search Input: `flex: 1`, `fontFamily: INTER`, `fontSize: 14`, `color: '#0F172A'`, `placeholderTextColor: '#94A3B8'`.
  - Filter Button: 34x34 circle, `backgroundColor: hasActiveFilters ? '#7C3AED' : '#F5F3FF'`, `alignItems: 'center'`, `justifyContent: 'center'`, `borderRadius: 17`.
  - Filter Icon: `<SlidersHorizontal size={16} color={hasActiveFilters ? '#FFFFFF' : '#7C3AED'} strokeWidth={2.2} />`.

---

## 4. Deep Dive 2: BottomNav Transformation

### 4.1 Current Implementation & Shortcomings
Currently in `src/ui/GlassComponents.tsx:397-438`:
```tsx
export function BottomNav({
  activeSection,
  onPress,
}: {
  activeSection: string;
  onPress: (section: string) => void;
})
```
- **Styling:**
  - `bottomNav`: `backgroundColor: 'rgba(13, 10, 28, 0.94)'`, dark obsidian capsule, dark borders.
  - Active pill: `#7C3AED` with white text.
  - Inactive icons: `#94A3B8`.
- **Problem:** Clashes with the new Clean White aesthetic.

### 4.2 Redesigned Architecture
The 5 destinations remain identical (`NAV_ITEMS`):
```tsx
const NAV_ITEMS = [
  { key: 'home', label: 'Accueil', Icon: Home },
  { key: 'stages', label: 'Stages', Icon: Briefcase },
  { key: 'documents', label: 'Créer', Icon: FileText },
  { key: 'resources', label: 'Ressources', Icon: BookOpen },
  { key: 'account', label: 'Profil', Icon: User },
] as const;
```

### 4.3 Visual Hierarchy & Styling Transformation
1. **Outer Wrapper (`bottomNavWrap`):**
   - Floating at screen bottom:
     `position: 'absolute'`, `left: 0`, `right: 0`, `bottom: 0`, `alignItems: 'center'`.
     `paddingBottom: Platform.OS === 'ios' ? 24 : 16`.
     `pointerEvents="box-none"`.
2. **Capsule Bar (`bottomNav`):**
   - Clean White: `backgroundColor: '#FFFFFF'`.
   - Smooth Pill Border Radius: `borderRadius: 9999` (continuous curve).
   - Crisp Hairline Border: `borderWidth: 1`, `borderColor: 'rgba(15, 23, 42, 0.06)'` (or `#F1F5F9`).
   - Ultra-Soft Elevation Shadow:
     `shadowColor: '#0F172A'`, `shadowOffset: { width: 0, height: 8 }`, `shadowOpacity: 0.10`, `shadowRadius: 20`, `elevation: 12`.
   - Padding & Alignment: `paddingVertical: 6`, `paddingHorizontal: 8`, `gap: 4`.
3. **Active Pill (`navActivePill`):**
   - Solid Royal Violet: `backgroundColor: '#7C3AED'`.
   - Rounded capsule: `borderRadius: 9999`.
   - Padding: `paddingHorizontal: 16`, `paddingVertical: 9`.
   - Violet Accent Glow: `shadowColor: '#7C3AED'`, `shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.35`, `shadowRadius: 10`, `elevation: 4`.
   - Typography & Icon: `<Icon size={17} color="#FFFFFF" strokeWidth={2.4} />`, `<Text style={styles.navActiveLabel}>{label}</Text>`.
4. **Inactive Item (`navInactiveItem`):**
   - Neutral Slate Contrast: `<Icon size={20} color="#64748B" strokeWidth={1.8} />`.
   - Hit slop: 8px for ergonomic one-handed tapping.
   - Touch feedback: `pressed && { opacity: 0.6 }`.

---

## 5. Deep Dive 3: CategoryGrid Transformation

### 5.1 Current Implementation & Shortcomings
Currently in `src/ui/GlassComponents.tsx:1025-1088`:
```tsx
export interface CategoryItem {
  id: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
}
```
- **Styling:**
  - `categoryGrid`: `flexWrap: 'wrap'`, 4 columns per row.
  - `categoryCard`: `width: '22.5%'`, dark background `surfaceContainerLow` (`#0E0B1F`), square box with 14px radius.
- **Problem:** Heavy, dark square tiles. Reference requires elegant, modern circular category avatars with soft purple icon backgrounds and high-contrast labels.

### 5.2 Redesigned Architecture
Support **both** horizontal scrollable mode (ideal for the new `#RecommandéPourToi` home screen) and grid mode:

```tsx
export function CategoryGrid({
  categories,
  activeId,
  onSelectCategory,
  onSeeAllPress,
  title = 'Filières Populaires',
  seeAllLabel = 'Voir tout',
  horizontal = true,
  style,
}: {
  categories: CategoryItem[];
  activeId?: string;
  onSelectCategory: (id: string) => void;
  onSeeAllPress?: () => void;
  title?: string;
  seeAllLabel?: string;
  horizontal?: boolean;
  style?: ViewStyle;
})
```

### 5.3 Circular Styling Specification
- **Circular Icon Badge (`categoryIconCircle`):**
  - Dimensions: `width: 56`, `height: 56`, `borderRadius: 28`.
  - Inactive Background: `cat.bg || 'rgba(124, 58, 237, 0.08)'` (Soft Lavender Tint `#F5F3FF`).
  - Active Background: Solid Royal Violet `'#7C3AED'` (or white circle with 2px Royal Violet border).
  - Inactive Icon Color: `cat.color || '#7C3AED'` (size 22, strokeWidth 2).
  - Active Icon Color: `'#FFFFFF'` (size 22, strokeWidth 2.2).
- **Legible Label Underneath (`categoryLabel`):**
  - Alignment: `textAlign: 'center'`, `marginTop: 8`.
  - Font: `fontFamily: INTER`, `fontSize: 12`, `lineHeight: 15`, `fontWeight: active ? '700' : '600'`.
  - Color: `active ? '#7C3AED' : '#0F172A'` (high-contrast Deep Slate Black).
- **Item Container (`categoryCard`):**
  - Dimensions: `width: 76` (when horizontal) or `'22.5%'` (when grid).
  - Background: `'transparent'` (no dark square borders).
  - Padding: `alignItems: 'center'`.

---

## 6. Deep Dive 4: Foundation Components Redesign

### 6.1 `Card`, `GlassCard`, `GlassPanel`
- **Current:** Dark `#131024` surface, purple-tinted borders.
- **Redesign:**
  - `card`:
    - `backgroundColor: '#FFFFFF'`
    - `borderRadius: 20` (16-24px soft corners)
    - `borderWidth: 1`, `borderColor: '#F1F5F9'`
    - Shadow: `shadowColor: '#0F172A'`, `shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.04`, `shadowRadius: 12`, `elevation: 2`.
  - Tones:
    - `tone === 'paper'`: `#FFFFFF`
    - `tone === 'ink'`: `#F8FAFC` (subtle off-white contrast surface)
    - `tone === 'sienna'`: `'rgba(124, 58, 237, 0.06)'` with `'rgba(124, 58, 237, 0.16)'` border.

### 6.2 `GradientButton`, `PrimaryButton`, `SecondaryButton`
- **`GradientButton` / `PrimaryButton`:**
  - Gradient: Royal Violet to Electric Violet (`['#7C3AED', '#8B5CF6']`).
  - Radii: `borderRadius: 14`.
  - Padding: `paddingVertical: 16`, `paddingHorizontal: 24`.
  - Typography: `fontFamily: SANS`, `fontSize: 15`, `fontWeight: '700'`, `color: '#FFFFFF'`.
  - Shadow: `shadowColor: '#7C3AED'`, `shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.30`, `shadowRadius: 12`, `elevation: 4`.
- **`SecondaryButton`:**
  - Clean light surface: `backgroundColor: '#F1F5F9'`, `borderWidth: 1`, `borderColor: '#E2E8F0'`, `borderRadius: 14`.
  - Typography: `fontFamily: SANS`, `fontSize: 15`, `fontWeight: '600'`, `color: '#0F172A'`.

### 6.3 `EditorialInput`, `GlassInput`
- **Container (`inputBox`):**
  - Inactive: `backgroundColor: '#F8FAFC'`, `borderWidth: 1`, `borderColor: '#E2E8F0'`, `borderRadius: 14`.
  - Focused: `borderColor: '#7C3AED'`, `backgroundColor: '#FFFFFF'`, `shadowColor: '#7C3AED'`, `shadowOpacity: 0.12`, `shadowRadius: 6`, `elevation: 2`.
- **Typography:**
  - Text: `fontFamily: INTER`, `fontSize: 15`, `color: '#0F172A'`.
  - Placeholder: `color: '#94A3B8'`.
  - Label: `fontFamily: INTER`, `fontSize: 12.5`, `fontWeight: '600'`, `color: '#334155'`.

### 6.4 `Pill`, `GlassPill`
- **Active (`pillActive`):**
  - Solid Royal Violet: `backgroundColor: '#7C3AED'`, `borderColor: '#7C3AED'`.
  - Text: `color: '#FFFFFF'`, `fontWeight: '700'`.
  - Shadow: `shadowColor: '#7C3AED'`, `shadowOffset: { width: 0, height: 3 }`, `shadowOpacity: 0.25`, `shadowRadius: 6`, `elevation: 3`.
- **Inactive (`pillInactive`):**
  - Off-white chip: `backgroundColor: '#F8FAFC'`, `borderWidth: 1`, `borderColor: '#E2E8F0'`.
  - Text: `color: '#64748B'`, `fontWeight: '600'`.

### 6.5 `SearchFilterBar`
- Standalone search bar for screens that do not use the full `TopBar` (or inside feeds):
  - Pill Container: `backgroundColor: '#FFFFFF'`, `borderWidth: 1`, `borderColor: '#E2E8F0'`, `borderRadius: 9999`.
  - Shadow: `shadowColor: '#0F172A'`, `shadowOffset: { width: 0, height: 2 }`, `shadowOpacity: 0.05`, `shadowRadius: 8`, `elevation: 2`.
  - Filter Button: `backgroundColor: hasActiveFilters ? '#7C3AED' : '#F5F3FF'`, Icon: `SlidersHorizontal` (`hasActiveFilters ? '#FFFFFF' : '#7C3AED'`).

### 6.6 `DocumentGridCard` & `PackCard`
- Pure white cards (`backgroundColor: '#FFFFFF'`), 18px radius, subtle border (`#E2E8F0`).
- Star ratings in warm amber (`#EAB308` on `#FEF9C3` badge).
- Document title in `#0F172A`, subtitle in `#64748B`, price tag in `#059669`.

### 6.7 `TrustBadgeStrip`
- Clean white strip (`backgroundColor: '#FFFFFF'`, `borderColor: '#F1F5F9'`, `borderRadius: 16`).
- Icons in circular tinted badges (`color + '18'`), labels in `#334155`.

---

## 7. Cross-Screen Prop Safety Matrix & Usage Verification

A critical priority is ensuring **zero breaking changes** to any screen calling these components.

| Component | Caller File & Line | Props Currently Passed | Backward Compatibility Status |
| :--- | :--- | :--- | :--- |
| `TopBar` | `src/AppShell.tsx:1156` | `appName`, `onBellPress`, `hasUnread`, `onAvatarPress`, `avatarInitials` | **100% Safe:** All existing props retained with identical types & defaults. New props are strictly optional (`?`). |
| `BottomNav` | `src/AppShell.tsx:1361` | `activeSection`, `onPress` | **100% Safe:** Preserves identical prop signature and 5 navigation keys. |
| `SearchFilterBar` | `HomeScreen.tsx:131`, `StagesScreen.tsx:243`, `ExploreScreen.tsx:18` | `value`, `onChangeText`, `placeholder`, `onFilterPress`, `hasActiveFilters`, `onSubmitEditing`, `style` | **100% Safe:** Zero signature modification; purely visual refinement. |
| `CategoryGrid` | `HomeScreen.tsx` | `categories`, `activeId`, `onSelectCategory`, `onSeeAllPress` | **100% Safe:** Added optional `horizontal?: boolean` default true. |
| `GlassCard` / `Card` | `AuthScreen.tsx:25`, `AppShell.tsx` | `style`, `children`, `tone` | **100% Safe:** Same prop signature, updated surfaces. |
| `GlassInput` / `EditorialInput` | `AuthScreen.tsx:26`, `ExploreScreen.tsx:12` | `label`, `value`, `onChangeText`, `placeholder`, `secureTextEntry`, icons | **100% Safe:** Identical prop signature. |
| `GlassPill` / `Pill` | `AuthScreen.tsx:27`, `ExploreScreen.tsx:13` | `label`, `active`, `onPress`, `style` | **100% Safe:** Identical prop signature. |
| `PrimaryButton` / `GradientButton` | `AuthScreen.tsx:28` | `label`, `onPress`, `fluid`, `disabled`, `loading`, `icon` | **100% Safe:** Identical prop signature. |
| `DocumentGridCard` | `DocumentsScreen.tsx:10`, `LibraryScreen.tsx:4`, `ExploreScreen.tsx:14` | `title`, `subject`, `pages`, `owned`, `price`, `rating`, `onPress` | **100% Safe:** Identical prop signature. |
| `TrustBadgeStrip` | `DashboardScreen.tsx:16`, `ExploreScreen.tsx:19` | `style` | **100% Safe:** Identical prop signature. |
| `TransactionRow` | `ProfileScreen.tsx:25` | `transaction` | **100% Safe:** Identical prop signature. |

---

## 8. Concrete Implementation Blueprint (Code Snippets for Implementer)

### 8.1 Proposed `TopBar` Component (Drop-in Replacement)

```tsx
// ─── TopBar — Curved Royal Violet Header with Location & Search ──────────────
export interface TopBarProps {
  appName?: string;
  onBellPress?: () => void;
  hasUnread?: boolean;
  unreadCount?: number;
  onAvatarPress?: () => void;
  avatarInitials?: string;
  locationName?: string;
  universityName?: string;
  onLocationPress?: () => void;
  showLocation?: boolean;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  searchPlaceholder?: string;
  onFilterPress?: () => void;
  onSearchPress?: () => void;
  hasActiveFilters?: boolean;
  iaCredits?: number;
  onWalletPress?: () => void;
  style?: ViewStyle;
}

export function TopBar({
  appName = 'Campus 360',
  onBellPress,
  hasUnread = false,
  unreadCount,
  onAvatarPress,
  avatarInitials,
  locationName,
  universityName,
  onLocationPress,
  showLocation = true,
  showSearch = true,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Rechercher un stage, entreprise...',
  onFilterPress,
  onSearchPress,
  hasActiveFilters = false,
  iaCredits,
  onWalletPress,
  style,
}: TopBarProps) {
  const displayLocation = locationName || universityName || 'Yaoundé • Univ. Ydé I';

  return (
    <LinearGradient
      colors={['#7C3AED', '#6D28D9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.topBarCurved, style]}
    >
      {/* ── Row 1: Location Pill & Action Buttons ── */}
      <View style={styles.topBarHeaderRow}>
        {showLocation ? (
          <Pressable
            onPress={onLocationPress}
            style={({ pressed }) => [styles.topBarLocPill, pressed && { opacity: 0.85 }]}
          >
            <MapPin size={14} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.topBarLocText} numberOfLines={1}>
              {displayLocation}
            </Text>
            <ChevronDown size={13} color="rgba(255, 255, 255, 0.85)" />
          </Pressable>
        ) : (
          <View style={styles.topBarBrand}>
            <View style={styles.topBarMark}>
              <Text style={styles.topBarMarkText}>C</Text>
            </View>
            <Text style={styles.topBarNameLight}>{appName}</Text>
          </View>
        )}

        <View style={styles.topBarActions}>
          {iaCredits !== undefined && onWalletPress && (
            <Pressable
              onPress={onWalletPress}
              style={({ pressed }) => [styles.topBarCreditsPill, pressed && { opacity: 0.85 }]}
            >
              <Coins size={13} color="#FDE047" />
              <Text style={styles.topBarCreditsText}>{iaCredits} cr</Text>
            </Pressable>
          )}

          <Pressable
            onPress={onBellPress}
            hitSlop={6}
            style={({ pressed }) => [styles.topBarIconCircle, pressed && { opacity: 0.8 }]}
          >
            <Bell size={18} color="#FFFFFF" strokeWidth={2} />
            {hasUnread && <View style={styles.topBarNotifDot} />}
          </Pressable>

          {onAvatarPress && (
            <Pressable
              onPress={onAvatarPress}
              hitSlop={4}
              style={({ pressed }) => [styles.topBarAvatarCircle, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.topBarAvatarText}>{avatarInitials ?? 'CB'}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Row 2: Integrated Clean White Search Pill ── */}
      {showSearch && (
        <View style={styles.topBarSearchPill}>
          <Search size={18} color="#94A3B8" strokeWidth={2} />
          {onSearchPress && !onSearchChange ? (
            <Pressable onPress={onSearchPress} style={{ flex: 1 }}>
              <Text style={styles.topBarSearchPlaceholder} numberOfLines={1}>
                {searchValue || searchPlaceholder}
              </Text>
            </Pressable>
          ) : (
            <TextInput
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder={searchPlaceholder}
              placeholderTextColor="#94A3B8"
              style={styles.topBarSearchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
          )}
          {onFilterPress && (
            <Pressable
              onPress={onFilterPress}
              style={({ pressed }) => [
                styles.topBarFilterBtn,
                hasActiveFilters && styles.topBarFilterBtnActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <SlidersHorizontal
                size={15}
                color={hasActiveFilters ? '#FFFFFF' : '#7C3AED'}
                strokeWidth={2.2}
              />
            </Pressable>
          )}
        </View>
      )}
    </LinearGradient>
  );
}
```

### 8.2 Proposed `BottomNav` Component (Drop-in Replacement)

```tsx
// ─── BottomNav — Floating Clean White Curved Bar with Solid Violet Pill ──────
export function BottomNav({
  activeSection,
  onPress,
}: {
  activeSection: string;
  onPress: (section: string) => void;
}) {
  return (
    <View style={styles.bottomNavWrap} pointerEvents="box-none">
      <View style={styles.bottomNavClean}>
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = activeSection === key;
          if (active) {
            return (
              <Pressable
                key={key}
                testID={`nav-${key}`}
                accessibilityLabel={label}
                onPress={() => onPress(key)}
                style={({ pressed }) => [styles.navActivePill, pressed && { opacity: 0.9 }]}
              >
                <Icon size={17} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.navActiveLabel}>{label}</Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={key}
              testID={`nav-${key}`}
              accessibilityLabel={label}
              onPress={() => onPress(key)}
              hitSlop={8}
              style={({ pressed }) => [styles.navInactiveItem, pressed && { opacity: 0.6 }]}
            >
              <Icon size={20} color="#64748B" strokeWidth={1.8} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
```

### 8.3 Proposed `CategoryGrid` Component (Circular Avatars)

```tsx
// ─── CategoryGrid — Horizontal Circular Category Items ──────────────────────
export function CategoryGrid({
  categories,
  activeId,
  onSelectCategory,
  onSeeAllPress,
  title = 'Filières Populaires',
  seeAllLabel = 'Voir tout',
  horizontal = true,
  style,
}: {
  categories: CategoryItem[];
  activeId?: string;
  onSelectCategory: (id: string) => void;
  onSeeAllPress?: () => void;
  title?: string;
  seeAllLabel?: string;
  horizontal?: boolean;
  style?: ViewStyle;
}) {
  const renderItem = (cat: CategoryItem) => {
    const active = activeId === cat.id;
    const Icon = cat.icon;
    return (
      <Pressable
        key={cat.id}
        onPress={() => onSelectCategory(cat.id)}
        style={({ pressed }) => [
          styles.categoryItemWrap,
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={[styles.categoryCircle, active && styles.categoryCircleActive]}>
          <Icon size={22} color={active ? '#FFFFFF' : '#7C3AED'} strokeWidth={2} />
        </View>
        <Text
          style={[styles.categoryItemLabel, active && styles.categoryItemLabelActive]}
          numberOfLines={2}
        >
          {cat.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.categorySection, style]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.categorySectionTitle}>{title}</Text>
        {onSeeAllPress ? (
          <Pressable onPress={onSeeAllPress} hitSlop={8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={styles.seeAllTextViolet}>{seeAllLabel}</Text>
              <ChevronRight size={14} color="#7C3AED" />
            </View>
          </Pressable>
        ) : null}
      </View>

      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map(renderItem)}
        </ScrollView>
      ) : (
        <View style={styles.categoryGridWrap}>
          {categories.map(renderItem)}
        </View>
      )}
    </View>
  );
}
```

### 8.4 Key New StyleSheet Entries for `GlassComponents.tsx`

```tsx
  // ── TopBar Curved Royal Violet ──
  topBarCurved: {
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  topBarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  topBarLocPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: '65%',
  },
  topBarLocText: {
    fontFamily: INTER,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  topBarBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBarMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarMarkText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  topBarNameLight: { fontFamily: SANS, fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarCreditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  topBarCreditsText: { fontFamily: SANS, fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  topBarIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topBarNotifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
  },
  topBarAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarAvatarText: { color: '#7C3AED', fontSize: 12.5, fontWeight: '800' },
  topBarSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  topBarSearchInput: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 4,
  } as any,
  topBarSearchPlaceholder: {
    fontFamily: INTER,
    fontSize: 13.5,
    color: '#94A3B8',
  },
  topBarFilterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarFilterBtnActive: {
    backgroundColor: '#7C3AED',
  },

  // ── BottomNav Clean Floating Bar ──
  bottomNavClean: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 12,
  },

  // ── Circular Category Items ──
  categoryScrollContent: {
    gap: 16,
    paddingHorizontal: 20,
  },
  categoryGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  categoryItemWrap: {
    alignItems: 'center',
    width: 76,
  },
  categoryCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  categoryCircleActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryItemLabel: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 14,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 8,
  },
  categoryItemLabelActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  seeAllTextViolet: {
    fontFamily: INTER,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#7C3AED',
  },
```

---

## 9. Conclusion & Recommendations for the Implementer

1. **Keep Component Signatures Backwards-Compatible:**
   Do not remove any props from `TopBar`, `BottomNav`, `Card`, `Pill`, or `CategoryGrid`. Use optional chaining and default parameters for all new capabilities.
2. **Synchronize with `stitch.ts` Palette Update:**
   When the theme foundation in `src/theme/stitch.ts` is updated to Clean White & Royal Violet (`stitchColors.paper = '#FFFFFF'`, `stitchColors.ink = '#0F172A'`), `GlassComponents.tsx` will automatically inherit the unified tokens.
3. **AppShell Integration:**
   `AppShell.tsx:1156` already mounts `<TopBar ... />`. Simply passing `onSearchChange` or `onSearchPress` allows instant search synchronization from the curved header directly into `HomeScreen` or `StagesScreen`.
4. **Verification Requirement:**
   Execute `npm run typecheck` (`tsc --noEmit`) after applying changes to guarantee zero regressions.
