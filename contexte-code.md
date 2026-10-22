# Contexte de code : Campus 360







> **Fichier pivot n°1.** Carte intelligente du code, lue en premier par tous les skills de développement (`/brainstorming` sur un projet existant, `/plan-task`, `/plan-detail`, `/execute`, `/test-and-verify`, `/cybersec`, `/vps-deploy`, `/apex`, `/oneshot`).



> **Écrit par :** `/code-analyzer-context`. **Mis à jour par :** chaque skill, en dernière étape, pour ce qu'il a changé ou appris.



> **Dernière mise à jour :** 2026-10-20 — **Commit analysé :** `fcd08ed` sur `main` (scan complet, Mode 1, vérifié contre le code).







## 0. Mode d'emploi



- Lire le **sommaire**, puis seulement les sections utiles à la tâche.



- Chaque fichier cité a son rôle en une ligne : ouvrir **uniquement** les fichiers désignés, pour vérifier ou modifier.



- Une information absente ou fausse ici : la corriger ici en fin de tâche et l'ajouter au journal (§13).



- Règle d'or : ne pas lire de code à l'aveugle sans consulter cette carte et `graphify-out/GRAPH_REPORT.md`.







## Sommaire



1. Identité et services · 2. Commandes vérifiées · 3. Carte des zones fonctionnelles · 4. Flux principaux · 5. Données (tables, migrations) · 6. Index des routes API · 7. Conventions et garde-fous · 8. Fichiers jumeaux et copies divergentes · 9. Variables d'environnement · 10. Pièges connus et dette · 11. Sécurité · 12. Déploiement et vérifications · 13. Journal des mises à jour







---







## 1. Identité et services



| Service | Dossier | Rôle | Dev (port) | Prod (URL / hôte) |



|---|---|---|---|---|



| **Application mobile** | `src/` (racine) | App Expo / React Native pour étudiants (stages, CV officiel, documents IA, wallet, PDF) | `npm run start` (8081) | EAS / APK Android (`landing-site/public/downloads/campus-360.apk`) |



| **Backend API mobile** | `mobile-api/` | Next.js 15 App Router : Better Auth, Postgres direct, IA OpenRouter, paiements NotchPay, WhatsApp Evolution API | 3002 | `https://api.campus360b.site` (VPS) |



| **Portail admin / recruteur** | `recruiter-web/` | Next.js 15 : tableau de bord admin, catalogue PDF, packs, stages, et **copies** des routes `/api/mobile/*` | 3001 | `https://admin.campus360b.site` (VPS) |



| **Site vitrine** | `landing-site/` | Next.js 15, Better Auth propre, formulaire de contact, téléchargement APK | 3000 | `https://campus360b.site` (VPS) |



| **Agents de scraping** | `scripts/agents/` | Python : collecte d'offres et rapports, pipeline 4 agents, ingestion Postgres (voir §3.7) | — | lancés à la main ou par planificateur (voir §12) |



| **Automatisations n8n** | `scripts/n8n/` | Workflows d'envoi des candidatures (WhatsApp + e-mail PDF) | 5678 | `https://n8n.blackcompany.site` (Docker VPS) |



| **Evolution API** | externe / Docker | Passerelle WhatsApp multi-instances | 8081 | `https://wa.blackcompany.site` (Docker VPS) |







- **Stack :** React Native 0.81.5, Expo SDK 54, React 19, Next.js 15, TypeScript 5.9, Better Auth, PostgreSQL (`pg`), Python 3.12 (scraping).



- **Cadrage produit :** `contexte.md`. **Plan :** `plan.md`. **Graphe :** `graphify-out/GRAPH_REPORT.md` (non vérifié dans ce scan).







---







## 2. Commandes vérifiées



Lancées le 2026-10-20 sur `main` (`fcd08ed`) :







| But | Dossier | Commande | Résultat |



|---|---|---|---|



| Typecheck app | racine | `npx tsc --noEmit` | 🟢 code 0 |



| Typecheck mobile-api | `mobile-api/` | `npx tsc --noEmit` | 🟢 code 0 |



| Typecheck recruiter-web | `recruiter-web/` | `npx tsc --noEmit` | 🟢 code 0 |



| Typecheck landing-site | `landing-site/` | `npx tsc --noEmit` | 🟢 code 0 |



| Tests mobile-api | `mobile-api/` | `npm test` | 🟢 130 réussis, 0 échec, 10 ignorés (serveur ou clé IA absents) — 2026-10-20 |



| Couleurs en dur | racine | `npm run lint:colors` | 🟢 192 (base 192) |



| Tests Python scraping | `scripts/agents/` | `PYTHONUTF8=1 python -m unittest discover -s tests -p "test_*.py"` | 🟢 56 tests OK, sans réseau ni base (2026-10-20, module 25) ; appels réels : `python tests/test_llm_agents.py --live` |



| Test M1 tokens | racine | `node scripts/test-m1-tokens.mjs` | 🟢 7 suites réussies |



| Test adversarial M3 | racine | `node scripts/test-challenger-m3-adversarial.mjs` | 🟢 83/83 (2026-10-20, tâche 25.4) |







Santé production : non revérifiée dans ce scan (voir §12).







---







## 3. Carte des zones fonctionnelles







### 3.1 Authentification & sessions



- **But :** comptes étudiants et admin (Better Auth), vérification d'e-mail, sessions, protection contre la force brute.



- **Fichiers clés :**



  - `mobile-api/lib/auth.ts` — config Better Auth : plugins, origines de confiance (`trustedOriginList`), vérification d'e-mail obligatoire en production, throttle de connexion.



  - `mobile-api/lib/origins.ts` — **liste exacte** des origines de confiance (`isTrustedOrigin`, `trustedOriginList`), sans joker. Utilisée par `middleware.ts`, `mobile-access.ts` et `auth.ts`.



  - `mobile-api/lib/mobile-access.ts` — `requireMobileUser()` : session par cookie ou `Authorization: Bearer` uniquement (plus de `?token=` ni de session par identifiant interne). `ensureMobileUser()` : rattachement à `app_users`, données legacy seulement si e-mail vérifié, conflit d'e-mail → 409.



  - `mobile-api/lib/login-throttle.ts` — anti-force brute sur connexion (clé e-mail + IP du client).



  - `mobile-api/lib/client-ip.ts` — IP du client : `x-forwarded-for` (dernière entrée) **seulement** si `TRUST_PROXY=true`, sinon `unknown`.



  - `mobile-api/middleware.ts` — CORS et en-têtes de sécurité sur `/api/*` et `/auth/*`, via `isTrustedOrigin`.



  - `src/features/auth/betterAuth.ts` — client Better Auth côté app, gestion `EMAIL_NOT_VERIFIED`.



  - `src/ui/screens/AuthScreen.tsx` — connexion, inscription, vérification par code à 6 chiffres.



  - `recruiter-web/lib/auth.ts` — Better Auth admin (vérification e-mail obligatoire en production, origines via `origins.ts`).



  - `landing-site/lib/auth.ts` — Better Auth du site vitrine (vérification e-mail désactivée : aucun envoi d'e-mail sur ce site).



- **Routes :** `/api/auth/[...all]`, `/api/mobile/account`, `/api/mobile/auth-capabilities`, `/api/mobile/reset-password-redirect`.



- **Tables :** `user`, `session`, `account`, `verification` (Better Auth) ; `app_users`, `app_login_attempts`, `app_rate_limits`.







### 3.2 Stages : offres, candidatures et envoi



- **But :** offres de stage, matching, CV officiel, candidature en un clic (WhatsApp / e-mail), suivi.



- **Fichiers clés :**



  - `src/ui/screens/StagesScreen.tsx` — liste des offres, erreur réessayable, contacts désactivés si absents.



  - `src/features/stages/AiApplyModal.tsx` — candidature assistée, CV au gabarit officiel, lettre.



  - `src/features/stages/stagesApi.ts` — client stages ; plus de données de démonstration (23.2).



  - `src/features/stages/applicationsCache.ts` — purge des candidatures fictives, budget de stockage sécurisé.



  - `src/features/stages/contactTargets.ts` — résolution des contacts entreprise (aucune valeur en dur).



  - `src/features/stages/cvHtml.ts` — génération HTML du CV, échappement, `[à compléter]` pour les champs manquants.



  - `src/features/stages/aiMatchEngine.ts` — calcul du score de compatibilité.



  - `src/features/stages/addedAt.ts` — `formatAddedAgo(createdAtIso, now)` : « Ajouté il y a … » puis date absolue en heure du Cameroun au-delà de 7 jours ; affiché sur la carte d'offre (`StagesScreen.tsx`).



  - `mobile-api/lib/stages-db.ts` — `listStageJobs`, `getStageJob` (null si id invalide ou inconnu), candidatures, dispatch. Plus de repli fictif (23.1).



  - `mobile-api/lib/stages-errors.ts` — `stageErrorStatus`, réexporte `isDatabaseUnavailable`.



  - `mobile-api/lib/dispatch-target.ts` — destinataire d'une candidature (e-mail ou WhatsApp), 422 si absent.



  - `mobile-api/lib/evolution-api.ts` — WhatsApp Evolution : jumelage, pas de code généré en local (23.6).



  - `mobile-api/lib/whatsapp-target.ts` — résolution de cible (`resolveWhatsAppTarget`), contrôle de propriété d'instance (`isOwnInstance`), normalisation de numéro (`normalizeTargetPhone`) (23.7).



  - `scripts/n8n/send_stage_application_workflow.json` — workflow n8n d'envoi WhatsApp et e-mail avec PDF.



- **Routes :** §6 (`/api/mobile/stages*`, `/api/mobile/whatsapp/instance`).



- **Tables :** `stage_jobs`, `stage_companies`, `stage_students`, `stage_applications` (statut `stage_app_status`), `stage_job_rejections` (migration 0005).







### 3.3 Documents académiques : rédaction, IA, export



- **But :** rapport de stage, mémoire, CV, lettre ; sections, sources, fichiers, export PDF et DOCX ; coach de soutenance.



- **Fichiers clés :**



  - `src/features/documents/DocumentEditorScreen.tsx` — éditeur WYSIWYG, plan interactif.



  - `src/features/documents/DocumentsScreen.tsx` — liste des documents, prix affichés via `freeLabel()`.



  - `src/features/documents/DocumentStylePanel.tsx` — réglages de style (police, interligne, marges).



  - `src/features/documents/SectionInterview.tsx`, `documentFilesApi.ts`, `aiHtml.ts` — entretien de section, fichiers, nettoyage HTML côté app.



  - `mobile-api/lib/documents-db.ts` — CRUD documents et sections (copie divergente dans `recruiter-web`, §8).



  - `mobile-api/lib/document-pdf.ts`, `document-docx.ts`, `pdf-render.ts` — rendus PDF (Puppeteer) et DOCX.



  - `mobile-api/lib/document-files-db.ts`, `file-storage.ts`, `file-signing.ts`, `file-urls.ts`, `file-validation.ts` — fichiers joints, URL signées.



  - `mobile-api/lib/source-extraction.ts`, `chunking.ts`, `safe-fetch.ts` — sources documentaires, découpage, récupération d'URL protégée.



  - `mobile-api/lib/interview.ts` — entretien de section et coach.



  - `mobile-api/lib/writing-rules.ts`, `document-numbering.ts`, `document-style-schema.ts`, `editor-html.ts`, `html-text.ts`, `academic-stage-template.ts` — règles d'écriture, gabarits, schéma de style.



  - `mobile-api/lib/sanitize-html.ts` — assainissement HTML (liste blanche de balises). Appelée par les routes d'entretien, pas encore par toutes les routes IA (voir §10).



  - `mobile-api/lib/llm.ts` — client IA OpenRouter.



- **Routes :** §6 (`/api/mobile/documents*`).



- **Tables :** `app_documents`, `app_document_sections`, `app_document_files`, `app_document_sources`, `app_document_chunks`, `app_document_images`, `app_document_purchases`.







### 3.4 Monétisation, wallet et mode gratuit de lancement



- **But :** portefeuille en coins (1 coin = 1 FCFA), achats PDF et packs, crédits IA, recharge Mobile Money (**Nyole** en passerelle principale, repli legacy NotchPay), mode gratuit de lancement.



- **Fichiers clés :**



  - `mobile-api/lib/free-launch.ts` — **source de vérité** du mode gratuit, copie identique dans `recruiter-web/lib/free-launch.ts` (test de parité). Exporte `resolveFreeLaunch` (lève une erreur en production si `FREE_LAUNCH_MODE` n'est pas `true`/`false`, ou si `true` sans `FREE_LAUNCH_UNTIL`), `isFreeLaunch`, `freeLaunchState`, `resolveStartingCoins` (défaut 3000), `resolveAiCost` / `aiCost` (0 pendant le gratuit ; 1 passage, 2 CV ou lettre, 3 document complet après).



  - `src/config/launch.ts` — état gratuit côté app (désactivé par défaut, réglé par `setFreeLaunch` depuis `/api/mobile/account`), `freeLabel()`.



  - `mobile-api/lib/payment-rules.ts` — règles pures de paiement : `verifyNyoleSignature` (validation HMAC-SHA256 sur `${timestamp}.${rawBody}` via `X-Afriflow-Signature` + `X-Afriflow-Timestamp`, fenêtre anti-rejeu 300s, `timingSafeEqual`), `verifyNotchSignature` (repli legacy), `decideWebhookCredit` et `isMockAllowed`.

  - `mobile-api/lib/payments.ts` — initiation Nyole (`POST /v1/checkout/sessions` + push Mobile Money `POST /checkout/initiate` pour `MTN_MOMO_CMR` / `ORANGE_CMR`) et traitement transactionnel atomique du webhook (`processNyoleWebhook` / `processNotchWebhook`).



  - `mobile-api/lib/db-errors.ts` — détection de base indisponible.



  - `mobile-api/lib/rate-limit.ts`, `route-rate-limit.ts` — limiteur PostgreSQL ; `failMode: 'closed'` pour les seaux `ai-`, `payments-`, `purchase-`, `wallet-`, `whatsapp-`.



  - `src/features/wallet/PaymentModal.tsx`, `walletApi.ts`, `paymentStatus.ts` — recharge avec suivi réel (polling 3 s, 20 essais sur `/v1/checkout/sessions/{id}/status`) et lien direct vers la page de paiement hébergée Nyole (`paymentUrl`).



  - `mobile-api/lib/mobile-access.ts` — solde de départ via `resolveStartingCoins`.



- **Routes :** `/api/mobile/wallet/topup`, `/api/mobile/wallet/topup/[reference]`, `/api/mobile/wallet/webhook`, `/api/mobile/payments/initiate`, `/api/mobile/payments/webhook`, `/api/mobile/purchase/document`, `/api/mobile/purchase/pack`, `/api/mobile/ia-packs/purchase`.



- **Tables :** `app_wallets`, `app_wallet_transactions`, `app_pack_purchases`, `app_document_purchases`, `app_ia_usage_logs`.



- **À savoir :** en production, sans `FREE_LAUNCH_MODE` explicite, le serveur refuse les appels IA et d'achat (erreur levée à l'usage, pas au démarrage).







### 3.5 Portail recruteur et admin (`recruiter-web/`)



- **But :** tableau de bord admin : analytics, candidatures, entreprises, paiements, stages, utilisateurs, catalogue PDF et packs.



- **Fichiers clés :**



  - `recruiter-web/app/admin/analytics/AnalyticsDashboard.tsx` — graphiques Recharts.



  - `recruiter-web/app/admin/{overview,users,payments,stages,companies,applications}` — pages d'administration.



  - `recruiter-web/lib/auth.ts`, `mobile-access.ts`, `access.ts` — authentification admin, rôles, solde de départ.



  - `recruiter-web/lib/supabase-pdf.ts`, `course-db.ts` — catalogue PDF et stockage.



- **Routes :** §6 (`/api/admin/*` pour l'administration, `/api/mobile/*` en copie, `/api/pdf/*`, `/api/packs/*`).



- **Attention :** `recruiter-web` n'a pas les routes `stages/ingest`, `stages/dispatch`, `stages/review`, `stages/direct-reach`, `whatsapp/instance`, `documents/scraped-reports`. Les routes stages existantes sont des copies divergentes (§8).







### 3.6 Landing site et distribution



- **But :** vitrine, formulaire de contact, téléchargement APK, inscription.



- **Fichiers clés :**



  - `landing-site/app/page.tsx` — accueil ; pages `tarifs`, `fonctionnalites`, `inscription`, `telecharger`, `contact`, `aide`, `a-propos`, `blog`.



  - `landing-site/app/api/contact/route.ts` — formulaire de contact (Resend).



  - `landing-site/lib/auth.ts`, `db.ts` — Better Auth et pool Postgres (`DATABASE_SSL_REJECT_UNAUTHORIZED`).



  - `landing-site/public/downloads/campus-360.apk` — binaire Android distribué.







### 3.7 Agents de scraping (`scripts/agents/`)



- **But :** collecter des offres de stage et rapports de stage (Cameroun, LinkedIn, Facebook, TikTok, web académique), les analyser et les enregistrer dans Postgres (`stage_jobs`, `scraped_stage_reports`).



- **Point d'entrée :** `run_scraper.py` (CLI : `--live` pour les sources payantes, `--dry-run`, `--no-db`, `--from-fixture`, `--offline-llm`) ; `evaluate_pipeline.py` (mesure sur le jeu étiqueté, hors git) ; `orchestrator.py` (`ScraperOrchestrator.run_full_pipeline`) ; `daily_scheduler.py` (démon unique : fenêtre 10 h à 12 h heure du Cameroun, une fois par jour, close au plafond).



- **Collecte :** `cameroon_jobs_agent.py`, `linkedin_agent.py`, `facebook_agent.py`, `web_academic_agent.py`, `apify_agent.py` (LinkedIn, Facebook, TikTok via Apify si `APIFY_API_TOKEN` présent), `ocr_flyer_agent.py` (lecture de flyers).



- **LinkedIn via Treg :** `treg_linkedin_agent.py` (`TregLinkedInAgent.search_jobs(query, kind)`) : stages = `employmentType: internship` + Cameroun, emplois = Cameroun ; transport HTTP `https://treg.to/call/anyapi.linkedin.search.jobs` (`X-Treg-Token`, plafond `X-Treg-Route-Max-Cost`) ou CLI `treg --json call` (VPS) ; rien sans `live`, plafond d'appels par passage, arrêt sur 429, offres hors Cameroun écartées. Ordre dans l'orchestrateur : Treg → Apify → repli RSS (`linkedin_agent.py`).



- **Plafond, expiration, journal :** `daily_cap.py` (jour camerounais) ; `JobStore.count_added_today`, `expire_due_offers`, `start_run` / `finish_run` (table `stage_scrape_runs`, migration 0014) ; plafond `config.DAILY_OFFER_CAP` (20) vérifié **avant** la collecte et offre par offre. Ces appels n'interrompent jamais un passage.



- **Pipeline d'offre (4 agents, `offer_pipeline.py`) :** `filter_agent.py` (règles déterministes, sans IA) → `classifier_agent.py` (stage / emploi / concours / formation / bruit) → `extractor_agent.py` (champs avec preuves) → `verifier_agent.py` (décision finale). Si le LLM est indisponible, l'offre passe en `deferred` (aucune supposition). Un item avec `kind_hint` (source structurée, LinkedIn) passe par `structured_evaluation` : type donné par la source, champs recopiés, **sans appel d'IA**, puis vérificateur.



- **Documents académiques :** `ai_analyzer_agent.py` puis `database_ingestor.py` (`save_stage_report`).



- **Persistance :** `job_store.py` (psycopg2 direct) pour les offres et les rejets ; `database_ingestor.py` pour les rapports.



- **Autres :** `company_direct_reach_agent.py`, `defense_coach_agent.py`, `in_app_push_notifier_agent.py` (notifications sur chaque offre publiée), `reprocess_existing.py` (relance du pipeline sur `stage_jobs`), `llm_client.py` (client LLM unique).



- **Tests :** `scripts/agents/tests/` — `test_filter.py`, `test_verifier.py`, `test_llm_agents.py` : **aucune fonction `test_` détectée**, donc non exécutés. Le classifieur et l'extracteur n'ont pas de test.







---







## 4. Flux principaux







### Flux 1 : Inscription et profil étudiant



1. Écran `AuthScreen.tsx` → `src/features/auth/betterAuth.ts` (inscription e-mail et mot de passe).



2. `POST /api/auth/sign-up/email` (Better Auth, `mobile-api/app/api/auth/[...all]`) → code à 6 chiffres par e-mail si `RESEND_API_KEY` est défini.



3. Premier accès à `/api/mobile/account` → `mobile-access.ts:ensureMobileUser` (rattachement `app_users`, solde de départ).



4. Profil étudiant synchronisé dans `stage_students` (`stages-db.ts:ensureStageStudent`).







### Flux 2 : Candidature stage en un clic



1. `StagesScreen.tsx` → `[Postuler]` → `AiApplyModal.tsx` (CV officiel via `cvHtml.ts`, lettre).



2. Vérification du solde : `resolveAiCost` / `isFreeLaunch` (côté serveur) et `src/config/launch.ts` (côté app).



3. `POST /api/mobile/stages/apply` puis `POST /api/mobile/stages/dispatch` → `dispatch-target.ts` (destinataire ; 422 si absent).



4. Envoi via n8n (`scripts/n8n/send_stage_application_workflow.json`) : WhatsApp (Evolution API) et e-mail avec PDF.







### Flux 3 : Document académique assisté



1. `DocumentsScreen.tsx` → nouveau rapport ou mémoire → `POST /api/mobile/documents/generate-full`.



2. Plan en chapitres, sections générées (`documents-db.ts`, `TEMPLATE_SECTIONS`).



3. Édition dans `DocumentEditorScreen.tsx`, entretien de section (`interview.ts`).



4. Export `GET /api/mobile/documents/[id]/export/pdf` (Puppeteer) ou `/export/docx`.







### Flux 4 : Offre scrapée jusqu'à la base



1. `run_scraper.py` ou `daily_scheduler.py` → `orchestrator.py` (collecte).



2. `offer_pipeline.py` : filtre → classifieur → extracteur → vérificateur.



3. `job_store.py` écrit `stage_jobs` (publié, en attente de relecture, rejeté ou différé).



4. Publication → `in_app_push_notifier_agent.py` (notification).



5. Les offres de n8n arrivent aussi par `POST /api/mobile/stages/ingest` (secret `X-N8N-API-KEY`).







---







## 5. Données







- **Client SQL :** `pg` (pool) dans `mobile-api/lib/database.ts` ; TLS dans `lib/db-ssl.ts` (vérifié en production, dérogation explicite `DATABASE_SSL_REJECT_UNAUTHORIZED=false`, certificat `DATABASE_SSL_CA_FILE`). Scraping : psycopg2 (`job_store.py`).



- **Base partagée :** une seule base Postgres (Supabase) pour `mobile-api`, `recruiter-web` et les agents. Ne jamais appliquer de migration sans accord explicite.







### Tables clés



| Table | Rôle | Écrite par |



|---|---|---|



| `app_users` | Profil applicatif lié à Better Auth | `mobile-access.ts:ensureMobileUser` |



| `app_wallets`, `app_wallet_transactions` | Solde et historique en coins | `free-launch.ts` (solde de départ), `payments.ts`, `wallet/*` |



| `app_document_purchases`, `app_pack_purchases` | Achats PDF et packs | `purchase/*` |



| `app_ia_usage_logs` | Coût des appels IA | routes `documents/*` |



| `app_documents`, `app_document_sections` | Rapports et mémoires, chapitres en HTML | `documents-db.ts` |



| `app_document_files`, `app_document_sources`, `app_document_chunks`, `app_document_images` | Fichiers joints, sources, découpage, images | `document-files-db.ts`, `source-extraction.ts` |



| `app_user_push_tokens` | Jetons de notification | `notifications/register` |



| `app_login_attempts`, `app_rate_limits` | Anti-force brute et limiteur | `login-throttle.ts`, `rate-limit.ts` |



| `stage_jobs` | Offres de stage (statut, type `kind`) | `stages-db.ts`, `job_store.py`, `stages/ingest` |



| `stage_companies` | Entreprises | `stages-db.ts` |



| `stage_students` | Profils étudiants pour les stages | `stages-db.ts` |



| `stage_applications` | Candidatures (statut `stage_app_status`) | `stages/apply`, `stages/dispatch` |



| `stage_job_rejections` | Journal des offres rejetées par le pipeline | `job_store.py` |



| `scraped_stage_reports` | Rapports scrapés (fichier, sans statut de relecture pour l'instant) | `database_ingestor.py` |



| `user`, `session`, `account`, `verification` | Better Auth | Better Auth |







### Migrations



- **Présentes :** `mobile-api/sql/0004_add_document_editor_columns.sql`, `0005_stage_jobs_quality.sql`, `0006_document_files.sql`, `0007_document_style.sql`, `0008_section_interviews.sql`.



- **Appliquées sur Supabase :** `0009_document_kind.sql` (`kind`, `always_free` sur `documents`), `0010_wallet_transactions_hardening.sql` (`pack_type`, contraintes CHECK, index unique `reference_id`), `0011_scraped_reports_status.sql` (`WITHDRAWN` sur `stage_app_status`, `status` sur `scraped_stage_reports`), `0012_account_deletion.sql` (anonymisation transactions, FK `ON DELETE SET NULL`, journal `app_account_deletions`).

- **Écrite, non appliquée :** `0014_scrape_runs_and_expiry.sql` (module 25 : `stage_scrape_runs`, statut `expired`, index `created_at`). Accord requis avant application sur la base partagée.

- **Prochaines migrations prévues :** `0013_account_deletion_trigger.sql` (ou archivage réservé).

---







## 6. Index des routes API







### `mobile-api` (`app/api/`)



Méthodes relevées dans le code. Toutes les routes `mobile/*` exigent une session sauf mention contraire (vérification dans la route, via `requireMobileUser`).







| Méthodes | Chemin | Fichier (à partir de `mobile-api/app/api/`) | Auth |



|---|---|---|---|



| GET | `/api/health` | `health/route.ts` | Non (503 si base injoignable) |



| GET, POST | `/api/auth/*` | `auth/[...all]/route.ts` | Better Auth |



| GET | `/api/files/[fileId]` | `files/[fileId]/route.ts` | Signature de fichier |



| POST | `/api/ai/pdf-chat` | `ai/pdf-chat/route.ts` | Oui |



| GET, PATCH | `/api/mobile/account` | `mobile/account/route.ts` | Oui |



| GET | `/api/mobile/auth-capabilities` | `mobile/auth-capabilities/route.ts` | Non |



| GET | `/api/mobile/reset-password-redirect` | `mobile/reset-password-redirect/route.ts` | Non |



| POST | `/api/mobile/onboarding/complete` | `mobile/onboarding/complete/route.ts` | Oui |



| POST | `/api/mobile/events` | `mobile/events/route.ts` | Oui (analytics non bloquant) |



| POST | `/api/mobile/notifications/register` | `mobile/notifications/register/route.ts` | Oui |



| GET, POST | `/api/mobile/documents` | `mobile/documents/route.ts` | Oui |



| GET, PATCH, DELETE | `/api/mobile/documents/[id]` | `mobile/documents/[id]/route.ts` | Oui |



| POST | `/api/mobile/documents/generate` | `mobile/documents/generate/route.ts` | Oui (coût `aiCost('careerDoc')`) |



| POST | `/api/mobile/documents/generate-full` | `mobile/documents/generate-full/route.ts` | Oui (coût `aiCost('fullDoc')`) |



| POST | `/api/mobile/documents/ai` | `mobile/documents/ai/route.ts` | Oui |



| POST | `/api/mobile/documents/ai/diagram` | `mobile/documents/ai/diagram/route.ts` | Oui |



| POST | `/api/mobile/documents/onboard-chat` | `mobile/documents/onboard-chat/route.ts` | Oui |



| POST | `/api/mobile/documents/defense-coach` | `mobile/documents/defense-coach/route.ts` | Oui |



| GET | `/api/mobile/documents/scraped-reports` | `mobile/documents/scraped-reports/route.ts` | Oui (voir §10 : pas encore durci) |



| POST, PATCH | `/api/mobile/documents/[id]/sections` | `mobile/documents/[id]/sections/route.ts` | Oui |



| PATCH, DELETE | `/api/mobile/documents/[id]/sections/[sectionId]` | `…/sections/[sectionId]/route.ts` | Oui |



| GET, POST, PUT | `/api/mobile/documents/[id]/sections/[sectionId]/interview` | `…/interview/route.ts` | Oui |



| POST | `/api/mobile/documents/[id]/chat` | `mobile/documents/[id]/chat/route.ts` | Oui |



| GET, POST | `/api/mobile/documents/[id]/sources` | `mobile/documents/[id]/sources/route.ts` | Oui |



| DELETE | `/api/mobile/documents/[id]/sources/[sourceId]` | `…/sources/[sourceId]/route.ts` | Oui |



| GET, POST, DELETE | `/api/mobile/documents/[id]/files` | `mobile/documents/[id]/files/route.ts` | Oui |



| GET, POST, PATCH, DELETE | `/api/mobile/documents/[id]/images` | `mobile/documents/[id]/images/route.ts` | Oui |



| GET | `/api/mobile/documents/[id]/export/pdf` | `mobile/documents/[id]/export/pdf/route.ts` | Oui |



| GET, POST | `/api/mobile/documents/[id]/export/docx` | `mobile/documents/[id]/export/docx/route.ts` | Oui |



| POST | `/api/mobile/files/sign` | `mobile/files/sign/route.ts` | Oui |



| GET | `/api/mobile/files/[fileId]/url` | `mobile/files/[fileId]/url/route.ts` | Oui |



| POST | `/api/mobile/pdf/signed-url` | `mobile/pdf/signed-url/route.ts` | Oui |



| GET | `/api/mobile/pdf/stream` | `mobile/pdf/stream/route.ts` | Oui (signature) |



| POST | `/api/mobile/purchase/document` | `mobile/purchase/document/route.ts` | Oui (prix 0 pendant le gratuit) |



| POST | `/api/mobile/purchase/pack` | `mobile/purchase/pack/route.ts` | Oui (prix 0 pendant le gratuit) |



| POST | `/api/mobile/ia-packs/purchase` | `mobile/ia-packs/purchase/route.ts` | Oui |



| GET, POST | `/api/mobile/wallet/topup` | `mobile/wallet/topup/route.ts` | Oui |



| GET | `/api/mobile/wallet/topup/[reference]` | `mobile/wallet/topup/[reference]/route.ts` | Oui |



| POST | `/api/mobile/wallet/webhook` | `mobile/wallet/webhook/route.ts` | Signature |



| POST | `/api/mobile/payments/initiate` | `mobile/payments/initiate/route.ts` | Oui |



| POST | `/api/mobile/payments/webhook` | `mobile/payments/webhook/route.ts` | Signature HMAC |



| GET | `/api/mobile/stages` | `mobile/stages/route.ts` | Non |



| POST | `/api/mobile/stages/ingest` | `mobile/stages/ingest/route.ts` | Secret `X-N8N-API-KEY` |



| POST | `/api/mobile/stages/apply` | `mobile/stages/apply/route.ts` | Oui |



| POST | `/api/mobile/stages/direct-reach` | `mobile/stages/direct-reach/route.ts` | Oui (voir §10 : pas encore de contrôle de statut de l'offre) |



| PATCH, POST | `/api/mobile/stages/dispatch` | `mobile/stages/dispatch/route.ts` | Oui |



| GET, PATCH | `/api/mobile/stages/applications` | `mobile/stages/applications/route.ts` | Oui |



| GET, POST | `/api/mobile/stages/review` | `mobile/stages/review/route.ts` | Secret `STAGES_REVIEW_SECRET` |



| GET, POST, DELETE | `/api/mobile/whatsapp/instance` | `mobile/whatsapp/instance/route.ts` | Oui (session obligatoire sans repli, rate limit fail-closed, cible profil) |







### `recruiter-web` (`app/api/`, 45 routes)



- **Admin :** `admin/analytics`, `admin/applications`, `admin/companies`, `admin/overview`, `admin/payments`, `admin/stages`, `admin/users`.



- **Catalogue PDF :** `pdf`, `pdf/[id]`, `pdf/[id]/analyze`, `pdf/[id]/price`, `pdf/[id]/status`, `packs`, `packs/[id]`, `packs/[id]/status`.



- **Auth et santé :** `auth/[...all]`, `auth/diagnostic`, `bootstrap-admin`, `health`.



- **Copies de `mobile/*` :** `account`, `auth-capabilities`, `documents*`, `events`, `ia-packs/purchase`, `pdf/*`, `purchase/*`, `stages`, `stages/applications`, `stages/apply`, `wallet/topup*`, `ai/pdf-chat`. Ces copies divergent de `mobile-api` (§8).







---







## 7. Conventions et garde-fous







- **Langue :** interface en français, commentaires de code en anglais, messages d'erreur utilisateur en français.



- **Design :** palette et jetons dans `src/theme/stitch.ts` ; pas de couleur en dur hors fichiers listés dans `scripts/check-hardcoded-colors.mjs` (base 192, `npm run lint:colors`).



- **Validation :** schémas Zod sur les corps de requête ; taille de corps limitée.



- **Erreurs :** `mobileErrorResponse` côté serveur ; base indisponible → 503, jamais de faux succès.



- **Pas de données inventées :** aucun repli fictif (personne, entreprise, numéro, prix, document). Les champs absents sont vides ou marqués `[à compléter]`.



- **Modules tolérants au build :** `database.ts` et `auth.ts` lèvent une erreur seulement à l'usage, jamais au chargement (le build Next.js ne doit pas dépendre des variables d'environnement).



- **Coût IA et prix :** toujours évalués **à chaque requête** (`aiCost(...)`, `isFreeLaunch()`), jamais à l'import.



- **Origines :** liste exacte dans `origins.ts`, aucun joker. Un domaine de prévisualisation passe par `TRUSTED_EXTRA_ORIGINS`.



- **Commits :** conventionnels (`feat(...)`, `fix(...)`, `docs(...)`, `merge:`).







---







## 8. Fichiers jumeaux et copies divergentes







| Fichier A | Fichier B | Règle |



|---|---|---|



| `mobile-api/lib/free-launch.ts` | `recruiter-web/lib/free-launch.ts` | **Identiques.** Test de parité : `mobile-api/tests/free-launch.test.mjs`. Modifier les deux. |



| `mobile-api/lib/origins.ts` | `recruiter-web/lib/origins.ts` | **Identiques.** Test : `sessions-origins.test.mjs`. |



| `mobile-api/lib/client-ip.ts` | `recruiter-web/lib/client-ip.ts` | **Identiques.** Test : `sessions-origins.test.mjs`. |



| `mobile-api/lib/db-ssl.ts` | `recruiter-web/lib/db-ssl.ts` | **Identiques.** Test : `sessions-origins.test.mjs`. |



| `mobile-api/lib/documents-db.ts` | (Supprimé) | **Unique.** La copie recruiter-web a été supprimée en 23.22. |



| `mobile-api/app/api/mobile/*` | (Supprimé) | **Unique.** Toutes les routes mobiles de recruiter-web ont été supprimées en 23.22. |



| `mobile-api/lib/auth.ts` | `recruiter-web/lib/auth.ts` | Origines et vérification e-mail alignées sur `origins.ts`. Le reste diffère. |



| `mobile-api/lib/mobile-access.ts` | (Supprimé) | **Unique.** La copie recruiter-web a été supprimée en 23.22. |



| `src/theme/stitch.ts` | `recruiter-web/app/globals.css` | Les jetons de couleur doivent être identiques. |



| `src/features/stages/cvHtml.ts` | `mobile-api/lib/...` (aucun) | Un seul CV officiel côté app. Pas de copie serveur. |







---







## 9. Variables d'environnement



*(Noms uniquement. Aucune valeur n'est écrite ici, conformément à `.skills/environments.md`.)*







### `mobile-api`



| Variable | Rôle | Obligatoire en prod | Comportement si absente |



|---|---|---|---|



| `DATABASE_URL` | Connexion Postgres | Oui | Erreur levée à l'usage |



| `BETTER_AUTH_SECRET` | Secret des sessions | Oui | Refus au démarrage si placeholder |



| `BETTER_AUTH_URL` | URL publique de Better Auth | Oui | Détection depuis l'environnement |



| `EXPO_APP_ORIGIN` | Origine de l'app | Non | Ignorée |



| `TRUSTED_EXTRA_ORIGINS` | Origines web supplémentaires exactes, séparées par des virgules | Non | Seules les origines de `origins.ts` |



| `CORS_ALLOWED_ORIGINS` | **Obsolète**, lu pendant la transition | Non | Ignorée |



| `FREE_LAUNCH_MODE` | `true` ou `false` | **Oui** | Production : erreur à l'usage des routes IA et d'achat |



| `FREE_LAUNCH_UNTIL` | Date ISO de fin de gratuité | Oui si `FREE_LAUNCH_MODE=true` | Production : erreur |



| `STARTING_COINS` | Solde de départ (défaut 3000) | Non | 3000 |



| `AI_COST_PASSAGE`, `AI_COST_CAREER_DOC`, `AI_COST_FULL_DOC` | Coûts IA après la gratuité (défaut 1, 2, 3) | Non | Valeurs par défaut |



| `TRUST_PROXY` | `true` seulement derrière Nginx | Oui sur le VPS | IP du client = `unknown` |



| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `false` = dérogation explicite au TLS | Non | Vérifié en production |



| `DATABASE_SSL_CA_FILE` | Certificat CA de la base | Recommandé | Pas de CA personnalisée |



| `RESEND_API_KEY` | Envoi des e-mails | **Oui en production** | Production : erreur au démarrage de Better Auth |



| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Modèles IA | Oui | Erreur à l'usage |



| `GEMINI_API_KEY` | OCR et analyse | Non | Fonctions IA réduites |



| `NOTCHPAY_PRIVATE_KEY`, `NOTCHPAY_WEBHOOK_SECRET` | Paiement Mobile Money | Oui si paiements actifs | Paiements refusés |



| `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` | WhatsApp | Non | Jumelage refusé (503) |



| `N8N_INGESTION_SECRET` | Secret d'ingestion n8n | Oui | Ingestion refusée |



| `STAGES_REVIEW_SECRET` | Secret de relecture des offres | Oui | Relecture refusée |



| `FILES_SIGNING_SECRET`, `FILES_PUBLIC_URL`, `UPLOAD_ROOT` | Fichiers signés et stockage | Oui | Fichiers indisponibles |



| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Images | Selon usage | Images indisponibles |



| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` | Stockage catalogue PDF | Selon usage | Catalogue indisponible |



| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Connexion Google | Non | Google désactivé |



| `MAIL_FROM`, `ADMIN_ALERT_EMAIL` | Expéditeur et alertes | Non | Valeurs par défaut |



| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_ALLOWED_EMAILS` | Administrateurs | Oui pour l'admin | Pas d'administrateur |



| `PUPPETEER_EXECUTABLE_PATH`, `CHROME_BIN` | Chromium pour les PDF | Oui sur le VPS | Export PDF impossible |



| `VERCEL`, `VERCEL_ENV`, `NODE_ENV` | Environnement d'exécution | Système | — |







### `recruiter-web`



Lit `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `EXPO_APP_ORIGIN`, `TRUSTED_EXTRA_ORIGINS`, `CORS_ALLOWED_ORIGINS`, `TRUST_PROXY`, `DATABASE_SSL_CA_FILE`, `DATABASE_SSL_REJECT_UNAUTHORIZED`, `FREE_LAUNCH_MODE`, `FREE_LAUNCH_UNTIL`, `STARTING_COINS`, `AI_COST_*`, `RESEND_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `NOTCHPAY_PRIVATE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_*`, `GOOGLE_CLIENT_*`, `ADMIN_*`, `MAIL_FROM`, `PUPPETEER_EXECUTABLE_PATH`, `CHROME_BIN`, `AUTH_FORCE_POSTGRES`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APK_*`.







### `landing-site`



`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_SSL_REJECT_UNAUTHORIZED`, `TRUSTED_EXTRA_ORIGINS`, `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`, `GOOGLE_CLIENT_*`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_AUTH_BASE_URL`, `NEXT_PUBLIC_APK_DOWNLOAD_URL`, `VERCEL_URL`.







### Application mobile (`EXPO_PUBLIC_*`)



`EXPO_PUBLIC_ADMIN_URL`, `EXPO_PUBLIC_AI_PROXY_URL`, `EXPO_PUBLIC_AUTH_URL`, `EXPO_PUBLIC_AUTH_WEB_URL`, `EXPO_PUBLIC_FILES_URL`, `EXPO_PUBLIC_NAME`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SUPPORT_WHATSAPP`.







### Agents de scraping (`scripts/agents/`)



`DATABASE_URL`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `SCRAPER_MODEL`, `SCRAPER_FALLBACK_MODEL`, `APIFY_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TREG_API_KEY`, `TREG_BASE_URL`, `TREG_CLI`, `TREG_MAX_CALLS_PER_RUN`, `TREG_MAX_COST_PER_CALL_USD`, `DAILY_OFFER_CAP`.







---







## 10. Pièges connus et dette







1. **Tests qui lisent des sources :** les fichiers sont en CRLF sous Windows ; un test qui cherche un extrait sur plusieurs lignes doit normaliser en LF (voir `readLf` dans `scripts/test-challenger-m3-adversarial.mjs`). `handleOpenDirections` (`StagesScreen.tsx`) ouvre la carte sur « Douala, Cameroun » quand l'offre n'a pas de lieu : dette à traiter.



2. **Tests Python :** depuis la tâche 25.1, `unittest` exécute 13 tests sans réseau. Le harnais de précision (25.3) et les tests de l'extracteur restent à écrire. Patcher `classifier_agent.call_json` / `extractor_agent.call_json`, jamais `llm_client.call_json`.



3. **Migrations en attente :** `0009`, `0010`, `0011` ne sont pas écrites ni appliquées (tâches 23.8, 23.12, 23.26). Ne rien appliquer sans accord explicite.



4. **Doublon recruiter-web résolu (23.22) :** toutes les routes `/api/mobile/*` et `/api/ai/*` de recruiter-web ont été supprimées, l'app mobile route tout vers `mobile-api` via `baseUrlFor`. Aucun doublon restant.



5. **`/api/mobile/documents/scraped-reports` :** durci (23.12) : rate limit (60/min), `source_url` masqué, filtre `status = 'published'`, session obligatoire.



6. **`stages/direct-reach` :** durci (23.12) : validation stricte via `getStageJob` (404 si inexistante, expirée ou suspendue) avant toute action.



7. **Sanitization HTML unifiée :** `sanitize-html.ts` unifié sur toutes les routes IA (`documents/generate`, `documents/ai`, `documents/generate-full` et entretiens) (23.13 validé).



8. **TLS base :** en production, `DATABASE_SSL_REJECT_UNAUTHORIZED` vaut `true` par défaut. Sans `DATABASE_SSL_CA_FILE`, la connexion Supabase peut échouer. Sur le VPS, la variable est définie à `false` (dérogation volontaire, à traiter).



9. **Accès au VPS :** `FREE_LAUNCH_MODE`, `TRUST_PROXY` ont été ajoutés le 2026-10-15 aux environnements de production de `mobile-api` et `recruiter-web`. **Pas encore relancé** : ces valeurs prendront effet au prochain redémarrage.



10. **Builds Next.js sur le VPS :** un redémarrage PM2 pendant le build crée un `ENOENT` sur `prerender-manifest.json`. Arrêter le service avant un build lourd.



11. **Clavier Android :** ne jamais mettre `behavior="height"` ni `justifyContent: 'center'` sur le `ScrollView` d'un formulaire.



12. **Documents de référence périmés :** `README.md` et `PROJECT.md` décrivent encore Supabase Auth et `admin-app/` (qui n'existe plus). Les corrections du `CLAUDE.md` priment.







---







## 11. Sécurité







- **Statut :** code vérifié ; **aucun nouvel audit `/cybersec` lancé dans ce scan**. L'ancien mention « CONFORME » du 2026-10-15 n'a pas été relu.



- **En place dans le code :**



  - Session par cookie ou `Authorization: Bearer` uniquement ; plus de jeton dans l'URL.



  - Origines de confiance exactes, sans joker (`origins.ts`).



  - Données legacy réservées aux comptes à e-mail vérifié ; conflit d'e-mail refusé (409).



  - Limiteur fail-closed sur les routes d'argent et d'IA.



  - IP du client de confiance seulement derrière Nginx (`TRUST_PROXY`).



  - TLS de la base vérifié en production.



  - Signature HMAC SHA-256 des webhooks de paiement, comparaison en temps constant.



  - Secrets : noms seulement dans ce fichier ; aucune valeur de `.env*` ne doit apparaître dans le code ou les commits.



- **Points ouverts :** §10, éléments 4 à 7.







---







## 12. Déploiement et vérifications







- **Où tourne quoi (VPS Ubuntu 24.04, hôte dans `.skills/environments.md`) :**



  - PM2 : `campus360-mobile-api` (port 3002), `campus360-recruiter-web` (3001), `campus360-landing-site` (3000). Les trois sont `online` au moment de la vérification du 2026-10-20.



  - Nginx : `/etc/nginx/sites-available/campus360b` ajoute `X-Forwarded-For` et `X-Real-IP` sur tous les proxys.



  - Docker : n8n (5678), Evolution API (8081), Coolify, PostgreSQL et Redis locaux.



  - Dépôt de déploiement : `/opt/campus-360`, sur `main` au tag `v1.0.0` (commit `1c82286`).

- **Environnements :** `mobile-api/.env.local` et `recruiter-web/.env.production` sur le VPS. Variables vérifiées et présentes : `RESEND_API_KEY`, `OPENROUTER_API_KEY`, `FREE_LAUNCH_MODE=true`, `FREE_LAUNCH_UNTIL`, `TRUST_PROXY=true`, `FILES_SIGNING_SECRET`, `UPLOAD_ROOT=/var/lib/campus360/uploads`, `FILES_PUBLIC_URL=https://files.campus360b.site`, `PAYMENTS_ENABLED=false`.

- **Application mobile :** Expo OTA via EAS Updates (branche `production`).

- **Dernière release : `db93fd5` · main · 2026-10-22 · VPS synchronisé sur `db93fd5` (charte v1 dans l'app, logo Orbite) ; APK build 114 (SHA-256 `ddb0c495...`, 72 Mo) déployé sur le VPS (/var/www/campus360-downloads/campus-360.apk) · cible : VPS (landing, admin, API, téléchargements APK) + EAS Updates · health : API 200 db connected, landing 200, admin 200, APK download 200.**
  - Build APK EAS local (GitHub runner) : workflow `eas-android.yml` manuel, pré-release GitHub `apk-v1.2.0-114`.

- **Release précédente (2026-10-20, v1.0.0, commit 1c82286) :**

  - PM2 : `campus360-mobile-api` (online, port 3002), `campus360-recruiter-web` (online, port 3001), `campus360-landing-site` (online, port 3000). RAM stable (37-43% global).

  - Migrations base de données : 12 migrations versionnées appliquées (0000 à 0015).

  - `https://api.campus360b.site/api/health` : 🟢 HTTP 200 `{"status":"ok","db":"connected"}`.

  - `https://campus360b.site` : 🟢 HTTP 200 OK.

  - `https://admin.campus360b.site` : 🟢 HTTP 200 OK.

  - Retour arrière : `bash scripts/deploy-vps.sh --rollback` ou checkout commit précédent.







---







9. **Scraping : deux cadences contradictoires.** `daily_scheduler.py` fait une fenêtre par jour (10 h à 12 h) ; le cadrage parlait de quatre passages. Retenu : une fenêtre (contexte.md §15). Le plafond de 20 offres ajoutées par jour n'est pas encore codé.



10. **Scraping : identifiants de modèles non vérifiés.** `llm_client.py` utilise `anthropic/claude-haiku-5.5` et `google/gemini-3.8-flash` par défaut ; à confirmer sur le compte OpenRouter avant production.



11. **Date d'ajout invisible.** `stage_jobs.created_at` est renvoyé par l'API mais la carte (`StagesScreen.tsx`) ne l'affiche pas.







12. **Scraping : accès Treg.** Le connecteur MCP Treg n'est pas utilisable par le cron Python. Le CLI `treg` 0.26.0 est installé et connecté (équipe `bct`) sur le VPS dans `/opt/treg-cli` depuis le 2026-10-20 : le scraper peut l'appeler (`treg call …`) ou passer par `https://treg.to/call/<endpoint>` avec l'en-tête `X-Treg-Token`. treg.to est injoignable depuis le poste de dev.



13. **Migrations scraping :** la prochaine migration libre pour ce module est `0014` (0009 à 0013 déjà réservées par les modules 23 et 24).







14. **Offres à lien seul (LinkedIn) :** l'app ne connaît que `WHATSAPP`, `EMAIL`, `PHYSICAL` ; `job_store.save_offer` enregistre une offre LinkedIn en `PHYSICAL` et la candidature en un clic n'a aucun destinataire. Tâche 25.17.



15. **Replis inventés sur la carte d'offre** (`StagesScreen.tsx`) : `job.matchScore || 75`, « Douala », « 3 à 6 mois », lien de partage `campus360.app`, itinéraire vers Douala sans lieu.



16. **Ordre de mise en production du scraping :** appliquer 0014 **avant** de déployer le code du module 25 ; sinon expiration et journal échouent (journalisé, non bloquant) et le plafond reste actif.

17. **Scraping : déclencheurs en doublon et à vide sur le VPS.** Les 4 crons du VPS tournent en `--dry-run` (aucune écriture) et sans `--live`. Le workflow GitHub `daily-scraper.yml` (9 h UTC) tourne en parallèle sans `--live`. Il faut supprimer les 4 crons VPS et désactiver le cron GitHub pour ne garder qu'un seul déclencheur effectif (démon PM2 `daily_scheduler.py` ou cron unique) (Tâche 25.18).



## 13. Journal des mises à jour

- **2026-10-22** `/test-and-verify` — **Module 26 : Migration Passerelle de Paiement Nyole VERIFIED.** Preuves concrètes : suite de tests `mobile-api` à 197 tests (179 pass, 0 fail, 18 skip), tests de paiement et signature `verifyNyoleSignature` (HMAC-SHA256, anti-rejeu 300s, timing-safe) et `env-check` (exigence `NYOLE_SECRET_KEY`) à 100% au vert ; session de test réelle exécutée contre l'API sandbox Nyole (`https://app.nyole.com/api/v1/checkout/sessions` `201 Created` avec session ID `cm...` et polling `/status` `200 OK`) ; typechecks complets (`mobile-api` et app) code 0 ; `npm run lint:colors` à 189 (zéro régression) ; sécurité : zéro fuite de secret dans les fichiers versionnés.

- **2026-10-22** `/plan-detail` — **Module 25 : Guide d'exécution de la tâche 25.18 (déclencheurs VPS).** Déclencheur unique formalisé (démon PM2 `campus360-scraper-daemon` ou cron unique 9h UTC) pour remplacer les 4 crons en `--dry-run` et désactiver le cron GitHub Actions en doublon.

- **2026-10-20** `/deploy-and-push` & `/vps-deploy` — **Livraison release V1 en production (tag `v1.0.0`, commit `1c82286`).**
  - 10 commits conventionnels atomiques poussés sur `origin/main` avec tag annoté `v1.0.0`.
  - 12 migrations versionnées appliquées avec succès (`0000_baseline` à `0015_apply_method_link`).
  - VPS synchronisé, services Next.js compilés et redémarrés sous PM2 (`campus360-landing-site`, `campus360-mobile-api`, `campus360-recruiter-web`).
  - Validation de santé publique : `https://api.campus360b.site/api/health` 🟢 HTTP 200 `connected`, vitrine et portail admin 🟢 HTTP 200.

- **2026-10-15 19:30** `/code-analyzer-context` — Première cartographie (Mode 1). Commit `651e296`.



- **2026-10-20** `/code-analyzer-context` — **Mise à jour complète (Mode 1), vérifiée contre le code.**



  - Ajouts : origines (`origins.ts`), IP client (`client-ip.ts`), TLS (`db-ssl.ts`), mode gratuit (`free-launch.ts` et parité), zone scraping (§3.7, pipeline 4 agents), solde et coûts IA (§3.4), limiteur fail-closed, routes complètes (§6, 50 routes `mobile-api`, 45 `recruiter-web`), variables réelles (§9), migrations 0004 à 0008.



  - Corrections : `isFreeLaunchActive()` n'existe pas ; le module est `free-launch.ts` (`isFreeLaunch`, `freeLaunchState`, `aiCost`). Les tables de stages incluent `stage_students`, `stage_job_rejections`. Les routes `payments/*` existent bien (fausse alerte levée).



  - Vérifications : typecheck ×4 OK ; `mobile-api` 116 réussis, 0 échec, 7 ignorés ; `lint:colors` 192 ; `test-m1-tokens` OK ; `test-challenger-m3-adversarial` **échoue** (test obsolète, §10.1) ; Python : 0 test exécuté (§10.2).



  - Problèmes ouverts : §10.



- **2026-10-20** `/execute` — tâches 25.1, 25.4, 25.13, 25.14 : tests Python en `unittest` (13), test M3 réparé (83/83), date d'ajout sur la carte. Dette repérée : repli `job.matchScore || 75` dans `StagesScreen.tsx` (score inventé).



- **2026-10-20** — Treg installé et connecté sur le VPS (`/opt/treg-cli`, équipe `bct`), paquet système `python3.12-venv` ajouté ; §10.12 mis à jour.



- **2026-10-20** `/plan-task` — Module 25 (scraping des offres) planifié dans plan.md (16 tâches) ; pièges §10.12 et §10.13 ajoutés.



- **2026-10-20** `/brainstorming` (voie Bounded) — cadrage du scraping ajouté dans contexte.md §15. Treg identifié comme connecteur MCP (passe-plat vers des APIs payantes à l'appel, LinkedIn compris) ; n'était pas dans le dépôt.



- **2026-10-20** `/execute` — Module 25 (scraping) : Treg LinkedIn, branchement, évaluation structurée sans IA, plafond quotidien, expiration, journal des passages, démon unique à l'heure du Cameroun, passage hors ligne. 56 tests Python, 124 tests mobile-api. Migration 0014 écrite (non appliquée). Pièges §10.14 à §10.16.



- **2026-10-20** `/test-and-verify` — **Audit QA complet de plan.md (toutes les tâches).** Typechecks ×4 au vert (`tsc --noEmit` app, mobile-api, recruiter-web, landing-site code 0) ; 140 tests mobile-api (130 pass, 0 fail, 10 skip) ; 56 tests Python scraping OK ; test M3 adversarial 83/83 ; test stage dispatch 36/36 ; test M1 tokens 36/36 (7 suites) ; `lint:colors` 192 (0 régression). Production VPS vérifiée via MCP : PM2 3 services online, API health 200 `connected`, landing et admin 200. Sécurité : zéro secret fuité, rate limits fail-closed confirmés. Verdict : 🟢 **VERIFIED** sur toutes les tâches [X] ; 🟠 **PARTIEL** sur les chantiers externes/cron/DNS ; ⚪ **NON ENTAMÉ** sur le module 24 et reste du Lot B (23.8, 23.10, 23.12-23.26).



- **2026-10-20** `/execute` — Tâche 23.7 (Appairage WhatsApp authentifié) : `whatsapp-target.ts` pur sans imports (`resolveWhatsAppTarget`, `isOwnInstance`, `normalizeTargetPhone`), `whatsapp/instance/route.ts` exigeant une session sans condition (`isStrictProd` et `VERCEL_ENV` supprimés, rate limits 5/10min pairing, 60/min status, 10/10min logout), `stages-db.ts` (`setStageStudentWhatsAppStatusById` et `getStageStudentWhatsAppStatusById` par `studentId` avec erreurs propagées), app `whatsappService.ts` et `WhatsAppPairingModal.tsx` (numéro en lecture seule lié au profil, lien de modification dans le profil, plus de saisie libre). 130 tests mobile-api réussis (+6 nouveaux dans `whatsapp-instance.test.mjs`), test-stage-dispatch 36/36, tsc ×4 OK.

- **2026-10-20** `/execute` — Tâches 23.8, 23.10, 23.12, 23.13, 23.26 validées :
  - Tâche 23.8 (Paiements durcis Notch Pay) : migration 0010, vérification HMAC SHA-256 en temps constant, transactions atomiques enregistrées avant appel tiers.
  - Tâche 23.10 (Quotas IA) : `ai-quota-rules.ts`, plafond global 60 appels/j et burst limits sur 9 routes IA, 0 occurrence de repli gratuit ou de fuite de clé.
  - Tâche 23.12 (Règles candidatures) : migration 0011, statut `WITHDRAWN`, restriction stricte des transitions étudiantes et des routes direct-reach / scraped-reports.
  - Tâche 23.13 (Assainisseur HTML unifié) : `sanitize-html.ts` (stripCodeFence, section, article...), suppression du code mort dans documents/{generate,ai,generate-full}.
  - Tâche 23.26 (PDF catalogue toujours gratuits) : migration 0009 (`kind`, `always_free`), `purchase-price.ts`, routes purchase/document sans ligne 0-coin inutile, admin recruiter-web et app adaptés. 163 tests mobile-api (148 pass, 0 fail, 15 skip), tsc ×3 code 0, lint:colors 191.
  - Tâche 23.14 (API suppression de compte) : migration 0012 appliquée ×2, lib/account-deletion.ts, route DELETE /api/mobile/account (rateLimit fail-closed 3/h, saisie SUPPRIMER, purge ordonnée et cookies expirés), tests 6/6 (5 pass, 1 skip), tsc ×3 code 0.
  - Tâche 23.15 (Suppression de compte et liens légaux app) : src/config/legalLinks.ts, DeleteAccountModal.tsx (2 étapes, SUPPRIMER, 0 hex hors tokens), ProfileScreen.tsx (Supprimer mon compte + INFORMATIONS LÉGALES), AppShell.tsx câblé, AuthScreen.tsx (liens sign-up), legal-links.test.mjs 2/2, tsc ×3 code 0, lint:colors 191.
  - Tâche 23.16 (Pages légales produit réel) : landing-site/components/legal-page.tsx, confidentialite, conditions, remboursement, mentions-legales, compte/page.tsx, suppression-compte/page.tsx créée, footer.tsx et sitemap.ts, zéro terme inventé (grep 0), next build 27/27 pages code 0.
  - Tâche 23.17 (Config build stores & schéma campus360) : eas.json (app-bundle, autoIncrement, submit internal), secrets/ gitignored, app.json (scheme campus360, v1.2.0, splash, plugin expo-notifications), package.json (v1.2.0), betterAuth.ts (scheme & URLs campus360://, clés locales campus-bordes_* préservées), origines unifiées, reset-password-redirect, sessions-origins test 6/6, tsc ×4 code 0, lint:colors 191.
  - Tâche 23.18 (Variables d'environnement démarrage) : mobile-api/lib/env-check.ts, instrumentation.ts, .env.example (34 variables), tests unitaires 6/6 pass, next build 35/35 pages, rejet startup certifié sans fuite de secrets, npm test 177/0 pass, tsc code 0.
  - Tâche 23.19 (Migrations versionnées) : mobile-api/sql/0000_baseline.sql, scripts/migrate.mjs (schema_migrations, SHA-256), package.json script migrate, suppression du DDL dynamique dans lib (grep create table lib 0 hit), deploy-vps.sh intègre migrate avant build, tests migrate.test.mjs 4/4 pass, npm test 182/0 pass, tsc code 0.
  - Tâche 23.20 (Export PDF opérationnel VPS) : lib/health-secret.ts (timing-safe), app/api/health/pdf/route.ts (x-health-secret, timeout 10s, 503 sans fuite technique), deploy-vps.sh (installation Chromium Puppeteer & vérification health check), tests health-pdf.test.mjs 2/2 pass, npm test 185/0 pass, tsc code 0.
  - Tâche 23.21 (Sauvegardes, surveillance et rollback) : scripts/backup-db.sh, backup-uploads.sh, purge-orphan-uploads.cjs (--max-delete, --force), deploy-vps.sh (PREV_SHA, health checks 5x5s, rollback automatique sans défaire les migrations), docs/deploy/OPERATIONS.md, bash -n code 0.

