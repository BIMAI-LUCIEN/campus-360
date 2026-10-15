# Contexte de code : Campus 360

> **Fichier pivot n°1.** Carte intelligente du code, lue en premier par tous les skills de développement (`/brainstorming` sur un projet existant, `/plan-task`, `/plan-detail`, `/execute`, `/test-and-verify`, `/cybersec`, `/vps-deploy`, `/apex`, `/oneshot`).
> **Écrit par :** `/code-analyzer-context`. **Mis à jour par :** chaque skill, en dernière étape, pour ce qu'il a changé ou appris.
> **Dernière mise à jour :** 2026-10-15 19:30 par /code-analyzer-context — **Commit analysé :** `651e296` sur `main`

## 0. Mode d'emploi
- Lire le **sommaire**, puis seulement les sections utiles à la tâche.
- Chaque fichier cité a son rôle en une ligne : ouvrir **uniquement** les fichiers désignés, pour vérifier ou modifier.
- Une information absente ou fausse ici : la corriger ici en fin de tâche et l'ajouter au journal (§13).
- Règle d'or : ne pas lire de code à l'aveugle sans consulter cette carte et `graphify-out/GRAPH_REPORT.md`.

## Sommaire
1. Identité et services · 2. Commandes vérifiées · 3. Carte des zones fonctionnelles · 4. Flux principaux · 5. Données (tables, relations) · 6. Index des routes API · 7. Conventions et garde-fous · 8. Fichiers jumeaux et copies divergentes · 9. Variables d'environnement · 10. Pièges connus et dette · 11. Sécurité · 12. Déploiement et vérifications · 13. Journal des mises à jour

---

## 1. Identité et services
| Service | Dossier | Rôle | Dev (port) | Prod (URL / hôte) |
|---|---|---|---|---|
| **Application Mobile** | `src/` (racine) | Application mobile multiplateforme pour étudiants (stages, CV officiel, rapports IA, wallet) | `npm run start` (8081) | Expo EAS / APK Android (`campus-360.apk`) |
| **Backend API Mobile** | `mobile-api/` | Backend Next.js 15 App Router : Auth, DB, IA OpenRouter, dispatch n8n / Evolution API | 3002 | `https://api.campus360b.site` (VPS Ubuntu) |
| **Portail Admin / Recruteur** | `recruiter-web/` | Dashboard Next.js 15, Tailwind v4 : métriques, gestion offres, utilisateurs, packs | 3001 | `https://admin.campus360b.site` (VPS Ubuntu) |
| **Site Vitrine / Landing** | `landing-site/` | Landing page Next.js 15, vidéo de démo, téléchargement APK direct, conversion | 3000 | `https://campus360b.site` (VPS Ubuntu) |
| **Automatisations n8n** | `scripts/n8n/` | Workflows cron scraping, OCR flyers via Gemini, relance J+7, expédition WhatsApp/Email | 5678 | `https://n8n.blackcompany.site` (Docker VPS) |
| **Evolution API** | Externe / Docker | Passerelle WhatsApp multi-instances pour dispatch de candidatures avec PDF | 8081 / proxy | `https://wa.blackcompany.site` (Docker VPS) |

- **Stack globale :** React Native 0.81.5, Expo SDK 54, React 19, Next.js 15, TypeScript 5.9, Better Auth 1.3/1.6, PostgreSQL (`pg` pool), Lucide Icons, Tailwind CSS v4.
- **Cadrage produit :** `contexte.md` (lu pour le cadrage et l'historique des releases).
- **Plan d'implémentation :** `plan.md` (fichier pivot n°2, suivi des modules et tâches).
- **Cartographie sémantique :** `graphify-out/GRAPH_REPORT.md` (graphe de code et dépendances).

---

## 2. Commandes vérifiées
Toutes les commandes ci-dessous ont été exécutées et validées avec un code de sortie 0 :
| But | Dossier | Commande | Résultat vérifié |
|---|---|---|---|
| Typecheck App Mobile | racine | `npm run typecheck` (`tsc --noEmit` stack 8192) | 🟢 Code 0 (0 erreur) |
| Typecheck Mobile API | `mobile-api/` | `npm run typecheck` | 🟢 Code 0 (0 erreur) |
| Typecheck Admin Web | `recruiter-web/` | `npm run typecheck` | 🟢 Code 0 (0 erreur) |
| Typecheck Landing Site | `landing-site/` | `npx tsc --noEmit` | 🟢 Code 0 (0 erreur) |
| Tests Tokens M1 | racine | `node scripts/test-m1-tokens.mjs` | 🟢 36/36 tests passés |
| Tests Adversarial M3 | racine | `node scripts/test-challenger-m3-adversarial.mjs` | 🟢 78/78 tests passés |
| Santé API Production | VPS | `curl -s https://api.campus360b.site/api/health` | 🟢 HTTP 200 `{"status":"ok","db":"connected"}` |
| Santé Admin Production | VPS | `curl -s -I https://admin.campus360b.site` | 🟢 HTTP 200 OK |
| Santé Landing Production | VPS | `curl -s -I https://campus360b.site` | 🟢 HTTP 200 OK |

---

## 3. Carte des zones fonctionnelles

### 3.1 Authentification & Sessions Étudiant
- **But :** Gestion unifiée des comptes étudiants (Better Auth), double persistance locale (SecureStore / LocalStorage) et fallback hors-ligne.
- **Fichiers clés :**
  - `src/features/auth/betterAuth.ts` — Client Better Auth pour Expo, gestion token et compte local de secours.
  - `src/ui/screens/AuthScreen.tsx` — Écran connexion / inscription, Clean White & Royal Violet, clavier stabilisé.
  - `mobile-api/lib/auth.ts` — Configuration Better Auth serveur, adapteur PostgreSQL, cookies et plugins expo.
  - `mobile-api/lib/mobile-access.ts` — Helper `requireMobileUser(req)` avec validation de session bearer et cookie.
- **Routes :** §6 (`/api/auth/*`, `/api/mobile/account`). **Tables :** §5 (`user`, `session`, `account`, `verification`).
- **À savoir :** Si `DATABASE_URL` est absent au démarrage, un proxy protecteur empêche le crash au build Vercel.

### 3.2 Stages, Matching IA & Expédition 1-Clic
- **But :** Découverte des offres de stage, scoring de compatibilité probabiliste, génération de CV au gabarit officiel RH et postulation directe.
- **Fichiers clés :**
  - `src/ui/screens/StagesScreen.tsx` — Feed des offres, bannières rotatives par secteur, logos HD, modale détail.
  - `src/features/stages/AiApplyModal.tsx` — Modale de candidature IA : analyse du match, reformulation de lettre, génération CV officiel 2 colonnes.
  - `src/features/stages/StudentProfileExpressModal.tsx` — Formulaire 6 champs en violet sur blanc pour onboarding express.
  - `src/features/stages/stagesApi.ts` — Client API stages, calcul de match local et persistance des candidatures.
  - `mobile-api/lib/stages-db.ts` — Ingestion offres, dédoublonnage, score KYB, persistance des candidatures (`ingestStageJob`).
  - `mobile-api/lib/evolution-api.ts` — Intégration Evolution API (pairing code 8 chiffres, vérification session WhatsApp).
  - `scripts/n8n/send_stage_application_workflow.json` — Workflow n8n d'expédition automatique WhatsApp et Email avec PDF joint.
- **Routes :** §6 (`/api/mobile/stages/*`, `/api/mobile/whatsapp/*`). **Tables :** §5 (`stage_jobs`, `stage_companies`, `stage_applications`).

### 3.3 Rédaction de Documents Académiques & Rapports IA
- **But :** Génération, édition collaborative et export PDF/DOCX de rapports de stage, mémoires et projets tutorés.
- **Fichiers clés :**
  - `src/features/documents/DocumentEditorScreen.tsx` — Éditeur WYSIWYG de document complet avec plan interactif et coach IA.
  - `mobile-api/lib/documents-db.ts` — Opérations CRUD et gestion des sections, fichiers et sources documentaires.
  - `mobile-api/lib/document-pdf.ts` & `mobile-api/lib/document-docx.ts` — Moteurs de rendu et conversion Puppeteer / docx.
  - `mobile-api/lib/interview.ts` — Simulateur et coach vocal/écrit de soutenance devant jury.
- **Routes :** §6 (`/api/mobile/documents/*`). **Tables :** §5 (`documents`, `document_sections`, `document_files`, `document_sources`).

### 3.4 Monétisation, Wallet & Mode Gratuit de Lancement
- **But :** Portefeuille prépayé en FCFA réels (Pay-per-Action), passerelle Mobile Money (NotchPay) et bascule automatique en mode 100% gratuit de lancement.
- **Fichiers clés :**
  - `src/features/wallet/PaymentModal.tsx` — Modale de rechargement Mobile Money (500, 1000, 2000, 5000 FCFA).
  - `mobile-api/lib/free-launch.ts` — Détection du mode gratuit de lancement (`isFreeLaunchActive()`), débrayage des débits.
  - `mobile-api/lib/payments.ts` — Initiation de transaction NotchPay, vérification de signature webhook HMAC SHA-256.
- **Routes :** §6 (`/api/mobile/payments/*`, `/api/mobile/wallet/*`). **Tables :** §5 (`stage_students`, `stage_wallet_topups`).
- **À savoir :** `FREE_LAUNCH_MODE` : tant que la variable n'est pas explicitement à `"false"`, toutes les actions sont offertes.

### 3.5 Portail Recruteur & Admin
- **But :** Gestion back-office pour recruteurs et administrateurs Campus 360 (validation offres, statistiques, contrôle d'accès).
- **Fichiers clés :**
  - `recruiter-web/app/admin/analytics/AnalyticsDashboard.tsx` — Graphiques Recharts des candidatures, inscriptions et conversions.
  - `recruiter-web/lib/auth.ts` — Authentification administrateur, vérification de rôle.
- **Routes :** `/admin/*`.

### 3.6 Landing Site & Distribution de l'Application
- **But :** Présentation publique, vidéo de démonstration MP4/WebM, génération de QR Code et téléchargement de l'APK officiel.
- **Fichiers clés :**
  - `landing-site/app/page.tsx` — Page d'accueil responsive, grille de fonctionnalités, témoignages.
  - `landing-site/public/downloads/campus-360.apk` — Binaire Android distribué aux visiteurs.

---

## 4. Flux principaux

### Flux 1 : Inscription & Profilage Express 30s
1. Utilisateur ouvre l'application → `src/ui/screens/AuthScreen.tsx`
2. Saisie Nom, WhatsApp, Université, Filière, Niveau → `src/features/auth/betterAuth.ts:signUpWithEmail`
3. Appel API `POST /api/auth/sign-up/email` → Insertion Better Auth dans `public.user`
4. Synchronisation profil étudiant → `mobile-api/lib/stages-db.ts:ensureStageStudent`
5. Enregistrement session sécurisée dans `SecureStore` → Redirection vers `HomeScreen`.

### Flux 2 : Postulation Stage 1-Clic avec Gabarit CV Officiel
1. Clic sur `[ Postuler ]` dans `StagesScreen.tsx`
2. Si profil incomplet : affichage `StudentProfileExpressModal.tsx` pour validation des 6 champs
3. Calcul du match probabiliste → `src/features/stages/aiMatchEngine.ts`
4. Génération IA du CV au gabarit officiel RH et de la lettre personnalisée → `AiApplyModal.tsx`
5. Vérification du wallet (ou gratuité active via `isFreeLaunchActive()`)
6. Clic `[ ⚡ Postuler en 1 Clic ]` → `POST /api/mobile/stages/dispatch`
7. Déclenchement du webhook n8n → Envoi WhatsApp via Evolution API et email SMTP avec pièce jointe PDF.

### Flux 3 : Génération et Édition de Document Académique
1. Atelier Documents → Clic Nouveau Document (Rapport de stage ou Mémoire)
2. Saisie du thème et de l'entreprise → `POST /api/mobile/documents/generate-full`
3. Génération du plan en chapitres académiques conformes aux normes universitaires
4. Éditeur WYSIWYG → `DocumentEditorScreen.tsx` avec modification en temps réel
5. Export final → `GET /api/mobile/documents/[id]/export/pdf` via Puppeteer headless.

---

## 5. Données

- **Client SQL :** `pg` (Pool natif PostgreSQL) configuré dans `mobile-api/lib/database.ts`.
- **SSL :** Résolution dynamique dans `mobile-api/lib/db-ssl.ts` (vérifié en production, désactivé sur localhost).

### Tables clés
| Table | Rôle | Écrite par |
|---|---|---|
| `public.stage_jobs` | Offres de stage actives, flyers HD, coordonnées recruteurs | `mobile-api/lib/stages-db.ts` (ingestion n8n) |
| `public.stage_companies` | Entreprises partenaires, logos corporatifs, score KYB | `mobile-api/lib/stages-db.ts` |
| `public.stage_students` | Profils étudiants, compétences, tokens et statut wallet | `mobile-api/lib/stages-db.ts`, `payments.ts` |
| `public.stage_applications` | Candidatures soumises, statut d'envoi, relance J+7 | `mobile-api/app/api/mobile/stages/dispatch` |
| `public.documents` | Rapports de stage et mémoires académiques rédigés | `mobile-api/lib/documents-db.ts` |
| `public.document_sections` | Chapitres et sections de documents avec contenu HTML | `mobile-api/lib/documents-db.ts` |
| `public.document_files` | Fichiers PDF et documents annexes rattachés | `mobile-api/lib/document-files-db.ts` |
| `public.user` / `session` | Tables d'authentification et sessions Better Auth | `better-auth` adapter |

---

## 6. Index des routes API (`mobile-api`)

| Méthode | Chemin | Fichier | Auth | Rôle |
|---|---|---|---|---|
| `GET` | `/api/health` | `app/api/health/route.ts` | Non | Health check public statut et connexion base de données |
| `ALL` | `/api/auth/[...all]` | `app/api/auth/[...all]/route.ts` | Géré par Better Auth | Authentification, sessions, tokens, reset mot de passe |
| `GET, POST` | `/api/mobile/account` | `app/api/mobile/account/route.ts` | Oui (Bearer/Cookie) | Lecture et mise à jour du profil étudiant |
| `GET` | `/api/mobile/auth-capabilities`| `app/api/mobile/auth-capabilities/route.ts` | Non | Capacités actives (Google, reset password, email verification) |
| `GET` | `/api/mobile/stages` | `app/api/mobile/stages/route.ts` | Non | Liste paginée des offres de stages et recommandations |
| `POST` | `/api/mobile/stages/ingest` | `app/api/mobile/stages/ingest/route.ts` | Secret `X-N8N-API-KEY` | Ingestion automatisée des offres scrapées par n8n |
| `POST` | `/api/mobile/stages/apply` | `app/api/mobile/stages/apply/route.ts` | Oui | Enregistrement d'une candidature stage |
| `POST` | `/api/mobile/stages/dispatch` | `app/api/mobile/stages/dispatch/route.ts` | Oui | Déclenchement de l'envoi WhatsApp/Email arrière-plan |
| `POST` | `/api/mobile/stages/review` | `app/api/mobile/stages/review/route.ts` | Oui | Évaluation et feedback recruteur |
| `POST` | `/api/mobile/whatsapp/instance`| `app/api/mobile/whatsapp/instance/route.ts` | Oui | Création d'instance et obtention du code de jumelage 8 chiffres |
| `GET, POST` | `/api/mobile/documents` | `app/api/mobile/documents/route.ts` | Oui | Liste et création de documents académiques |
| `POST` | `/api/mobile/documents/generate-full` | `app/api/mobile/documents/generate-full/route.ts` | Oui | Génération assistée par IA de document complet |
| `GET` | `/api/mobile/documents/[id]/export/pdf` | `app/api/mobile/documents/[id]/export/pdf/route.ts` | Oui | Exportation PDF haute fidélité via Puppeteer |
| `GET` | `/api/mobile/documents/[id]/export/docx` | `app/api/mobile/documents/[id]/export/docx/route.ts` | Oui | Exportation DOCX Word éditable |
| `POST` | `/api/mobile/payments/initiate`| `app/api/mobile/payments/initiate/route.ts` | Oui | Initiation de transaction Mobile Money |
| `POST` | `/api/mobile/payments/webhook` | `app/api/mobile/payments/webhook/route.ts` | Signature HMAC | Webhook de validation de paiement NotchPay |
| `GET, POST` | `/api/mobile/wallet/topup` | `app/api/mobile/wallet/topup/route.ts` | Oui | Recharge du portefeuille étudiant |

---

## 7. Conventions et garde-fous

- **Langue :** Interface utilisateur en français soigné, commentaires et commits en français ou anglais standardisé.
- **Direction Artistique (Design System) :** Charte unifiée **Clean White & Royal Violet** :
  - Fond de carte : Blanc pur `#FFFFFF`, bordure ardoise `#E2E8F0`, rayon de 16 à 24px.
  - Texte : Noir ardoise profond `#0F172A`, sous-titres ardoise `#64748B`.
  - Boutons d'action & accents : Violet Royal `#7C3AED` avec texte blanc pur `#FFFFFF`.
  - Zéro dégradé sombre ou composant noir opaque dans les formulaires utilisateurs.
- **Garde-fous Sécurité :**
  - Validation stricte de tous les corps de requêtes via des schémas Zod.
  - Pas de secrets stockés dans le code source ; conformité stricte avec GitHub Push Protection.
  - Gestion sécurisée des transactions avec bloc `BEGIN ... COMMIT / ROLLBACK`.
  - Sanitization HTML systématique (`sanitize-html.ts`) avant le rendu et les exports.

---

## 8. Fichiers jumeaux et copies divergentes

| Fichier A | Fichier B | Règle de synchronisation |
|---|---|---|
| `mobile-api/lib/documents-db.ts` | `recruiter-web/lib/documents-db.ts` | Les opérations sur les documents doivent conserver les mêmes schémas de colonnes et contraintes SQL. |
| `src/theme/stitch.ts` | `recruiter-web/app/globals.css` | Les jetons de couleurs primaires (`#7C3AED`, `#0F172A`, `#F8FAFC`) doivent être identiques. |
| `mobile-api/lib/auth.ts` | `src/features/auth/betterAuth.ts` | Les paramètres d'authentification et les noms de champs session doivent être synchronisés. |

---

## 9. Variables d'environnement
*(Noms uniquement, aucune valeur conformément à `.skills/environments.md`)*
| Variable | Service | Rôle | Obligatoire en prod | Comportement si absente |
|---|---|---|---|---|
| `DATABASE_URL` | `mobile-api`, `recruiter-web` | Chaîne de connexion PostgreSQL | Oui | Erreur explicite levée sur requête |
| `BETTER_AUTH_SECRET` | `mobile-api`, `recruiter-web` | Clé secrète de chiffrement des sessions | Oui | Échec de validation des sessions |
| `OPENROUTER_API_KEY` | `mobile-api` | Clé d'inférence pour les modèles IA (Gemini, Claude) | Oui | Erreur lors de la génération IA |
| `FREE_LAUNCH_MODE` | `mobile-api` | Drapeau d'activation de la gratuité totale | Non | Si non défini ou `!= false` : gratuité active |
| `EVOLUTION_API_URL` | `mobile-api` | URL d'instance WhatsApp Evolution API | Non | Fallback vers envoi direct WhatsApp |
| `EVOLUTION_API_KEY` | `mobile-api` | Clé d'API Evolution API | Non | Jumelage désactivé si absent |
| `RESEND_API_KEY` | `mobile-api` | Clé d'expédition des e-mails transactionnels | Non | Mode d'e-mail simulé en local |
| `NOTCHPAY_PRIVATE_KEY` | `mobile-api` | Clé privée de passerelle Mobile Money | Non (si gratuit) | Paiements réels bloqués |
| `NOTCHPAY_WEBHOOK_SECRET`| `mobile-api` | Secret HMAC de validation du webhook | Non (si gratuit) | Rejet des callbacks non signés |

---

## 10. Pièges connus et dette

1. **Builds Next.js sur VPS & Timeouts MCP :**
   - La génération statique de Next.js peut prendre 60 à 90 secondes. Si PM2 tente de redémarrer en parallèle, cela peut créer un crash `ENOENT` sur `prerender-manifest.json`.
   - *Règle :* Stopper le service PM2 avant un build distant lourd ou laisser le workflow GitHub Actions exécuter la compilation en tâche de fond.
2. **Clavier virtuel mobile sous Android :**
   - Ne jamais mettre `behavior="height"` ou `justifyContent: 'center'` sur le `ScrollView` d'un formulaire, sous peine d'annulation instantanée du focus.
   - Utiliser `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` et `justifyContent: 'flex-start'`.
3. **Double hébergement (Vercel vs VPS) :**
   - Le domaine officiel de production `campus360b.site`, l'API `api.campus360b.site` et l'admin `admin.campus360b.site` sont servis par Nginx sur le VPS Ubuntu (`164.68.109.206`). Les déploiements Vercel en échec sur les secrets de repo sont sans impact sur la production active.

---

## 11. Sécurité

- **Statut :** 🟢 `CONFORME` — **Dernier audit :** 2026-10-15 par `/cybersec` et GitHub Push Protection.
- **Points certifiés :**
  - Zéro clé privée, mot de passe ou jeton codé en dur dans le code ou l'historique Git.
  - Signature cryptographique HMAC SHA-256 avec comparaison en temps constant sur les webhooks de paiement.
  - Sessions gérées via cookies HTTP-only sécurisés et headers d'autorisation standardisés.
  - Validation et sanitization systématique de tous les payloads entrants.

---

## 12. Déploiement et vérifications

- **Où tourne quoi :**
  - VPS Ubuntu 24.04 LTS (164.68.109.206) : `campus360-landing-site` (3000), `campus360-recruiter-web` (3001), `campus360-mobile-api` (3002).
  - Reverse proxy Nginx avec certificats SSL Let's Encrypt valides sur tous les sous-domaines.
  - Conteneurs Docker : n8n (`5678`), Evolution API (`8081`), PostgreSQL (`5432`), Redis (`6379`).
  - Application Mobile : Expo OTA via EAS Updates (branche `production`).
- **Dernière release en production :**
  - Commit : `651e296` (suivi de `eab3403`)
  - Statut : 🟢 Les trois processus PM2 sont `online` avec un Uptime stable et 0 erreur.
  - Contrôle HTTP : 🟢 `HTTP 200 OK` vérifié sur API, Admin et Landing.

---

## 13. Journal des mises à jour

- **2026-10-15 19:30** `/code-analyzer-context` — Initialisation complète de `contexte-code.md` (Mode 1 - Scan complet) : cartographie des 4 applications, 49 routes d'API, commandes vérifiées avec code 0, flux critiques et inventaire d'infrastructure VPS.
