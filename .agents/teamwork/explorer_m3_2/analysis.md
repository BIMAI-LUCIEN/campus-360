# M3 Architecture & Implementation Blueprint — StagesScreen.tsx

**Author:** Explorer 2 (Milestone M3)  
**Date:** 2026-10-08  
**Target:** `src/ui/screens/StagesScreen.tsx`  
**Milestone:** M3 (Immersive Stage Detail Screen & White Feed)

---

## 1. Executive Summary

Milestone M3 focuses on replacing the legacy obsidian dark theme in `src/ui/screens/StagesScreen.tsx` with:
1. **Feed d'offres en cartes blanches aérées** (Clean White cards, cover photos, domain pills, AI match rating badges, smooth filter chips, clean search bar).
2. **Immersive Stage Detail Screen** (Full-bleed hero image header with curved bottom corners, horizontal thumbnail strip of workspace photos with `+N photos` indicator, domain & AI match badges, segmented tabs with purple underline indicators, metadata pills row, expandable description with skills tags, recruiter info card with direct WhatsApp/email actions, and fixed sticky bottom bar with stipend and Royal Violet `Postuler en 1 Clic` CTA).
3. **Seamless wiring with `AiApplyModal.tsx`** for 1-Click background dispatch via Evolution API & N8N SMTP with official CV PDF.

Both `npm run typecheck` (root Expo) and `cd mobile-api && npm run typecheck` currently pass with **0 errors**. Worker M3 must maintain this 100% type safety.

---

## 2. Component Integration & Application Flow

### 2.1 Wiring with `AiApplyModal.tsx`
- **Location**: `src/features/stages/AiApplyModal.tsx`.
- **Props signature**:
  ```typescript
  interface AiApplyModalProps {
    visible: boolean;
    job: StageJob | null;
    studentProfile: {
      fullName: string;
      email: string;
      phoneWhatsapp?: string;
      university?: string;
      major: string;
      educationLevel: string;
      skills: string[];
      portfolioUrl?: string;
      tokens?: number;
    };
    onClose: () => void;
    onApplicationComplete?: () => void;
    onRecharge?: () => void;
  }
  ```
- **State in `StagesScreen.tsx`**:
  ```typescript
  const [applyingJob, setApplyingJob] = useState<StageJob | null>(null);
  const [selectedDetailJob, setSelectedDetailJob] = useState<StageJob | null>(null);
  ```
- **Trigger from Feed Card**:
  Clicking "Postuler" or "Voir l'offre" directly triggers:
  ```typescript
  setApplyingJob(job);
  ```
- **Trigger from Detail Screen Sticky Bottom Bar**:
  Clicking the large Royal Violet CTA `[ ⚡ Postuler en 1 Clic ]`:
  ```typescript
  const handleApplyFromDetail = () => {
    const job = selectedDetailJob;
    if (!job) return;
    if (Platform.OS === 'ios') {
      // On iOS, dismissing detail modal prior to opening AiApplyModal avoids UIViewController stacking issues
      setSelectedDetailJob(null);
      setTimeout(() => setApplyingJob(job), 350);
    } else {
      setApplyingJob(job);
    }
  };
  ```
- **Workflow inside `AiApplyModal`**:
  1. Instant generation of official 2-column CV and targeted motivation pitch.
  2. If WhatsApp is linked (`isWhatsAppLinked`), button `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]` initiates background dispatch via `POST /api/mobile/stages/dispatch` -> Supabase PDF upload -> Evolution API / N8N webhook.
  3. If unlinked, offers 30-second WhatsApp pairing modal (`WhatsAppPairingModal`) or native deep-link fallback.
  4. Provides formal receipt card with reference ID `CAMPUS-XXXXX` and sync to application timeline.

---

## 3. Design System & Theme Token Harmonization

### 3.1 Tokens from `src/theme/stitch.ts`
| Element | Token / Value | Usage in StagesScreen |
|---|---|---|
| Screen Background | `stitchColors.paperDeep` (`#F8FAFC`) | Main feed and detail screen backdrop |
| Card Surface | `stitchColors.paper` (`#FFFFFF`) | White job cards, recruiter cards, sticky bar |
| Elevated Surface | `stitchColors.paperSoft` (`#F1F5F9`) | Metadata pills, skill chips, search container |
| Brand Accent Primary | `stitchColors.sienna` (`#7C3AED`) | Sticky CTA button, active category pill, active tab indicator |
| Brand Accent Secondary | `stitchColors.siennaTone` (`#8B5CF6`) | Gradient highlights, match accents |
| Soft Tint Container | `stitchColors.siennaBg` (`rgba(124, 58, 237, 0.08)`) | Domain pill container, avatar background |
| High Contrast Text | `stitchColors.ink` (`#0F172A`) | Job title, company name, modal headings |
| Muted Body Text | `stitchColors.inkMuted` (`#64748B`) | Descriptions, locations, subtitles |
| Faint Border | `stitchColors.glassBorder` (`#E2E8F0`) | Card borders, dividers |
| Success / Compensation | `stitchColors.emeraldTone` (`#059669`) / `emerald` (`#10B981`) | Stipend values, verified badge, match score dot |
| Card Border Radius | `stitchRadius.card` (`20`) | Feed cards, recruiter card |
| Button Radius | `stitchRadius.button` (`16`) | Sticky CTA, primary action buttons |
| Pill Radius | `stitchRadius.full` (`9999`) | Filter chips, metadata pills, floating action buttons |
| Shadows | `stitchShadows.card`, `stitchShadows.floating`, `stitchShadows.primary` | Clean elevations |

### 3.2 Master Shared Components from `src/ui/GlassComponents.tsx`
- `SearchFilterBar`: integrated search input pill with filter sliders toggle.
- `Pill`: category & contract chips.
- `GradientButton` / `PrimaryButton`: Royal Violet CTAs.
- `Card`: clean white surface containers.

---

## 4. Data Models & Workspace Photo Enrichment

### 4.1 Data Availability in `StageJob` & `StageCompany`
- **Job Title**: `job.title` (string).
- **Company Name**: `job.company?.name` (string).
- **Company Logo**: `job.company?.logoUrl` (string optional) with fallback to 2-letter initials.
- **Location**: `job.location` or `job.company?.address` (string).
- **Duration**: `job.duration` (string, e.g. `'3 à 6 mois'`).
- **Contract Type**: `job.contractType` (string, e.g. `'Stage PFE'`).
- **Stipend**: `job.stipend` (string, e.g. `'Rémunéré (85 000 FCFA/mois)'`, formatted as `'85 000 FCFA /mois'`).
- **Skills**: `job.requirements` (string array).
- **AI Match Rating**: `job.matchScore` (number 0-100), `job.matchHeadline` (string), `job.matchReasons` (string array).
- **Recruiter Contact**: `job.company?.contactWhatsapp` (phone), `job.company?.contactEmail` (email).
- **KYB Score**: `job.company?.kybScore` (number, e.g. `98%`).

### 4.2 Workspace Photos Helper (`getWorkspacePhotos`)
Workspace photos peek into modern offices, open-space workspaces, meeting rooms, and tech setups. Worker M3 should implement the following pure helper in `StagesScreen.tsx`:
```typescript
export function getWorkspacePhotos(job: StageJob): string[] {
  const text = `${job.company?.industry || ''} ${job.title || ''} ${job.description || ''}`.toLowerCase();
  let poolKey = 'default';
  if (/tech|développ|dev|informatique|software|web|mobile|télécom|cloud|réseau|cyber/.test(text)) {
    poolKey = 'tech';
  } else if (/financ|banque|audit|compta|cobac|cemac|bourse|trésor/.test(text)) {
    poolKey = 'finance';
  } else if (/btp|génie civil|bâtiment|travaux publics|architect|construction/.test(text)) {
    poolKey = 'btp';
  } else if (/market|com|vente|commercial|publicité|brand|événement|cosmét/.test(text)) {
    poolKey = 'marketing';
  } else if (/logist|transit|supply chain|douan|port|fret|stock/.test(text)) {
    poolKey = 'logistique';
  } else if (/santé|pharmac|médic|biolog|biochim|biomédic|laboratoire/.test(text)) {
    poolKey = 'sante';
  } else if (/droit|jurid|contentieux|légal|avocat|ohada/.test(text)) {
    poolKey = 'droit';
  } else if (/admin|secrétariat|gestion|organisation|service/.test(text)) {
    poolKey = 'admin';
  }

  const pool = BANNER_POOLS[poolKey] || BANNER_POOLS.default;
  return pool.slice(0, 4);
}
```

---

## 5. Implementation Blueprint for Worker M3

### 5.1 Required Imports
```typescript
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Alert,
  Platform,
  Linking,
  Share,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  ArrowLeft,
  Share2,
  Heart,
  MapPin,
  Briefcase,
  Clock,
  Coins,
  Building2,
  CheckCircle2,
  Sparkles,
  Zap,
  Star,
  MessageSquare,
  Mail,
  Compass,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { StageJob } from '../../types';
import { fetchStageJobs } from '../../features/stages/stagesApi';
import { AiApplyModal } from '../../features/stages/AiApplyModal';
import { analyzeJobMatch, type MatchAnalysis } from '../../features/stages/aiMatchEngine';
import { SearchFilterBar } from '../GlassComponents';
import {
  stitchColors,
  stitchRadius,
  stitchShadows,
  fontFamilies,
} from '../../theme/stitch';
```

### 5.2 Component State Hooks
```typescript
// Feed states
const [jobs, setJobs] = useState<StageJob[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
const [activeSector, setActiveSector] = useState('Tous');
const [activeContractType, setActiveContractType] = useState('Tous');
const [showTopThreeOnly, setShowTopThreeOnly] = useState(false);

// Application modal state
const [applyingJob, setApplyingJob] = useState<StageJob | null>(null);

// Detail view state
const [selectedDetailJob, setSelectedDetailJob] = useState<StageJob | null>(null);
const [activeDetailTab, setActiveDetailTab] = useState<'about' | 'company' | 'ai'>('about');
const [isDescExpanded, setIsDescExpanded] = useState(false);
const [favorites, setFavorites] = useState<Record<string, boolean>>({});
```

### 5.3 Immersive Detail Screen: Layout Tree & Structure
Inside `<Modal visible={!!selectedDetailJob} animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedDetailJob(null)}>`:

```
View.detailModalContainer (flex: 1, backgroundColor: #FFFFFF)
│
├── ScrollView.detailScrollView (flex: 1, showsVerticalScrollIndicator: false)
│   │
│   ├── View.heroContainer (height: 290, borderBottomLeftRadius: 32, borderBottomRightRadius: 32)
│   │   ├── Image.heroImage (width: 100%, height: 100%, resizeMode: cover)
│   │   ├── LinearGradient (top subtle dark overlay & bottom soft gradient)
│   │   └── View.heroFloatingHeader (paddingTop: iOS ? 48 : 36, horizontal row)
│   │       ├── Pressable.heroBackBtn (Back ArrowLeft, circular 40x40, white frosted)
│   │       └── View.heroRightActions (row, gap: 10)
│   │           ├── Pressable.heroActionBtn (Share2 icon)
│   │           └── Pressable.heroActionBtn (Heart icon, filled with #EF4444 when favorited)
│   │
│   ├── View.detailContent (paddingHorizontal: 20, paddingTop: 16)
│   │   │
│   │   ├── View.thumbnailStripSection
│   │   │   ├── Text.thumbnailSectionTitle ("Espace de travail de l'entreprise")
│   │   │   └── ScrollView.thumbnailRow (horizontal, gap: 10)
│   │   │       ├── Image.thumbnailPhoto (1st office photo)
│   │   │       ├── Image.thumbnailPhoto (2nd office photo)
│   │   │       ├── Image.thumbnailPhoto (3rd office photo)
│   │   │       └── View.thumbnailLastBox (4th photo + "+N photos" dark overlay)
│   │   │
│   │   ├── View.badgeRow (row, gap: 8, alignItems: center, marginTop: 16)
│   │   │   ├── View.domainBadge (Soft purple pill: "Stage Pré-embauche • Informatique")
│   │   │   └── View.matchRatingBadge (Soft emerald pill: "★ 95% Match")
│   │   │
│   │   ├── Text.detailJobTitle (fontSize: 22, fontWeight: '800', color: #0F172A)
│   │   │
│   │   ├── View.companyDirectionRow (row, alignItems: center, justifyContent: space-between)
│   │   │   ├── View.companyInfoBlock (row, avatar + name + verified badge + location)
│   │   │   └── Pressable.directionBtn ("Itinéraire ↗", soft purple pill, opens Google Maps)
│   │   │
│   │   ├── View.segmentedTabsBar (row, marginTop: 20, borderBottomWidth: 1, borderColor: #F1F5F9)
│   │   │   ├── Pressable.tabItem ("[ À propos ]") -> active indicator underline
│   │   │   ├── Pressable.tabItem ("[ Entreprise ]")
│   │   │   └── Pressable.tabItem ("[ Conseils IA ]")
│   │   │
│   │   ├── View.metadataPillRow (horizontal row of 3 cards, marginTop: 18)
│   │   │   ├── View.metaCard (Duration: "🏃 3 à 6 mois")
│   │   │   ├── View.metaCard (Location: "📍 Présentiel")
│   │   │   └── View.metaCard (Status: "🕒 Ouvert")
│   │   │
│   │   ├── View.tabContentArea (dynamic based on activeDetailTab)
│   │   │   ├── If 'about':
│   │   │   │   ├── Description block (numberOfLines: expanded ? undefined : 4)
│   │   │   │   ├── "Voir plus" toggle button
│   │   │   │   ├── Skills title ("Compétences & Technologies requises")
│   │   │   │   └── View.skillsChipWrap (flexWrap chips with light slate background)
│   │   │   ├── If 'company':
│   │   │   │   ├── Company address, KYB score badge (98% Fiabilité KYB)
│   │   │   │   ├── Industry & mission overview
│   │   │   │   └── Culture & workplace benefits
│   │   │   └── If 'ai':
│   │   │       ├── AI match score banner with headline
│   │   │       ├── Matched points checklist (CheckCircle2 icons)
│   │   │       └── Strategic advice card (tips to maximize candidate conversion)
│   │   │
│   │   ├── View.recruiterCard (Card container, white, border: #E2E8F0, soft shadow)
│   │   │   ├── Recruiter info (Avatar, "Responsable Recrutement", "Réponse rapide garantie")
│   │   │   └── View.recruiterActionBtns (row, gap: 10)
│   │   │       ├── Pressable.recruiterWhatsAppBtn ("💬 WhatsApp RH", soft green)
│   │   │       └── Pressable.recruiterEmailBtn ("✉️ Email RH", soft purple)
│   │   │
│   │   └── View.bottomPaddingSpacer (height: 90)
│
└── View.stickyBottomBar (fixed bottom, white background, top border #F1F5F9, elevation)
    ├── View.stipendCol
    │   ├── Text.stipendLabel ("INDEMNITÉ ESTIMÉE")
    │   └── View.stipendValueRow (Text: "75 000 FCFA", Subtitle: " /mois")
    └── Pressable.stickyApplyCta (Solid Royal Violet #7C3AED, rounded 16px, "Postuler en 1 Clic")
```

---

## 6. Exact Styling Specification

```typescript
const styles = StyleSheet.create({
  // Root Screen
  container: {
    flex: 1,
    backgroundColor: stitchColors.paperDeep, // #F8FAFC
  },

  // Feed Header & Search
  header: {
    paddingTop: Platform.OS === 'ios' ? 48 : 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: stitchColors.paper, // #FFFFFF
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: stitchColors.ink,
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: stitchColors.inkMuted,
    marginTop: 2,
  },
  filtersScroll: {
    marginTop: 10,
  },
  contractsScroll: {
    marginTop: 6,
  },
  filtersContent: {
    gap: 8,
    paddingRight: 12,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: stitchRadius.full,
    backgroundColor: stitchColors.paperSoft,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: stitchColors.sienna,
    borderColor: stitchColors.sienna,
    ...stitchShadows.primary,
  },
  filterChipText: {
    fontSize: 12.5,
    color: stitchColors.inkMuted,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Feed Scroll & Cards
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  jobCard: {
    backgroundColor: stitchColors.paper,
    borderRadius: stitchRadius.card, // 20
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...stitchShadows.card,
  },
  cardHeroImageContainer: {
    width: '100%',
    height: 150,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  cardHeroImage: {
    width: '100%',
    height: '100%',
  },
  floatingBadgesRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingContractBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: stitchRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  floatingContractText: {
    color: stitchColors.ink,
    fontSize: 11.5,
    fontWeight: '700',
  },
  floatingMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: stitchRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  cardBody: {
    padding: 16,
  },
  cardCompanyName: {
    fontSize: 13.5,
    color: stitchColors.ink,
    fontWeight: '700',
  },
  cardJobTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: stitchColors.ink,
    lineHeight: 23,
    marginTop: 6,
    marginBottom: 8,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  // ── Immersive Detail Screen Styles ─────────────────────────────────────────
  detailModalContainer: {
    flex: 1,
    backgroundColor: stitchColors.paper,
  },
  detailHeroContainer: {
    width: '100%',
    height: 290,
    position: 'relative',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  detailHeroImage: {
    width: '100%',
    height: '100%',
  },
  detailHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  detailFloatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 36,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  detailCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    ...stitchShadows.md,
  },
  thumbnailStripSection: {
    marginTop: 16,
  },
  thumbnailStripTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: stitchColors.inkMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: 10,
  },
  thumbnailPhoto: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  thumbnailOverlayBox: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  domainPill: {
    backgroundColor: stitchColors.siennaBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: stitchRadius.full,
    alignSelf: 'flex-start',
  },
  domainPillText: {
    color: stitchColors.sienna,
    fontSize: 12,
    fontWeight: '700',
  },
  matchPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: stitchRadius.full,
  },
  matchPillText: {
    color: stitchColors.emeraldTone,
    fontSize: 12,
    fontWeight: '700',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: stitchColors.ink,
    lineHeight: 28,
    marginTop: 10,
    letterSpacing: -0.4,
  },
  directionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: stitchColors.siennaBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: stitchRadius.full,
  },
  directionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.sienna,
  },
  segmentedBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginTop: 20,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  segmentedTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: stitchColors.inkMuted,
  },
  segmentedTabTextActive: {
    color: stitchColors.sienna,
    fontWeight: '700',
  },
  segmentedTabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: stitchColors.sienna,
    borderRadius: 2,
  },
  metaGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  metaCard: {
    flex: 1,
    backgroundColor: stitchColors.paperSoft,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaCardLabel: {
    fontSize: 11,
    color: stitchColors.inkMuted,
    marginTop: 4,
  },
  metaCardValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: stitchColors.ink,
    marginTop: 2,
    textAlign: 'center',
  },
  recruiterCard: {
    backgroundColor: stitchColors.paper,
    borderRadius: 18,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...stitchShadows.card,
  },
  recruiterActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  recruiterWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  recruiterWhatsAppText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  recruiterEmailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: stitchColors.siennaBg,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.20)',
  },
  recruiterEmailText: {
    fontSize: 13,
    fontWeight: '700',
    color: stitchColors.sienna,
  },

  // Sticky Bottom Bar
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...stitchShadows.floating,
  },
  stipendLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: stitchColors.inkMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stipendAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: stitchColors.ink,
  },
  stipendPeriod: {
    fontSize: 12,
    color: stitchColors.inkMuted,
    fontWeight: '500',
  },
  stickyApplyBtn: {
    backgroundColor: stitchColors.sienna,
    borderRadius: stitchRadius.button, // 16
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...stitchShadows.primary,
  },
  stickyApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
```

---

## 7. Type Safety Checklist for Worker M3

1. **Imports verification**: All Lucide icons imported must exist in `lucide-react-native` (verified).
2. **Prop interface integrity**: `StagesScreenProps` must strictly adhere to `{ studentProfile: ..., onSelectJob?: ..., onOpenWallet?: ... }`.
3. **Banner pools & Rotating function**: Keep `BANNER_POOLS` and `getRotatingJobBanner` exported for backward compatibility.
4. **Modal nesting safety**: Use `handleApplyFromDetail` timeout on iOS to avoid UIViewController presentation conflicts.
5. **No missing exports**: `npm run typecheck` across root and `mobile-api` must pass with 0 errors.
