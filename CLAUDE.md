# Campus 360 — Monorepo

Ce fichier documente l'architecture du dépôt pour éviter de devoir ré-analyser le codebase à chaque tâche. À maintenir à jour si l'architecture change significativement (nouveau service, migration de schéma majeure, changement d'auth, etc.).

## Vue d'ensemble

Monorepo à **3 services** + 1 dossier de maquettes de design :

1. **App mobile Expo** (racine) — client React Native/Expo, ne parle jamais directement à Postgres/Storage
2. **`mobile-api/`** (port 3002 dev) — backend "business" pour le mobile (auth, wallet, achats, documents/rédaction, notifications)
3. **`admin-app/`** (port 3001 dev) — dashboard admin web + point d'entrée historique de l'auth en prod (`https://admin.campus360b.site`)
4. **`stitch_academic_hub_ia_assistant/`** et **`admin-app/public/stitch_campus_360_admin_dashboard/`** — maquettes HTML statiques générées par l'outil "Stitch" (Google), servent de référence visuelle uniquement, pas de code exécutable dans l'app.

### Comment les services s'articulent

- Le mobile appelle `authFetch()` (`src/features/auth/betterAuth.ts`) vers un `authBaseUrl` résolu dynamiquement (voir section Auth).
- `admin-app` proxifie `/api/mobile/:path*` vers `mobile-api` via `next.config.ts`:
  ```ts
  async rewrites() {
    const mobileApiUrl = process.env.NEXT_PUBLIC_MOBILE_API_URL || 'http://localhost:3002';
    return [{ source: '/api/mobile/:path*', destination: `${mobileApiUrl}/api/mobile/:path*` }];
  }
  ```
  En pratique : le mobile appelle `admin-app` (prod) ou IP LAN:3001 (dev), et `admin-app` relaie vers `mobile-api:3002` pour tout `/api/mobile/*`.
- `admin-app` et `mobile-api` **partagent la même base Postgres** (même `DATABASE_URL`) et **doivent partager le même `BETTER_AUTH_SECRET`** pour que les sessions soient valides des deux côtés.
- ⚠️ **Dette technique** : `documents-db.ts` est dupliqué et divergent entre `admin-app/lib/documents-db.ts` (328 lignes, a `document_metadata`, insert sans colonnes thème) et `mobile-api/lib/documents-db.ts` (342 lignes, plus récent, insert avec `primary_color`/`secondary_color`/`font_family`). Vérifier les deux si on touche au schéma `app_documents`.
- ⚠️ `README.md` et `PROJECT.md` sont **partiellement obsolètes** : ils décrivent encore Supabase Auth et admin-app comme gateway API unique, alors que l'architecture réelle actuelle est Better Auth + Postgres direct avec `mobile-api` en service séparé (port 3002).

## Stack technique

**App mobile (racine, `package.json`)**
- Expo SDK `~54.0.35`, React `^19.1.0`, React Native `^0.81.5`, TypeScript `~5.9.2` strict
- Auth client : `better-auth` `^1.6.19` + `@better-auth/expo`
- UI : `lucide-react-native`, `react-native-svg`, `expo-linear-gradient`, Google Fonts (`@expo-google-fonts/inter`, `@expo-google-fonts/outfit`)
- `expo-file-system`, `expo-print`, `expo-sharing` (export PDF), `expo-secure-store` (session), `expo-notifications` (push), `expo-updates` (OTA)
- Scripts : `npm run start|android|ios|web|typecheck`
- `app.json` : "Campus 360", scheme `campus-bordes`, bundle `com.campus360b.app`, EAS projectId `098589af-cd81-41d3-8c74-173bd02396a5`, owner `campus360s-team`

**`mobile-api/`** — `campus-360-mobile-api`, Next `^15.5.7`, port **3002**
- `better-auth` `^1.3.34` + `@better-auth/expo`, `pg` `^8.21.0` (Postgres direct), `zod` `^4.3.6`, `puppeteer` `^25.1.0`, `resend` `^4.0.0`

**`admin-app/`** — `campus-360-admin`, Next `^15.5.7`, port **3001**
- `@tiptap/react` + `@tiptap/starter-kit` (éditeur riche web), `docx` `^9.7.1`, `pdf-lib`, `pdfjs-dist` `5.4.54`, `recharts`, `tailwindcss` `^4.3.1`, `puppeteer`
- Scripts : `predev`/`build` lancent `css:build`, `auth:migrate`, `mobile:setup`, `supabase:setup`, `verify`

**Base de données** : PostgreSQL sur Supabase (pooler `aws-1-eu-north-1.pooler.supabase.com`), accès direct via `pg` (pas le SDK Supabase côté serveur). Auth via **Better Auth**, pas Supabase Auth.

## Structure des dossiers

### `src/` (app mobile)
- `AppShell.tsx` — composant racine (~1669 lignes), toute la logique métier + état + navigation (pas de react-navigation, navigation "maison" par état `activeSection`)
- `config/env.ts` — variables d'env publiques (`EXPO_PUBLIC_*`), `isSupabaseConfigured()`
- `types.ts` — types partagés : `Transaction`, `CampusDocument`, `CampusPdfPack`
- `theme/stitch.ts` — design system éditorial (voir section Thème)
- `ui/GlassComponents.tsx` — `Card`, `Pill`, `TopBar`, `BottomNav`, `InkRule`, `IconButton` (alias `GlassPanel`/`GlassCard` conservés pour compat)
- `ui/screens/` — `HomeScreen`, `ExploreScreen`, `LibraryScreen`, `ProfileScreen`, `AuthScreen`, `DocumentsScreen`
- `features/auth/betterAuth.ts` — client Better Auth, auto-détection IP dev, fonctions auth/API
- `features/pdf/pdfApi.ts` — catalogue PDF/packs (REST Supabase direct en lecture publique + `authFetch` pour achats)
- `features/pdf/pdfAssistant.ts` — assistant IA chat contextualisé sur un PDF, fallback local si API indispo
- `features/pdf/PdfStudentSection.tsx` — catalogue/bibliothèque étudiant (~2352 lignes)
- `features/documents/DocumentEditorScreen.tsx` — éditeur natif (WebView HTML bundlé + toolbar), ~1262 lignes
- `features/documents/DocumentsScreen.tsx` — liste/gestion documents (CV, lettre, stage, mémoire), ~1262 lignes
- `features/onboarding/OnboardingScreen.tsx`, `FreePdfSelector.tsx`

### `mobile-api/`
- `app/api/auth/[...all]/route.ts` — instance Better Auth (catch-all)
- `app/api/health/route.ts`
- `app/api/mobile/account/route.ts` — GET/PATCH profil + wallet + abonnement + achats + transactions
- `app/api/mobile/auth-capabilities/route.ts` — expose `{ passwordReset, google }`
- `app/api/mobile/documents/route.ts`, `[id]/route.ts`, `[id]/sections/route.ts`, `[id]/sections/[sectionId]/route.ts` — CRUD documents/sections
- `app/api/mobile/documents/[id]/export/pdf/route.ts` — export PDF (puppeteer)
- `app/api/mobile/documents/ai/route.ts`, `generate/route.ts`, `generate-full/route.ts` — génération IA
- `app/api/mobile/documents/onboard-chat/route.ts`
- `app/api/mobile/events/route.ts` — analytics
- `app/api/mobile/ia-packs/purchase/route.ts`
- `app/api/mobile/notifications/register/route.ts`
- `app/api/mobile/pdf/signed-url/route.ts`
- `app/api/mobile/purchase/document/route.ts`, `purchase/pack/route.ts` — achats atomiques (transaction SQL)
- `app/api/mobile/reset-password-redirect/route.ts`
- `app/api/mobile/subscription/purchase/route.ts`
- `app/api/mobile/wallet/topup/route.ts`, `[reference]/route.ts`, `wallet/webhook/route.ts`
- `lib/auth.ts` — config Better Auth complète (voir Auth)
- `lib/database.ts` — pool `pg` partagé (Proxy défensif si `DATABASE_URL` absent → throw seulement à l'usage, jamais au build)
- `lib/documents-db.ts` — accès `app_documents`/`app_document_sections` (voir DB)
- `lib/mobile-access.ts` — `requireMobileUser()`, `ensureMobileUser()` (mapping Better Auth → `app_users` legacy), rate limiting
- `lib/login-throttle.ts`, `rate-limit.ts`, `route-rate-limit.ts` — anti brute-force
- `lib/mailer.ts` (Resend), `lib/subscriptions.ts`
- `middleware.ts` — CORS + headers sécurité pour `/api/*` et `/auth/*`
- `sql/0004_add_document_editor_columns.sql` — migration idempotente (colonnes éditeur, `ia_credits`, tables usage/transactions)
- `tests/documents.test.mjs` — tests d'intégration HTTP réels (voir Tests)
- `tests/db-check.cjs`, `query-users.cjs` — scripts d'inspection DB ad hoc

### `admin-app/`
- `app/admin/layout.tsx`, `AdminShell.tsx` — shell dashboard (nav, guard rôle)
- `app/admin/login/` — `LoginClient.tsx`, `page.tsx`
- `app/admin/page.tsx`, `_components/DashboardOverview.tsx`
- `app/admin/pdf/PdfDashboardClient.tsx` (~1054 lignes) — CRUD catalogue PDF, upload, analyse IA, prix suggéré, statut (`draft`→`analyzing`→`needs_review`→`published`→`archived`)
- `app/admin/packs/PacksDashboardClient.tsx`
- `app/admin/users/UsersDashboardClient.tsx`
- `app/admin/analytics/AnalyticsDashboard.tsx`, `DashboardCharts.tsx` (recharts)
- `app/admin/settings/SettingsClient.tsx`
- `app/admin/documents/DocumentsListClient.tsx`, `new/NewDocumentClient.tsx`
- `app/documents/[id]/page.tsx`, `lib/html-to-docx.ts`, `extensions/ImagePlaceholder.ts` — éditeur riche Tiptap web + export docx
- `app/api/admin/analytics/route.ts`, `users/route.ts`
- `app/api/ai/pdf-chat/route.ts` — proxy IA consommé par `pdfAssistant.ts` mobile
- `app/api/auth/[...all]/route.ts`, `auth/diagnostic/route.ts` — instance Better Auth propre à admin-app
- `app/api/bootstrap-admin/route.ts`
- `app/api/packs/route.ts`, `[id]/route.ts`, `[id]/status/route.ts`
- `app/api/pdf/route.ts`, `[id]/route.ts`, `[id]/analyze/route.ts`, `[id]/price/route.ts`, `[id]/status/route.ts`
- `lib/auth.ts`, `auth-client.ts`, `auth-schema.ts`
- `lib/course-db.ts`, `documents-db.ts`, `database.ts`
- `lib/pdf-intelligence.ts`, `pdf-preview.ts`, `supabase-pdf.ts` — analyse IA PDF, preview, upload Storage
- `lib/access.ts`, `mobile-access.ts`
- `next.config.ts` — proxy `/api/mobile/*` → `mobile-api`
- `scripts/*.mjs|.ts` — migrations ad hoc, seed, vérif RLS, setup Better Auth mobile, hotfix sécurité DB
- `public/stitch_campus_360_admin_dashboard/` — maquettes design
- `campus360-admin.sqlite` — DB SQLite locale (probable pré-Postgres dev/test)

## Fonctionnalités principales

- **Catalogue PDF étudiant** : recherche/filtre université/faculté/matière/niveau (`ExploreScreen`, `PdfStudentSection.tsx`)
- **Preview + achat PDF** via wallet coins (`buyDocument`/`buyPack` dans `AppShell.tsx`, `purchasePdfDocument`/`purchasePdfPack` dans `pdfApi.ts`)
- **Packs PDF** (bundles avec réduction), suggestion auto si aucun publié (`buildSuggestedPacks`)
- **Bibliothèque "Mes PDF"** (`LibraryScreen`)
- **Wallet** : solde en coins, recharge Mobile Money (MTN MoMo / Orange Money), polling statut (`topUpStudentWallet`/`checkTopUpStatus`)
- **Abonnements** (`free`/`basic`/`premium`) débloquant l'accès au catalogue (`hasSubscription`)
- **Packs de crédits IA** (`micro`/`standard`/`boost`) — `purchaseIaPack`
- **Assistant IA sur PDF** : chat contextualisé (résumé, plan d'étude, quiz), fallback local si API échoue
- **Rédaction de documents** : CV, lettre motivation, rapport de stage, mémoire, document vierge — sections auto via `TEMPLATE_SECTIONS`, éditeur natif WebView + toolbar, génération IA, export PDF/DOCX, thème (couleurs, police, interligne, marges, template de couverture)
- **Auth étudiant** : email/password, Google OAuth optionnel, reset password email, deep links (`campus-bordes://reset-password`)
- **Onboarding** : slides + sélection PDF gratuit à l'inscription
- **Notifications push** (Expo Notifications) + centre in-app
- **OTA updates** (expo-updates) avec bannière nouvelle version
- **Dashboard admin** : catalogue PDF complet, packs, users, analytics (funnels, usage IA, wallet)
- **Analytics events** : `catalog_view`, `search`, `preview_open`, `purchase_start/success/failed`, `reader_open`, `assistant_question`, `free_pdf_claim`

## Base de données (Postgres, accès via `pg` direct)

Tables identifiées (pas de schéma SQL unique — migrations incrémentales) :
- `app_users` — liés à Better Auth via `better_auth_user_id`, `legacy_supabase_user_id` (migration ancien schéma), `email, name, role, phone, whatsapp_phone, university, faculty, level, subscription_tier, subscription_expires_at`
- `app_wallets` — `user_id, balance_coins, ia_credits, report_credits, updated_at`
- `app_wallet_transactions` — `type ('purchase'|'ai_generation'|'topup'|'withdrawal'|'commission'|'report'), amount_coins, reference_id, status`
- `app_document_purchases` — `document_id, buyer_id, amount_coins` (unique document_id+buyer_id)
- `app_pack_purchases` — `pack_id, buyer_id, amount_coins, document_ids[]`
- `documents` — catalogue PDF public : `title, description, university, faculty, subject, teacher, level, academic_year, price_coins, page_count, file_path, preview_path, status, commission_rate, rating, sales_count, ai_summary, ai_tags, ai_difficulty, suggested_price_coins, quality_score, ai_study_plan, ai_quiz`
- `pdf_packs` — `title, university, faculty, level, semester, pack_type, price_coins, discount_percent, status, sales_count, revenue_coins`
- `pdf_pack_items` — `pack_id, document_id, sort_order`
- `app_documents` (rédaction) — `user_id, title, template_type, font_family, line_spacing, margins, cover_template, cover_data (jsonb), primary_color, secondary_color`
- `app_document_sections` — `document_id, title, content_html, content_json (jsonb), sort_order, is_system`
- `app_ia_usage_logs` — `user_id, tokens_used`
- Tables legacy : `profiles`, `wallets`, `document_purchases`, `pack_purchases`, `wallet_transactions` — copiées vers `app_*` à la première connexion (`copyLegacyData` dans `mobile-access.ts`)

Migration clé : `mobile-api/sql/0004_add_document_editor_columns.sql` — idempotente (`IF NOT EXISTS`), ajoute `content_json`, colonnes thème/layout (defaults `#2563EB`/`#0D9488`/`Lora`/`1.5`/`normal`/`classic`), `ia_credits` (default 10), crée `app_ia_usage_logs`/`app_wallet_transactions`.

`mobile-api/lib/documents-db.ts` expose : `listUserDocuments`, `getDocumentById`, `getDocumentSections`, `createDocument` (transaction insert document + sections via `TEMPLATE_SECTIONS`), `updateDocumentSettings`, `deleteDocument`, `updateDocumentSection`, `addDocumentSection`, `deleteDocumentSection` (protège sections système), `reorderDocumentSections`.

## Authentification

Better Auth partout, **deux instances distinctes** (admin-app + mobile-api) partageant la même base Postgres et devant partager `BETTER_AUTH_SECRET`.

`mobile-api/lib/auth.ts` :
- Origines de confiance en dur en prod (`api.campus360b.site`, `admin.campus360b.site`, domaines Vercel) + origines locales (`campus-bordes://`, `localhost:3001/8081/8082`)
- `emailAndPassword.requireEmailVerification = false` (volontaire, évite blocage si SMTP mal configuré)
- Champs additionnels `user` : `role` (default `student`), `phone`, `whatsappPhone`, `university`, `faculty`, `level`
- Cookie session `better-auth.session_token`, 7 jours, refresh quotidien, `httpOnly`, `sameSite: lax`, `secure` en prod
- Plugins : `expo()`, `admin({ defaultRole: 'student', adminRoles: ['admin'] })`, `nextCookies()`
- Rate limiting Better Auth (100 req/60s) + throttle brute-force sur `/sign-in/email` et `/sign-up/email`
- Google OAuth conditionnel (seulement si `GOOGLE_CLIENT_ID`/`SECRET` semblent réels)
- `databasePool`/`auth` exposés via Proxy qui throw seulement à l'usage (jamais au build Vercel)

**Auto-détection IP dev** (`src/features/auth/betterAuth.ts`) :
- `getDevBackendUrl()` : en dev natif, lit `Constants.expoConfig?.hostUri` (IP LAN du PC hôte fournie par Expo Go), construit `http://<ip>:3001`, fallback `Linking.createURL('/')`
- Sur web : si `window.location.hostname` est localhost ou IP LAN privée, force `http://<hostname>:3001`, sinon utilise config prod — garde-fou pour ne jamais réécrire un domaine prod légitime
- Résout le problème classique : un téléphone physique sur le même Wi-Fi ne peut pas atteindre `localhost:3001` (qui pointerait vers le téléphone lui-même)

Sécurité additionnelle : `mobile-api/middleware.ts` (CORS + headers sécurité), `mobile-access.ts::requireMobileUser()` (vérif session + rate limit + auto-provisioning legacy).

## Thème / UI

`src/theme/stitch.ts` — design "éditorial" : *"No glassmorphism. No shadows. No gradients. Only ink, paper, sienna, emerald."*
- Palette : `ink` (#0F172A), `paper` (#F6F1E7), `sienna` (#B7410E, CTA principal), `emerald` (#047857, succès/possédé/IA)
- Anciens noms Material Design 3 conservés en alias (`primary`, `onPrimaryContainer`...) pour compat
- Tokens `glass*` neutralisés (vestige de l'ancienne UI glassmorphism, retirée depuis)
- Typo : serif (Georgia) pour displays éditoriaux, `Outfit` pour headlines, `Inter` pour le corps, monospace pour kickers/labels
- `stitchRadius` très peu arrondi (`DEFAULT: 2`, `full: 9999` pour pills), `stitchShadows` quasi nulles (opacité 0.04-0.06)
- `stitchComponents` : styles prêts à l'emploi (`btnPrimary`, `btnSienna`, `btnSecondary`, `btnGhost`, `btnPill*`, `inputWrapper`, `chipTag*`, `avatar`, `modalBackdrop`, `modalSheet`)

`src/ui/GlassComponents.tsx` : `Card` (tones `paper`/`ink`/`sienna`), `Pill`, `InkRule`, `IconButton`, `TopBar`, `BottomNav`. Alias compat : `GlassPanel = Card`, `GlassCard = Card`, `GlassPill = Pill`, `GlassInput = EditorialInput`.

## Tests

`mobile-api/tests/documents.test.mjs` — tests d'intégration HTTP réels (pas de mocking, pas de Jest/Vitest) contre un serveur `mobile-api` lancé (`BASE_URL` par défaut `http://localhost:3002`) :
- Nécessite `TEST_EMAIL`/`TEST_PASSWORD` sinon `smokeTests()` non authentifiés (`/api/health` → 200, `/api/mobile/documents` → 401)
- Scénario complet : sign-in → créer document → lister → récupérer avec sections → PATCH settings → ajouter section → PATCH contenu → DELETE section → DELETE document → vérifier 404
- Exécution : `node tests/documents.test.mjs`

`db-check.cjs`, `query-users.cjs` — scripts d'inspection DB ad hoc, pas des tests automatisés.

Aucun test unitaire (pas de Jest/Vitest configuré) — seulement ce test d'intégration HTTP et `tsc --noEmit`/`typecheck`.

## Conventions de code

- TypeScript strict partout, fonctions arrow exportées nommées plutôt que classes (sauf `MobileApiError extends Error`)
- Pas de state management global (Redux/Zustand) — tout l'état mobile est dans `AppShell.tsx` (useState/useEffect), qui délègue le rendu à `src/ui/screens/`
- Pas de `react-navigation` — navigation "maison" par état (`activeSection`), rendu conditionnel, `BottomNav` custom
- Pattern erreurs API : `try/catch` → `mobileErrorResponse(error)` côté serveur (mappe `MobileApiError`/`RateLimitError` → codes HTTP, sinon 500) ; côté client `Alert.alert()` avec message extrait
- Sécurité défensive systématique : limite taille payload (`MAX_BODY_BYTES`), validation `zod`, rate limiting par route + par user, transactions SQL explicites (`begin`/`commit`/`rollback`) avec `for update` pour achats/wallet (anti race condition/double achat)
- Modules "fail-safe" serveur : `databasePool`/`auth` en Proxy qui throw seulement à l'usage, jamais au build
- Analytics non bloquants : `recordPdfAnalyticsEvent` avale les erreurs (`catch {}`) — *"Analytics must never block reading, previewing or buying PDFs"*
- Messages utilisateur en français, commentaires de code en anglais
- Commits conventionnels (`feat(mobile):`, `fix(auth):`, `config(mobile-api):`, `chore:`)

## Points de vigilance (dette technique connue)

1. `documents-db.ts` dupliqué et divergent entre `admin-app` et `mobile-api` — vérifier les deux si modification du schéma `app_documents`/`app_document_sections`
2. `README.md`/`PROJECT.md` décrivent une architecture obsolète (Supabase Auth, admin-app comme gateway unique) — ne pas s'y fier, se référer à ce fichier et au code
3. `stitch_academic_hub_ia_assistant/` et `public/stitch_campus_360_admin_dashboard/` sont des maquettes statiques (HTML/PNG), pas du code applicatif
