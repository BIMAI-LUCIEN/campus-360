# Contexte & Spécifications Globales : Campus 360

Ce document unifié sert de référence absolue pour comprendre à la fois la vision produit, les parcours utilisateurs et l'architecture technique intégrale du monorepo **Campus 360**. Il permet à tout développeur ou agent IA de travailler avec un contexte complet et sans ambiguïté.

---

## 1. Vision & Proposition de Valeur

**Campus 360** est une plateforme double (B2C Mobile / B2B Web) conçue pour simplifier et automatiser la recherche et l'obtention de stages pour les étudiants en Afrique Francophone (Cameroun, Côte d'Ivoire, Sénégal, Bénin, Togo, etc.), tout en offrant aux entreprises un outil de sourcing qualifié, direct et sécurisé.

* **Slogan** : *« L'IA qui trouve et décroche ton stage. »*
* **Cœur de cible B2C** : Étudiants d'IUT, BTS, Licences, Masters cherchant un stage académique, professionnel ou de fin d'études (PFE).
* **Cœur de cible B2B** : Recruteurs, DRH, PME, Startups et grands groupes locaux à la recherche de stagiaires pré-qualifiés.
* **Hiérarchie Produit** :
  1. **Priorité 1 (Cœur)** : Trouver, matcher et décrocher un stage (Feed intelligent, calcul de % de match, postulation IA 1-clic).
  2. **Priorité 2** : Atelier de rédaction et d'outils professionnels (CV, lettre de motivation sur-mesure, rapport de stage, mémoire académique).
  3. **Priorité 3 (Ressources)** : Catalogue académique de PDF, annales d'examens et assistant IA de révision.

---

## 2. Architecture des Fonctionnalités

```text
                               ┌────────────────────────────────┐
                               │           CAMPUS 360           │
                               └───────────────┬────────────────┘
                                               │
                 ┌─────────────────────────────┴─────────────────────────────┐
                 ▼                                                           ▼
     💼 FONCTIONNALITÉS CŒUR (B2C)                               📦 FONCTIONNALITÉS SECONDAIRES
 ──────────────────────────────────────                     ──────────────────────────────────────
 • Onboarding interactif & profilage compétences            • Catalogue d'Épreuves PDF (En ligne / Hors-ligne)
 • Flux de Stages avec score de Matching (%)                • Bibliothèque de cours & épreuves acquis
 • Postulation IA 1-Clic (CV & Lettre ciblés)               • Assistant IA de Révision & Quiz
 • Atelier Rédaction (CV, Lettre, Rapport, Mémoire)         • Portefeuille & Micro-paiements Mobile Money
 • Timeline des Candidatures & Relances J+7                 • Banques de rapports de stage scrapés
 • Système KYB Anti-fraude Entreprise (>80%)                • Détective de soutenance IA
```

---

## 3. Le Parcours Utilisateur Étudiant (Mobile Expo)

### A. L'Onboarding Obligatoire & Profilage
1. **Établissement & Université** : Sélection parmi les universités et grandes écoles ciblées.
2. **Filière & Niveau d'études** : BTS, Licence 1 à 3, Master, Cycle Ingénieur.
3. **Compétences clés** : Saisie et sélection de compétences (techniques et soft skills).
4. **Coordonnées de contact** : Téléphone WhatsApp obligatoire pour les alertes et les recruteurs.

### B. Recherche de Stages & Algorithme de Match
* Cartes d'offres dynamiques avec filtres par domaine (Informatique, Gestion, Finance, BTP, etc.).
* Badge de **% de Matching calculé dynamiquement** :
  * **Vert (80–100%)** : Adéquation forte, l'IA recommande de postuler sans attendre.
  * **Bleu (60–79%)** : Adéquation partielle, l'IA adapte la lettre pour compenser les lacunes.
  * **Neutre (<60%)** : Déconseillé ou exploratoire.

### C. Les 3 Canaux de Postulation
1. **Postulation Interne (In-App)** : Envoi direct du dossier qualifié sur le tableau de bord du recruteur validé.
2. **Postulation WhatsApp** : Ouverture immédiate de l'application WhatsApp avec texte pré-rempli et PDF prêt à l'envoi.
3. **Postulation E-mail** : Transmission directe avec en-têtes configurés pour réponse à l'étudiant.

### D. Suivi des Candidatures & Relance J+7
* Timeline visuelle des étapes (`PENDING`, `REVIEWING`, `INTERVIEW`, `ACCEPTED`, `REJECTED`).
* Alertes et rappels automatisés J+7 pour relancer les recruteurs sans stress.

---

## 4. Modèle Économique & Structure des Prix

### A. Micro-Paiements à la Carte (Mobile Money FCFA)
* **Paiements supportés** : MTN Mobile Money, Orange Money, Moov, Wave.
* **Recharge Wallet** : À partir de 500 FCFA.
* **Postulation IA complète** : 1 000 FCFA (ou 1 jeton de candidature).
* **Atelier Rédaction** :
  * CV / Lettre : 500 FCFA
  * Rapport de stage : 1 000 FCFA
  * Mémoire académique : 2 000 à 3 000 FCFA
* **PDF Académique** : 25 à 100 FCFA par document.

### B. Abonnements Mensuels
| Offre | Prix mensuel | Candidatures IA | Rédactions Atelier | PDF Catalogue | Chat IA | Exports Atelier |
|---|---:|:---:|:---:|:---:|:---:|:---:|
| **Gratuit** | 0 FCFA | 1 offerte | Aperçu seul | Lecture limitée | Non | Aperçu avec filigrane |
| **Basique** | 2 000 FCFA | 5 / mois | 3 rédactions | Illimité en ligne | 500 msgs | PDF filigrané |
| **Pro** | 3 500 FCFA | 10 / mois | 5 rédactions | Illimité + Hors-ligne | 1 000 msgs | PDF sans filigrane |
| **Elite** | 5 000 FCFA | 20 / mois | 10 rédactions | Illimité + Mode Boost | 2 000 msgs | PDF & Word sans filigrane |

---

## 5. Le Portail Recruteur B2B & Système KYB

* **Vérification Anti-Fraude (KYB)** :
  * Grandes Entreprises : vérification automatique e-mail de domaine et site web.
  * Startups / Micro-entreprises : vérification RCCM / ID fiscal ou réseau social d'entreprise actif (> 6 mois) + validation obligatoire par OTP WhatsApp.
  * Score KYB de 0 à 100 ; verrouillage des contacts WhatsApp d'étudiants sous un certain seuil.
* **Publication & Boost d'Offres** :
  * Formulaire rapide avec canaux de réponse ciblés (WhatsApp / Email).
  * Boost quotidien d'offres financé par Mobile Money.
* **CVthèque Dynamique** : Accès aux profils qualifiés, compétences et vidéos de présentation.

---

## 6. Architecture & Contexte Technique Global

### 6.1 Stack & Commandes

#### A. Application Mobile Client (`campus-360` - Racine)
- **Technologies** : Expo SDK 54.0.36, React Native 0.81.5, React 19.1.0, TypeScript 5.9.2, Lucide Icons, Expo Linear Gradient, SecureStore, Notifications.
- **Authentification** : Better Auth Client (`@better-auth/expo` ^1.6.19) avec auto-détection LAN IP pour tests sur mobile physique.
- **Design System** : Thème Stitch éditorial (`theme/stitch.ts`) fondé sur `ink` (#0F172A), `paper` (#F6F1E7), `sienna` (#B7410E) et `emerald` (#047857).
- **Scripts Réels** :
  - Lancement Bundler Expo : `npm run start` (ou `npx expo start --clear`)
  - Mode Web : `npm run web` (ou `expo start --web`)
  - Émulateur Android : `npm run android`
  - Simulateur iOS : `npm run ios`
  - Contrôle Typage : `npm run typecheck` (`node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit`)

#### B. API Métier Mobile (`mobile-api/`)
- **Technologies** : Next.js 15.5.7 (App Router, Node.js runtime, Port 3002), PostgreSQL (driver direct `pg` ^8.21.0), Zod 4.3.6, Puppeteer 25.1.0, Resend 4.0.0, Better Auth 1.3.34.
- **Scripts Réels** :
  - Serveur de Développement : `npm run dev` (`next dev -p 3002`)
  - Compilation Production : `npm run build` (`next build`)
  - Démarrage Production : `npm run start` (`next start -p 3002`)
  - Contrôle Typage : `npm run typecheck` (`tsc --noEmit`)
  - Tests d'Intégration HTTP : `npm test` (`node --test tests/*.test.mjs`)

#### C. Portail Recruteur & Admin Web (`recruiter-web/`)
- **Technologies** : Next.js 15.5.7 (App Router, Port 3001), Prisma ORM (`prisma/schema.prisma`), Tailwind CSS 4.3.1, Tiptap React 3.27.1, Recharts 3.9.0, Puppeteer, docx 9.7.1, pdf-lib, pdfjs-dist.
- **Rôle de Passerelle** : Proxifie `/api/mobile/:path*` vers `mobile-api` (Port 3002) via les rewrites `next.config.ts`.
- **Scripts Réels** :
  - Développement : `npm run dev` (`next dev -p 3001`)
  - Pré-build CSS : `npm run predev` / `npm run css:build` (`node scripts/prebuild-css.mjs`)
  - Compilation : `npm run build` (`npm run css:build && next build`)
  - Contrôle Typage : `npm run typecheck` (`tsc --noEmit`)
  - Migrations de données : `npm run mvp:migrate`, `npm run mobile:setup`, `npm run auth:migrate`

#### D. Site Vitrine & Landing Page (`landing-site/`)
- **Technologies** : Next.js 15.5.19, React 19.1.0, Tailwind CSS v4, Lucide React, Better Auth.
- **Scripts Réels** :
  - Développement : `npm run dev` (`next dev --turbopack`)
  - Compilation : `npm run build` (`next build`)
  - Démarrage : `npm run start` (`next start`)
  - Linter : `npm run lint` (`next lint`)

#### E. Moteur IA & Automatisation (`scripts/`)
- **Technologies** : Python 3, Google Gemini 2.0 Flash / 3.7 Flash API (OCR Multimodal & Rédaction ciblée), API MTN Mobile Money (USSD Push direct).

---

### 6.2 Arborescence Nette du Projet

```text
campus-360/
├── App.tsx                             # Point d'entrée Expo (délègue à src/AppShell.tsx)
├── index.ts                            # Enregistrement racine Expo
├── app.json                            # Configuration Expo SDK 54 & EAS
├── tsconfig.json                       # Config TypeScript Mobile (extends expo/tsconfig.base)
├── package.json                        # Dépendances Mobile Expo
├── CLAUDE.md                           # Documentation technique interne
├── contexte.md                         # Référence globale produit & architecture unifiée
├── contexte_code.md                    # Cache architectural & dictionnaire des composants
│
├── src/                                # CODE SOURCE APPLICATION MOBILE
│   ├── AppShell.tsx                    # Composant maître : navigation (5 onglets), wallet, sessions
│   ├── types.ts                        # Types partagés (StageJob, StageApplication, CampusDocument...)
│   ├── theme/
│   │   └── stitch.ts                   # Design system éditorial (couleurs, rayons, typos, presets)
│   ├── config/
│   │   └── env.ts                      # Configuration des variables d'environnement publiques
│   ├── ui/
│   │   ├── GlassComponents.tsx         # Composants UI (BottomNav, TopBar, GradientButton, Card, Pill)
│   │   ├── Toast.tsx                   # Système in-app de notifications Toast
│   │   └── screens/                    # Écrans fonctionnels
│   │       ├── HomeScreen.tsx          # Tableau de bord étudiant & prochaine action dynamique
│   │       ├── StagesScreen.tsx        # Feed des stages, recherche, filtres secteurs & matching %
│   │       ├── ApplicationsTimelineScreen.tsx # Suivi des candidatures & relances J+7
│   │       ├── ResourcesScreen.tsx     # Hub académique unifié (catalogue PDF, bibliothèque)
│   │       ├── DocumentsScreen.tsx     # Liste et accès à la rédaction de documents
│   │       ├── ProfileScreen.tsx       # Gestion profil, wallet, abonnements et paramètres
│   │       ├── AuthScreen.tsx          # Authentification étudiant (email/mdp, Google)
│   │       ├── OnboardingScreen.tsx    # Questionnaire de profilage obligatoire
│   │       ├── ExploreScreen.tsx       # Découverte approfondie de documents
│   │       ├── LibraryScreen.tsx       # Bibliothèque personnelle de documents débloqués
│   │       ├── ScrapedReportsView.tsx  # Consultation des rapports de stage scrapés
│   │       ├── DefenseCoachModal.tsx   # Coach IA pour préparation à la soutenance
│   │       └── WritingWorkshopModal.tsx# Atelier interactif de rédaction
│   └── features/
│       ├── auth/
│       │   └── betterAuth.ts           # Client Better Auth, stockage SecureStore, auto-IP LAN dev
│       ├── stages/
│       │   ├── stagesApi.ts            # Client API stages, calcul de score de match, mock data
│       │   └── AiApplyModal.tsx        # Modal de génération IA 1-clic de candidature (CV + Lettre)
│       ├── documents/
│       │   ├── DocumentsScreen.tsx     # Gestionnaire de documents atelier
│       │   ├── DocumentEditorScreen.tsx# Éditeur hybride natif / WebView
│       │   ├── DocGenChat.tsx          # Assistant conversationnel de génération de document
│       │   ├── EditorAiChat.tsx        # Assistant d'édition de section IA
│       │   ├── DocumentImagesModal.tsx # Insertion et gestion des images
│       │   └── DocumentSourcesModal.tsx# Gestion des sources et références
│       ├── pdf/
│       │   ├── pdfApi.ts               # Requêtes catalogue PDF et achats de packs
│       │   ├── pdfAssistant.ts         # Chat contextuel IA sur PDF
│       │   ├── PdfStudentSection.tsx   # Composant complet catalogue & lecteur
│       │   └── SimplePdfReaderModal.tsx# Lecteur PDF sécurisé in-app
│       ├── onboarding/
│       │   ├── FreePdfSelector.tsx     # Choix du PDF gratuit à l'inscription
│       │   └── OnboardingScreen.tsx    # Slides d'accueil
│       └── subscriptions/
│           └── plans.ts                # Définition des plans tarifaires (Gratuit, Basique, Pro, Elite)
│
├── mobile-api/                         # BACKEND DÉDIÉ CLIENT MOBILE (Port 3002)
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts  # Instance Better Auth serveur (catch-all)
│   │   │   ├── health/route.ts         # Healthcheck serveur
│   │   │   ├── ai/pdf-chat/route.ts    # Chat IA sur PDF académiques
│   │   │   └── mobile/
│   │   │       ├── account/route.ts    # Profil, portefeuille, abonnements et achats
│   │   │       ├── stages/             # Endpoints Stages
│   │   │       │   ├── route.ts        # Liste et recherche d'offres actives
│   │   │       │   ├── apply/route.ts  # Soumission d'une candidature générée par IA
│   │   │       │   ├── applications/route.ts # Historique et statut des candidatures
│   │   │       │   └── direct-reach/route.ts # Prise de contact directe étudiant -> entreprise
│   │   │       ├── documents/          # CRUD et exports de documents d'atelier
│   │   │       │   ├── route.ts, [id]/route.ts
│   │   │       │   ├── [id]/sections/  # Gestion des sections (chapitres)
│   │   │       │   ├── [id]/export/pdf/# Export PDF haute fidélité (Puppeteer)
│   │   │       │   ├── [id]/export/docx/# Export Word docx
│   │   │       │   └── ai/, generate/  # Génération IA de contenu et plans
│   │   │       ├── wallet/             # Recharges Mobile Money & Webhook
│   │   │       ├── purchase/           # Achats atomiques de documents et de packs
│   │   │       └── subscription/       # Souscription aux abonnements mensuels
│   ├── lib/
│   │   ├── database.ts                 # Pool de connexion PostgreSQL Supabase (pg) avec Proxy défensif
│   │   ├── auth.ts                     # Configuration Better Auth serveur et plugins
│   │   ├── stages-db.ts                # Requêtes SQL directes pour stages, entreprises, candidatures
│   │   ├── documents-db.ts             # Accès aux tables app_documents et app_document_sections
│   │   ├── mobile-access.ts            # Middleware de validation session et rate-limiting
│   │   └── mailer.ts                   # Envoi d'emails transactionnels (Resend)
│   └── tests/
│       └── documents.test.mjs          # Tests d'intégration HTTP
│
├── recruiter-web/                      # PORTAIL RECRUTEUR B2B & ADMIN (Port 3001)
│   ├── app/
│   │   ├── page.tsx                    # Page d'accueil portail / téléchargement APK
│   │   ├── recruteur/
│   │   │   └── page.tsx                # Espace Recruteur B2B (Offres, Boosts, CVthèque, KYB)
│   │   ├── admin/                      # Dashboard Supervision Admin (PDFs, packs, users, stats)
│   │   ├── documents/[id]/page.tsx     # Éditeur web riche Tiptap
│   │   └── api/                        # Routes internes et passerelle proxy vers mobile-api
│   ├── prisma/
│   │   └── schema.prisma               # Modèles Student, Company, Job, Application
│   └── lib/
│       ├── access.ts                   # Contrôle d'accès et guards admin
│       ├── stages-db.ts                # Requêtes d'accès aux stages côté web
│       └── supabase-pdf.ts             # Gestionnaire du catalogue PDF
│
├── landing-site/                       # SITE VITRINE PUBLIC & MARKETING
│   └── app/                            # Pages publiques Next.js App Router (tarifs, téléchargement...)
│
├── scripts/                            # PIPELINES AUTONOMES & SCRAPING
│   ├── scrape_flyers_ocr.py            # OCR multimodal Gemini 2.0 pour extraction d'offres depuis flyers
│   ├── mtn_momo_payment.py             # Script de test et gestion des paiements directs MTN MoMo
│   ├── migrate-stages-supabase.mjs     # Script d'application du schéma SQL stages dans Supabase
│   └── test-all-agents-suite.mjs       # Suite de tests d'automatisation
│
└── docs/                               # SPÉCIFICATIONS ET SCRIPTS SQL
    ├── STAGES_SUPABASE.sql             # Définition des tables stage_*
    └── context.md                      # Historique du cadrage produit
```

---

### 6.3 Règles de Typage & Conventions Impératives

1. **Typage TypeScript Strict** :
   - Aucun `any` implicite autorisé.
   - Types partagés du mobile centralisés dans [`src/types.ts`](file:///F:/mes%20projets/campus%20360/src/types.ts).
   - Validation systématique des entrées API avec **Zod** (`mobile-api/` et `recruiter-web/`).
2. **Gestion des Données & Base de Données** :
   - Accès PostgreSQL direct via driver `pg` sécurisé (`databasePool`).
   - Transactions SQL explicites (`BEGIN`, `COMMIT`, `ROLLBACK`) et verrouillage `FOR UPDATE` sur les opérations de portefeuille et de débits pour éviter tout double-débit ou race condition.
   - Les modèles `stage_*` utilisent des UUID générés via `gen_random_uuid()` avec clés étrangères en cascade (`on delete cascade`).
3. **Sécurité et Authentification** :
   - Même secret partagé `BETTER_AUTH_SECRET` et même URL de base de données `DATABASE_URL` entre `mobile-api` et `recruiter-web`.
   - Les sessions Better Auth utilisent un cookie sécurisé en production et un en-tête `Authorization: Bearer <token>` sur le mobile.
   - Détection automatique de l'adresse IP de développement local dans `src/features/auth/betterAuth.ts` via `Constants.expoConfig?.hostUri`.
4. **Gestion des Erreurs Normalisée** :
   - Les endpoints API encapsulent les erreurs dans `try/catch` et renvoient `mobileErrorResponse(error)`.
   - Classes d'erreurs typées : `MobileApiError` (avec code de statut HTTP dédié) et `RateLimitError` (HTTP 429).
5. **Design System Mobile** :
   - Utilisation exclusive des tokens de `src/theme/stitch.ts`.
   - Interdiction formelle du style "glassmorphism" dépassé, des ombres lourdes ou des dégradés saturés hors du gradient signature de marque (`brandGradient`).
   - Typographie éditoriale : Serif pour les affichages littéraires, Outfit pour les titres modernes, Inter pour le corps de texte.

---

## 7. Journal d'Exécution & Refonte UI (APEX)

### 7.1 Refonte Épurée de la Page d'Accueil (`HomeScreen.tsx`)
- **Objectif** : Éliminer la surcharge cognitive, recentrer l'expérience sur **une seule offre en vedette** ("Ton meilleur match du jour") et rendre la candidature assistée par IA accessible dès le premier écran sans friction.
- **Modifications appliquées** :
  - **En-tête minimaliste** : Salutation dynamique, avatar avec initiales, filière universitaire de l'étudiant, et indicateur de jetons IA disponibles.
  - **Carte héroïque "Meilleur Match"** : Titre du poste, entreprise certifiée, localisation, durée, indemnité mensuelle, score de match (`% Match ✨`) calculé selon le profil, et badges de compétences clés.
  - **CTA IA 1-Clic (`AiApplyModal`)** : Bouton d'action signature `[ ⚡ Postuler avec l'IA (1-Clic) ]` câblé directement sur l'offre affichée. Ouvre la modal de génération instantanée de CV et de lettre de motivation adaptés à l'offre.
  - **Statut de candidature en cours** : Bannière sobre alertant l'étudiant de l'état de sa dernière candidature si active.
  - **Accès secondaire épuré** : Liens discrets vers le catalogue complet des stages, l'Atelier de Rédaction et le Hub Académique.
  - **Éléments supprimés** : Suppression complète de la fausse carte bancaire violette, de la grille 2x2 redondante avec la barre de navigation, et de la liste de relevés de transactions.
- **Passage de props (`src/AppShell.tsx`)** : Injection du profil complet de l'étudiant (`studentProfile`) dans `HomeScreen` pour alimenter le matching et l'IA.

### 7.3 Refonte Glassmorphic du Dashboard & Profil (Maquette Complète)
- **Objectif** : Aligner à 100% l'expérience visuelle sur la nouvelle maquette de référence mobile (Dashboard 2x2 et Écran Profil).
- **Modifications appliquées** :
  - **Composant `DashboardGrid` & `DashboardHubCard` (`src/ui/GlassComponents.tsx`)** :
    - 4 grandes cartes blanches arrondies avec icônes 3D (`Postuler IA`, `Mes Candidatures`, `Atelier Rédaction`, `Stages & Favoris`), titres serif, sous-titres descriptifs et boutons flèches `→`.
    - Intégré directement dans `HomeScreen.tsx` et disponible en vue dédiée `DashboardScreen.tsx`.
  - **Barre de Navigation Flottante `BottomNav` (`src/ui/GlassComponents.tsx`)** :
    - Pilule frosted glass flottante avec ombre douce.
    - L'onglet actif se transforme en capsule noire/anthracite (`#111827`) avec icône et libellé blancs (`[ 🏠 Accueil ]` / `[ 👤 Profil ]`).
  - **Harmonisation Charte Graphique Violette (Home, Profil, Dashboard & BottomNav)** :
    - **Accueil (`src/ui/screens/HomeScreen.tsx`)** : Retrait des 4 tuiles blanches intrusives. L'accueil retrouve son flux dark violet fluide et captivant (En-tête de localisation ➔ Barre de recherche arrondie ➔ Hero banner ➔ Filières populaires en tuiles douces ➔ Offres recommandées ➔ Réassurance).
    - **Écran Profil Violet Obsidienne (`src/ui/screens/ProfileScreen.tsx`)** : 100% aligné sur la charte graphique violette : fond sombre `#090714`, halo concentrique violet lumineux `#8B5CF6`, carte en verre obsidienne `#131024`, badge `👑 Premium` ambre/violet, 3 pilules statistiques en verre sombre, bannière de recharge en dégradé royal violet et menu aux chevrons lavande.
    - **Dashboard Hub (`src/ui/screens/DashboardScreen.tsx` & `DashboardHubCard`)** : Conversion des 4 tuiles 2x2 et des en-têtes vers le thème dark violet avec bordures douces et typographies blanches.
    - **Barre de Navigation Flottante (`BottomNav`)** : Fond verre sombre `rgba(13, 10, 28, 0.94)`, bordure violette subtile, capsule active en violet royal électrique `#7C3AED` avec icône et libellé blancs, et icônes inactives discrètes en `#94A3B8`.

---

## 8. Preuves de Validation Mécanique & Visuelle (/test-and-verify)

- **Compilation TypeScript Strict** :
  - Commande : `node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit`
  - Résultat : **0 erreur** (Code retour 0).
- **Serveurs de Développement** :
  - Expo Web : Actif sur `http://localhost:8081` (Background Task `task-418`).
  - Next.js Mobile API : Actif sur `http://localhost:3002` (Background Task `task-416`).
- **Preuves Visuelles Réelles (Playwright)** :
  - Script : `scripts/verify_dashboard_profile.js`
  - Capture 1 : [`.agent/screenshots/home_verified.png`](file:///f:/mes%20projets/campus%20360/.agent/screenshots/home_verified.png) — Accueil épuré sans éléments blancs, flux continu dark violet et BottomNav en pilule active violette.
  - Capture 2 : [`.agent/screenshots/profile_verified.png`](file:///f:/mes%20projets/campus%20360/.agent/screenshots/profile_verified.png) — Écran Profil complet avec halo violet lumineux, 3 stats pills sombres, bannière royal violet et menu chevrons.
- **Verdict de conformité** : **VERIFIED** (100% conforme à la charte graphique violette Campus 360).


