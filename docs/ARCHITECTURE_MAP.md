# Campus 360 : cartographie du codebase

> Générée le 2026-10-13 par 4 agents d'exploration (lecture seule) + Graphify (`graphify-out/`, 6405 nœuds / 10251 arêtes / 525 communautés).
> Source de vérité = le code. `README.md`, `PROJECT.md`, `docs/PDF_*` sont obsolètes (Supabase Auth, MVP PDF-only).

## 1. Services

| Service | Dossier | Package | Port | Déploiement | Rôle |
|---|---|---|---|---|---|
| App mobile | racine (`src/`, `App.tsx`, `index.ts`) | Expo SDK ~54.0.36, RN 0.81.5, React 19 | Metro | EAS build (APK) + EAS Update (OTA, canaux `preview`/`production`) | Client étudiant |
| API mobile | `mobile-api/` | `campus-360-mobile-api`, Next ^15.5.7 | 3002 | Vercel (`api.campus360b.site`) + VPS pm2 `campus360-mobile-api` | Backend métier mobile (43 routes, aucune UI) |
| Admin + recruteur | `recruiter-web/` | `campus-360-admin`, Next ^15.5.7, Tailwind 4, Tiptap 3, Recharts | 3001 | Vercel (`admin.campus360b.site`) + VPS pm2 `campus360-recruiter-web` | Dashboard admin, portail recruteur, éditeur Tiptap, **+ doublon de ~40 routes `/api/mobile/*`** |
| Landing | `landing-site/` | `campus-360-landing`, Next 15.5.19 | 3000 | Vercel + VPS pm2 `campus360-landing-site` | Site public, inscription/connexion web |
| Legacy | `admin/` | aucun package | — | aucun | `pdf-dashboard.html` + adapter Supabase direct (clé anon). Mort. |

**`admin-app/` n'existe pas.** Le dashboard admin est `recruiter-web/`. Encore référencé (cassé) dans `.claude/launch.json`, `.mavis/plans/admin-redesign.yaml`, `metro.config.js`.

Aucun service n'appelle un autre en HTTP : les 3 Next partagent la **même base Postgres** (Supabase pooler) et chacun a sa **propre instance Better Auth** sur les mêmes tables `user`/`session`.

## 2. App mobile (`src/`, ~34 500 lignes, 58 fichiers)

- `AppShell.tsx` (2089 l.) : état global (useState), navigation par `activeSection` (`AppSection`, l.223), gardes dans `openSection()` (l.1009), éditeur plein écran via `editingDocumentId`. Flux : polices → restauration session → slider intro → `AuthScreen` → onboarding profil → shell.
- `BottomNav` (`ui/GlassComponents.tsx`) : `home`, `stages`, `documents` (Créer), `resources`, `account`.
- `features/` : `auth/betterAuth.ts` (base URL dev LAN `:3001`, `authFetch`/`authFetchRaw` Bearer + cookie), `stages/` (stagesApi 1349 l. avec seed fallback, aiMatchEngine, AiApplyModal, OfficialCvView, pdfExportService), `whatsapp/` (pairing Evolution), `wallet/` (Notch Pay MTN/Orange), `documents/` (liste + éditeur WebView + chats IA), `pdf/` (catalogue Supabase REST direct, lecteur, assistant IA), `subscriptions/plans.ts`, `onboarding/`.
- Thème `theme/stitch.ts` : **clés historiques, valeurs "Clean White & Royal Violet"** — `sienna`/`primary` = #7C3AED, `paper` = #FFFFFF, `ink` = #0F172A, `emerald` = #10B981. Nombreux hex en dur hors thème, restes de fonds sombres (#0B0F17, #111622, #090714) dans l'éditeur, la timeline, DefenseCoach, ScrapedReports. `app.json` déclare `userInterfaceStyle: "dark"` alors que l'UI est claire.
- **Code mort** : `features/home/homePriority.ts`, `ui/screens/DocumentsScreen.tsx` (doublon), `DashboardScreen` (section jamais atteinte), `PremiumSection`, `buySubscription`/`buyIaPack` (non câblés), `EXPO_PUBLIC_AI_PROXY_URL` (non lu).

## 3. mobile-api : routes (`app/api/**`)

RMU = `requireMobileUser` (`lib/mobile-access.ts`).

- **Auth/compte** : `auth/[...all]`, `health`, `mobile/account` (GET/PATCH), `mobile/auth-capabilities`, `mobile/reset-password-redirect`, `mobile/notifications/register`.
- **Documents (rédaction)** : `mobile/documents` (+ `[id]`, `sections`, `sources`, `images`, `chat`, `export/pdf` Puppeteer, `export/docx`), `documents/ai`, `ai/diagram`, `generate`, `generate-full` (300 s), `onboard-chat`, `defense-coach`, `scraped-reports` (public).
- **PDF catalogue** : `mobile/pdf/signed-url`, `pdf/stream`, `purchase/document`, `purchase/pack`, `events`, `ai/pdf-chat`.
- **Wallet/paiements** : `wallet/topup` (+ `[reference]`), `wallet/webhook` (HMAC Notch), `payments/initiate`, `payments/webhook`, `ia-packs/purchase`, `subscription/purchase`.
- **Stages** : `stages` (GET public), `stages/apply`, `stages/applications`, `stages/direct-reach`, `stages/dispatch` (POST → n8n, PATCH callback), `stages/ingest` (n8n, secret `N8N_INGESTION_SECRET`).
- **WhatsApp** : `whatsapp/instance` (POST pairing / GET statut / DELETE).

`lib/` : `auth`, `database`, `mobile-access`, `documents-db` (618 l.), `stages-db`, `subscriptions`, `document-export-policy`, `payments` (Notch Pay), `evolution-api`, `push` (Expo), `mailer` (Resend), `cloudinary`, `rate-limit`, `route-rate-limit`, `login-throttle`, `sanitize-html`, `academic-stage-template`.

## 4. Modèle économique réel

- Wallet en coins (FCFA), recharge Notch Pay (`cm.mtn`, `cm.orange`), mode mock si pas de clé.
- Abonnements **`free` / `basic` (2000) / `pro` (3500) / `elite` (5000)**, 30 j, payés en coins. Pas de `premium`. Export : free = aucun PDF, basic = PDF filigrané, pro = PDF propre, elite = + DOCX.
- `ia_credits` séparés des coins (`app_wallets.ia_credits`).
- Tarifs unitaires (`src/types.ts`) : candidature 500 (1re offerte), rapport IA 2000, mémoire IA 5000, PDF 250, recharge min 500.
- ⚠️ `contexte.md` §5.1 annonce « 100 % wallet, zéro abonnement » alors que le backend vend encore des abonnements (l'UI mobile ne les expose plus).

## 5. Base de données (aucune source de migration unique)

Sources DDL : `docs/PDF_SUPABASE.sql`, `docs/STAGES_SUPABASE.sql`, `docs/MVP_PRODUCTION_MIGRATION.sql`, `mobile-api/sql/0004_*.sql`, `recruiter-web/scripts/setup-*.mjs` / `migrate-*.mjs`, DDL au runtime (`documents-db.ts`, `rate-limit.ts`, `login-throttle.ts`), `scripts/create-scraped-reports-table.mjs`.

- **Auth** : `user`, `session`, `account`, `verification` (Better Auth), `app_users`, `app_user_push_tokens`, `app_rate_limits`, `app_login_attempts`, legacy `profiles`.
- **Wallet** : `app_wallets`, `app_wallet_transactions`, `app_subscriptions`, `app_document_purchases`, `app_pack_purchases` ; legacy `wallets`, `wallet_transactions`, `document_purchases`, `pack_purchases`, `subscription_plans`, `ia_packs` + RPC Supabase (`topup_wallet`, `purchase_*`, `consume_ia_credit`…).
- **Catalogue PDF** : `documents`, `pdf_packs`, `pdf_pack_items`, `document_events`.
- **Rédaction** : `app_documents`, `app_document_sections`, `app_document_sources`, `app_document_images`, `app_ia_usage_logs` (créée, jamais utilisée) ; legacy `app_reports`, `app_report_sections`.
- **Stages** : `stage_students` (+ colonnes WhatsApp), `stage_companies`, `stage_jobs`, `stage_applications`, `scraped_stage_reports`. Enums `company_status`, `apply_method`, `job_source`, `stage_app_status`.
- `recruiter-web/prisma/schema.prisma` : orphelin (Prisma absent des dépendances).

## 6. Intégrations externes

Notch Pay · Evolution API (`wa.blackcompany.site`) · n8n (`n8n.blackcompany.site`, 7 workflows exportés dans `scripts/n8n/`) · OpenRouter (gpt-4o-mini + fallbacks) · Gemini (scrapers Python) · Resend · Supabase Storage (buckets `documents`, `document-previews`, `cvs`) · Cloudinary · Expo Push · Google OAuth · Apify (token présent, non utilisé par mobile-api).

Scrapers Python : `scripts/agents/` (`run_scraper.py`, orchestrator, agents LinkedIn/Facebook/Apify/Cameroon jobs/OCR flyer/AI analyzer), lancés par `daily-scraper.yml` et les crons VPS.

## 7. Dette technique

1. **Duplication recruiter-web ↔ mobile-api** : ~40 routes `/api/mobile/*` et la plupart de `lib/` (`auth`, `database`, `documents-db` 387 vs 618 l., `stages-db`, `mobile-access`, `subscriptions`, `rate-limit`…) divergent. Seuls `mailer`, `document-export-policy`, `academic-stage-template` sont identiques.
2. Double déploiement Vercel + VPS sur chaque push `main` ; la cible de production canonique n'est pas documentée.
3. Docs obsolètes ; `admin-app` fantôme dans les configs.
4. Débris racine (`error-b64.txt`, `*.log`, `*.png`, `build.ps1`), `scratch/` (5 fichiers suivis), `.agents/` (370 fichiers suivis).
5. Pas de tests pour l'auth, les paiements, les stages ni les webhooks.

## 8. Constats sécurité et statuts de résolution (Module 23)

Tous les constats critiques ont été audités, durcis et validés par des tests automatisés dans le cadre du Module 23 :

1. **`PATCH /api/mobile/stages/dispatch` :** ✅ **Corrigé (Tâche 23.1)** — Authentification stricte par en-tête `x-n8n-secret` comparé à `N8N_INGESTION_SECRET`. Renvoie 404 si la candidature n'existe pas.
2. **Identités et e-mails de repli (`dispatch` POST) :** ✅ **Corrigé (Tâche 23.1 & 23.8)** — Plus aucune donnée personnelle en dur ni faux e-mail `etudiant@campus360.cm`. Profil étudiant complet requis avant dispatch. Échec n8n remonte en 502 avec statut `FAILED`.
3. **Replis `guest-student` et faux utilisateurs :** ✅ **Corrigé (Tâches 23.1, 23.8, 23.10, 23.22)** — Élimination intégrale de `guest-student`, `guest-student-001` et `student-offline`. 401 strict renvoyé sans session valide.
4. **Recharges Wallet & Webhook Notch Pay :** ✅ **Corrigé (Tâche 23.8)** — Recharges anonymes bloquées (401). Signature HMAC obligatoire vérifiée dans `payments/webhook` et `wallet/webhook`.
5. **CORS & Origines de confiance :** ✅ **Corrigé (Tâche 23.11)** — `lib/origins.ts` centralise la liste blanche stricte. Refus des domaines tiers Vercel non configurés. Fin du reflet aveugle d'Origin avec credentials.
6. **Rate limit et jetons en URL :** ✅ **Corrigé (Tâche 23.11)** — Mode fail-closed en cas de panne BDD pour les routes critiques. Interdiction absolue de l'authentification par paramètre d'URL `?token=`.
7. **Doublon d'API `recruiter-web` :** ✅ **Corrigé (Tâche 23.22)** — Suppression intégrale des 25 routes `/api/mobile/*` et de `/api/ai/*` dans `recruiter-web`. Routage unifié vers `mobile-api` via `baseUrlFor(path)`.
8. **Nettoyage des fichiers et journaux :** ✅ **Corrigé (Tâche 23.23)** — 31 fichiers temporaires (logs, PNGs de debug, cache Python, scratch) retirés du suivi git sans perte de données.
9. **Sauvegardes et rollbacks automatisés :** ✅ **Corrigé (Tâche 23.21)** — `scripts/backup-db.sh`, `scripts/backup-uploads.sh`, et rollback automatique dans `scripts/deploy-vps.sh` avec guide opérationnel dans `docs/deploy/OPERATIONS.md`.
