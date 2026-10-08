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

