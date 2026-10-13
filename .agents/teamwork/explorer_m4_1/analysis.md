# Milestone M4 Audit & Harmonization Blueprint: Royal Violet & Clean White

**Auditor:** Explorer M4  
**Date:** 2026-10-08  
**Scope:** Global Screen Harmonization across Campus 360 React Native Mobile App  
**Status:** READ-ONLY Architectural & Visual Audit Completed  

---

## 1. Executive Summary

Following the successful completion of **M1 (Design Tokens Foundation)**, **M2 (Master Shared Components)**, and **M3 (Immersive Stage Detail Screen & White Feed)**, Milestone M4 focuses on **harmonizing all remaining core screens** of the application with the **Royal Violet & Clean White** design system.

The audit examined every target screen in detail, identifying all hardcoded dark obsidian tokens (`#090714`, `#120E22`, `#131024`, `#0D0B18`, `#160F2E`, `rgba(255, 255, 255, 0.08)`, etc.) and determining the exact recipes, component wirings, and token mappings required for **Worker M4** to implement the transition smoothly with **0 TypeScript errors (`npm run typecheck` clean)**.

---

## 2. Target Screen Audits & Implementation Recipes

---

### 2.1. Screen 1: `src/ui/screens/HomeScreen.tsx`

#### A. Direct Observations & Current Dark Remnants
- **Container background:** Line 293: `backgroundColor: '#090714'`.
- **Greeting typography:** Line 308: `color: '#FFFFFF'`, Line 314: `color: '#94A3B8'`.
- **Quick tools cards:** Line 327: `backgroundColor: '#120E22'`, border `rgba(255, 255, 255, 0.08)`.
- **Section headers:** Line 365: `color: '#FFFFFF'`, Line 372: `color: '#A78BFA'`.
- **Job cards:** Line 380: `backgroundColor: '#120E22'`, border `rgba(255, 255, 255, 0.08)`.
- **Job card titles & text:** Line 396: `color: '#FFFFFF'`, Line 408: `color: '#94A3B8'`.
- **Job card footer divider:** Line 446: `borderTopColor: 'rgba(255, 255, 255, 0.06)'`.

#### B. Gap Analysis against R4 Requirements
1. **Header bombé violet / curved banner:** Currently `HomeScreen` has a simple flat dark greeting. It requires a curved Royal Violet gradient banner (`LinearGradient` with `['#7C3AED', '#6D28D9']`, bottom border radiuses `28-30px`, welcoming the student with their name and university, plus dynamic punchline).
2. **Carrousel `#RecommandéPourToi` with company photo banners:** Currently offers are only rendered in a vertical list of dark cards without photo headers. It needs a dedicated horizontal carousel `#RecommandéPourToi` featuring curated stage cards with photo banners (`Image` using `getRotatingJobBanner(job)` or company banners), company logo, match badge, stipend, and 1-tap apply.
3. **Circular filières:** The current `quickToolsGrid` uses 4 square dark cards. It should be upgraded to `CategoryGrid` from `src/ui/GlassComponents.tsx` rendering circular 56x56 avatars with soft lavender containers (`#F5F3FF`) and Royal Violet icons (`#7C3AED`) representing major academic filières (Tech & Dév, Finance & Audit, Marketing, BTP, Droit, Santé).
4. **Feed of top offers on Clean White cards:** The vertical feed below must be refactored into Clean White cards (`#FFFFFF`, border `#F1F5F9`, soft shadow `stitchShadows.card`, deep slate titles `#0F172A`, slate meta `#64748B`, emerald stipend `#059669`, and Royal Violet CTA `#7C3AED`).

#### C. Worker M4 Step-by-Step Recipe
1. **Imports:**
   ```tsx
   import { LinearGradient } from 'expo-linear-gradient';
   import {
     stitchColors,
     stitchRadius,
     stitchSpacing,
     stitchTypography,
     stitchShadows,
     brandGradient,
   } from '../../theme/stitch';
   import {
     SearchFilterBar,
     CategoryGrid,
     type CategoryItem,
   } from '../GlassComponents';
   import { getRotatingJobBanner } from './StagesScreen';
   ```
2. **Filières Definition:**
   Define circular category items:
   ```tsx
   const HOME_CATEGORIES: CategoryItem[] = [
     { id: 'tech', label: 'Tech & Dév', icon: Briefcase, color: '#7C3AED', bg: '#F5F3FF' },
     { id: 'finance', label: 'Finance & Audit', icon: BookOpen, color: '#2563EB', bg: '#EFF6FF' },
     { id: 'marketing', label: 'Marketing', icon: Sparkles, color: '#DB2777', bg: '#FDF2F8' },
     { id: 'btp', label: 'BTP & Génie', icon: Building2, color: '#D97706', bg: '#FFFBEB' },
     { id: 'droit', label: 'Droit & RH', icon: FileText, color: '#4F46E5', bg: '#EEF2FF' },
   ];
   ```
3. **Banner Curved Header:**
   Add curved Royal Violet banner at top of HomeScreen:
   ```tsx
   <LinearGradient
     colors={['#7C3AED', '#6D28D9']}
     start={{ x: 0, y: 0 }}
     end={{ x: 1, y: 1 }}
     style={styles.heroBanner}
   >
     <View style={styles.heroGreetingRow}>
       <View style={{ flex: 1 }}>
         <Text style={styles.heroGreetingText}>Bonjour, {firstName} 👋</Text>
         <Text style={styles.heroGreetingSub}>
           {studentProfile?.university || 'Université de Yaoundé I'}
         </Text>
       </View>
       <View style={styles.heroMatchBadge}>
         <Sparkles size={13} color="#FDE047" />
         <Text style={styles.heroMatchText}>Top Match</Text>
       </View>
     </View>
     <Text style={styles.heroCatchphrase}>
       Trouve ton stage professionnel certifié
     </Text>
   </LinearGradient>
   ```
4. **Horizontal `#RecommandéPourToi` Carousel:**
   Insert between `CategoryGrid` and vertical feed:
   ```tsx
   <View style={styles.carouselSection}>
     <View style={styles.sectionHeaderRow}>
       <Text style={styles.sectionTitle}>#RecommandéPourToi</Text>
       <Pressable onPress={onStages} hitSlop={8}>
         <Text style={styles.seeAllText}>Explorer tout ↗</Text>
       </Pressable>
     </View>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselScroll}>
       {recommendedJobs.map((job, index) => (
         <Pressable key={job.id} style={styles.carouselCard} onPress={() => setApplyingJob(job)}>
           <Image source={{ uri: getRotatingJobBanner(job, index) }} style={styles.carouselImage} />
           <View style={styles.carouselBody}>
             <Text style={styles.carouselTitle} numberOfLines={1}>{job.title}</Text>
             <Text style={styles.carouselCompany} numberOfLines={1}>{job.company?.name || 'Entreprise partenaire'}</Text>
             <View style={styles.carouselFooter}>
               <Text style={styles.carouselStipend}>{job.stipend || '75 000 FCFA'}</Text>
               <View style={styles.carouselApplyBadge}>
                 <Text style={styles.carouselApplyText}>1-Clic</Text>
               </View>
             </View>
           </View>
         </Pressable>
       ))}
     </ScrollView>
   </View>
   ```
5. **Feed Cards Styling Update:**
   - `container`: `backgroundColor: stitchColors.background` (`#F8FAFC`).
   - `jobCard`: `backgroundColor: '#FFFFFF'`, `borderColor: '#F1F5F9'`, `borderWidth: 1`, `borderRadius: 18`, `...stitchShadows.card`.
   - `jobTitle`: `color: stitchColors.ink` (`#0F172A`).
   - `companyName`: `color: stitchColors.inkMuted` (`#64748B`).
   - `applyBtn`: `backgroundColor: stitchColors.primary` (`#7C3AED`).

---

### 2.2. Screen 2: `src/ui/screens/ProfileScreen.tsx`

#### A. Direct Observations & Current Dark Remnants
- **Container:** Line 405: `backgroundColor: '#090714'`.
- **Header:** Line 424: `color: '#FFFFFF'`. Line 431: `bellBtn: backgroundColor: '#120E22'`.
- **Profile card:** Line 440: `backgroundColor: '#120E22'`.
- **Stat pills:** Line 506: `backgroundColor: '#0D0B18'`.
- **Menu cards:** Line 543: `backgroundColor: '#120E22'`, Line 558: `borderTopColor: 'rgba(255, 255, 255, 0.06)'`.
- **Transactions card:** Line 580: `backgroundColor: '#120E22'`.
- **Missing neobank wallet card:** `balance`, `iaCredits`, and `onRecharge` are passed via props but omitted from the UI.

#### B. Gap Analysis against R4 Requirements
1. **Virtual neobank wallet card in Royal Violet gradient (`brandGradient`):**
   Add a neobank credit-card style surface with `brandGradient.colors` (`['#7C3AED', '#8B5CF6', '#A78BFA']`), chip icon, balance in bold white numerals (`45 000 C`), IA token pill, MoMo / OM badge, and recharge button calling `onRecharge`.
2. **WhatsApp pairing integration:**
   Clean white card entry with green connected status pill (`✅ WhatsApp connecté`) or soft lavender pill (`Non associé`) opening `WhatsAppPairingModal`.
3. **Clean settings list on white cards:**
   All menu card groups (`ACTIVITÉ & OUTILS`, `PARAMÈTRES & SÉCURITÉ`, `COMPTE & ASSISTANCE`) must use clean white card containers (`#FFFFFF`), light border (`#F1F5F9`), deep slate text (`#0F172A`), and soft slate icons.

#### C. Worker M4 Step-by-Step Recipe
1. **Destructuring Props:**
   Ensure `balance`, `iaCredits`, and `onRecharge` are destructured in `ProfileScreen`:
   ```tsx
   export function ProfileScreen({
     studentProfile,
     balance = 0,
     iaCredits = 0,
     subscriptionTier,
     transactions,
     purchasedDocumentsCount,
     syncingAccount,
     onRecharge,
     ...
   }: ProfileScreenProps)
   ```
2. **Virtual Neobank Card Component:**
   Render right below student identity card:
   ```tsx
   <LinearGradient
     colors={brandGradient.colors}
     start={brandGradient.horizontal.start}
     end={brandGradient.horizontal.end}
     style={styles.neobankCard}
   >
     <View style={styles.neobankTopRow}>
       <View>
         <Text style={styles.neobankLabel}>CAMPUS 360 PAY</Text>
         <Text style={styles.neobankHolder}>{studentProfile?.name || 'Étudiant'}</Text>
       </View>
       <View style={styles.neobankIaPill}>
         <Sparkles size={11} color="#FFFFFF" strokeWidth={2.4} />
         <Text style={styles.neobankIaText}>{iaCredits} CRÉDITS IA</Text>
       </View>
     </View>
     <View style={styles.neobankBalanceRow}>
       <Text style={styles.neobankBalance}>{formatCoins(balance)}</Text>
       <Text style={styles.neobankCurrency}> COINS</Text>
     </View>
     <View style={styles.neobankBottomRow}>
       <Text style={styles.neobankHint}>MoMo • Orange Money</Text>
       <Pressable style={styles.neobankRechargeBtn} onPress={onRecharge}>
         <Text style={styles.neobankRechargeText}>Recharger</Text>
       </Pressable>
     </View>
   </LinearGradient>
   ```
3. **Surfaces & Styles Update:**
   - `container`: `backgroundColor: stitchColors.background` (`#F8FAFC`).
   - `profileCard`: `backgroundColor: '#FFFFFF'`, `borderColor: '#F1F5F9'`, `borderWidth: 1`, `borderRadius: 20`, `...stitchShadows.card`.
   - `studentName`: `color: stitchColors.ink` (`#0F172A`).
   - `statPill`: `backgroundColor: '#F8FAFC'`, `borderColor: '#E2E8F0'`.
   - `statNumber`: `color: stitchColors.ink` (`#0F172A`).
   - `menuCard`: `backgroundColor: '#FFFFFF'`, `borderColor: '#F1F5F9'`, `borderWidth: 1`, `borderRadius: 16`, `...stitchShadows.card`.
   - `menuItemText`: `color: stitchColors.ink` (`#0F172A`).
   - `menuItemDivider`: `borderTopColor: '#F1F5F9'`.
   - `txCard`: `backgroundColor: '#FFFFFF'`, `borderColor: '#F1F5F9'`, `...stitchShadows.card`.

---

### 2.3. Screen 3: `src/features/documents/DocumentsScreen.tsx`

#### A. Direct Observations & Current Dark Remnants
- **Options tile card:** Line 832: `backgroundColor: '#111622'`, border `rgba(255, 255, 255, 0.08)`.
- **Tiles:** Line 853: `backgroundColor: '#131927'`.
- **Document cards:** Line 907: `backgroundColor: '#111622'`.
- **Empty state box:** Line 976: `backgroundColor: '#111622'`.
- **Primary action button:** Line 944: `editButton: backgroundColor: '#4F46E5'` (outdated dark indigo).
- **Titles & typography:** `#F8FAFC`, `#94A3B8`.

#### B. Gap Analysis against R4 Requirements
1. **Clean white UI:** All cards, tiles, and containers must transition from `#111622` and `#131927` to `#FFFFFF` with `#F1F5F9` / `#E2E8F0` borders and soft elevation shadows.
2. **2-column HR official CV preview:** Currently the screen only lists documents or opens editing. It requires an integrated preview card/modal presenting the official HR 2-column CV layout (powered by `OfficialCvView` from `src/features/stages/OfficialCvView.tsx`).
3. **Royal Violet action buttons:** Upgrade action buttons (`editButton`, `createButton`, `downloadPdfButton`) to Royal Violet `#7C3AED` (`PrimaryButton` or solid `#7C3AED`).

#### C. Worker M4 Step-by-Step Recipe
1. **Imports:**
   ```tsx
   import { OfficialCvView } from '../stages/OfficialCvView';
   import type { OfficialCvData } from '../../types';
   ```
2. **Official CV Preview Integration:**
   Add state for `cvPreviewVisible` and a showcase card for "Mon CV Officiel RH":
   ```tsx
   <View style={styles.cvShowcaseCard}>
     <View style={styles.cvShowcaseHeader}>
       <View style={styles.cvShowcaseBadge}>
         <Text style={styles.cvShowcaseBadgeText}>Gabarit Officiel RH</Text>
       </View>
       <Text style={styles.cvShowcaseFormat}>Format 2 Colonnes</Text>
     </View>
     <Text style={styles.cvShowcaseTitle}>Curriculum Vitae Certifié Campus 360</Text>
     <Text style={styles.cvShowcaseDesc}>
       Gabarit officiel adapté aux normes des recruteurs au Cameroun et en zone CEMAC.
     </Text>
     <View style={styles.cvShowcaseActions}>
       <Pressable style={styles.cvPreviewBtn} onPress={() => setCvPreviewVisible(true)}>
         <Eye size={15} color="#FFFFFF" />
         <Text style={styles.cvPreviewBtnText}>Aperçu du CV Officiel</Text>
       </Pressable>
     </View>
   </View>
   ```
3. **Official CV Modal:**
   Render `OfficialCvView` inside a Clean White modal sheet with Royal Violet action buttons: "Télécharger PDF" and "Modifier".
4. **Card Styles Conversion:**
   - `optionsCard`: `backgroundColor: '#FFFFFF'`, `borderColor: '#F1F5F9'`, `...stitchShadows.card`.
   - `tile`: `backgroundColor: '#F8FAFC'`, `borderColor: '#E2E8F0'`.
   - `documentCard`: `backgroundColor: '#FFFFFF'`, `borderColor: '#F1F5F9'`, `...stitchShadows.card`.
   - `cardTitle`: `color: stitchColors.ink` (`#0F172A`).
   - `tileLabel`: `color: stitchColors.ink` (`#0F172A`).
   - `editButton`: `backgroundColor: stitchColors.primary` (`#7C3AED`).

---

### 2.4. Screen 4: `src/ui/screens/LibraryScreen.tsx`, `ExploreScreen.tsx` & `ResourcesScreen.tsx`

#### A. Direct Observations & Current Dark Remnants
- **`ExploreScreen.tsx` line 267:** `toggleBtns: backgroundColor: '#131024'`, `borderColor: 'rgba(139, 92, 246, 0.2)'`.
- **`ExploreScreen.tsx` line 283:** `toggleBtnText: color: '#94A3B8'`.
- **`ResourcesScreen.tsx` (the wrapper container) line 191:** `backgroundColor: '#090714'`.
- **`ResourcesScreen.tsx` line 206:** `header: backgroundColor: 'rgba(9, 7, 20, 0.95)'`.
- **`ResourcesScreen.tsx` line 273:** `subTabBar: backgroundColor: '#131024'`, border `rgba(139, 92, 246, 0.16)`.

#### B. Gap Analysis against R4 Requirements
1. **Clean White background & Header:** Both `ExploreScreen` and `LibraryScreen` are wrapped inside `ResourcesScreen`. Thus, `ResourcesScreen` must be harmonized to Clean White (`stitchColors.background` `#F8FAFC`, header on `#FFFFFF` with `#F1F5F9` border, sub-tab bar on `#F1F5F9` with Royal Violet active tab `#7C3AED`).
2. **Modern White PDF Cards with Purple Tags/Pills:** `DocumentGridCard` from `GlassComponents.tsx` already renders white cards; ensure `ExploreScreen.tsx`'s view toggle bar (`PDF / Packs`) uses `#F1F5F9` background and `#7C3AED` active pill.

#### C. Worker M4 Step-by-Step Recipe
1. **In `src/ui/screens/ExploreScreen.tsx`:**
   Update `toggleBtns`:
   ```tsx
   toggleBtns: {
     flexDirection: 'row',
     backgroundColor: stitchColors.paperSoft, // #F1F5F9
     borderWidth: 1,
     borderColor: stitchColors.outlineVariant,
     borderRadius: 12,
     padding: 3,
   },
   toggleBtnActive: {
     backgroundColor: stitchColors.primary, // #7C3AED
   },
   toggleBtnText: {
     ...stitchTypography.labelSm,
     color: stitchColors.inkMuted,
     fontWeight: '700',
   },
   toggleBtnTextActive: {
     color: '#FFFFFF',
   },
   ```
2. **In `src/ui/screens/ResourcesScreen.tsx`:**
   - Change `container`: `backgroundColor: stitchColors.background` (`#F8FAFC`).
   - Change `header`: `backgroundColor: '#FFFFFF'`, `borderBottomColor: '#F1F5F9'`.
   - Change `title`: `color: stitchColors.ink` (`#0F172A`).
   - Change `subtitle`: `color: stitchColors.inkMuted` (`#64748B`).
   - Change `subTabBar`: `backgroundColor: '#F1F5F9'`, `borderColor: '#E2E8F0'`.
   - Change `subTabActive`: `backgroundColor: '#7C3AED'`.
   - Change `subTabText`: `color: stitchColors.inkMuted` (`#64748B`), active: `#FFFFFF`.

---

### 2.5. Screen 5: `src/ui/screens/ApplicationsTimelineScreen.tsx`

#### A. Direct Observations & Current Dark Remnants
- **Container:** Line 333: `backgroundColor: '#090714'`.
- **Header:** Line 351: `backgroundColor: '#120E22'`.
- **Duo advice card:** Line 383: `backgroundColor: '#120E22'`.
- **Empty state box:** Line 417: `backgroundColor: '#120E22'`.
- **TicketCard:** Line 445: `backgroundColor: '#120E22'`.
- **Ticket cutout circles:** Lines 526 & 538: `backgroundColor: '#090714'` (cutouts are painted obsidian dark!).
- **Text colors:** Line 366: `color: '#F8FAFC'`, Line 487: `color: '#FFFFFF'`, Line 499: `color: '#94A3B8'`.

#### B. Gap Analysis against R4 Requirements
1. **Boarding-pass ticket style on clean white:** The ticket card must have `backgroundColor: '#FFFFFF'`, subtle border `#E2E8F0` / `#F1F5F9`, soft shadow `stitchShadows.card`.
2. **Perforated ticket cutouts:** `cutoutLeft` and `cutoutRight` must use `backgroundColor: stitchColors.background` (`#F8FAFC`) to create the realistic punch-hole cutout against the white background.
3. **Violet & Emerald status badges:**
   - `DELIVERED`, `ACCEPTED`: `bg: 'rgba(16, 185, 129, 0.10)'`, `text: '#059669'`, `border: 'rgba(16, 185, 129, 0.25)'`.
   - `INTERVIEW`, `REVIEWING`: `bg: 'rgba(124, 58, 237, 0.10)'`, `text: '#7C3AED'`, `border: 'rgba(124, 58, 237, 0.25)'`.
   - `PENDING`, `SENT_PENDING`: `bg: 'rgba(245, 158, 11, 0.10)'`, `text: '#D97706'`, `border: 'rgba(245, 158, 11, 0.25)'`.
4. **Action buttons:**
   - View dossier button: soft lavender container `rgba(124, 58, 237, 0.08)`, border `rgba(124, 58, 237, 0.20)`, violet text `#7C3AED`.
   - Reminder CTA: solid Royal Violet `#7C3AED` with white text.

#### C. Worker M4 Step-by-Step Recipe
1. **Update `STATUS_CONFIG` colors:**
   Use high-contrast light theme tints:
   ```tsx
   const STATUS_CONFIG = {
     PENDING: { label: 'En attente', bg: 'rgba(245, 158, 11, 0.10)', text: '#D97706', border: 'rgba(245, 158, 11, 0.25)', icon: Clock },
     SENT_PENDING: { label: 'En cours d’envoi', bg: 'rgba(59, 130, 246, 0.10)', text: '#2563EB', border: 'rgba(59, 130, 246, 0.25)', icon: Send },
     DELIVERED: { label: 'Délivrée', bg: 'rgba(16, 185, 129, 0.10)', text: '#059669', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },
     FAILED: { label: 'Échec d’envoi', bg: 'rgba(239, 68, 68, 0.10)', text: '#DC2626', border: 'rgba(239, 68, 68, 0.25)', icon: XCircle },
     REVIEWING: { label: 'En examen', bg: 'rgba(59, 130, 246, 0.10)', text: '#2563EB', border: 'rgba(59, 130, 246, 0.25)', icon: FileCheck },
     INTERVIEW: { label: 'Entretien', bg: 'rgba(124, 58, 237, 0.10)', text: '#7C3AED', border: 'rgba(124, 58, 237, 0.25)', icon: MessageSquare },
     ACCEPTED: { label: 'Accepté', bg: 'rgba(16, 185, 129, 0.10)', text: '#059669', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },
     REJECTED: { label: 'Non retenu', bg: 'rgba(239, 68, 68, 0.10)', text: '#DC2626', border: 'rgba(239, 68, 68, 0.25)', icon: XCircle },
   };
   ```
2. **Styles Conversion:**
   - `container`: `backgroundColor: stitchColors.background` (`#F8FAFC`).
   - `header`: `backgroundColor: '#FFFFFF'`, `borderBottomColor: '#F1F5F9'`.
   - `title`: `color: stitchColors.ink` (`#0F172A`).
   - `subtitle`: `color: stitchColors.inkMuted` (`#64748B`).
   - `backBtn`: `backgroundColor: '#F1F5F9'`.
   - `ticketCard`: `backgroundColor: '#FFFFFF'`, `borderColor: '#F1F5F9'`, `borderWidth: 1`, `borderRadius: 18`, `...stitchShadows.card`.
   - `ticketJobTitle`: `color: stitchColors.ink` (`#0F172A`).
   - `ticketCompanyName`: `color: stitchColors.inkMuted` (`#64748B`).
   - `cutoutLeft` & `cutoutRight`: `backgroundColor: stitchColors.background` (`#F8FAFC`), `borderColor: '#E2E8F0'`.
   - `dashedLine`: `borderBottomColor: '#E2E8F0'`.
   - `ticketMetaValue`: `color: stitchColors.ink` (`#0F172A`).
   - `ticketMetaLabel`: `color: stitchColors.inkMuted` (`#64748B`).
   - `qrBox`: `backgroundColor: '#F8FAFC'`, `borderColor: '#E2E8F0'`.
   - `viewDossierButton`: `backgroundColor: 'rgba(124, 58, 237, 0.08)'`, `borderColor: 'rgba(124, 58, 237, 0.20)'`.
   - `viewDossierButtonText`: `color: '#7C3AED'`.
   - `changeStatusPill`: `borderColor: '#CBD5E1'`, text: `color: stitchColors.inkSoft`.

---

### 2.6. Screen 6: `src/ui/screens/AuthScreen.tsx` & `src/ui/screens/OnboardingScreen.tsx`

#### A. Direct Observations & Current Dark Remnants
- **`AuthScreen.tsx` line 543:** `authCard: backgroundColor: '#131024'`, border `rgba(139, 92, 246, 0.22)`.
- **`AuthScreen.tsx` lines 593 & 613:** `logoTitle` and `cardTitle: color: '#F8FAFC'`.
- **`AuthScreen.tsx` line 747:** `successModalCard: backgroundColor: '#160F2E'`.
- **`OnboardingScreen.tsx` line 629:** `container: backgroundColor: '#090714'`.
- **`OnboardingScreen.tsx` line 657:** `header: backgroundColor: 'rgba(9, 7, 20, 0.85)'`.
- **`OnboardingScreen.tsx` line 727:** `stepCard: backgroundColor: '#131024'`.
- **`OnboardingScreen.tsx` line 783:** `textInput: backgroundColor: '#0E0B1F'`.
- **`OnboardingScreen.tsx` line 799:** `chip: backgroundColor: '#1A1435'`.
- **`OnboardingScreen.tsx` lines 825, 874, 909, 960:** `domainCard`, `levelCard`, `objectiveCard`, `skillPill` all with `backgroundColor: '#0E0B1F'`.
- **`OnboardingScreen.tsx` line 987:** `footer: backgroundColor: '#0D0A1C'`.

#### B. Gap Analysis against R4 Requirements
1. **`AuthScreen.tsx`:** Clean white modern login surface. The card container must be pure white (`#FFFFFF`) with soft shadow (`stitchShadows.card`), slate titles (`#0F172A`), clean input borders (`#E2E8F0`), and Royal Violet button (`#7C3AED`).
2. **`OnboardingScreen.tsx`:** Modern 3-step student activation flow on clean white. Screen background on `#F8FAFC`, step cards on pure white `#FFFFFF`, domain / level / objective cards on `#FFFFFF` with lavender active border when selected (`#7C3AED`), white text inputs, and clean bottom footer bar.

#### C. Worker M4 Step-by-Step Recipe
1. **In `src/ui/screens/AuthScreen.tsx`:**
   - `authCard`: `backgroundColor: '#FFFFFF'`, `borderColor: '#F1F5F9'`, `borderWidth: 1`, `...stitchShadows.card`.
   - `logoTitle`: `color: stitchColors.ink` (`#0F172A`).
   - `cardTitle`: `color: stitchColors.ink` (`#0F172A`).
   - `logoSubtitle`: `color: stitchColors.inkMuted` (`#64748B`).
   - `closeModalBtn`: `backgroundColor: '#F1F5F9'`.
   - `successModalBackdrop`: `backgroundColor: 'rgba(15, 23, 42, 0.45)'`.
   - `successModalCard`: `backgroundColor: '#FFFFFF'`, `borderColor: 'rgba(16, 185, 129, 0.25)'`, `...stitchShadows.card`.
   - `successTitle`: `color: stitchColors.ink` (`#0F172A`).
   - `successMessage`: `color: stitchColors.inkMuted` (`#64748B`).
2. **In `src/ui/screens/OnboardingScreen.tsx`:**
   - `container`: `backgroundColor: stitchColors.background` (`#F8FAFC`).
   - `header`: `backgroundColor: '#FFFFFF'`, `borderBottomColor: '#F1F5F9'`.
   - `stepCard`: `backgroundColor: '#FFFFFF'`, `borderColor: '#F1F5F9'`, `borderWidth: 1`, `...stitchShadows.card`.
   - `stepTitle`: `color: stitchColors.ink` (`#0F172A`).
   - `stepSubtitle`: `color: stitchColors.inkMuted` (`#64748B`).
   - `fieldLabel`: `color: stitchColors.ink` (`#0F172A`).
   - `textInput`: `backgroundColor: '#FFFFFF'`, `borderColor: '#CBD5E1'`, `color: stitchColors.ink`.
   - `chip`: `backgroundColor: '#F1F5F9'`, `borderColor: '#E2E8F0'`, `color: stitchColors.inkSoft`.
   - `chipSelected`: `backgroundColor: '#7C3AED'`, `borderColor: '#7C3AED'`, `color: '#FFFFFF'`.
   - `domainCard`: `backgroundColor: '#FFFFFF'`, `borderColor: '#E2E8F0'`, selected: `backgroundColor: 'rgba(124, 58, 237, 0.06)'`, `borderColor: '#7C3AED'`.
   - `domainTitle`: `color: stitchColors.ink` (`#0F172A`).
   - `levelCard` & `objectiveCard`: `backgroundColor: '#FFFFFF'`, `borderColor: '#E2E8F0'`, selected: `backgroundColor: 'rgba(124, 58, 237, 0.06)'`, `borderColor: '#7C3AED'`.
   - `footer`: `backgroundColor: '#FFFFFF'`, `borderTopColor: '#F1F5F9'`, `...stitchShadows.card`.
   - `continueButton`: `backgroundColor: stitchColors.primary` (`#7C3AED`).

---

## 3. Global Type Safety & Backward Compatibility Strategy

- **Zero Breaking Prop Changes:** Every screen component must preserve 100% of its current interface signature (`HomeScreenProps`, `ProfileScreenProps`, `DocumentsScreenProps`, `LibraryScreenProps`, `ExploreScreenProps`, `ApplicationsTimelineProps`, `AuthScreenProps`, `OnboardingScreenProps`).
- **Token Consistency:** All color replacements map directly to tokens in `src/theme/stitch.ts` (`stitchColors.paper`, `stitchColors.paperDeep`, `stitchColors.paperSoft`, `stitchColors.ink`, `stitchColors.inkMuted`, `stitchColors.primary`, `stitchColors.emerald`, `stitchRadius`, `stitchShadows.card`, `brandGradient`).
- **Validation Command:** Worker M4 must execute:
  ```bash
  npm run typecheck
  ```
  to ensure 0 errors across the entire repository.

---

## 4. Execution Sequence for Worker M4

1. **Step 1:** Harmonize `src/ui/screens/HomeScreen.tsx` (Hero curved violet banner, `#RecommandéPourToi` photo carousel, `CategoryGrid` circular filières, clean white feed cards).
2. **Step 2:** Harmonize `src/ui/screens/ProfileScreen.tsx` (Virtual neobank wallet card in `brandGradient`, clean white profile card, stat pills, settings lists, WhatsApp badge).
3. **Step 3:** Harmonize `src/features/documents/DocumentsScreen.tsx` (Clean white UI, 2-column HR official CV preview integration, Royal Violet action buttons).
4. **Step 4:** Harmonize `src/ui/screens/LibraryScreen.tsx`, `ExploreScreen.tsx` and parent `ResourcesScreen.tsx` (Toggle buttons and tab bar to light mode).
5. **Step 5:** Harmonize `src/ui/screens/ApplicationsTimelineScreen.tsx` (Boarding pass white ticket cards, cutout circles on light background, violet and emerald status badges).
6. **Step 6:** Harmonize `src/ui/screens/AuthScreen.tsx` and `OnboardingScreen.tsx` (Clean white auth surfaces, 3-step activation wizard).
7. **Step 7:** Run `npm run typecheck` to confirm 100% clean compilation.
