# Plan de Développement MVP : Campus 360 (Lancement Flash & Spécifications Officielles)

> **Progression globale :** 45/45 tâches validées (100%) — Module 14 certifié  
> **Couverture MVP :** 100% des fonctionnalités du cadrage `contexte.md` (Template CV Officiel, Ingestion n8n, Mobile Money, Onboarding Express, Suivi J+7, Expédition Automatisée WhatsApp/Email via Evolution API & N8N)  
> **Dernière mise à jour :** 2026-10-07 17:35  

---

## 🏛️ HISTORIQUE DES MODULES DÉJÀ VALIDÉS (1 à 8)

- [X] **MODULE 1 : Composants Communs & Design System (Fondations Visuelles)** (Tâches 1.1)
- [X] **MODULE 2 : Page d'Accueil (`HomeScreen.tsx`) — Structure Épurée** (Tâches 2.1)
- [X] **MODULE 3 : Harmonisation des Écrans Principaux (Stages, Suivi, Profil)** (Tâches 3.1 à 3.4)
- [X] **MODULE 4 : Déploiement & Pipeline Vercel / GitHub Actions** (Tâches 4.1)
- [X] **MODULE 5 : Dashboard Hub & Profil Calqués sur la Charte** (Tâches 5.1 à 5.4)
- [X] **MODULE 6 : Trouver un Stage avec les Agents IA (Matcher + Rédacteur)** (Tâches 6.1 à 6.9)
- [X] **MODULE 7 : Refonte Anti-Saturation IA (DA Calme, Sobre et Crédible)** (Tâches 7.1 à 7.5)
- [X] **MODULE 8 : Template CV Officiel (Génération & Rendu PDF Conforme au Gabarit)** (Tâches 8.1 à 8.4)

---

## ⚙️ MODULE 9 : Pipeline d'Ingestion Automatisée n8n $\rightarrow$ Campus 360 API

### 1. Endpoint Backend d'Ingestion Sécurisé
- [X] **Tâche 9.1 : Endpoint API `POST /api/mobile/stages/ingest` & Validation Zod**
  - **Fichiers :** `mobile-api/app/api/mobile/stages/ingest/route.ts`, `mobile-api/lib/stages-db.ts`
  - **Action :**
    - Créer la route d'ingestion dédiée pour l'Agent n8n.
    - Authentifier les requêtes via un header secret `X-N8N-API-KEY` stocké en variable d'environnement (`N8N_INGESTION_SECRET`).
    - Valider le payload avec Zod selon le schéma convenu (rejet systématique si aucun contact WhatsApp ou Email).
  - **DoD :** Test unitaire `scripts/test-stage-ingest.mjs` validant les 6 scénarios (HTTP 201 avec clé valide, HTTP 401 si clé absente, HTTP 400 si sans contact).

- [X] **Tâche 9.2 : Persistance & Dédoublonnage des Offres en Base Supabase**
  - **Fichiers :** `mobile-api/lib/stages-db.ts`
  - **Action :**
    - Fonction atomique `ingestStageJob` avec transaction SQL PostgreSQL (`begin ... commit`).
    - Vérification et création automatique de l'entreprise dans `stage_companies` (Score KYB 85, statut `VERIFIED`).
    - Détection de doublons (même entreprise + même titre + même ville) avec mise à jour intelligente des dates d'expiration.
  - **DoD :** Code compilé sans erreur (`mobile-api` typecheck code 0) et transaction sécurisée.

### 2. Spécification & Modèle du Workflow n8n
- [X] **Tâche 9.3 : Modèle de Workflow n8n Exportable (`n8n-workflow-stages.json`)**
  - **Fichiers :** `scripts/n8n/stages_ocr_ingestion_workflow.json`, `docs/N8N_PIPELINE.md`
  - **Action :**
    - Modèle exportable n8n complet : Cron 1h, Webhook entrant, nœud Gemini Flash Vision OCR et requête HTTP POST vers l'API.
    - Documentation pas-à-pas de déploiement dans `docs/N8N_PIPELINE.md`.
  - **DoD :** Fichier JSON valide et importable dans n8n, documentation exhaustive avec commandes curl.

---

## 💳 MODULE 10 : Monétisation Mobile Money Direct (CinetPay / Notch Pay)

### 1. Service d'Initiation & Webhook de Paiement
- [X] **Tâche 10.1 : Endpoint Backend d'Initiation de Paiement Mobile Money**
  - **Fichiers :** `mobile-api/app/api/mobile/payments/initiate/route.ts`, `mobile-api/lib/payments.ts`
  - **Action :**
    - Passerelle Notch Pay / CinetPay (compatible MTN MoMo, Orange Money Cameroun/CI, Wave).
    - Route `POST /api/mobile/payments/initiate` gérant les 2 formules :
      - *Pack Découverte (500 FCFA)* $\rightarrow$ 5 candidatures IA avec CV officiel.
      - *Pass Mensuel (2 000 FCFA)* $\rightarrow$ 30 jours illimités + relances J+7.
    - Formatage automatique des numéros locaux en E.164 (+237 / +225) et déclenchement push USSD.
  - **DoD :** Route fonctionnelle, validée par `scripts/test-payments-flow.mjs` et typecheck code 0.

- [X] **Tâche 10.2 : Webhook de Validation & Crédit Atomique des Jetons**
  - **Fichiers :** `mobile-api/app/api/mobile/payments/webhook/route.ts`, `mobile-api/lib/payments.ts`
  - **Action :**
    - Vérification cryptographique de la signature HMAC SHA-256 avec `timingSafeEqual`.
    - Crédit transactionnel atomique :
      - Pack 500 FCFA $\rightarrow$ `tokens = tokens + 5` dans `stage_students`.
      - Pass 2 000 FCFA $\rightarrow$ `is_premium = true, boost_ends_at = now() + 30 days`.
  - **DoD :** Signature HMAC et validation de payload certifiées par script unitaire (code 0).

### 2. Interface Utilisateur & Modal de Recharge Mobile Money
- [X] **Tâche 10.3 : Composant Modal de Paiement Mobile Money in-App**
  - **Fichiers :** `src/features/wallet/PaymentModal.tsx`, `src/features/wallet/walletApi.ts`, `src/features/stages/AiApplyModal.tsx`
  - **Action :**
    - Composant `PaymentModal` au design anti-saturation haute fidélité :
      - Sélection des 2 offres : Pack Découverte (500 FCFA) et Pass Mensuel (2 000 FCFA).
      - Sélecteur d'opérateurs rapides : MTN MoMo, Orange Money, Wave.
      - Écran d'attente USSD avec consignes explicites de code PIN et écran de confirmation.
    - Câblage direct dans `AiApplyModal` pour recharger en 1 clic ou dès l'épuisement du solde gratuit.
  - **DoD :** Capture d'écran certifiée par Playwright (`payment_modal_verified.png`) et `npm run typecheck` à 0 erreur.

---

## 📱 MODULE 11 : Onboarding Express 30s & Câblage Profil Étudiant

### 1. Refonte du Formulaire d'Onboarding Express
- [X] **Tâche 11.1 : Formulaire d'Onboarding Express en 6 Champs**
  - **Fichiers :** `src/features/onboarding/OnboardingScreen.tsx`, `src/features/stages/StudentProfileExpressModal.tsx`, `src/AppShell.tsx`
  - **Action :**
    - Réduire le parcours à 6 champs essentiels :
      1. Nom complet
      2. Téléphone WhatsApp
      3. Université & Ville (avec autocomplétion des facultés)
      4. Filière / Spécialité
      5. Niveau d'études (L1, L2, L3, Master, BTS/DUT, Ingénieur)
      6. 3 à 5 Compétences clés cliquables selon la filière.
    - Sauvegarder dans le profil étudiant pour pré-remplir automatiquement le **Template CV Officiel**.
  - **DoD :** Saisie complète en moins de 30 secondes chrono, 0 blocage. Screenshot certifié `04_onboarding_express_verified.png`.

---

## 🔔 MODULE 12 : Suivi des Candidatures & Notifications de Relance J+7

### 1. Automatisation de la Relance Recruteur J+7
- [X] **Tâche 12.1 : Calcul d'Échéance & Déclencheur de Relance J+7**
  - **Fichiers :** `src/ui/screens/ApplicationsTimelineScreen.tsx`, `src/features/stages/stagesApi.ts`
  - **Action :**
    - Calculer dynamiquement le nombre de jours écoulés depuis l'envoi de la candidature (`appliedAt`).
    - Si `jours >= 7` et statut `PENDING` :
      - Afficher le badge urgent d'incitation à la relance.
      - Bouton `[ 💬 Relancer sur WhatsApp (J+7) ]` ouvrant WhatsApp avec un message poli et engageant :
        > *"Bonjour [Entreprise], je me permets de faire suite à ma candidature du [Date] pour le poste de [Poste]. Toujours très motivé pour rejoindre vos équipes, je me tiens à votre disposition pour échanger. Bien cordialement, [Étudiant]."*
  - **DoD :** Clic sur le bouton de relance ouvrant WhatsApp avec le message de relance horodaté. Screenshot certifié `03_timeline_j7_relance_verified.png`.

---

## 🧪 MODULE 13 : Validation Complète E2E, DevSecOps & Certification (/test-and-verify)

### 1. Tests Automatisés & Preuves Visuelles
- [X] **Tâche 13.1 : Script Playwright E2E du Parcours MVP Intégral**
  - **Fichiers :** `scripts/verify_mvp_complete_flow.js`
  - **Action :**
    - Écrire et exécuter le scénario Playwright automatisé :
      1. Profilage express d'un étudiant en Licence 3 (`04_onboarding_express_verified.png`).
      2. Consultation du feed d'offres de stage et vérification du score de match (`01_stages_feed_verified.png`).
      3. Clic sur `Postuler` $\rightarrow$ Génération IA du CV au **Template Officiel** et de la Lettre RH (`02_official_cv_and_letter_verified.png`).
      4. Vérification de l'ouverture du lien WhatsApp pré-rempli et fermeture modale.
      5. Consultation de la timeline avec vérification du badge urgent et déclencheur de relance J+7 (`03_timeline_j7_relance_verified.png`).
    - Sauvegarder les captures d'écran de certification dans le répertoire des artefacts.
  - **DoD :** Script exécuté avec succès (Code 0), captures générées et vérifiées sans régression.

- [X] **Tâche 13.2 : Audit DevSecOps, Typage Strict & Déploiement**
  - **Fichiers :** Workspace complet
  - **Action :**
    - Lancer `npm run typecheck` (`tsc --noEmit`) : **0 erreur** sur `campus-360` et `mobile-api`.
    - Vérifier l'absence de fuite de secrets ou de tokens en dur.
    - Synchroniser `contexte.md` et `walkthrough.md` avec les preuves d'exécution.
    - Exécuter le push git sécurisé.
  - **DoD :** Codebase 100% propre, typecheck vert (0 erreur), certification complète.

---

## 🚀 MODULE 14 : Expédition Automatisée des Candidatures (Evolution API & N8N Webhook)

### 1. Backend & Intégration Evolution API
- [X] **Tâche 14.1 : Service d'Intégration Evolution API & Endpoint de Jumelage**
  - **Fichiers :** `mobile-api/app/api/mobile/whatsapp/instance/route.ts`, `mobile-api/lib/evolution-api.ts`
  - **Action :**
    - Créer le client TypeScript pour Evolution API (`https://wa.blackcompany.site`).
    - Gérer la création d'instance étudiant (`student-<phone>`) et la demande de **Pairing Code à 8 chiffres** (`POST /instance/connect/:instance` avec `number`).
    - Implémenter la vérification du statut de connexion de session (`GET /instance/connectionState/:instance`).
    - Créer la route d'API Next.js `POST /api/mobile/whatsapp/instance` pour initier l'appairage et sonder le statut.
    - Sécuriser les variables d'environnement (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`).
  - **DoD :** Route testable via curl retournant un pairing code 8 chiffres, validation Zod des requêtes, `mobile-api` typecheck sans erreur.

### 2. Backend & Relais Webhook N8N
- [X] **Tâche 14.2 : Endpoint de Dispatch de Candidature & Stockage Cloud PDF**
  - **Fichiers :** `mobile-api/app/api/mobile/stages/dispatch/route.ts`, `mobile-api/lib/n8n-dispatch.ts`, `mobile-api/lib/stages-db.ts`
  - **Action :**
    - Créer la route `POST /api/mobile/stages/dispatch` recevant la demande de postulation automatisée.
    - Persistance du document PDF officiel généré dans Supabase Storage (bucket `cvs/` public/signé) pour obtenir une URL accessible par Evolution API/n8n.
    - Construction du payload unifié et transmission sécurisée vers le webhook n8n (`POST https://n8n.blackcompany.site/webhook/send-stage-application`).
    - Enregistrement immédiat dans `stage_applications` avec statut `SENT_PENDING` et canal utilisé (`whatsapp` ou `email`).
  - **DoD :** Route `dispatch` fonctionnelle renvoyant HTTP 200 avec confirmation de prise en charge et ID de candidature.

### 3. Workflow d'Automatisation N8N
- [X] **Tâche 14.3 : Modèle de Workflow N8N d'Expédition (`send_stage_application_workflow.json`)**
  - **Fichiers :** `scripts/n8n/send_stage_application_workflow.json`, `docs/N8N_APPLICATION_DISPATCH.md`
  - **Action :**
    - Concevoir le workflow n8n complet exportable :
      1. Trigger Webhook : `POST /webhook/send-stage-application`.
      2. Switch selon `channel` : `whatsapp` vs `email`.
      3. Branche WhatsApp : Requête HTTP vers Evolution API `POST /message/sendMedia/:instanceName` avec `mediatype: "document"`, `mimetype: "application/pdf"`, `media: cvPdfUrl`, `fileName: "CV_Officiel.pdf"` et `caption: whatsappPitch`.
      4. Branche Email : Nœud SMTP avec pièce jointe PDF téléchargée depuis l'URL, corps HTML soigné, `replyTo: student.email` et copie pour l'étudiant.
      5. Nœud Supabase : Callback de mise à jour du statut dans `stage_applications` (`DELIVERED`).
      6. Temporisation anti-ban : Nœud Wait (15-30s aléatoire) pour lisser les envois groupés.
    - Rédiger le guide d'import et de configuration dans `docs/N8N_APPLICATION_DISPATCH.md`.
  - **DoD :** Fichier JSON valide et importable sans erreur dans l'instance n8n, documentation détaillée avec exemples de payload.

### 4. Interface Utilisateur & Jumelage WhatsApp dans l'App
- [X] **Tâche 14.4 : Composant Modal de Jumelage WhatsApp par Pairing Code**
  - **Fichiers :** `src/features/whatsapp/WhatsAppPairingModal.tsx`, `src/features/whatsapp/whatsappService.ts`, `src/features/profile/ProfileScreen.tsx`
  - **Action :**
    - Créer `WhatsAppPairingModal.tsx` selon le design anti-saturation :
      - Saisie / confirmation du numéro WhatsApp de l'étudiant (`+237 6xx xx xx xx`).
      - Appel backend pour générer le code de jumelage à 8 chiffres.
      - Affichage en grands caractères espacés (ex: `7842 - 9012`) avec bouton interactif `[ 📋 Copier le code ]`.
      - Guide visuel simplifié en 3 étapes : *1. Ouvrir WhatsApp > 2. Appareils connectés > 3. Associer avec un numéro de téléphone*.
      - Détection automatique de connexion réussie avec badge `✅ WhatsApp connecté`.
    - Intégrer un déclencheur direct dans `ProfileScreen.tsx` et dans le parcours de candidature.
  - **DoD :** Modal fluide et responsive, gestion des états (chargement, code généré, connecté, erreur), 0 erreur TypeScript.

### 5. Câblage UI 1-Clic dans AiApplyModal & Fallback Natif
- [X] **Tâche 14.5 : Refonte du Câblage de Postulation dans `AiApplyModal.tsx`**
  - **Fichiers :** `src/features/stages/AiApplyModal.tsx`, `src/features/stages/stagesApi.ts`
  - **Action :**
    - Adapter l'onglet final "Envoi" de `AiApplyModal.tsx` :
      - Si l'instance WhatsApp est connectée : Bouton proéminent `[ ⚡ Postuler en 1 Clic (Envoi Automatique Arrière-Plan) ]`.
      - Clic $\rightarrow$ déclenche la génération PDF, l'upload et le dispatch API sans forcer l'étudiant à jongler avec WhatsApp ou d'autres applications.
      - Animation de succès, notification de confirmation et ajout automatique à la timeline de suivi.
      - Si l'étudiant choisit l'Email : Bouton `[ ✉️ Expédier ma Candidature par Email ]` avec le même confort en arrière-plan.
      - Si WhatsApp n'est pas encore connecté : Proposer d'associer en 30s OU proposer le bouton de secours `[ 💬 Ouvrir WhatsApp Manuellement ]` (fallback natif sans blocage).
  - **DoD :** Parcours utilisateur sans friction testé, confirmation d'envoi immédiate avec mise à jour du statut.

### 6. Validation Complète, Tests E2E & Typage Strict
- [X] **Tâche 14.6 : Tests E2E de Dispatch, Typage Strict & Certification**
  - **Fichiers :** `scripts/test-stage-dispatch.mjs`, `src/`, `mobile-api/`
  - **Action :**
    - Écrire un script unitaire `scripts/test-stage-dispatch.mjs` testant le flux de bout en bout (génération code jumelage, dispatch mock n8n).
    - Exécuter la vérification des types : `npm run typecheck` sur l'application mobile et `cd mobile-api && npm run typecheck` : **0 erreur**.
    - Vérifier la conformité de sécurité (pas de secrets exposés dans le client mobile, proxy systématique par `mobile-api`).
  - **DoD :** Typecheck 100% au vert sur les deux projets, script de test validé (Code 0).

---

## MODULE 15 : SUPPRESSION DÉFINITIVE DES ABONNEMENTS & PAIEMENT À L'ACTE PAR WALLET (PAY-PER-ACTION)

### 1. Types & Constantes Tarifaires Officielles
- [X] **Tâche 15.1 : Définition des Constantes Tarifaires et Nettoyage des Types d'Abonnement**
  - **Fichiers :** `src/types.ts`, `src/features/wallet/walletApi.ts`
  - **Action :**
    - Définir les constantes officielles de prix en FCFA :
      - `PRICE_STAGE_APPLY = 500` (1ère gratuite)
      - `PRICE_REPORT = 2000` (Rapport de stage)
      - `PRICE_THESIS = 5000` (Mémoire de fin d'études)
      - `PRICE_PDF = 250` (Documents payants, annales gratuites)
      - `MIN_WALLET_RECHARGE = 500`
    - Nettoyer et déprécier les types `subscriptionTier` et `PaidSubscriptionTier`.
    - Harmoniser le solde (`balance`) en FCFA réels au lieu de jetons abstraits.
  - **DoD :** Types stricts, constantes exportées et documentées, 0 ambiguïté.

### 2. Nettoyage de l'AppShell & Écrans Centraux
- [X] **Tâche 15.2 : Suppression de la Section Abonnement dans AppShell et Navigation**
  - **Fichiers :** `src/AppShell.tsx`
  - **Action :**
    - Retirer le composant `PremiumSection` et tout modal/bannière vantant un abonnement mensuel ou annuel.
    - Remplacer l'affichage dans la barre latérale / modal par l'état du Wallet : "Solde : X FCFA" avec action rapide `[ Recharger ]`.
    - Supprimer tout lien ou écran orphelin orienté abonnement.
  - **DoD :** Plus aucune mention d'abonnement dans `AppShell.tsx`, affichage direct du solde en FCFA.

### 3. Refonte du Profil & Modal de Rechargement Mobile Money
- [X] **Tâche 15.3 : Simplification de ProfileScreen et Recharge dès 500 FCFA dans PaymentModal**
  - **Fichiers :** `src/ui/screens/ProfileScreen.tsx`, `src/features/wallet/PaymentModal.tsx`
  - **Action :**
    - Dans `ProfileScreen.tsx` : Supprimer les badges et cartes de souscription ("Plan Gratuit", "Pass Pro", etc.). Mettre en avant la carte néobanque du portefeuille prépayé avec le solde exact en FCFA, l'historique des débits par action et le bouton `[ + Recharger ]`.
    - Dans `PaymentModal.tsx` : Retirer l'onglet/mode d'abonnement récurrent. Proposer des paliers de recharge adaptés : 500 FCFA, 1 000 FCFA, 2 000 FCFA, 5 000 FCFA. Intégrer le déclencheur instantané si le modal est ouvert suite à un solde insuffisant.
  - **DoD :** Interface Wallet propre et limpide, paliers clairs dès 500 FCFA, zéro mention d'abonnement.

### 4. Intégration du Débit à l'Acte dans la Candidature Stage (500 FCFA)
- [X] **Tâche 15.4 : Débit Transparent et Première Candidature Gratuite dans `AiApplyModal.tsx`**
  - **Fichiers :** `src/features/stages/AiApplyModal.tsx`, `src/features/stages/StagesScreen.tsx`
  - **Action :**
    - Afficher clairement le coût sur le bouton d'action : `Postuler (500 FCFA)` ou `1ère Candidature Offerte (Gratuit)` si première postulation.
    - Avant soumission, vérifier le solde du wallet. Si le solde < 500 FCFA, ouvrir directement `PaymentModal` avec montant pré-rempli à 500 FCFA.
    - Enregistrer la transaction de débit de 500 FCFA lors de la validation.
  - **DoD :** Expérience utilisateur fluide, transparence totale sur le coût, gestion automatique du solde insuffisant.

### 5. Intégration Tarifaire dans la Rédaction & Bibliothèque de Documents
- [X] **Tâche 15.5 : Tarification Rapport (2 000 F), Mémoire (5 000 F) et PDF (Gratuit / 250 F)**
  - **Fichiers :** `src/features/documents/DocumentsScreen.tsx`, `src/ui/screens/LibraryScreen.tsx`
  - **Action :**
    - Dans l'Atelier de Rédaction :
      - Afficher le tarif transparent : Rapport de stage `2 000 FCFA` (25-45 pages structurées avec IA).
      - Mémoire de fin d'études `5 000 FCFA` (50-100 pages académiques).
      - Débit du wallet ou modal de recharge si solde insuffisant.
    - Dans la Bibliothèque :
      - Annales et épreuves : Badge `GRATUIT` explicite (téléchargement libre).
      - Documents/mémoires certifiés : Badge `250 FCFA` avec déblocage instantané via wallet.
  - **DoD :** Badges tarifaires visibles et uniformes, débits atomiques conformes.

### 6. Nettoyage Backend API & Typecheck Global
- [X] **Tâche 15.6 : Dépréciation des Routes d'Abonnement et Validation Compilation**
  - **Fichiers :** `mobile-api/app/api/mobile/`, `src/`
  - **Action :**
    - Désactiver/déprécier les endpoints d'abonnements mensuels au profit des endpoints de transaction wallet (`/api/mobile/wallet/topup` et `/api/mobile/wallet/spend`).
    - Lancer `npm run typecheck` sur l'app mobile et sur `mobile-api/`.
    - Résoudre toute anomalie ou référence orpheline.
  - **DoD :** `npm run typecheck` passe avec 0 erreur sur le client et l'API.

---

## 🛠️ MODULE 16 : RÉPARATION DÉFINITIVE DE LA SAISIE CLAVIER MOBILE & REFONTE VIOLET SUR BLANC DU PROFIL EXPRESS

### 1. Fix Clavier Mobile & Harmonisation Visuelle
- [X] **Tâche 16.1 : Élimination du Bug de Saut de Clavier (Auth & Profil Express) et Refonte Violet sur Blanc**
  - **Fichiers :** `src/ui/screens/AuthScreen.tsx`, `src/ui/GlassComponents.tsx`, `src/features/stages/StudentProfileExpressModal.tsx`, `src/ui/screens/OnboardingScreen.tsx`
  - **Action :**
    - Dans `AuthScreen.tsx` : Supprimer `behavior="height"` sur Android (`Platform.OS === 'ios' ? 'padding' : undefined`), remplacer `justifyContent: 'center'` par `justifyContent: 'flex-start'`, supprimer `keyboardDismissMode="on-drag"`, renommer le bouton d'inscription en "Inscrire mes informations".
    - Dans `GlassComponents.tsx` : Supprimer les modifications dynamiques d'élévation/ombres dans `inputBoxFocused` qui provoquent l'invalidation native du focus Android.
    - Dans `StudentProfileExpressModal.tsx` : Refonte complète en Clean White & Royal Violet (carte `#FFFFFF`, texte `#0F172A`, accents `#7C3AED`, bouton "Inscrire mes informations (30s)"), intégration `KeyboardAvoidingView` fluide sans saut de modale à l'apparition du clavier.
    - Dans `OnboardingScreen.tsx` : Intégration `KeyboardAvoidingView` pour sécuriser l'onboarding.
  - **DoD :** Saisie fluide sans fermeture intempestive du clavier virtuel sur mobile, `npm run typecheck` à 0 erreur, tests unitaires passés.




---

## 🕵️ MODULE 17 : PIPELINE DE SCRAPING FIABLE (4 AGENTS) + VALIDATION HUMAINE TELEGRAM VIA HERMES

> Cadrage validé le 2026-10-14 : stages **et** emplois, 4 agents spécialisés, Claude Haiku 5.5 (OpenRouter) + secours Gemini Flash, aucune heuristique de repli (mise en attente), validation des cas douteux sur Telegram via Hermes, re-passage des 72 offres existantes.
> **Prérequis utilisateur (bloquant pour 17.9) :** bot Telegram créé via @BotFather et branché dans Hermes (`platforms` vide au 2026-10-14).

### 1. Base de Données
- [X] **Tâche 17.1 : Colonnes de qualité sur `stage_jobs`**
  - **Fichiers :** `mobile-api/sql/0005_stage_jobs_quality.sql`, `scripts/run-sql.cjs`
  - **Action :** Migration idempotente : `kind` (`stage`|`emploi`, défaut `stage`), `status` (`published`|`pending_review`|`rejected`, défaut `published`), `confidence` numeric, `review_reason` text, `evidence` jsonb (citations par champ), `source_url` text, `source_published_at` timestamptz, `company_normalized` text + index, `reviewed_at`/`reviewed_by`. Table `stage_job_rejections` (journal des rejets : texte source, raison, étape).
  - **DoD :** migration exécutée 2× sans erreur ; `select status, kind, count(*) from stage_jobs group by 1,2` OK.

- [X] **Tâche 17.2 : Seules les offres publiées sont visibles**
  - **Fichiers :** `mobile-api/lib/stages-db.ts`, `recruiter-web/lib/stages-db.ts`, `mobile-api/lib/automations.ts`
  - **Action :** Filtre `status = 'published'` sur les listes/détails/alertes de correspondance ; exposer `kind`.
  - **DoD :** `npm run typecheck` (mobile-api + recruiter-web) code 0 ; une offre `pending_review` n'apparaît pas dans `GET /api/mobile/stages`.

### 2. Agents (Python, `scripts/agents/`)
- [X] **Tâche 17.3 : Client LLM unique (Haiku 5.5 + secours Gemini)**
  - **Fichiers :** `scripts/agents/llm_client.py`, `scripts/agents/config.py`
  - **Action :** `call_json(prompt, schema)` : OpenRouter `anthropic/claude-haiku-5.5` (sortie JSON structurée, température 0), secours Gemini Flash (modèle le plus récent disponible, vérifié à l'implémentation) ; si les deux échouent → exception `LLMUnavailable` (pas de devinette). Modèles configurables par env (`SCRAPER_MODEL`, `SCRAPER_FALLBACK_MODEL`).
  - **DoD :** `python -c "from llm_client import call_json; ..."` sur un exemple renvoie un JSON validé.

- [X] **Tâche 17.4 : Agent 1 — Filtre (règles dures, sans IA)**
  - **Fichiers :** `scripts/agents/filter_agent.py`
  - **Action :** Rejets : concours, formations payantes, posts personnels (patterns existants repris), année < année courante, ni entreprise ni contact, hors Cameroun explicite, texte < 80 caractères. Retourne `(ok, reason)`.
  - **DoD :** `python scripts/agents/tests/test_filter.py` vert sur un jeu de 20 exemples réels (dont ENIET, Oasis Lounge, CAMPOST).

- [X] **Tâche 17.5 : Agent 2 — Classifieur**
  - **Fichiers :** `scripts/agents/classifier_agent.py`
  - **Action :** Prompt court → `{category: stage|emploi|concours|formation|bruit, confidence: 0..1, reason}`.
  - **DoD :** test sur le jeu d'exemples : 0 concours/bruit classé stage/emploi.

- [X] **Tâche 17.6 : Agent 3 — Extracteur avec citations**
  - **Fichiers :** `scripts/agents/extractor_agent.py`
  - **Action :** Extrait titre, entreprise, ville, date limite, durée, rémunération, contact WhatsApp/email, compétences ; chaque champ accompagné de la citation exacte du texte, sinon `null`. Vérification côté code que la citation existe bien dans le texte (sinon champ mis à `null`). Aucune valeur par défaut inventée.
  - **DoD :** test : aucun champ non nul sans citation présente dans la source.

- [X] **Tâche 17.7 : Agent 4 — Vérificateur + décision**
  - **Fichiers :** `scripts/agents/verifier_agent.py`
  - **Action :** Normalisation entreprise (suffixes SARL/SA/Cameroun…), doublon flou (entreprise normalisée + similarité titre ≥ 0,85 sur 60 jours), date limite passée, entreprise générique ; score final → `published` (≥ 0,8), `pending_review` (0,5–0,8, avec `review_reason`), `rejected` (< 0,5, journalisé).
  - **DoD :** test : les doublons HYST/KEISIS/SANLAM sont détectés.

- [X] **Tâche 17.8 : Orchestrateur + ingestion refondus**
  - **Fichiers :** `scripts/agents/orchestrator.py`, `scripts/agents/database_ingestor.py`, `scripts/agents/ai_analyzer_agent.py` (retrait du chemin offres + heuristique)
  - **Action :** Collecte → Filtre → Classifieur → Extracteur → Vérificateur → insertion avec `kind`/`status`/`confidence`/`evidence`/`source_url` ; `LLMUnavailable` → `pending_review`. Notification push seulement pour `published`. Mode `--dry-run`.
  - **DoD :** `python scripts/agents/run_scraper.py --dry-run` termine avec un résumé par statut.

### 3. Validation humaine (Hermes / Telegram + Admin)
- [X] **Tâche 17.9 : Route de revue protégée**
  - **Fichiers :** `mobile-api/app/api/mobile/stages/review/route.ts`, `mobile-api/lib/stages-db.ts`
  - **Action :** `GET` (file `pending_review`) et `POST {jobId, decision: publish|reject}` ; auth par secret partagé `STAGES_REVIEW_SECRET` (comparaison à temps constant), validation zod, rate limit, journal `reviewed_by`.
  - **DoD :** curl sans secret → 401 ; avec secret → 200 et statut changé.

- [ ] **Tâche 17.10 : Envoi Telegram via Hermes**
  - **Fichiers :** `scripts/agents/review_notifier.py`, skill/hook Hermes sur le VPS (`/root/.hermes/skills/` ou cron Hermes)
  - **Action :** Pour chaque nouvelle offre `pending_review` : message Telegram (titre, entreprise, ville, confiance, raison du doute, lien source) avec boutons ✅ Publier / ❌ Rejeter qui appellent la route 17.9. Accès limité à l'ID Telegram de l'utilisateur.
  - **DoD :** une offre de test reçue sur Telegram ; clic ✅ → offre visible dans l'app.
  - **Bloqué tant que** le bot Telegram n'est pas branché dans Hermes.

- [/] **Tâche 17.11 : File « À valider » dans l'admin**
  - **Fichiers :** `recruiter-web/app/admin/stages/` (onglet ou filtre), `recruiter-web/lib/stages-db.ts`
  - **Action :** Liste des offres `pending_review` avec raison, citations et lien source ; boutons Publier/Rejeter.
  - **DoD :** `npm run typecheck` recruiter-web code 0 + capture navigateur.

### 4. App mobile
- [X] **Tâche 17.12 : Filtre Stages / Emplois**
  - **Fichiers :** `src/features/stages/stagesApi.ts`, `src/types.ts`, écran Stages
  - **Action :** Type `kind`, puces « Stages » / « Emplois » / « Tout », badge sur la carte.
  - **DoD :** `npm run typecheck` code 0 + capture e2e de l'onglet Stages.

### 5. Reprise des données & mise en production
- [ ] **Tâche 17.13 : Re-passage des 72 offres existantes**
  - **Fichiers :** `scripts/agents/reprocess_existing.py`
  - **Action :** Rejoue Filtre → Vérificateur sur chaque offre existante (texte = titre + description) en `--dry-run` d'abord (rapport CSV : décision, raison), puis application : rejetées → `rejected`, douteuses → `pending_review` (envoyées sur Telegram), les autres → `published`. Les ~20 offres du 2026-10-03 au style généré passent d'office en `pending_review`.
  - **DoD :** rapport dry-run relu par l'utilisateur avant application ; après application, 0 concours/CDI mal classé publié.

- [ ] **Tâche 17.14 : Déploiement & planification**
  - **Fichiers :** `scripts/agents/daily_scheduler.py`, `.env` VPS (`OPENROUTER_API_KEY`, `STAGES_REVIEW_SECRET`)
  - **Action :** `/vps-deploy`, exécution quotidienne du pipeline, vérification de santé.
  - **DoD :** API health 200 ; un run réel produit un résumé published/pending/rejected cohérent.

---

## 🌐 MODULE 18 : Refonte de la Landing Publique (`landing-site/`)

> Cadrage validé le 2026-10-14 (voir `contexte.md` §12). Périmètre : `landing-site/` uniquement. Aucune modification de l'app mobile ni de `recruiter-web/`. Aucun déploiement sans accord explicite.
> **Décisions :** tarifs = constantes de `src/types.ts` (candidature 500 FCFA, 1re offerte ; rapport 2 000 ; mémoire 5 000 ; PDF 250 ; recharge min 500) ; « fonction de la vie » = **Coach de soutenance** (`DefenseCoachModal.tsx`) ; recruteur masqué ; emails = redirection ImprovMX vers Gmail ; formulaire de contact = envoi réel via Resend (clé `RESEND_API_KEY` à fournir).

### 1. Captures & visuels
- [X] **Tâche 18.1 : Captures réelles de l'app dans la landing**
  - **Fichiers :** `landing-site/public/images/screens/*.png` (nouveaux), `components/hero-scene.tsx`, `components/screenshots.tsx`
  - **Action :** Copier les captures à thème clair (`campus360_home_violet`, `01_stages_feed_verified`→ à exclure si sombre, `apply_modal_match_tab`, `02_official_cv_and_letter_verified`, `03_timeline_j7_relance_verified`, `e2e-13-atelier-ia`, `e2e-14-recharge-wallet`). Remplacer les références `app-home/app-explore/app-premium/packs-card`. Retirer le slide « Catalogue PDFs ».
  - **DoD :** `npm run build` (landing) code 0 ; aucune référence à `app-premium` ni `packs-card` dans `components/` et `app/`.

### 2. Accueil & textes
- [X] **Tâche 18.2 : Accueil — textes réels, Coach de soutenance, sans chiffres non vérifiés**
  - **Fichiers :** `app/page.tsx`, `components/how-it-works.tsx`, `components/faq.tsx`
  - **Action :** Retirer `stats` (12 000+, 95 %, 3 500+) et la mention « n°1 » ; piliers recentrés sur stage IA, CV officiel, suivi J+7, Atelier IA, **Coach de soutenance**, wallet à l'usage ; retirer « PDFs académiques » et « iOS » ; FAQ sans PDF ni abonnement.
  - **DoD :** `npm run build` code 0 ; `grep` ne trouve plus `12 000`, `95%`, `3 500`, `Pass`, `abonnement` dans `app/page.tsx`, `components/how-it-works.tsx`, `components/faq.tsx`.

- [X] **Tâche 18.3 : Pages Fonctionnalités, Inscription, Aide**
  - **Fichiers :** `app/fonctionnalites/page.tsx`, `app/inscription/page.tsx`, `app/aide/page.tsx`, `app/layout.tsx`
  - **Action :** Réécrire les 12 fonctionnalités sur l'app réelle ; retirer « bilingue », « 3 500+ PDFs », « mode hors-ligne » non vérifié, abonnements Basique/Pro/Elite ; métadonnées (`layout.tsx`) alignées ; `wa.me/campus360` → `wa.me/237690273500`.
  - **DoD :** `npm run build` code 0 ; `grep -ri "basique\|pro/elite\|3 500\|bilingue" app` ne renvoie rien hors pages légales/blog.

### 3. Tarifs
- [X] **Tâche 18.4 : Tarifs à l'usage (sans Pass)**
  - **Fichiers :** `components/pricing.tsx`, `app/tarifs/page.tsx`
  - **Action :** Remplacer les 4 offres par la grille à l'usage issue de `src/types.ts` : Découverte (1re candidature offerte), Candidature 500 FCFA, Rapport 2 000 FCFA, Mémoire 5 000 FCFA, PDF 250 FCFA ; recharge min 500 FCFA (Orange Money / MTN MoMo).
  - **DoD :** `npm run build` code 0 ; aucun « Pass » ni « / mois » dans `components/pricing.tsx` et `app/tarifs/page.tsx`.

### 4. Recruteur
- [X] **Tâche 18.5 : Masquer le Portail Recruteur**
  - **Fichiers :** `components/navbar-client.tsx`, `components/footer.tsx`, `app/fonctionnalites/page.tsx`
  - **Action :** Retirer les liens « Espace Recruteur » (navbar, footer) et la carte « Portail Recruteur ». Réactivation prévue plus tard.
  - **DoD :** `grep -rn "admin.campus360b\|Espace Recruteur\|Portail Recruteur" components app` ne renvoie rien.

### 5. Contact & emails
- [X] **Tâche 18.6 : Formulaire de contact fonctionnel & coordonnées réelles**
  - **Fichiers :** `app/contact/page.tsx`, `app/api/contact/route.ts` (nouveau), `app/aide/page.tsx`
  - **Action :** Route `POST /api/contact` (validation, envoi via Resend API si `RESEND_API_KEY`, sinon 503 explicite). Formulaire branché (états envoi / succès / erreur). Téléphone `+237 690 27 35 00`, WhatsApp `https://wa.me/237690273500`. Retirer « Bureau Akwa — sur rendez-vous » tant que non confirmé.
  - **DoD :** `npm run build` code 0 ; `POST /api/contact` avec payload invalide → 400 (test local).

- [ ] **Tâche 18.7 : Emails `@campus360b.site` (action utilisateur DNS)**
  - **Action :** Ajouter chez LWS les enregistrements MX d'ImprovMX + SPF, vers la redirection vers l'adresse de l'utilisateur. Hors code.
  - **DoD :** `nslookup -type=MX campus360b.site 8.8.8.8` renvoie des MX ; un mail test arrive.

### 6. Vérification
- [/] **Tâche 18.8 : Build, liens internes & rendu mobile** (build ✅, liens ✅ ; capture 390 px en attente : le navigateur intégré ne joint pas localhost)
  - **Action :** `npm run build` ; contrôle HTTP de chaque lien interne ; capture 390 px de l'accueil.
  - **DoD :** build code 0 ; aucun lien interne cassé ; capture jointe.
