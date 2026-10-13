# Technical Investigation: Immersive Stage Detail Screen & White Feed (Milestone M3)

## 1. Executive Summary

This investigation analyzes `src/ui/screens/StagesScreen.tsx` (1,393 lines), its data models (`src/types.ts`), parent routing (`src/AppShell.tsx`), and connected flows (`src/features/stages/AiApplyModal.tsx`).

The goal is to transition the current dark obsidian stage feed and basic bottom-sheet modal into:
1. **Aired Clean White Feed Cards** (`#FFFFFF`, `#F8FAFC`, `stitchShadows.card`, `stitchRadius.card: 20`) with cover photography, contract badge, and AI match rating pill (`★ 95% Match`).
2. **Screen 2 Reference: Immersive Stage Detail View**:
   - Full-bleed hero header (height: 280, curved bottom corners `borderBottomLeftRadius: 32`, `borderBottomRightRadius: 32`).
   - Floating circular action buttons: Back (`ChevronLeft`), Share (`Share2`), and Favorite (`Heart`).
   - Horizontal thumbnail photo strip peeking into company workspaces with "+N photos" badge.
   - Domain pill badge (`Stage Pré-embauche` / `Informatique`) + AI Match rating badge (`★ 95% Match`).
   - Prominent job title and company location with direction action (`Itinéraire ↗`).
   - Segmented tabs with purple underline indicators: `[ À propos ]`, `[ Entreprise ]`, `[ Conseils IA ]`.
   - Quick metadata pill row: Duration (`🏃 3 à 6 mois`), Location mode (`📍 Présentiel`), Status (`🕒 Ouvert`).
   - Rich description block with expandable "Voir plus" toggle and required skills tag chips.
   - Recruiter / Company info card with direct WhatsApp and email contact buttons.
   - Fixed sticky bottom bar displaying estimated stipend and large Royal Violet CTA (`Postuler en 1 Clic`), directly invoking `AiApplyModal.tsx`.

---

## 2. Current Implementation Analysis (`StagesScreen.tsx`)

### 2.1 File & State Metrics
- **Current Lines:** 1,393 lines.
- **Background Styling:** Dark obsidian violet (`#090714`, `#120E22`, `rgba(124, 58, 237, 0.15)`).
- **Current State:**
  ```tsx
  const [jobs, setJobs] = useState<StageJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSector, setActiveSector] = useState('Tous');
  const [activeContractType, setActiveContractType] = useState('Tous');
  const [applyingJob, setApplyingJob] = useState<StageJob | null>(null);
  const [selectedDetailJob, setSelectedDetailJob] = useState<StageJob | null>(null);
  const [showTopThreeOnly, setShowTopThreeOnly] = useState(false);
  ```
- **New States Needed for Screen 2:**
  - `activeDetailTab`: `'about' | 'company' | 'aiAdvice'` (defaults to `'about'`).
  - `isDescriptionExpanded`: `boolean` (defaults to `false`).
  - `isFavorited`: `Record<string, boolean>` (persisting heart toggle per stage).
  - `selectedPreviewPhoto`: `string | null` (optional modal or fullscreen preview when tapping a workspace thumbnail).

### 2.2 Feed Rendering vs Required Redesign
| Attribute | Current Implementation | Redesign Requirement (R4) |
|---|---|---|
| Screen Background | `#090714` (Dark obsidian) | `#F8FAFC` (Clean slate-50) |
| Header Container | `#090714`, custom dark search input | Clean white header, `SearchFilterBar`, clean category chips |
| Job Card Surface | `#120E22`, border `rgba(255,255,255,0.08)` | `#FFFFFF`, border `#F1F5F9`, radius 20, `stitchShadows.card` |
| Cover Photo | H:140, dark gradient overlay | H:150-160, crisp photo, top radius 20, contract badge & AI match badge |
| Match Score Display | Discrete text line `... · 85% de correspondance` | High-visibility rating pill `★ 95% Match` on hero + badge |
| Company Avatar | Dark box `rgba(124, 58, 237, 0.16)` | Soft lavender circle / rounded square `rgba(124, 58, 237, 0.08)` |
| Card Action Bottom | Dark row, stipend label, small purple button | Clean white bottom row with stipend and Royal Violet CTA |

### 2.3 Detail View Transition
- Currently, tapping any card sets `setSelectedDetailJob(job)`, opening a bottom-sheet `<Modal>` with `maxHeight: '85%'` and dark theme.
- **Target Architecture:**
  - The modal or full-screen view must render full-bleed (`statusBarTranslucent`, `transparent={false}` or overlay with `flex: 1`, `backgroundColor: '#FFFFFF'`).
  - The sticky bottom bar must reside **outside** the `ScrollView` at the root of the detail container to remain permanently fixed while the user scrolls through the tabs and content.

---

## 3. Data Structure & Type Safety Analysis

### 3.1 Existing Data Models (`src/types.ts`)
```ts
export type StageCompany = {
  id: string;
  name: string;
  industry: string;
  address: string;
  contactEmail: string;
  contactWhatsapp?: string;
  kybScore: number;
  status: CompanyStatus; // 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED'
  isPremium: boolean;
  logoUrl?: string;
};

export type StageJob = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  requirements: string[];
  applyMethod: ApplyMethod;
  isSponsored: boolean;
  source: JobSource;
  createdAt: string;
  expiresAt: string;
  location?: string;
  duration?: string;
  contractType?: string;
  stipend?: string;
  company?: StageCompany;
  matchScore?: number;
  matchHeadline?: string;
  matchBadgeColor?: string;
  matchReasons?: string[];
  matchingSkills?: string[];
  flyerUrl?: string;
  videoUrl?: string;
};
```

### 3.2 Non-Breaking Workspace Photos Strategy
`StageJob` does not currently define `workspacePhotos`. To support:
> "Horizontal thumbnail photo strip peeking into company workspaces with '+N photos' badge"
we provide:
1. **Deterministic Fallback Photo Pools** by sector in `StagesScreen.tsx`:
   ```ts
   export const WORKSPACE_PHOTO_POOLS: Record<string, string[]> = {
     tech: [
       'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80',
       'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
       'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
       'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
       'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=80',
     ],
     finance: [
       'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
       'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&auto=format&fit=crop&q=80',
       'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80',
       'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
     ],
     // btp, marketing, sante, etc.
   };
   ```
2. Helper `getCompanyWorkspacePhotos(job: StageJob): string[]` which returns `job.workspacePhotos ?? poolPhotos`.
3. Optional property in `src/types.ts`:
   ```ts
   workspacePhotos?: string[];
   ```
   This guarantees 100% backward compatibility and zero TypeScript errors.

---

## 4. Screen 2 Detailed Component Specifications (R3)

```
┌────────────────────────────────────────────────────────┐
│ [←] (Back)             [Share]        [♥] (Favorite)  │  ← Floating circular buttons
│                                                        │
│             HERO BANNER (H: 280)                      │  ← Full-bleed with curved bottom (R:32)
│                                                        │
├────────────────────────────────────────────────────────┤
│ [ Photo 1 ] [ Photo 2 ] [ Photo 3 ] [ Photo 4 +3 ]     │  ← Workspace thumbnail strip
├────────────────────────────────────────────────────────┤
│ [Stage Pré-embauche]              [★ 95% Match]        │  ← Domain pill + AI Match pill
│                                                        │
│ Développeur Mobile React Native                        │  ← Prominent Job Title (22px bold)
│ MTN Digital Communications · Douala [Itinéraire ↗]    │  ← Company + Direction action
├────────────────────────────────────────────────────────┤
│ [ À PROPOS ]      [ ENTREPRISE ]      [ CONSEILS IA ]  │  ← Segmented Underline Tabs
│ ━━━━━━━━━━                                            │  (Active purple underline)
├────────────────────────────────────────────────────────┤
│ TAB 1: À PROPOS                                        │
│  · [🏃 3 à 6 mois]  [📍 Présentiel]  [🕒 Ouvert]        │  ← Quick Metadata Pill Row
│  · Description du poste... [Voir plus ∨]               │  ← Expandable description
│  · Compétences requises : [React Native] [TypeScript]  │  ← Skills tag chips
│                                                        │
│ TAB 2: ENTREPRISE                                      │
│  · Présentation entreprise (KYB Score 98% Vérifié)    │
│  · CARTE RECRUTEUR :                                   │
│    [👤 Avatar] Mme Claire Dupont - RH                  │
│    [💬 WhatsApp Recruteur]   [✉️ Email Recruteur]       │  ← Recruiter contact actions
│                                                        │
│ TAB 3: CONSEILS IA                                     │
│  · Score d'affinité IA & Points de correspondance      │
│  · Conseil stratégique entretien & points forts         │
├────────────────────────────────────────────────────────┤
│ STICKY BOTTOM BAR (Fixed outside ScrollView)           │
│  INDEMNITÉ MENSUELLE        [ ⚡ Postuler en 1 Clic ]   │  ← Sticky CTA wired to
│  75 000 FCFA /mois                                     │     AiApplyModal
└────────────────────────────────────────────────────────┘
```

### 4.1 Full-Bleed Hero Header & Floating Action Buttons
- **Height:** 280px.
- **Radiuses:** `borderBottomLeftRadius: 32`, `borderBottomRightRadius: 32`, `overflow: 'hidden'`.
- **Image:** Dynamic sector banner from `getRotatingJobBanner(job)`.
- **Floating Action Buttons:**
  - Back Button: `ChevronLeft` (size 22, color `#0F172A`), circular 44x44, white translucent surface `rgba(255, 255, 255, 0.92)`, soft shadow.
  - Share Button: `Share2` (size 20, color `#0F172A`), circular 44x44.
  - Favorite Button: `Heart` (size 20, fill/color `#EF4444` if favorited, else `#0F172A`), circular 44x44.
  - Position: `position: 'absolute'`, `top: Platform.OS === 'ios' ? 50 : 36`, `left: 16`, `right: 16`, `flexDirection: 'row'`, `justifyContent: 'space-between'`.

### 4.2 Horizontal Workspace Photo Strip
- **Layout:** Horizontal `ScrollView` with 4 visible thumbnail slots.
- **Thumbnail:** 74x74 square, `borderRadius: 14`, border `1px solid #E2E8F0`, `overflow: 'hidden'`.
- **4th Thumbnail Overlay:** `LinearGradient` or dark backdrop `rgba(15, 23, 42, 0.65)` with text `+N photos` (`fontSize: 12`, `fontWeight: '700'`, `color: '#FFFFFF'`).
- **Interactive Preview:** Tapping any photo displays a high-res photo preview modal or expands gallery.

### 4.3 Domain Pill Badge + AI Match Rating Badge
- **Domain Badge:** Lavender tint background `rgba(124, 58, 237, 0.08)`, text `#7C3AED`, `fontWeight: '700'`, e.g. `Stage Pré-embauche` / `Informatique`.
- **AI Match Rating:** Emerald pill `rgba(16, 185, 129, 0.12)`, text `#059669` / `#10B981` with `Star` or `Sparkles` icon (`★ 95% Match`).

### 4.4 Prominent Job Title & Direction Action
- **Title:** Deep Slate Black (`#0F172A`), `fontSize: 22`, `lineHeight: 28`, `fontWeight: '800'`.
- **Company & Location:**
  - Company row with logo/avatar (32x32), name in `#0F172A`, industry in `#64748B`, verified badge (`CheckCircle2` in `#10B981`).
  - Location line with `MapPin` (color `#64748B`, size 15).
  - Direction Action Button: Pressable badge with `Compass` or `Navigation` icon and label `"Itinéraire ↗"` calling `Linking.openURL('https://maps.google.com/?q=' + encodeURIComponent(address))`.

### 4.5 Segmented Underline Tabs
- 3 tabs:
  1. `[ À propos ]`
  2. `[ Entreprise ]`
  3. `[ Conseils IA ]`
- **Active Tab Styling:** Text in Royal Violet (`#7C3AED`, `fontWeight: '700'`), with a purple underline indicator bar (height 3px, rounded 2px, `#7C3AED`).
- **Inactive Tab Styling:** Text in Muted Slate (`#64748B`, `fontWeight: '600'`), no underline indicator.

### 4.6 Tab Contents
#### Tab 1: "À propos"
1. **Quick Metadata Pill Row:**
   - Duration: `Clock` + `job.duration || '3 à 6 mois'`
   - Location mode: `MapPin` + `Présentiel` (or `Hybride` / `Télétravail`)
   - Status: `CheckCircle2` + `Ouvert` (or `Urgent`)
2. **Rich Description Block:**
   - Body text in Deep Slate (`#334155`, `fontSize: 14`, `lineHeight: 22`).
   - "Voir plus" toggle: If text > 220 chars, truncate to 4 lines and show `"Voir plus ∨"` / `"Voir moins ∧"` button in `#7C3AED`.
3. **Required Skills Chips:**
   - Header: `"Compétences requises"`
   - Tag chips in `#F1F5F9`, border `#E2E8F0`, label in `#0F172A`.
   - Matching student skills highlighted in soft lavender (`rgba(124, 58, 237, 0.12)`, text `#7C3AED`).

#### Tab 2: "Entreprise"
1. **Company Overview:**
   - Name, sector, address, KYB Verification badge (`Score KYB : 98% Vérifié`).
   - About company description.
2. **Recruiter / Company Info Card:**
   - Card container: Clean white card, border `#E2E8F0`, rounded 18px, soft shadow.
   - Header: Circular avatar with initials or logo, `"Service Recrutement & Talents"`, company verified badge.
   - 2 Action Buttons:
     - `WhatsApp Recruteur`: `MessageCircle` icon + text, emerald background or tint, calls `Linking.openURL('https://wa.me/' + phone)`.
     - `Email Recruteur`: `Mail` icon + text, purple tint or white border, calls `Linking.openURL('mailto:' + email)`.

#### Tab 3: "Conseils IA"
1. **Match Overview:**
   - Score badge: `★ ${detailMatch.score}% de correspondance`.
   - Headline: `detailMatch.headline`.
2. **Key Matched Points:** Bullet list from `detailMatch.matchedPoints`.
3. **Strategic Advice:** Box with `Sparkles` icon containing `detailMatch.strategicAdvice`.
4. **Official CV Tip:** Recommendation to apply using the official 2-column RH CV.

### 4.7 Sticky Bottom Bar & 1-Click CTA
- **Placement:** Outside the `ScrollView`, at the bottom of the detail view container.
- **Styling:** White surface (`#FFFFFF`), top border (`#F1F5F9`), soft elevation shadow (`shadowOffset: { width: 0, height: -4 }`, `shadowOpacity: 0.06`, `shadowRadius: 12`).
- **Left Column:**
  - Label: `"INDEMNITÉ ESTIMÉE"` (uppercase, `#64748B`, 10px, bold).
  - Amount: `job.stipend || '75 000 FCFA /mois'` (bold `#0F172A` or `#059669`, 16px).
- **Right Column:**
  - Large Royal Violet button (`Postuler en 1 Clic`).
  - Background: `#7C3AED` (or `brandGradient` LinearGradient).
  - Rounded capsule `borderRadius: 16`, padding horizontal 24, vertical 14.
  - Icon: `Sparkles` or `Zap` or `Send` in white.
  - **Press Handler:**
    ```tsx
    onPress={() => {
      setApplyingJob(selectedDetailJob);
    }}
    ```
    Directly opens `AiApplyModal.tsx` for automated background WhatsApp / Email dispatch with official CV PDF!

---

## 5. Lucide React Native Icon Verification

All icons required for Milestone M3 were verified in `node_modules/lucide-react-native/dist/lucide-react-native.d.ts`:
| Icon Name | Verified Status | Purpose |
|---|---|---|
| `ChevronLeft` | ✅ Available | Detail screen Back button |
| `Share2` | ✅ Available | Detail screen Share button |
| `Heart` | ✅ Available | Detail screen Favorite toggle |
| `MapPin` | ✅ Available | Location badge & metadata pill |
| `Clock` | ✅ Available | Duration metadata pill |
| `Briefcase` | ✅ Available | Contract type & bottom nav |
| `Sparkles` | ✅ Available | AI match badge & 1-Click CTA icon |
| `ExternalLink` | ✅ Available | Direction / link action |
| `MessageCircle`| ✅ Available | WhatsApp recruiter contact button |
| `Mail` | ✅ Available | Email recruiter contact button |
| `Compass` | ✅ Available | Direction / Itinéraire action |
| `Building2` | ✅ Available | Company info & fallback logo |
| `CheckCircle2` | ✅ Available | Verified company badge & status |
| `Star` | ✅ Available | AI match rating star (`★ 95%`) |
| `Zap` | ✅ Available | 1-Click application indicator |
| `ChevronRight` | ✅ Available | List item navigation arrow |
| `SlidersHorizontal` | ✅ Available | Filter button in search bar |
| `Camera` / `ImageIcon` | ✅ Available | Workspace photos indicator |
| `ChevronDown` / `ChevronUp` | ✅ Available | Expandable description toggle |

---

## 6. Type Safety & Non-Breaking Verification

- Current project baseline: `npm run typecheck` passes with **0 errors**.
- Props contract with `AppShell.tsx`:
  - `StagesScreenProps`:
    ```ts
    interface StagesScreenProps {
      studentProfile: {
        fullName: string;
        email: string;
        phoneWhatsapp?: string;
        major: string;
        educationLevel: string;
        skills: string[];
        portfolioUrl?: string;
        tokens?: number;
      };
      onSelectJob?: (job: StageJob) => void;
      onOpenWallet?: () => void;
    }
    ```
  - Preserved verbatim.
- Props contract with `AiApplyModal.tsx`:
  - `AiApplyModalProps`:
    ```ts
    interface AiApplyModalProps {
      visible: boolean;
      job: StageJob | null;
      studentProfile: {
        fullName: string;
        email: string;
        phoneWhatsapp?: string;
        major: string;
        educationLevel: string;
        skills: string[];
        portfolioUrl?: string;
        tokens?: number;
      };
      onClose: () => void;
    }
    ```
  - Compatible with `applyingJob` state.
- Optional non-breaking extension in `src/types.ts`:
  ```ts
  workspacePhotos?: string[];
  ```
  Permits existing database entities and seed objects to omit the field without compiler errors.

---

## 7. Implementation Blueprint for Worker Agent

When implementing Milestone M3, the worker agent should:
1. Update `src/types.ts` to add optional `workspacePhotos?: string[]` on `StageJob` (non-breaking).
2. Refactor `src/ui/screens/StagesScreen.tsx`:
   - Replace dark styles with Clean White tokens from `src/theme/stitch.ts` (`stitchColors.paper`, `stitchColors.ink`, `stitchColors.sienna`, `stitchShadows.card`, `stitchRadius.card`).
   - Implement `WORKSPACE_PHOTO_POOLS` and `getCompanyWorkspacePhotos(job)`.
   - Redesign Feed Cards: white surface, curved cover photo, contract pill, `★ 95% Match` rating badge, company row, metadata, skills chips, and clean stipend bottom row.
   - Redesign Detail Screen: full-screen presentation with full-bleed hero image (H:280, R:32), circular Back/Share/Favorite buttons, horizontal workspace photo strip with "+N photos", domain pill, AI match pill, prominent title with `Itinéraire ↗`, segmented tabs `[ À propos ]`, `[ Entreprise ]`, `[ Conseils IA ]`, quick metadata pill row, expandable description ("Voir plus"), recruiter WhatsApp/Email contact card, and fixed sticky bottom bar with stipend and Royal Violet `Postuler en 1 Clic` CTA.
   - Wire `Postuler en 1 Clic` to `setApplyingJob(selectedDetailJob)`.
3. Verify type safety by running `npm run typecheck` (must exit with 0 errors).
