# Original User Request

## 2026-10-05T19:52:32Z

Implement the end-to-end automated stage application system for Campus 360, enabling students to link their WhatsApp account via an 8-digit pairing code (Evolution API) and dispatch official CV PDFs and personalized pitch messages in 1 click in the background via Evolution API and N8N SMTP without opening external apps.

Working directory: c:/Users/DELL/Desktop/mes projet/campus-360
Integrity mode: development

## Requirements

### R1. WhatsApp Session Management via Evolution API
- Integrate with the self-hosted Evolution API (`https://wa.blackcompany.site`).
- Implement student instance creation (`student-<phone>`) and 8-digit pairing code generation (`POST /instance/connect/:instance`).
- Check and report session connection state (`open`, `close`, `connecting`).
- Provide secure backend proxy endpoints in `mobile-api/app/api/mobile/whatsapp/instance/route.ts` so no secret API keys are leaked to the mobile client.

### R2. Backend Application Dispatch & PDF Cloud Storage
- Create route `POST /api/mobile/stages/dispatch` in `mobile-api/app/api/mobile/stages/dispatch/route.ts`.
- Upload/persist the generated official CV PDF in Supabase Storage (`cvs/` bucket) or base64 payload to provide a stable, accessible URL for Evolution API and N8N.
- Transmit the dispatch payload to the N8N webhook (`https://n8n.blackcompany.site/webhook/send-stage-application`).
- Record application status in the Supabase PostgreSQL `stage_applications` table with status tracking (`SENT_PENDING`, `DELIVERED`, `FAILED`).

### R3. N8N Automation Workflow
- Provide an exportable, valid N8N workflow JSON in `scripts/n8n/send_stage_application_workflow.json` with documentation in `docs/N8N_APPLICATION_DISPATCH.md`.
- Workflow routes by `channel`:
  - `whatsapp`: Calls Evolution API `POST /message/sendMedia/:instanceName` with `mediatype: "document"`, `mimetype: "application/pdf"`, `media: cvPdfUrl`, `fileName: "CV_Officiel.pdf"` and `caption: whatsappPitch`.
  - `email`: Sends SMTP email with attached PDF, HTML body, and `replyTo: student.email`.
  - Callback updates Supabase `stage_applications` to `DELIVERED`.
  - Anti-ban rate-limiting queue (15-30s jittered delay for batch applications).

### R4. Mobile UI: WhatsApp Pairing Modal
- Create `src/features/whatsapp/WhatsAppPairingModal.tsx` following the calm anti-saturation design system.
- Flow: Student enters/confirms phone number -> requests pairing code -> receives 8-digit code (e.g., `7842 - 9012`) with 1-tap copy button and clear instructions.
- Real-time polling/detection of `open` status with green connected badge `✅ WhatsApp connecté`.
- Accessible from `ProfileScreen.tsx` and directly within the application flow.

### R5. Mobile UI: 1-Click Apply Flow & Native Fallback
- Refactor `src/features/stages/AiApplyModal.tsx` sending step:
  - If WhatsApp linked: Primary action `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]` triggering background dispatch without opening external apps.
  - If Email chosen: Action `[ ✉️ Expédier ma Candidature par Email ]`.
  - If WhatsApp not linked: Offer 30s pairing or fallback button `[ 💬 Ouvrir WhatsApp Manuellement ]` (native deep-link).
  - Immediate visual feedback, receipt confirmation, and timeline sync.

### R6. Verification & Quality Assurance
- Zero TypeScript errors (`npm run typecheck` in project root and `npm run typecheck` in `mobile-api`).
- Automated test script `scripts/test-stage-dispatch.mjs` verifying pairing code initiation and dispatch payload generation.
- Zero exposed secrets in client-side code.

## Acceptance Criteria

### Functionality & Integration
- [ ] Evolution API instance creation and 8-digit pairing code endpoint responds with valid pairing code.
- [ ] Backend `/api/mobile/stages/dispatch` validates input, stores PDF, and forwards to N8N webhook.
- [ ] Exportable N8N workflow JSON file is syntactically valid and contains both WhatsApp (Evolution API) and Email (SMTP) branches.
- [ ] `WhatsAppPairingModal.tsx` renders cleanly, allows copying the 8-digit code, and reflects connection status.
- [ ] `AiApplyModal.tsx` allows 1-click background dispatch when connected, with native fallback when unconnected.

### Type Safety & Code Quality
- [ ] `npm run typecheck` passes with 0 errors in `c:/Users/DELL/Desktop/mes projet/campus-360`.
- [ ] `cd mobile-api && npm run typecheck` passes with 0 errors.
- [ ] `scripts/test-stage-dispatch.mjs` executes and exits with code 0.
- [ ] `plan.md` updated with all tasks checked off upon completion.

## 2026-10-07T10:14:46Z

Le serveur a redémarré. Les jalons M1 (Proxy Evolution API), M2 (Backend Stage Dispatch & Storage), M3 (Workflow N8N) et M4 (Modal d'appairage WhatsApp dans ProfileScreen) sont déjà implémentés et présents dans le codebase.

Veuillez reprendre l'orchestration et finaliser les jalons restants :
1. Jalon M5 : Câblage du flux 1-Clic dans `src/features/stages/AiApplyModal.tsx` et `src/features/stages/stagesApi.ts` (vérification de la session WhatsApp via `whatsappService`, bouton d'envoi automatique en arrière-plan appelant `/api/mobile/stages/dispatch`, accusé de réception immédiat, et conservation du fallback manuel).
2. Jalon M6 : Création et validation du script de test `scripts/test-stage-dispatch.mjs`, validation de l'absence totale d'erreurs TypeScript (`npm run typecheck` à la racine et dans `mobile-api`), et validation des tâches dans `plan.md`.


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
