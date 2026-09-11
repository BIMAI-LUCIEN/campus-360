# Contexte Code : Cache Architectural & Cartographie Détaillée (Campus 360)

> **Statut du Cache** : Scanner actif — Cartographie complète et vérifiée.  
> **Dernière synchronisation** : Septembre 2026.  
> **Usage** : Ce fichier constitue le cache d'ingestion rapide (Instant Recall) pour tout agent IA ou développeur reprenant le projet. Il évite de devoir relire et rescanner l'intégralité du codebase à chaque session.

---

## 1. Profil Architectural & Cartographie des Services

| Service | Emplacement | Stack & Runtime | Port Dev | Rôle Principal |
|---|---|---|:---:|---|
| **App Mobile** | Racine (`/`) | Expo SDK 54, React Native 0.81, React 19, TypeScript Strict | Metro 8081 | Client mobile B2C (iOS, Android, Web) pour étudiants |
| **Mobile API** | `mobile-api/` | Next.js 15.5.7 App Router, Node.js, `pg` direct | **3002** | Backend métier mobile (Auth, Stages, Documents, Wallet, Exports) |
| **Recruiter & Admin** | `recruiter-web/` | Next.js 15.5.7 App Router, Prisma ORM, Tiptap, Tailwind | **3001** | Portail recruteurs B2B (`/recruteur`), Dashboard Admin (`/admin`), Proxy API |
| **Landing Site** | `landing-site/` | Next.js 15.5.19, Tailwind CSS v4, Lucide React | Next dev | Site vitrine commercial et marketing public |
| **Moteur IA & Scrapers**| `scripts/` | Python 3, Gemini 2.0/3.7 Flash API, Shell/Node | CLI / Cron | Scraping d'offres, OCR multimodal de flyers, paiements directs MoMo |

---

## 2. Dictionnaire des Écrans & Composants Mobile (`src/`)

### 2.1 Navigation & Écrans Principaux (`src/ui/screens/`)

- [`src/AppShell.tsx`](file:///F:/mes%20projets/campus%20360/src/AppShell.tsx) :
  - Composant racine orchestrateur (~2050 lignes).
  - Gère l'état global : session `studentSession`, profil `studentProfile`, solde `balance`, crédits `iaCredits`, onglet actif `activeSection`.
  - Navigation par état interne (pas de react-navigation) avec 5 onglets stables : `home`, `stages`, `documents`, `resources`, `account`, complétés par `applications`, `explore`, `library`, `premium`.
  - Modales globales : Recharge Wallet, Notifications, Sécurité/Mot de passe, Sélecteurs Université/Filière/Niveau.
- [`src/ui/screens/HomeScreen.tsx`](file:///F:/mes%20projets/campus%20360/src/ui/screens/HomeScreen.tsx) :
  - Écran d'accueil dynamique centré sur la prochaine action recommandée (Candidature urgente, Top 3 Matches, document en cours ou profil incomplet).
  - Raccourcis directs vers Stages, Candidatures, Atelier Créer et Wallet.
- [`src/ui/screens/StagesScreen.tsx`](file:///F:/mes%20projets/campus%20360/src/ui/screens/StagesScreen.tsx) :
  - Flux des offres de stage avec filtres par filière/secteur.
  - Calcul du score d'affinité (%) en direct selon les compétences du profil étudiant.
  - Cartes d'offres avec badge de sponsorisation, méthode de contact (WhatsApp/Email/In-App) et déclenchement du modal d'IA.
- [`src/ui/screens/ApplicationsTimelineScreen.tsx`](file:///F:/mes%20projets/campus%20360/src/ui/screens/ApplicationsTimelineScreen.tsx) :
  - Suivi chronologique des candidatures envoyées (`PENDING` -> `REVIEWING` -> `INTERVIEW` -> `ACCEPTED` / `REJECTED`).
  - Système de rappel et relances automatiques J+7.
- [`src/ui/screens/ResourcesScreen.tsx`](file:///F:/mes%20projets/campus%20360/src/ui/screens/ResourcesScreen.tsx) :
  - Hub académique combinant les packs d'épreuves d'examens, le catalogue de PDF universitaires, la bibliothèque de documents possédés et les mémoires scrapés.
- [`src/ui/screens/DocumentsScreen.tsx`](file:///F:/mes%20projets/campus%20360/src/ui/screens/DocumentsScreen.tsx) & [`src/features/documents/DocumentsScreen.tsx`](file:///F:/mes%20projets/campus%20360/src/features/documents/DocumentsScreen.tsx) :
  - Hub de création et d'édition de documents professionnels (CV, lettre, rapport de stage, mémoire académique).
- [`src/ui/screens/ProfileScreen.tsx`](file:///F:/mes%20projets/campus%20360/src/ui/screens/ProfileScreen.tsx) :
  - Consultation et édition du profil étudiant, statut de l'abonnement (Gratuit, Basique, Pro, Elite), historique des transactions Mobile Money et paramètres de sécurité.
- [`src/ui/screens/AuthScreen.tsx`](file:///F:/mes%20projets/campus%20360/src/ui/screens/AuthScreen.tsx) :
  - Écran de connexion et d'inscription avec validation, support mot de passe oublié et Google OAuth conditionnel.
- [`src/ui/screens/OnboardingScreen.tsx`](file:///F:/mes%20projets/campus%20360/src/ui/screens/OnboardingScreen.tsx) :
  - Tunnel obligatoire de profilage initial (Université, Filière, 3 Compétences maîtresses, WhatsApp).
- [`src/ui/screens/ScrapedReportsView.tsx`](file:///F:/mes%20projets/campus%20360/src/ui/screens/ScrapedReportsView.tsx) :
  - Moteur de recherche et consultation dans la base de rapports de stage réels scrapés.
- [`src/ui/screens/DefenseCoachModal.tsx`](file:///F:/mes%20projets/campus%20360/src/ui/screens/DefenseCoachModal.tsx) :
  - Simulateur interactif de questions de jury de soutenance avec notation IA.

---

### 2.2 Composants UI & Design System (`src/ui/` & `src/theme/`)

- [`src/theme/stitch.ts`](file:///F:/mes%20projets/campus%20360/src/theme/stitch.ts) :
  - Design system typographique et éditorial rigoureux.
  - Palette : `ink` (`#0F172A`), `paper` (`#F6F1E7`), `sienna` (`#B7410E`), `emerald` (`#047857`), `surface` (`#FFFFFF`).
  - Dégradé signature : `brandGradient` (rouge terracotta -> bordeaux profond).
  - Typographie : `Georgia` (Serif de prestige), `Outfit` (Headlines contemporains), `Inter` (Corps fluide), Monospace (Kickers & Tags).
  - Zéro flou glassmorphism, zéro ombre lourde, borders fines à haute lisibilité.
- [`src/ui/GlassComponents.tsx`](file:///F:/mes%20projets/campus%20360/src/ui/GlassComponents.tsx) :
  - Composants partagés : `BottomNav`, `TopBar`, `GradientButton` (ou `PrimaryButton`), `SecondaryButton`, `SiennaButton`, `Card`, `Pill`, `TransactionRow`, `ScreenMasthead`, `SectionHeading`, `EmptyState`.

---

### 2.3 Modules Métier (`src/features/`)

- **Matching & Stages (`src/features/stages/`)** :
  - [`stagesApi.ts`](file:///F:/mes%20projets/campus%20360/src/features/stages/stagesApi.ts) : Requêtes `/api/mobile/stages`, calcul d'affinité mathématique selon les intersections de tableaux de compétences, mock seed companies.
  - [`AiApplyModal.tsx`](file:///F:/mes%20projets/campus%20360/src/features/stages/AiApplyModal.tsx) : Modal en 3 étapes (Génération IA -> Prévisualisation/Édition live -> Envoi WhatsApp/Email/In-App).
- **Atelier de Documents (`src/features/documents/`)** :
  - [`DocumentEditorScreen.tsx`](file:///F:/mes%20projets/campus%20360/src/features/documents/DocumentEditorScreen.tsx) : Éditeur hybride avec WebView HTML intégrée, toolbar d'enrichissement, chat IA d'assistance et configuration du thème (polices, marges, couleurs d'accent).
  - [`DocGenChat.tsx`](file:///F:/mes%20projets/campus%20360/src/features/documents/DocGenChat.tsx) : Assistant de génération complète de document à partir d'un prompt conversationnel.
  - [`EditorAiChat.tsx`](file:///F:/mes%20projets/campus%20360/src/features/documents/EditorAiChat.tsx) : IA contextuelle pour reformuler, allonger ou résumer une section sélectionnée.
- **Catalogue & Assistant PDF (`src/features/pdf/`)** :
  - [`pdfApi.ts`](file:///F:/mes%20projets/campus%20360/src/features/pdf/pdfApi.ts) : Fetching de documents et packs, achat atomique en coins avec confirmation.
  - [`pdfAssistant.ts`](file:///F:/mes%20projets/campus%20360/src/features/pdf/pdfAssistant.ts) : Chatbot de révision connecté au document sélectionné.
  - [`SimplePdfReaderModal.tsx`](file:///F:/mes%20projets/campus%20360/src/features/pdf/SimplePdfReaderModal.tsx) : Lecteur PDF in-app sécurisé par URL signée éphémère.
- **Authentification (`src/features/auth/betterAuth.ts`)** :
  - Client Better Auth configuré pour Expo (`@better-auth/expo`).
  - Fonction `getDevBackendUrl()` : résolution dynamique de l'IP LAN locale (`Constants.expoConfig?.hostUri`) pour pointer vers le port 3001 ou 3002 sans bloquer les requêtes sur appareil physique.
  - Persistance via `SecureStore` (iOS/Android) et `localStorage` (Web).

---

## 3. Cartographie des Endpoints Backend (`mobile-api/`)

Toutes les routes sont sous [`mobile-api/app/api/`](file:///F:/mes%20projets/campus%20360/mobile-api/app/api/) et protégées par [`mobile-access.ts::requireMobileUser()`](file:///F:/mes%20projets/campus%20360/mobile-api/lib/mobile-access.ts).

### 3.1 Stages & Candidatures
- `GET /api/mobile/stages` : Liste des stages non expirés d'entreprises vérifiées, avec filtres par requête `q` et `sector`.
- `POST /api/mobile/stages/apply` : Enregistrement d'une candidature avec texte de CV/lettre généré par IA (`public.stage_applications`).
- `GET /api/mobile/stages/applications` : Récupération de l'historique des candidatures de l'étudiant connecté.
- `PATCH /api/mobile/stages/applications` : Mise à jour du statut d'une candidature (`PENDING`, `REVIEWING`, `INTERVIEW`, `ACCEPTED`, `REJECTED`).
- `POST /api/mobile/stages/direct-reach` : Prise de contact directe et transmission de message personnalisé à un recruteur.

### 3.2 Gestion du Compte & Wallet
- `GET /api/mobile/account` : Données complètes du compte étudiant, solde de coins, crédits IA, abonnement en cours, liste des achats et transactions récentes.
- `PATCH /api/mobile/account` : Mise à jour des informations de profil (téléphone WhatsApp, filière, niveau).
- `POST /api/mobile/wallet/topup` : Initialisation d'une recharge Mobile Money via FedaPay / CinetPay / MTN MoMo.
- `GET /api/mobile/wallet/topup/[reference]` : Vérification du statut de la transaction (polling mobile).
- `POST /api/mobile/wallet/webhook` : Webhook sécurisé des agrégateurs de paiement pour créditer le portefeuille.

### 3.3 Atelier de Documents
- `GET /api/mobile/documents` & `POST /api/mobile/documents` : CRUD des documents de l'étudiant.
- `GET /api/mobile/documents/[id]` : Chargement du document avec l'ensemble de ses sections ordonnées.
- `POST /api/mobile/documents/[id]/sections` & `PATCH /api/mobile/documents/[id]/sections/[sectionId]` : Gestion des sections.
- `POST /api/mobile/documents/[id]/export/pdf` : Rendu et conversion HTML/CSS en PDF via Puppeteer (application stricte de la politique d'export selon l'abonnement).
- `POST /api/mobile/documents/[id]/export/docx` : Génération de fichier Word docx (réservé aux abonnements Élite).
- `POST /api/mobile/documents/ai` & `POST /api/mobile/documents/generate-full` : Moteur de rédaction assistée par LLM.
- `GET /api/mobile/documents/scraped-reports` : Interrogation des mémoires scrapés.

### 3.4 Catalogue PDF & IA
- `POST /api/mobile/purchase/document` : Transaction SQL atomique d'achat d'un PDF avec contrôle du solde et verrouillage `FOR UPDATE`.
- `POST /api/mobile/purchase/pack` : Transaction SQL d'achat d'un pack complet d'épreuves.
- `GET /api/mobile/pdf/signed-url` : Génération d'une URL de lecture sécurisée à durée de vie limitée (15 min).
- `POST /api/ai/pdf-chat` : Proxy d'interrogation IA pour l'assistant de révision sur document.

---

## 4. Schéma de la Base de Données (PostgreSQL / Supabase)

### 4.1 Tables "Stages & Recrutement" (`docs/STAGES_SUPABASE.sql`)
1. **`public.stage_students`** :
   - `id` (uuid, PK), `auth_id` (text unique), `app_user_id` (uuid, FK `app_users`), `full_name`, `phone_whatsapp`, `email`, `education_level`, `major`, `skills` (text[]), `portfolio_url`, `tokens` (int, def 1), `is_premium` (bool), `boost_ends_at` (timestamptz), `created_at`.
2. **`public.stage_companies`** :
   - `id` (uuid, PK), `name`, `industry`, `address`, `contact_email`, `contact_whatsapp`, `kyb_score` (int 0-100), `status` (`UNVERIFIED`, `VERIFIED`, `SUSPENDED`), `is_premium`, `logo_url`, `created_at`.
3. **`public.stage_jobs`** :
   - `id` (uuid, PK), `company_id` (uuid, FK `stage_companies`), `title`, `description` (max 2000 car.), `requirements` (text[]), `apply_method` (`WHATSAPP`, `EMAIL`, `PHYSICAL`), `is_sponsored` (bool), `source` (`INTERNAL`, `SCRAPED`), `location`, `duration`, `stipend`, `flyer_url`, `video_url`, `created_at`, `expires_at`.
4. **`public.stage_applications`** :
   - `id` (uuid, PK), `student_id` (uuid, FK `stage_students`), `job_id` (uuid, FK `stage_jobs`), `status` (`PENDING`, `REVIEWING`, `INTERVIEW`, `ACCEPTED`, `REJECTED`), `applied_at`, `cv_file_url`, `letter_file_url`, `generated_cv_text`, `generated_letter_text`, `last_reminded_at`, `notes`. Clé unique composite `(student_id, job_id)`.

### 4.2 Tables "Utilisateurs, Wallets & Documents"
1. **`public.app_users`** : Table unifiée d'identités associant les identifiants Better Auth (`better_auth_user_id`) et les données académiques.
2. **`public.app_wallets`** : Portefeuille d'étudiant (`balance_coins`, `ia_credits`, `report_credits`).
3. **`public.app_wallet_transactions`** : Historique financier complet (`amount_coins`, `type`, `status`).
4. **`public.app_documents`** : Documents d'atelier (`template_type`, polices, couleurs thématiques, template de couverture).
5. **`public.app_document_sections`** : Sections d'un document (`content_html`, `content_json`, `sort_order`, `is_system`).
6. **`public.scraped_stage_reports`** : Rappels et mémoires réels indexés pour inspiration.
7. **`public.documents` & `public.pdf_packs`** : Catalogue public de cours et d'annales d'examens.

---

## 5. Portail Recruteur B2B (`recruiter-web/`)

- **Espace Recruteur B2B ([`app/recruteur/page.tsx`](file:///F:/mes%20projets/campus%20360/recruiter-web/app/recruteur/page.tsx))** :
  - **Onglet Publication** : Formulaire de publication d'offre avec options de sponsoring payant par jour (1 000 FCFA/jour via Mobile Money) et sélection du canal de postulation direct (WhatsApp / Email).
  - **Onglet CVthèque** : Consultation des profils étudiants avec vidéos de pitch de 30 secondes et compétences vérifiées.
  - **Onglet Détective KYB** : Système multimodal anti-fraude (RCCM, URL réseau social de plus de 6 mois, code de validation OTP WhatsApp).
- **Dashboard Admin ([`app/admin/`](file:///F:/mes%20projets/campus%20360/recruiter-web/app/admin/))** :
  - Supervision des utilisateurs, gestion des statuts de documents PDF (`draft` -> `analyzing` -> `published`), packs d'épreuves, graphiques Recharts d'usage et de revenus.
- **Passerelle Proxy** :
  - `next.config.ts` dans `recruiter-web` redirige automatiquement les requêtes `/api/mobile/:path*` vers `mobile-api` (`http://localhost:3002`).

---

## 6. Pipelinage IA & OCR (`scripts/`)

- **OCR Multimodal de Flyers ([`scripts/scrape_flyers_ocr.py`](file:///F:/mes%20projets/campus%20360/scripts/scrape_flyers_ocr.py))** :
  - Utilise l'API Google Gemini 2.0 Flash (`gemini-2.0-flash:generateContent`).
  - Convertit les captures d'écran et flyers de recrutement en Base64 et extrait les champs requis (`company_name`, `title`, `description`, `requirements`, `location`, `duration`, `stipend`, `contact_whatsapp`, `contact_email`, `apply_method`).
  - Insère directement les enregistrements dans Supabase via PostgREST ou PostgreSQL.
- **Paiements Directs MTN MoMo ([`scripts/mtn_momo_payment.py`](file:///F:/mes%20projets/campus%20360/scripts/mtn_momo_payment.py))** :
  - Script Python autonome déclenchant les demandes d'autorisation de débit direct par USSD push sans passer par des intermédiaires coûteux.

---

## 7. Points de Vigilance & Dette Technique Identifiée

1. **Partage du Secret d'Authentification** : `mobile-api` et `recruiter-web` doivent impérativement posséder la même variable `BETTER_AUTH_SECRET` dans leurs `.env.local` respectifs pour que les sessions soient interchangeables.
2. **Duplication `documents-db.ts`** : Le fichier existe dans `mobile-api/lib/` et `recruiter-web/lib/`. La version de `mobile-api` est la plus complète et intègre les attributs thématiques d'éditeur. Toujours maintenir les deux synchronisés lors de modifications structurelles.
3. **Résolution IP LAN Dev** : Lors de tests sur un smartphone physique via Expo Go, l'appareil ne peut pas résoudre `localhost:3001` ou `localhost:3002`. La fonction `getDevBackendUrl()` dans `src/features/auth/betterAuth.ts` utilise `hostUri` pour extraire automatiquement l'adresse IP de la machine hôte sur le réseau Wi-Fi local.
4. **Défense Build Vercel** : `databasePool` dans `mobile-api/lib/database.ts` et `auth` dans `lib/auth.ts` sont encapsulés dans des Proxies défensifs afin que `next build` ne plante jamais sur Vercel lorsque `DATABASE_URL` n'est pas fourni lors de la phase de compilation statique.
