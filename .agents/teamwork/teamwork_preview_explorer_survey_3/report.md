# Campus 360 — Architectural Survey & Blueprint: Immersive Stage Detail Screen & Global Screen Harmonization

**Author:** Survey Explorer 3 (Stages & Screens Architecture)  
**Date:** 2026-10-08  
**Scope:** `src/ui/screens/StagesScreen.tsx`, `src/features/stages/AiApplyModal.tsx`, and Global Screen Layout Harmonization (`HomeScreen`, `DocumentsScreen`, `ProfileScreen`, `LibraryScreen`, `ExploreScreen`, `ApplicationsTimelineScreen`, `AuthScreen`, `OnboardingScreen`).

---

## 1. Executive Summary & Problem Diagnosis

The Campus 360 React Native (Expo SDK 54) application is undergoing a comprehensive UI/UX redesign from an obsidian dark mode to a high-converting, modern **"Clean White & Royal Violet"** design system inspired by contemporary PropTech and workspace mobile applications.

### Key Architectural Findings:
1. **Current `StagesScreen.tsx` Implementation**:
   - The screen currently runs on a dark obsidian palette (`#090714`, `#120E22`, dark gradient overlays).
   - Feed cards use dark card containers (`#120E22`) with hairline borders (`rgba(255, 255, 255, 0.08)`).
   - The Stage Detail view is currently rendered inside a bottom sheet modal (`<Modal visible={!!selectedDetailJob}>`, max height 85%) with a dark slate background, a simple close button, and a basic metadata list. It lacks the full-bleed hero banner, workspace photo gallery, segmented tabs, company direction button, recruiter direct contact actions, and the sticky bottom bar with stipend and 1-Click Apply CTA specified in **Screen 2 of the reference design**.

2. **AiApplyModal & WhatsApp 1-Click Integration**:
   - `AiApplyModal.tsx` already features a complete background dispatch pipeline connecting to `POST /api/mobile/stages/dispatch` and N8N webhook (`https://n8n.blackcompany.site/webhook/send-stage-application`).
   - It already supports WhatsApp pairing state detection (`getStoredWhatsAppStatus()`), PDF base64 generation (`generateCvPdfBase64`), and automated dispatch without opening external apps.
   - The Immersive Stage Detail Screen can seamlessly trigger this flow via a dedicated sticky bottom bar CTA (`[ ⚡ Postuler en 1 Clic ]`), passing `selectedDetailJob` directly into `AiApplyModal`.

3. **Global Screen Layout Disparities**:
   - **HomeScreen**: Needs the curved Royal Violet header container, the `#RecommandéPourToi` photo banner carousel, circular category icons (`CategoryGrid`), and clean white job cards.
   - **ProfileScreen**: Needs the virtual neobank card in Royal Violet gradient (`#7C3AED` to `#4338CA`), clean white menu cards, and prominent WhatsApp pairing status.
   - **DocumentsScreen**: Contains dark obsidian backgrounds and dark card sheets; needs transition to clean white `#FFFFFF` surfaces with Royal Violet CTA buttons while preserving WYSIWYG and DocGenChat functionality.
   - **ApplicationsTimelineScreen**: Boarding pass / ticket layout currently uses dark cuts (`#090714`); needs clean white ticket surfaces with emerald and purple status badges.
   - **LibraryScreen & ExploreScreen**: Ready to consume updated theme tokens and `DocumentGridCard` components in clean white.
   - **AuthScreen & OnboardingScreen**: Require clean white cards, soft borders (`#E2E8F0`), and Royal Violet primary buttons.

---

## 2. Deep Dive: Current State of `StagesScreen.tsx`

### File Structure & Dependencies
- **Path**: `src/ui/screens/StagesScreen.tsx` (1,393 lines)
- **Key State Variables**:
  ```typescript
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
- **Banner Engine**:
  - `BANNER_POOLS`: Slices high-resolution Unsplash images categorized by domain (`tech`, `finance`, `btp`, `marketing`, `logistique`, `sante`, `droit`, `admin`, `default`).
  - `getRotatingJobBanner(job, index)`: Deterministically selects realistic workspace banners based on company industry and job title.

### Current Detail Presentation Deficiencies (vs Screen 2 Reference):
| Feature | Current `StagesScreen.tsx` | Screen 2 Reference Requirement |
| :--- | :--- | :--- |
| **Presentation Container** | 85% bottom sheet modal (`backgroundColor: '#120E22'`) | Full-bleed immersive screen (`backgroundColor: '#FFFFFF'`) with curved hero |
| **Hero Image** | Small flyer image inside scroll view | Full-bleed hero image (~280px) with curved bottom corners (R: 32px) |
| **Top Actions** | Small X button in top right | Floating circular buttons: Back `←`, Share `Share2`, Favorite `♥` |
| **Workspace Photos** | None | Horizontal photo strip (4 thumbnails + "+N photos" overlay) |
| **Badges** | Text inside dark boxes | Domain pill (`Stage Pré-embauche`) + AI Match badge (`★ 95% Match`) |
| **Navigation** | None (monolithic scroll) | Segmented tabs with purple underline: `[ À propos ]`, `[ Entreprise ]`, `[ Conseils IA ]` |
| **Company Card** | Single line text | Full recruiter card with direct WhatsApp and email buttons |
| **Bottom Bar** | Static button at bottom of sheet | Fixed sticky bottom bar with stipend (`75 000 FCFA/mois`) + Royal Violet `Postuler en 1 Clic` |

---

## 3. Architectural Blueprint: The Immersive Stage Detail Screen

To achieve 100% fidelity with Screen 2 of the reference design while maintaining React Native performance and modularity, the detail view should be encapsulated in a dedicated component `ImmersiveStageDetail` rendered within `StagesScreen.tsx`.

### 3.1 Component Architecture & Layout Hierarchy

```
┌──────────────────────────────────────────────────────────────┐
│ 1. FULL-BLEED HERO IMAGE HEADER                              │
│    - Spans 100% width, height: 280px                        │
│    - Curved bottom corners (borderBottomRadius: 32px)        │
│    - Floating Circular Buttons:                              │
│      [ ← Back ]                [ Share ] [ ♥ Favorite ]      │
├──────────────────────────────────────────────────────────────┤
│ 2. HORIZONTAL WORKSPACE PHOTO STRIP                          │
│    - 4 thumbnail cards (74x70px, radius: 14px)              │
│    - [ Office 1 ] [ Office 2 ] [ Office 3 ] [ +4 photos ]   │
├──────────────────────────────────────────────────────────────┤
│ 3. BADGES ROW                                                │
│    [ Stage Pré-embauche ]            [ ★ 95% Match ]         │
├──────────────────────────────────────────────────────────────┤
│ 4. TITLE & LOCATION ROW                                      │
│    Stage Développeur Full-Stack Mobile React Native          │
│    📍 Douala, Akwa · TechCorp Solutions  [ Itinéraire ↗ ]    │
├──────────────────────────────────────────────────────────────┤
│ 5. SEGMENTED TABS (Purple underline indicator)               │
│    [ À propos ]*        [ Entreprise ]       [ Conseils IA ] │
│    ════════════                                              │
├──────────────────────────────────────────────────────────────┤
│ 6. QUICK METADATA PILLS ROW                                  │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│    │ 🏃 3 à 6 mois│  │ 📍Présentiel │  │ 🕒 Ouvert    │      │
│    └──────────────┘  └──────────────┘  └──────────────┘      │
├──────────────────────────────────────────────────────────────┤
│ 7. RICH CONTENT BLOCK (Tab-dependent)                        │
│    - Mission Description with expandable "Voir plus" / "moins"│
│    - Required Skills Chips: [ React Native ] [ TypeScript ]  │
├──────────────────────────────────────────────────────────────┤
│ 8. RECRUITER & COMPANY CONTACT CARD                          │
│    ┌──────────────────────────────────────────────────┐      │
│    │ [Avatar] Sarah Mbarga · Équipe Recrutement RH    │      │
│    │ [ 💬 WhatsApp RH ]         [ ✉️ Email RH ]       │      │
│    └──────────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────────────┤
│ 9. FIXED STICKY BOTTOM BAR (Elevation shadow)                │
│    INDEMNITÉ                                                 │
│    75 000 FCFA /mois         [ ⚡ Postuler en 1 Clic ]        │
└──────────────────────────────────────────────────────────────┘
```

---

### 3.2 Detailed Specifications of the 9 Reference Elements

#### 1. Full-Bleed Hero Image Header
- **Layout**: Spans the entire screen width with `height: 280`, `borderBottomLeftRadius: 32`, and `borderBottomRightRadius: 32`.
- **Image**: Fetched from `BANNER_POOLS` matching the job's sector or `job.flyerUrl`.
- **Linear Gradient Scrim**: Subtle gradient from top `rgba(0,0,0,0.4)` to transparent, ensuring the floating circular action buttons remain clearly visible over bright photos.
- **Floating Circular Action Buttons**:
  - Placed in a safe top row (`top: Platform.OS === 'ios' ? 50 : 36`, `paddingHorizontal: 18`).
  - **Back Button**: 42x42px circular container, `backgroundColor: 'rgba(255, 255, 255, 0.92)'`, `borderRadius: 21`, elevation shadow, hosting `ArrowLeft` (color `#0F172A`).
  - **Action Group (Right)**:
    - **Share Button**: 42x42px circular container, hosting `Share2` (color `#0F172A`), triggering `handleShareReferral`.
    - **Favorite Button**: 42x42px circular container, hosting `Heart` (color `#EF4444` when active, `#0F172A` when inactive).

#### 2. Horizontal Thumbnail Photo Strip
- **Layout**: Positioned directly beneath the curved hero header (`marginTop: 14`, `paddingHorizontal: 18`).
- **Structure**: Row of 4 workspace/office photos (`width: 74`, `height: 68`, `borderRadius: 14`, `overflow: 'hidden'`).
- **Photos**: High-resolution office workspace and team collaboration images from the pool.
- **"+N photos" Overlay**: The 4th thumbnail features an overlay `rgba(15, 23, 42, 0.65)` with bold text `+4 photos` and an image gallery icon.

#### 3. Domain Pill Badge + AI Match Rating Badge
- **Layout**: Horizontal row (`flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`, `marginTop: 16`, `paddingHorizontal: 18`).
- **Domain Pill**:
  - Text: `job.contractType || 'Stage Pré-embauche'`
  - Style: Soft lavender container (`backgroundColor: 'rgba(124, 58, 237, 0.08)'`), border `1px solid rgba(124, 58, 237, 0.2)`, text Royal Violet `#7C3AED`, font 700, 12px.
- **AI Match Rating Badge**:
  - Text: `★ ${detailMatch?.score || 95}% Match`
  - Style: Soft emerald container (`backgroundColor: '#ECFDF5'`), border `1px solid rgba(16, 185, 129, 0.25)`, text Emerald Green `#059669`, font 800, 12px.

#### 4. Prominent Job Title & Company Location with Direction Button
- **Job Title**: `fontSize: 22`, `fontWeight: '800'`, `color: '#0F172A'` (Deep Slate Black), `letterSpacing: -0.4`, `lineHeight: 28`.
- **Location Row**:
  - Company Name with `CheckCircle2` (color `#10B981`).
  - Location pin icon `MapPin` (color `#64748B`), location text (e.g. `Douala, Cameroun`).
  - "Itinéraire" Pill Button: `Navigation` icon + `Itinéraire`, soft slate background `#F1F5F9`, border `#E2E8F0`, allowing students to open Google Maps / native directions.

#### 5. Segmented Tabs with Purple Underline Indicators
- **Tabs**:
  1. `[ À propos ]` (`activeTab === 'about'`)
  2. `[ Entreprise ]` (`activeTab === 'company'`)
  3. `[ Conseils IA ]` (`activeTab === 'ai_advice'`)
- **Active State**:
  - Text: Royal Violet `#7C3AED`, `fontWeight: '700'`, `fontSize: 14`.
  - Indicator: Solid purple bar (`height: 3`, `width: '50%'`, `backgroundColor: '#7C3AED'`, `borderRadius: 2`, `position: 'absolute'`, `bottom: 0`).
- **Inactive State**:
  - Text: Muted Slate `#64748B`, `fontWeight: '500'`, `fontSize: 14`.
- **Divider**: Bottom hairline divider `#F1F5F9`.

#### 6. Quick Metadata Pill Row
- Three equal cards side-by-side (`backgroundColor: '#F8FAFC'`, `borderWidth: 1`, `borderColor: '#E2E8F0'`, `borderRadius: 14`, `padding: 10`, `alignItems: 'center'`):
  1. **Durée**: `Clock` icon (purple `#7C3AED`) + `Durée` (10px, uppercase) + `job.duration || '3 à 6 mois'` (bold `#0F172A`).
  2. **Mode**: `MapPin` icon (blue `#2563EB`) + `Mode` (10px, uppercase) + `Présentiel` (bold `#0F172A`).
  3. **Statut**: `CheckCircle2` icon (green `#10B981`) + `Statut` (10px, uppercase) + `Ouvert` (bold `#10B981`).

#### 7. Rich Description Block with Expandable "Voir plus" & Required Skills Chips
- **Description Block**:
  - Truncated text (`numberOfLines={isExpanded ? undefined : 4}`), `fontSize: 14`, `lineHeight: 22`, `color: '#334155'`.
  - "Voir plus" / "Voir moins" link in Royal Violet `#7C3AED` (font 700).
- **Compétences Requises**:
  - Wrap row of modern rounded chips: `backgroundColor: '#F5F3FF'`, `borderColor: '#DDD6FE'`, `paddingHorizontal: 12`, `paddingVertical: 6`, `borderRadius: 16`, text `#6D28D9` (font 600, 12px).
- **Alternative Tabs**:
  - **Entreprise**: KYB Score badge (`Score KYB : 96%`), company presentation, address, and verification details.
  - **Conseils IA**: Detailed breakdown from `aiMatchEngine.ts` with key matching points (`matchedPoints`), transferable strengths, and strategic advice.

#### 8. Recruiter & Company Contact Card
- Clean white card (`backgroundColor: '#FFFFFF'`, `borderRadius: 16`, `borderWidth: 1`, `borderColor: '#E2E8F0'`, `padding: 14`, elevation 2):
  - Recruiter avatar / logo + Company name + `Équipe Recrutement RH`.
  - Action 1: **WhatsApp RH Button** (`backgroundColor: '#ECFDF5'`, `borderColor: '#A7F3D0'`, text `#059669`) opening direct WhatsApp inquiry.
  - Action 2: **Email RH Button** (`backgroundColor: '#F5F3FF'`, `borderColor: '#DDD6FE'`, text `#7C3AED`) opening mailto composer.

#### 9. Fixed Sticky Bottom Bar
- Sticky bar at bottom of screen (`position: 'absolute'`, `bottom: 0`, `left: 0`, `right: 0`, `backgroundColor: '#FFFFFF'`, `borderTopWidth: 1`, `borderTopColor: '#E2E8F0'`, elevation 12):
  - Left:
    - Label: `INDEMNITÉ MENSUELLE` (10px, uppercase, `#64748B`).
    - Amount: `job.stipend || '75 000 FCFA'` (`fontSize: 18`, `fontWeight: '800'`, `color: '#0F172A'`) + `/mois` (`#64748B`).
  - Right:
    - Button: Large rounded Royal Violet CTA (`backgroundColor: '#7C3AED'`, `paddingHorizontal: 24`, `paddingVertical: 14`, `borderRadius: 24`, `flexDirection: 'row'`, `gap: 8`).
    - Icon: `Zap` (size 16, color white, fill white).
    - Label: `Postuler en 1 Clic` (`fontSize: 14`, `fontWeight: '700'`, `color: '#FFFFFF'`).
  - Action: Immediately sets `applyingJob` to open `AiApplyModal`.

---

## 4. Connection to `AiApplyModal.tsx` & 1-Click WhatsApp Flow

### 4.1 Invocation Pipeline
When the student taps `Postuler en 1 Clic` from the sticky bottom bar:
1. `setSelectedDetailJob(null)` (or keeps it open while overlaying modal).
2. `setApplyingJob(selectedDetailJob)` opens `<AiApplyModal visible={true} job={applyingJob} ... />`.
3. `AiApplyModal` initiates generation:
   - Evaluates profile completeness (`isProfileIncomplete`).
   - Analyzes job match via `analyzeJobMatch(job, currentProfile)`.
   - Generates official CV (`result.officialCv`) and customized pitch (`buildWhatsAppPitch`).
4. In the preview step, the student sees the official 2-column CV and cover letter.

### 4.2 Automated 1-Click WhatsApp Background Dispatch
- If student has linked WhatsApp (`isWhatsAppLinked === true`):
  - The primary CTA is: `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]`.
  - Tapping this triggers `handleOneClickApply('whatsapp')`:
    ```typescript
    const pdfBase64 = await generateCvPdfBase64({
      studentName: currentProfile.fullName,
      studentEmail: currentProfile.email,
      studentPhone,
      major: currentProfile.major,
      educationLevel: currentProfile.educationLevel,
      jobTitle: job.title,
      companyName: job.company?.name || "L'Entreprise",
      letterText: editableLetter,
      cvText: editableCv,
      officialCv: result.officialCv,
    });
    
    const res = await dispatchStageApplication({
      jobId: job.id,
      channel: 'whatsapp',
      whatsappPitch: pitch,
      letterText: editableLetter,
      cvPdfBase64: pdfBase64,
      studentNotes: '',
      studentName: currentProfile.fullName,
      studentEmail: currentProfile.email,
      studentPhone,
      phoneNumber: studentPhone,
      officialCv: result.officialCv,
      cvText: editableCv,
      job,
    });
    ```
  - Backend route `POST /api/mobile/stages/dispatch` validates payload, uploads CV PDF to Supabase Storage, and fires N8N webhook `https://n8n.blackcompany.site/webhook/send-stage-application`.
  - Evolution API dispatches the official CV PDF and caption via WhatsApp in the background.
  - Student receives immediate visual confirmation with status `SENT_PENDING` / `DELIVERED`.
- If WhatsApp is not linked:
  - Offers 30s pairing via `WhatsAppPairingModal` or fallback button `[ 💬 Ouvrir WhatsApp Manuellement ]` (native deep-link).

---

## 5. Global Screen Harmonization Architecture

To achieve a coherent, agency-grade Clean White & Royal Violet visual language across the entire application, each primary screen requires targeted harmonization:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CAMPUS 360 UNIFIED THEME                              │
│  Primary Background: #FFFFFF / #F8FAFC  │  Brand Accent: Royal Violet #7C3AED / #8B5CF6 │
│  Text: Deep Slate #0F172A / Sub: #64748B│  Cards: Clean White #FFFFFF, Border: #F1F5F9  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 HomeScreen (`src/ui/screens/HomeScreen.tsx`)
- **Header**: Replace basic dark greeting with the curved Royal Violet container (`#7C3AED`), featuring white logo/text, university location pill dropdown, and white pill search bar.
- **#RecommandéPourToi Carousel**:
  - Add horizontal carousel of recommended jobs featuring rich company workplace banners (`BANNER_POOLS`), verified badges, and match pills.
- **Filières Populaires**:
  - Integrate `CategoryGrid` with circular icon backgrounds (`backgroundColor: 'rgba(124, 58, 237, 0.08)'`, icons in `#7C3AED`, and legible labels in Deep Slate `#0F172A`).
- **Best Offers Feed**:
  - Clean white cards with light borders (`#F1F5F9`), subtle shadows, stipend display, and Royal Violet "Postuler" CTA.

### 5.2 StagesScreen Feed (`src/ui/screens/StagesScreen.tsx`)
- **Background**: `#FFFFFF` / `#F8FAFC`.
- **Filter Chips**:
  - Active: Solid Royal Violet `#7C3AED` with white text.
  - Inactive: Clean light surface `#F1F5F9` with slate text `#64748B`.
- **Feed Cards**:
  - Clean white containers (`backgroundColor: '#FFFFFF'`), rounded 18px, subtle border `#E2E8F0`, soft shadow (`elevation: 3`, `shadowOpacity: 0.05`).
  - Card hero banner (height 140px) with floating contract badge and match badge.
  - Company row with clean avatar, verified checkmark, job title in `#0F172A`, stipend, and Royal Violet "Postuler" button.

### 5.3 DocumentsScreen (`src/features/documents/DocumentsScreen.tsx`)
- **Theme Shift**:
  - Replace dark canvas (`#090714`) with clean white (`#FFFFFF`) and surfaces `#F8FAFC`.
  - Type selection cards (`DOCUMENT_TYPES`): Render on clean white surfaces with soft tinted icon circles (`#F5F3FF`) and purple/blue accents.
  - Generated CV Preview: Clean 2-column official layout with Royal Violet action bar (`[ Modifier ]`, `[ Télécharger PDF ]`, `[ Postuler ]`).

### 5.4 ProfileScreen (`src/ui/screens/ProfileScreen.tsx`)
- **Virtual Neobank Card**:
  - Replace the dark profile card with a modern virtual card in Royal Violet gradient:
    ```tsx
    <LinearGradient
      colors={['#7C3AED', '#6D28D9', '#4338CA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.virtualNeobankCard}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardBankLabel}>CAMPUS 360 PASS</Text>
        <Sparkles size={16} color="#DDD6FE" />
      </View>
      <Text style={styles.cardHolderName}>{studentProfile?.name || 'Étudiant'}</Text>
      <View style={styles.cardBalanceRow}>
        <Text style={styles.cardBalanceValue}>{formatCoins(balance)} Coins</Text>
        <View style={styles.cardIaPill}><Text style={styles.cardIaPillText}>{iaCredits} IA</Text></View>
      </View>
    </LinearGradient>
    ```
- **Menu Card Groups**:
  - Clean white card containers with soft borders `#E2E8F0`.
  - Icon circles with pastel tints (`rgba(124, 58, 237, 0.08)` for purple, `rgba(52, 211, 153, 0.12)` for green).
  - WhatsApp pairing status badge (`✅ WhatsApp connecté` or `Non associé`) with direct tap to pair.

### 5.5 LibraryScreen & ExploreScreen (`src/ui/screens/LibraryScreen.tsx`, `ExploreScreen.tsx`)
- **Catalogue & Document Cards**:
  - `DocumentGridCard`: Clean white card surface with book cover previews in soft pastel colors, rating badges (`★ 4.8`), and price/owned tags.
  - Category and faculty filter pills in soft purple and white.

### 5.6 ApplicationsTimelineScreen (`src/ui/screens/ApplicationsTimelineScreen.tsx`)
- **Boarding Pass / Ticket Cards**:
  - Ticket container: Clean white card surface (`backgroundColor: '#FFFFFF'`) with dashed perforation line and cutout notches in light grey `#F8FAFC`.
  - Status badges with clear colors:
    - `DELIVERED` / `ACCEPTED`: Soft emerald `#ECFDF5`, text `#059669`.
    - `INTERVIEW`: Soft purple `#F5F3FF`, text `#7C3AED`.
    - `PENDING` / `SENT_PENDING`: Soft blue `#EFF6FF`, text `#2563EB`.
    - `FAILED` / `REJECTED`: Soft red `#FEF2F2`, text `#DC2626`.
  - J+7 WhatsApp reminder action button in Royal Violet.

### 5.7 AuthScreen & OnboardingScreen (`src/ui/screens/AuthScreen.tsx`, `OnboardingScreen.tsx`)
- **Clean Inputs**: White inputs with hairline border `#E2E8F0`, purple focus ring `#7C3AED`, clear placeholders.
- **Primary CTAs**: Solid Royal Violet `#7C3AED` with white text and smooth border radiuses (16px).
- **Onboarding Carousel**: Clean white slide backgrounds with crisp illustrations and purple step progress indicators.

---

## 6. Implementation Architecture & TypeScript Interface Verification

### 6.1 Proposed Component Breakdown in `StagesScreen.tsx`
To maintain clean code separation and token economy, the screen should be structured into three main parts:
1. `StagesScreen`: Main container, handles search, sector filters, contract filters, and job list state.
2. `StageJobFeedCard`: Individual card component rendering clean white cards for the feed.
3. `ImmersiveStageDetailModal`: Full-screen modal implementing the exact 9 Screen 2 reference elements.

### 6.2 Zero-Breaking Changes Verification
- **Props**: `StagesScreenProps` remains identical (`studentProfile`, `onSelectJob`, `onOpenWallet`).
- **Data Models**: `StageJob`, `StageCompany`, `StageApplication` remain 100% typed to `src/types.ts`.
- **API Endpoints**: Uses existing `fetchStageJobs` and `fetchStudentApplications`.
- **Modals**: Connects directly to existing `AiApplyModal` without modifying its external contract.
- **TypeScript Health**: Both root and `mobile-api` currently compile with zero errors (`tsc --noEmit` code 0).

---

## 7. Next Steps for Implementation Agents

1. **Theme Foundation Agent (Explorer 1 / Implementer 1)**:
   - Provide the complete Clean White & Royal Violet tokens in `src/theme/stitch.ts`.
2. **Shared UI Components Agent (Explorer 2 / Implementer 2)**:
   - Implement the curved violet `TopBar`, floating white `BottomNav`, and circular `CategoryGrid` in `src/ui/GlassComponents.tsx`.
3. **Screen Implementation Agent (Implementer 3)**:
   - Refactor `src/ui/screens/StagesScreen.tsx` with:
     - The Clean White Feed layout and cards.
     - The Immersive Stage Detail Modal (`ImmersiveStageDetailModal`) with all 9 reference elements.
     - Seamless invocation of `AiApplyModal`.
   - Update `HomeScreen.tsx`, `ProfileScreen.tsx`, `ApplicationsTimelineScreen.tsx`, and `DocumentsScreen.tsx` to match the Clean White & Royal Violet system.
4. **Verification Agent**:
   - Run `npm run typecheck` in project root and in `mobile-api`.
   - Verify layout responsiveness and button handlers.
