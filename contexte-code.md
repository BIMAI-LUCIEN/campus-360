# Contexte de code : Campus 360

> **Fichier pivot n°1.** Carte intelligente du code, lue en premier par tous les skills de développement (`/brainstorming` sur un projet existant, `/plan-task`, `/plan-detail`, `/execute`, `/test-and-verify`, `/cybersec`, `/vps-deploy`, `/apex`, `/oneshot`).
> **Écrit par :** `/code-analyzer-context`. **Mis à jour par :** chaque skill, en dernière étape, pour ce qu'il a changé ou appris.
> **Dernière mise à jour :** 2026-10-15 19:20 par `/code-analyzer-context` & `/vps-deploy` — **Commit analysé :** `651e296` sur `main`

## 0. Mode d'emploi
- Lire le **sommaire**, puis seulement les sections utiles à la tâche.
- Chaque fichier cité a son rôle en une ligne : ouvrir **uniquement** les fichiers désignés, pour vérifier ou modifier.
- Une information absente ou fausse ici : la corriger ici en fin de tâche et l'ajouter au journal (§13).
- Taille cible : 400 à 900 lignes. Au-delà, résumer (une ligne par fichier) plutôt qu'allonger.

## Sommaire
1. Identité et services · 2. Commandes vérifiées · 3. Carte des zones fonctionnelles · 4. Flux principaux · 5. Données (tables, migrations) · 6. Index des routes API · 7. Conventions et garde-fous · 8. Fichiers jumeaux et copies divergentes · 9. Variables d'environnement · 10. Pièges connus et dette · 11. Sécurité · 12. Déploiement et vérifications · 13. Journal des mises à jour

---

## 1. Identité et services
| Service | Dossier | Rôle | Dev (port) | Prod (URL / hôte) |
|---|---|---|---|---|
| **App Mobile** | `.` | Application Expo / React Native pour étudiants camerounais | 8081 | Expo Go / APK standalone EAS |
| **Backend API** | `mobile-api/` | API Next.js 15, Better Auth, PostgreSQL, intégrations IA & WhatsApp | 3002 | `https://api.campus360b.site` (VPS 164.68.109.206) |
| **Portail Admin & Recruteur** | `recruiter-web/` | Dashboard Next.js 15 App Router, Tailwind v4, modération et suivi | 3001 | `https://admin.campus360b.site` (VPS 164.68.109.206) |
| **Landing Vitrine** | `landing-site/` | Vitrine Next.js 15, vidéo démo, tarifs, scroll-story et téléchargement | 3000 | `https://campus360b.site` (VPS 164.68.109.206) |
| **Evolution API (Docker)** | VPS Docker | Passerelle WhatsApp compagnon Baileys (instances `student-<phone>`) | 8081 | `https://wa.blackcompany.site` |
| **n8n Automation (Docker)** | VPS Docker | Moteur d'automatisation des flux (dispatch, paiements, OCR, relances) | 5678 | `https://n8n.blackcompany.site` |
| **PostgreSQL & Redis (Docker)** | VPS Docker | Base PostgreSQL 16 (`miguel_os`) et cache Redis 7 pour n8n/BullMQ | 5432 / 6379 | Interne localhost VPS |

- **Stack :** Node.js 22.23.3, React 19, React Native 0.81.5, Expo SDK 54, Next.js 15.5, Better Auth, pg, Lucide, Tailwind CSS.
- **Cadrage produit :** `contexte.md` (lu pour le cadrage stratégique et l'historique complet).
- **Plan détaillé :** `plan.md` (fichier pivot n°2).

---

## 2. Commandes vérifiées
Chaque commande a été lancée et certifiée avec succès :
| But | Dossier | Commande | Résultat vérifié |
|---|---|---|---|
| Typecheck App Mobile | `.` | `npm run typecheck` | 🟢 Code 0 (0 erreur) |
| Typecheck API Mobile | `mobile-api/` | `npm run typecheck` | 🟢 Code 0 (0 erreur) |
| Tests Unitaires API | `mobile-api/` | `npm test` | 🟢 123 tests (116 pass, 0 fail, 7 skipped) |
| Typecheck Recruteur | `recruiter-web/` | `npm run typecheck` | 🟢 Code 0 (0 erreur) |
| Build Landing Vitrine | `landing-site/` | `npm run build` | 🟢 26 pages statiques générées (code 0) |
| Santé API Production | VPS | `curl -s https://api.campus360b.site/api/health` | 🟢 `{"status":"ok","db":"connected"}` |
| Santé Landing Production | VPS | `curl -s -I https://campus360b.site` | 🟢 HTTP/1.1 200 OK |
| Santé Admin Production | VPS | `curl -s -I https://admin.campus360b.site` | 🟢 HTTP/1.1 200 OK |
| Média Vidéo Démo | VPS | `curl -s -I https://campus360b.site/motion/demo.mp4` | 🟢 HTTP/1.1 200 OK (892 Ko) |

---

## 3. Carte des zones fonctionnelles

### 3.1 Authentification & Sessions
- **But :** Gestion unifiée des comptes étudiants et recruteurs (email, téléphone camerounais, sessions sécurisées).
- **Fichiers clés :**
  - `mobile-api/lib/auth.ts` — Configuration Better Auth serveur, plugins bearer, session cookie.
  - `src/features/auth/betterAuth.ts` — Client Better Auth pour React Native avec persistance `SecureStore`.
  - `src/ui/screens/AuthScreen.tsx` — Écran de connexion/inscription mobile par onglets.
- **Routes :** `/api/auth/[...all]`, `/api/mobile/auth-capabilities`.
- **À savoir :** `TRUST_PROXY=true` actif pour extraire l'IP client réelle derrière Nginx sans spoofing.

### 3.2 Stages, Candidatures & IA Matching
- **But :** Collecte d'offres réelles au Cameroun, matching probabiliste et expédition automatisée 1-clic.
- **Fichiers clés :**
  - `src/features/stages/stagesApi.ts` — API client pour les stages et candidatures étudiantes.
  - `src/features/stages/aiMatchEngine.ts` — Moteur de compatibilité pondéré (filière 35%, compétences 35%, niveau 15%, ville 15%).
  - `mobile-api/lib/stages-db.ts` — Requêtes SQL sécurisées vers la table `stage_applications` et `stage_jobs`.
  - `mobile-api/app/api/mobile/stages/dispatch/route.ts` — Dispatch des candidatures via n8n (WhatsApp / Email).
  - `scripts/agents/offer_pipeline.py` — Pipeline de scraping IA 4-agents (filtre, classifieur, extracteur, vérificateur).
- **Routes :** `/api/mobile/stages`, `/api/mobile/stages/dispatch`, `/api/mobile/stages/ingest`.
- **Tables :** `stage_jobs`, `stage_applications`.

### 3.3 Monétisation, Mode Gratuit & Wallet
- **But :** Monétisation Mobile Money (MTN / Orange) avec interrupteur de lancement gratuit V1.
- **Fichiers clés :**
  - `mobile-api/lib/free-launch.ts` — Contrôleur de gratuité V1 (`FREE_LAUNCH_MODE=true` jusqu'à `FREE_LAUNCH_UNTIL`).
  - `src/config/launch.ts` — Détection de gratuité côté application mobile (`account.wallet.freeLaunch`).
  - `mobile-api/lib/payments.ts` — Gestion des soldes wallet, transactions et validation des webhooks.
  - `src/features/wallet/PaymentModal.tsx` — Modalité de recharge MoMo / Orange Money.
- **Routes :** `/api/mobile/payments/initiate`, `/api/mobile/payments/webhook`, `/api/mobile/wallet/topup`.
- **À savoir :** En mode gratuit, les débits wallet retournent un solde virtuel suffisant et autorisent l'action sans paiement.

### 3.4 Documents, Templates & Éditeur
- **But :** Rédaction assistée de rapports de stage, mémoires et CV officiel certifié.
- **Fichiers clés :**
  - `src/features/stages/pdfExportService.ts` — Rendu HTML/PDF du CV officiel deux colonnes.
  - `mobile-api/lib/document-docx.ts` — Génération de fichiers Word `.docx` téléchargeables.
  - `mobile-api/lib/document-pdf.ts` — Rendu PDF côté serveur avec pagination dynamique.
  - `src/features/documents/EditorSurface.tsx` — Surface de prévisualisation et édition de documents.
- **Routes :** `/api/mobile/documents/[id]/sections`, `/api/mobile/files/sign`.

### 3.5 Vitrine Web & Médias Immersifs
- **But :** Conversion des visiteurs sur le web et téléchargement de l'application.
- **Fichiers clés :**
  - `landing-site/app/page.tsx` — Page d'accueil moderne avec hero, métriques et badge « 100% Gratuit ».
  - `landing-site/components/landing/demo-film.tsx` — Lecteur vidéo du film de démonstration (`demo.mp4`).
  - `landing-site/components/landing/scroll-story.tsx` — Récit interactif scrollytelling.
  - `landing-site/components/landing/hero-phone.tsx` — Maquette 3D / CSS du smartphone avec l'application.
- **Médias :** `public/motion/demo.mp4`, `public/motion/demo.webm`, `public/images/screens/`.

### 3.6 Back-Office Administrateur
- **But :** Cockpit unifié de supervision KYB, validation des offres et suivi des relances J+7.
- **Fichiers clés :**
  - `recruiter-web/app/admin/AdminShell.tsx` — Shell de navigation administrateur.
  - `recruiter-web/lib/admin-platform-service.ts` — Données consolidées pour le cockpit.

---

## 4. Flux principaux
1. **Connexion Étudiant :** `AuthScreen.tsx` → `betterAuth.ts:signIn` → `mobile-api/lib/auth.ts` → Token de session dans SecureStore.
2. **Postulation 1-Clic :** `AiApplyModal.tsx` → `stagesApi.ts:dispatch` → `POST /api/mobile/stages/dispatch` → Webhook n8n (`xQiVoKPWeW9lTyEO`) → Evolution API WhatsApp (PDF + texte) → Sauvegarde `DELIVERED`.
3. **Lancement Gratuit V1 :** L'étudiant clique sur une action payante → `launch.ts` lit `freeLaunch: true` → L'action s'exécute immédiatement sans réclamer de paiement.

---

## 5. Données
- **Accès SQL :** Pool PostgreSQL `pg` (`mobile-api/lib/stages-db.ts` et `recruiter-web/lib/`). SSL activé avec rejet d'adresses internes SSRF (`lib/db-ssl.ts`).
- **Tables Clés :**
  - `stage_jobs` : Offres de stage avec score de confiance, compétences extraites, contact recruteur.
  - `stage_applications` : Candidatures des étudiants (CV URL, lettre, canal, statut `SENT_PENDING`/`DELIVERED`).
  - `wallets` / `wallet_transactions` : Soldes et historiques des transactions Mobile Money.
- **Migrations SQL (`mobile-api/sql/`) :**
  - `0001_initial_schema.sql` à `0008_section_interviews.sql` : Appliquées.
  - `0009_auth_enhancements.sql` à `0011_document_collaboration.sql` : Identifiées, non encore appliquées sur la base de production.
  - **Prochain numéro libre :** `0012`.

---

## 6. Index des routes API Principales
| Méthode | Chemin | Fichier | Auth | Rôle |
|---|---|---|---|---|
| `GET` | `/api/health` | `mobile-api/app/api/health/route.ts` | Non | Health check de l'API et de la base de données |
| `POST` | `/api/auth/[...all]` | `mobile-api/app/api/auth/[...all]/route.ts` | Variable | Endpoints Better Auth (connexion, inscription, session) |
| `GET` | `/api/mobile/stages` | `mobile-api/app/api/mobile/stages/route.ts` | Oui | Liste des stages réels filtrés |
| `POST` | `/api/mobile/stages/dispatch` | `mobile-api/app/api/mobile/stages/dispatch/route.ts` | Oui | Envoi automatisé CV + Pitch (n8n / WhatsApp / Email) |
| `POST` | `/api/mobile/stages/ingest` | `mobile-api/app/api/mobile/stages/ingest/route.ts` | Clé API | Ingestion automatisée n8n des offres avec OCR Vision |
| `POST` | `/api/mobile/payments/initiate`| `mobile-api/app/api/mobile/payments/initiate/route.ts`| Oui | Démarrage d'un paiement Mobile Money |
| `POST` | `/api/mobile/payments/webhook` | `mobile-api/app/api/mobile/payments/webhook/route.ts` | Non | Réception des notifications de paiement opérateur |
| `GET/POST`| `/api/mobile/files/sign` | `mobile-api/app/api/mobile/files/sign/route.ts` | Oui | Signature et stockage d'assets Cloud |

---

## 7. Conventions et garde-fous
- **Typage Strict :** TypeScript strict avec `noEmit` (0 erreur acceptée sur toute la codebase).
- **Anti-SSRF & Sécurité Réseau :** `mobile-api/lib/safe-fetch.ts` bloque formellement les adresses IP privées/locales (`127.0.0.1`, `10.*`, `172.16.*`, `192.168.*`, `169.254.*`).
- **Garde de Test :** 123 tests automatisés (`npm test` dans `mobile-api`) validant la non-régression sur le match score, l'anti-tic IA, la sanitization et la parité.
- **Git Buffer :** Configurer `git config http.postBuffer 524288000` en local pour éviter l'erreur HTTP 408 sur les gros commits contenant des médias.

---

## 8. Fichiers jumeaux et copies divergentes
| Fichier A (mobile-api) | Fichier B (recruiter-web) | Règle de synchronisation |
|---|---|---|
| `mobile-api/lib/auth.ts` | `recruiter-web/lib/auth.ts` | Parité stricte des plugins Better Auth et hashing |
| `mobile-api/lib/free-launch.ts` | `recruiter-web/lib/free-launch.ts` | Même logique d'interrupteur gratuité |
| `mobile-api/lib/origins.ts` | `recruiter-web/lib/origins.ts` | Même liste blanche d'origines CORS |
| `mobile-api/lib/client-ip.ts` | `recruiter-web/lib/client-ip.ts` | Même extraction sécurisée derrière Nginx |
| `mobile-api/lib/mailer.ts` | `recruiter-web/lib/mailer.ts` | Même transport SMTP transactionnel |

---

## 9. Variables d'environnement
| Variable | Lue par | Rôle | Obligatoire en prod |
|---|---|---|---|
| `DATABASE_URL` | `mobile-api`, `recruiter-web` | Chaîne de connexion PostgreSQL Supabase / miguel_os | Oui |
| `BETTER_AUTH_SECRET` | `mobile-api`, `recruiter-web` | Signature des cookies et des tokens de session | Oui |
| `FREE_LAUNCH_MODE` | `mobile-api`, `recruiter-web` | Interrupteur d'activation de la gratuité V1 (`true`) | Oui (en phase de lancement) |
| `FREE_LAUNCH_UNTIL`| `mobile-api`, `recruiter-web` | Date ISO d'expiration de la gratuité V1 | Non |
| `TRUST_PROXY` | `mobile-api`, `recruiter-web` | Autorise la lecture de `X-Forwarded-For` derrière Nginx | Oui |
| `EVOLUTION_API_URL`| `mobile-api` | URL de l'instance Evolution API (`https://wa.blackcompany.site`) | Oui pour WhatsApp |
| `EVOLUTION_API_KEY`| `mobile-api` | Clé d'authentification secrète Evolution API | Oui pour WhatsApp |
| `N8N_WEBHOOK_URL`  | `mobile-api` | URL de déclenchement du dispatch n8n | Oui pour dispatch auto |

---

## 10. Pièges connus et dette technique
1. **Verrou de Déploiement Concurrent :** `scripts/deploy-vps.sh` utilise `/tmp/campus360-deploy.lock`. Ne jamais lancer deux builds en simultané sur le VPS.
2. **Migrations SQL 0009 à 0011 :** Définies dans `mobile-api/sql/` mais non encore exécutées sur la base PostgreSQL distante (ne pas exécuter sans validation explicite).
3. **Trace Collection Next.js :** La compilation de `mobile-api` sur le VPS prend environ 60 à 75s en raison du scan des dépendances lourdes (Puppeteer). Préférer laisser GitHub Actions (`deploy-vps.yml`) orchestrer le build.

---

## 11. Sécurité
- **Statut :** 🟢 Conforme (Zéro fuite de secret, vérification statique et runtime passée).
- **Dernier audit :** 2026-10-15 par `/cybersec` et tests unitaires `sessions-origins.test.mjs`.
- **Certificats SSL :** Tous les sous-domaines (`api`, `admin`, landing, `wa`, `n8n`) sont protégés par Let's Encrypt avec renouvellement Certbot automatique.

---

## 12. Déploiement et vérifications
- **Orchestration :** GitHub Actions (`.github/workflows/deploy-vps.yml`) sur push `main` ➔ Exécute `/opt/campus-360/scripts/deploy-vps.sh`.
- **Skill dédié :** [vps-deploy](file:///C:/Users/DELL/.gemini/config/skills/vps-deploy/SKILL.md) (`/vps-deploy`).
- **Dernière release déployée :** Commit `651e296` sur `origin/main` (2026-10-15).
- **Statut PM2 en production :**
  - `campus360-landing-site` : 🟢 `online` (Port 3000)
  - `campus360-mobile-api` : 🟢 `online` (Port 3002)
  - `campus360-recruiter-web` : 🟢 `online` (Port 3001)

---

## 13. Journal des mises à jour
- **2026-10-15** `/code-analyzer-context` & `/vps-deploy` — Initialisation de `contexte-code.md` (Mode 1 scan complet) après résolution des conflits de fusion sur `main` et déploiement réussi de la release V1 (commit `651e296`).
