# Original User Request

## Initial Request — 2026-06-26T19:48:46Z

An admin web dashboard for Campus-Bordes to upload academic PDFs to Supabase Storage, automatically generate watermarked preview files, and display sales and downloads on a live analytics dashboard.

Working directory: c:/Users/migue/Desktop/mes projets/campus 360
Integrity mode: demo

## Requirements

### R1. Supabase PDF Upload and Metadata Sync
The app must allow admins to upload complete academic PDF files. The file must be saved in the private `documents` bucket on Supabase Storage, and the metadata (title, subject, price, page count, etc.) must be saved/updated in the Supabase PostgreSQL database.

### R2. Automatic Watermarked Preview Generation
Upon uploading a complete PDF, the app must automatically extract its first page, overlay a highly visible "Campus-Bordes Preview" watermark, and upload the watermarked preview PDF to the private `document-previews` bucket on Supabase Storage.

### R3. Live Analytics Dashboard
The app must display a dashboard fetching data from Supabase (`document_events`, `documents`, and `profiles`) that displays key metrics: total revenue, total sales, number of search queries, top performing documents by conversion rate (purchases / previews), and a live event stream.

### R4. Complete Document Catalog Management
Admins must be able to list all documents, edit metadata, update status (draft, published, archived), and delete documents. These operations must be synced directly to the Supabase database.

## Acceptance Criteria

### PDF Upload & Storage
- [ ] Uploading a PDF via Next.js Admin dashboard creates an entry in `public.documents` table with correct metadata (title, faculty, subject, university, price_coins, level, page_count).
- [ ] The full PDF is stored in the private `documents` bucket on Supabase Storage.
- [ ] A 1-page preview PDF is automatically extracted from the uploaded document, overlayed with a "Campus-Bordes Preview" watermark, and saved in the private `document-previews` bucket on Supabase.

### Analytics & Catalog Management
- [ ] The Next.js Admin Analytics page displays: total sessions, search query count, previews, purchases, total revenue, top-performing documents by conversion rate, and a list of recent events.
- [ ] The admin can view the document list, update document price, title, subject details, status (draft, published, archived), and delete any document.
- [ ] Deleting a document removes its files from both `documents` and `document-previews` storage buckets on Supabase.

### Code Quality & Security
- [ ] Enforces role-based access control: only authenticated users with role `admin` or `super_admin` in `public.profiles` can access admin pages and APIs.
- [ ] Running `npm run typecheck` or `npm run build` in `admin-app/` passes without any TypeScript or compile errors.

## Verification Plan

### Automated Checks
- Run typecheck in `admin-app/`: `npm run typecheck`

### Manual Verification
- Log in to Next.js Admin Dashboard using credentials in `.env.local`.
- Upload a test academic PDF. Verify that it appears in Supabase database (`public.documents`) and Storage (`documents` and `document-previews` buckets).
- Verify the generated preview by downloading/viewing it to confirm that it contains only the first page and has the watermark text overlaid.
- Perform a simulated purchase from the mobile app (or manually insert a `document_events` purchase event in Supabase). Verify that the admin analytics dashboard updates in real-time.
- Try to access the admin pages/APIs with a student profile. Verify that access is denied with a 403 error.

## Follow-up — 2026-06-26T21:59:03Z

Connect the Campus-Bordes Expo mobile app to the Supabase backend, enabling user authentication, live catalog loading, wallet transaction synchronization, and secure signed PDF URLs for reading.

Working directory: c:/Users/migue/Desktop/mes projets/campus 360
Integrity mode: development

## Requirements

### R1. Persistent Email/Password Authentication
Replace the mocked auth in the Expo app with real user registration and login flows using `betterAuth.ts` client. Persist sessions using `expo-secure-store` so the user remains authenticated upon restarting the app.

### R2. Live Catalog and Packs Integration
Connect the catalog and packs UI in `PdfStudentSection.tsx` and `App.tsx` to `listPublishedPdfDocuments()` and `listPublishedPdfPacks()` from `pdfApi.ts`, fetching live records from Supabase instead of showing mock items.

### R3. Synchronized Wallet & Purchases
Connect the purchase buttons for documents and packs to `purchasePdfDocument()` and `purchasePdfPack()`, debiting the user's real Supabase wallet balance and listing their items under the "Mes PDF" tab upon successful purchase.

### R4. Secure PDF Viewer
Connect the reader screen to open the PDF using a temporary secure signed URL retrieved via `createSignedPdfUrl()`, displaying the actual PDF pages instead of a mock reader interface.

## Acceptance Criteria

### Authentication & Session
- [ ] User login and sign-up communicate with the Better Auth server backend, writing profiles to the database.
- [ ] The authenticated session persists across app restarts (e.g. killing and reopening the app retains the student profile and wallet balance).
- [ ] Logging out successfully clears session details from SecureStore.

### Catalog & Transactions
- [ ] The "Catalog" tab lists documents retrieved directly from Supabase's `public.documents` table where status is `published`.
- [ ] Buying a document/pack executes the purchase endpoint, updates the wallet balance (`public.wallets`), and successfully adds the document/pack ID to the student's purchased library.
- [ ] The wallet balance shown in the app matches the balance stored in the database.

### Secure PDF Viewer
- [ ] The student can open a preview of any PDF, loading the file from `document-previews` bucket.
- [ ] The student can read a purchased PDF, loading the complete file from `documents` bucket via a signed URL.
- [ ] An unpurchased full PDF is not accessible, returning an access error if the reader tries to load it without purchase.

### Build & Type Safety
- [ ] Running `npm run typecheck` in the mobile app root passes without TypeScript compilation errors.

## Verification Plan

### Automated Checks
- Run typecheck at the project root: `npm run typecheck`

### Manual Verification
- Register a new student user in the mobile app. Log out, restart the app, and verify you are prompted to log in. Log in and verify session persistence.
- Complete a wallet top-up and check that the balance increments in the app and matches the DB.
- Confirm that the catalog lists published documents from the Supabase DB.
- Purchase a document. Confirm that the coins are debited and the document appears under "Mes PDF".
- Open a preview PDF and confirm it renders. Open the purchased PDF and confirm it renders using the signed URL. Attempt to read an unpurchased PDF directly and confirm it fails.


## 2026-10-08T01:55:15Z

Complete UI/UX redesign of the Campus 360 React Native (Expo) mobile application to a high-converting, modern "Royal Violet & Clean White" design system inspired by modern PropTech/workspace mobile references, including a curved violet header, clean white cards, circular categories, and a full-bleed immersive stage detail screen with sticky application CTA.

Working directory: c:/Users/DELL/Desktop/mes projet/campus-360
Integrity mode: development

## Requirements

### R1. Design System & Theme Foundation (`src/theme/stitch.ts`)
- Replace the dark obsidian theme with a crisp **Clean White & Royal Violet** theme.
- Primary backgrounds: `#FFFFFF` and subtle `#F8FAFC`.
- Brand Accent: Royal Violet (`#7C3AED`), Electric Violet (`#8B5CF6`), and soft tinted purple containers (`rgba(124, 58, 237, 0.08)`).
- Foreground / Typography: Deep Slate Black (`#0F172A`) for high contrast readability, muted slate (`#64748B`) for subtitles.
- Shadows & Surfaces: Ultra-soft elevation shadows (`#0F172A` at 4-6% opacity) and smooth rounded card radiuses (16-24px).

### R2. Master Shared Components (`src/ui/GlassComponents.tsx`)
- **TopBar:** Redesign to feature the curved bottom container in Royal Violet (`#7C3AED`), with location pill dropdown (`📍 Ville / Université ∨`), notification bell with unread badge, and an integrated white search bar pill with filter button icon (`SlidersHorizontal`).
- **BottomNav:** Floating clean white curved bar with 5 icons (`Accueil`, `Stages`, `Créer`, `Ressources`, `Profil`), where the active tab displays as a solid violet pill with white icon and label.
- **CategoryGrid:** Horizontal circular category items with soft purple icon backgrounds and legible labels underneath.
- **Buttons & Cards:** Primary rounded buttons in solid Royal Violet with white text, and clean white card containers with subtle borders.

### R3. Immersive Stage Detail Screen (`src/ui/screens/StagesScreen.tsx`)
- Implement the exact layout from Screen 2 of the reference image:
  1. Full-bleed hero image header with curved bottom corners and floating circular action buttons (Back `←`, Share, Favorite `♥`).
  2. Horizontal thumbnail photo strip peeking into company workspaces/offices with "+N photos" indicator.
  3. Domain pill badge (`Stage Pré-embauche` / `Informatique`) + AI Match rating badge (`★ 95% Match`).
  4. Prominent job title and company location with direction button.
  5. Segmented tabs with purple underline indicators: `[ À propos ]`, `[ Entreprise ]`, `[ Conseils IA ]`.
  6. Quick metadata pill row: Duration (`🏃 3 à 6 mois`), Location mode (`📍 Présentiel`), Status (`🕒 Ouvert`).
  7. Rich description block with expandable "Voir plus" and required skills chips.
  8. Recruiter / Company info card with direct WhatsApp and email contact buttons.
  9. Fixed sticky bottom bar displaying estimated stipend on the left (`75 000 FCFA /mois` or mention) and a large rounded Royal Violet CTA on the right (`Postuler en 1 Clic`).

### R4. Global Screen Harmonization
- **HomeScreen (`src/ui/screens/HomeScreen.tsx`):** Header bombé violet, carrousel `#RecommandéPourToi` avec bannières photos d'entreprises, filières circulaires, et feed des meilleures offres.
- **StagesScreen Feed (`src/ui/screens/StagesScreen.tsx`):** Feed d'offres en cartes blanches aérées avec photo de couverture, badges de match IA, et ouverture instantanée de la vue détaillée immersive.
- **DocumentsScreen (`src/features/documents/DocumentsScreen.tsx`):** Interface blanche épurée avec prévisualisation du CV officiel RH 2 colonnes et boutons d'actions violets.
- **LibraryScreen & ExploreScreen (`src/ui/screens/LibraryScreen.tsx`, `ExploreScreen.tsx`):** Grille de documents PDF en cartes blanches modernes avec puces violettes.
- **ProfileScreen (`src/ui/screens/ProfileScreen.tsx`):** Carte portefeuille virtuelle en dégradé violet royal (style néobanque), intégration jumelage WhatsApp et réglages épurés.
- **ApplicationsTimelineScreen (`src/ui/screens/ApplicationsTimelineScreen.tsx`):** Suivi chronologique clair des candidatures avec badges de statut violets et verts.
- **AuthScreen & OnboardingScreen (`src/ui/screens/AuthScreen.tsx`, `OnboardingScreen.tsx`):** Écrans d'accueil et d'inscription blancs, modernes et sans friction.

### R5. Non-Breaking Architecture & Typecheck
- Preserve all existing backend API integration contracts (`mobile-api`), authentication sessions (Better Auth), WhatsApp pairing services, and database queries.
- Zero TypeScript compilation errors: `npm run typecheck` (`tsc --noEmit`) must pass without errors.

## Acceptance Criteria

### Type Safety & Compilation
- [ ] `npm run typecheck` passes with zero errors across the entire codebase.

### Visual & Layout Fidelity
- [ ] TopBar renders the curved violet container with white search bar and location selector.
- [ ] BottomNav renders the floating white bar with active purple pill indicator.
- [ ] Stage Detail view faithfully matches the reference layout: hero image, thumbnail photo strip, metadata pills, segmented tabs, recruiter card, and sticky bottom bar.
- [ ] All primary app screens (`Home`, `Stages`, `Documents`, `Resources`, `Profile`, `Timeline`, `Auth`) adopt the unified Clean White & Royal Violet design system.

### Functional Integrity
- [ ] 1-Click Application flow (WhatsApp & Email with official CV PDF) opens and triggers properly from the new sticky bottom bar.
- [ ] Wallet top-up modal and balance display function correctly.
- [ ] Search and category filter chips filter stages and documents dynamically without layout shifts.
