# Plan de Développement MVP : Campus 360 (Lancement Flash & Spécifications Officielles)

> **Progression globale :** 33/33 tâches validées (100%) — MVP FINALISÉ ET CERTIFIÉ  
> **Couverture MVP :** 100% des fonctionnalités du cadrage `contexte.md` (Template CV Officiel, Ingestion n8n, Mobile Money, Onboarding Express, Suivi J+7, Tests E2E Playwright)  
> **Dernière mise à jour :** 2026-09-29 14:35  

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
