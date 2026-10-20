# Plan de Développement MVP : Campus 360 (Lancement Flash & Spécifications Officielles)

> **Progression globale :** 101/159 tâches validées (64%) — Module 25 (scraping des offres) : 12/17 ; Module 24 (galerie de modèles de rapports) : 0/12 ; Module 23 (préparation V1) : 0/26 ; Module 20 : 16/16 validées ; Module 21 : 9/9 validées ; Module 19 : 10 en cours ; hors Module 19 : 3 en cours, 2 ouvertes  
> **Couverture MVP :** 100% des fonctionnalités du cadrage `contexte.md` (Template CV Officiel, Ingestion n8n, Mobile Money, Onboarding Express, Suivi J+7, Expédition Automatisée WhatsApp/Email via Evolution API & N8N, Éditeur de documents §13, Style du document & rédaction §14)  
> **Dernière mise à jour :** 2026-10-20 par /execute (module 25)

---
## Reprise
- **Tâche en cours :** aucune ; en cours `[/]` : 25.5, 25.10, 25.15 (voir plus bas)
- **Prochaine :** 25.2 — jeu de référence de 50 offres étiquetées (🔒 : lecture de la base et étiquetage par l'utilisateur)
- **Reste :** 25.2, 25.5, 25.10, 25.14 (visuel), 25.15, 25.16 — module 25 (25.17 faite, migration 0015 en attente) ; module 24 et module 23 : voir `Progression globale`
- **Points ouverts :**
  - 🔒 25.2 : accord lecture seule de la base partagée ; étiquetage de 50 offres par l'utilisateur
  - 🔒 25.5 : application de la migration 0014 sur la base partagée (puis double application)
  - 🔒 25.10 : rotation de la clé Treg exposée dans `scripts/n8n/campus360_treg_full_workflow.json`, retrait de sa valeur du fichier, avant tout commit
  - 🔒 25.9 : désactiver le déclencheur GitHub `daily-scraper.yml` (décision 14)
  - 🔒 25.16 : déploiement et premier passage réel (appels Treg payants)
  - 25.14 : vérification visuelle non faite (session requise, identifiants de test à fournir)
  - 🔒 25.17 : code fait et testé ; migration 0015 (valeur `LINK`) **non appliquée** sur la base partagée. Tant qu'elle ne l'est pas, le scraper échouera à écrire une offre `LINK` (valeur refusée par l'enum) : appliquer 0015 **avant** le premier passage réel.
  - Non commité : tout le travail du module 25 est dans l'arbre de travail (`fcd08ed` = dernier commit)
- **Commit de référence :** 5458012 (le code du module 25 a été commité en dehors de cette session, en 3 commits : e88439b, a2283cd, 5458012 ; seuls les fichiers de suivi et de documentation restent non commités)
- **Dernière entrée journal :** 2026-10-20 · tâche 25.17 · execute

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
- [X] **Tâche 17.13 : Re-passage des 72 offres existantes**
  - **Fichiers :** `scripts/agents/reprocess_existing.py`
  - **Action :** Rejoue Filtre → Vérificateur sur chaque offre existante (texte = titre + description) en `--dry-run` d'abord (rapport CSV : décision, raison), puis application : rejetées → `rejected`, douteuses → `pending_review` (envoyées sur Telegram), les autres → `published`. Les ~20 offres du 2026-10-03 au style généré passent d'office en `pending_review`.
  - **DoD :** rapport dry-run relu par l'utilisateur avant application ; après application, 0 concours/CDI mal classé publié.

- [/] **Tâche 17.14 : Déploiement & planification**
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


---

## 📝 MODULE 19 : Éditeur de Documents — Images Locales, Sources (fichiers & URL) & Assistant Cité

> Cadrage validé le 2026-10-14 (voir `contexte.md` §13). Voie Bounded. Périmètre : `mobile-api/` (API, BDD, exports), `src/features/documents/` (app mobile), config VPS (Nginx). Hors périmètre : `recruiter-web/lib/documents-db.ts` (doublon divergent, dette séparée), pré-remplissage du rapport depuis les candidatures (V2), RAG vectoriel pgvector (V2).
> **Décisions :**
> - Stockage des fichiers sur le **disque du VPS** (`UPLOAD_ROOT`), servi par `files.campus360b.site` (Nginx HTTPS vers la mobile-api du VPS).
> - Upload **en ligne uniquement** en V1 ; échec explicite et réessai.
> - Sources : extraction PDF / DOCX / TXT, découpage d'environ 800 tokens, recherche `tsvector` en français (top-k 8), citations `[Source n, p.x]`.
> - Sources URL : récupération côté serveur avec garde-fous SSRF (IP privées refusées, redirections revalidées, timeout 10 s, 5 Mo maximum).
> - **Images référencées par identifiant dans le HTML** (`data-file-id`), jamais par URL signée stockée : une URL signée expire. Elle est résolue à l'affichage et à l'export.
> - Rapport de stage : rédaction seule.
> **Points ouverts (à confirmer avant `/execute`) :** quota de stockage par utilisateur (proposition 200 Mo) ; conservation du « texte collé » comme troisième option de source (proposition : oui, en repli).

### 0. Prérequis
- [X] **Tâche 19.1 : Correctif « fausses sessions » déployé** (grep vide, tsc 0 ; correctif déjà sur origin/main (11c07cb) ; durci : repli « email/id comme jeton » supprimé, getDocumentById filtre toujours le propriétaire)
  - **Fichiers :** `mobile-api/lib/mobile-access.ts`, `mobile-api/app/api/auth/[...all]/route.ts`, `mobile-api/app/api/mobile/stages/dispatch/route.ts`
  - **Action :** Fusionner la branche `fix/security-hardening-fake-sessions` (non commitée à ce jour) et la déployer. Vérifier qu'aucune route documents n'a de repli de session. Définir `N8N_INGESTION_SECRET` sur Vercel et sur le VPS.
  - **DoD :** `grep -rn "student-offline\|guest-student" mobile-api/app mobile-api/lib` ne renvoie rien ; `npx tsc --noEmit` dans `mobile-api/` code 0.

### 1. Base de données
- [X] **Tâche 19.2 : Migration `0006_document_files.sql`** (appliquée 2 fois sans erreur, colonne tsv générée + index GIN vérifiés)
  - **Fichiers :** `mobile-api/sql/0006_document_files.sql` (nouveau)
  - **Action :** Créer `app_document_files` (id, document_id, user_id, kind `image|source`, origin `upload|url`, storage_key, original_name, mime, bytes, sha256, source_url, status `pending|ready|failed`, error, page_count, created_at). Créer `app_document_chunks` (id, file_id, document_id, user_id, page, position, content, `tsv` tsvector généré en `french`, index GIN). Ajouter `file_id` nullable à `app_document_images`. Migration idempotente (`IF NOT EXISTS`).
  - **DoD :** exécution deux fois de suite via `node scripts/run-sql.cjs mobile-api/sql/0006_document_files.sql` sans erreur ; la colonne `tsv` et l'index GIN sont présents sur `app_document_chunks`.

- [X] **Tâche 19.3 : Accès données fichiers & chunks** (tsc 0 ; requêtes toutes filtrées par user_id)
  - **Fichiers :** `mobile-api/lib/document-files-db.ts` (nouveau)
  - **Action :** Fonctions `createDocumentFile`, `setFileStatus`, `getDocumentFile(fileId, userId)`, `insertChunks`, `deleteFilesForDocument`. Toutes filtrées par `user_id` : aucune lecture entre utilisateurs.
  - **DoD :** `npx tsc --noEmit` dans `mobile-api/` code 0 ; test d'isolation dans la tâche 19.25.

### 2. Stockage & upload (VPS)
- [X] **Tâche 19.4 : Stockage disque sécurisé** (tests/file-storage.test.mjs 4/4)
  - **Fichiers :** `mobile-api/lib/file-storage.ts` (nouveau)
  - **Action :** Racine `UPLOAD_ROOT`. Clé = `{userId}/{uuid}.{ext}`. Écriture atomique (fichier temporaire puis renommage). Résolution de chemin qui refuse toute sortie de la racine (`../`, chemins absolus, liens symboliques). Suppression.
  - **DoD :** `node mobile-api/tests/file-storage.test.mjs` : un chemin `../../etc/passwd` est refusé ; écriture puis lecture d'un fichier de test réussies.

- [X] **Tâche 19.5 : Validation des fichiers** (tests/file-validation.test.mjs 7/7)
  - **Fichiers :** `mobile-api/lib/file-validation.ts` (nouveau)
  - **Action :** Type réel vérifié par les octets d'en-tête : PNG, JPEG, WEBP, PDF (`%PDF`), DOCX (archive ZIP contenant `word/document.xml`), TXT (UTF-8 sans octet nul). Limites : 10 Mo pour une image, 20 Mo pour un document. Le MIME déclaré doit correspondre au type réel. Le nom d'origine n'est jamais utilisé sur le disque.
  - **DoD :** tests : un PNG renommé `.pdf` est refusé ; un fichier de 21 Mo est refusé ; un vrai PDF est accepté.

- [X] **Tâche 19.6 : Route d'upload** (sans jeton 401 (test HTTP) ; PNG réel 200 ready (navigateur) ; faux PDF refusé (tests unitaires))
  - **Fichiers :** `mobile-api/app/api/mobile/documents/[id]/files/route.ts` (nouveau)
  - **Action :** `POST` multipart. `requireMobileUser` obligatoire (401 sans session, aucun repli). Rate limit via `route-rate-limit.ts`. Quota par utilisateur (valeur à confirmer). Crée la ligne `app_document_files` en `pending`, écrit le fichier, puis passe à `ready` ou `failed`. `OPTIONS` avec CORS, comme les autres routes.
  - **DoD :** `curl -X POST` sans jeton → 401 ; avec un PNG valide → 200 et une ligne `status=ready` en base ; avec un faux PDF → 422.

- [X] **Tâche 19.7 : URLs signées & service des fichiers (VPS)** (signature fausse/expirée 403 (test HTTP), URL valide 200 image/png (navigateur) ; tests/file-signing.test.mjs 3/3)
  - **Fichiers :** `mobile-api/lib/file-signing.ts` (nouveau), `mobile-api/app/api/mobile/files/[fileId]/url/route.ts` (nouveau), `mobile-api/app/api/files/[fileId]/route.ts` (nouveau, servi par `files.campus360b.site`)
  - **Action :** `GET .../url` (authentifié) renvoie une URL HMAC valable 10 minutes, signée avec `FILES_SIGNING_SECRET`. Le service de fichiers vérifie la signature et l'expiration, renvoie le bon `Content-Type`, `X-Content-Type-Options: nosniff`, et `Content-Disposition: inline` pour les seules images.
  - **DoD :** URL expirée → 403 ; signature modifiée → 403 ; URL valide → 200 avec le bon type MIME.

### 3. Extraction, découpage & sources
- [X] **Tâche 19.8 : Extraction de texte (PDF, DOCX, TXT)** (tests/extraction.test.mjs 4/4 sur vraies fixtures PDF 3 pages, DOCX, TXT)
  - **Fichiers :** `mobile-api/lib/source-extraction.ts` (nouveau), `mobile-api/package.json` (ajouter `pdfjs-dist`, `mammoth`), `mobile-api/tests/fixtures/` (nouveau)
  - **Action :** Retourne `pages: [{ page, text }]`. PDF via `pdfjs-dist`, DOCX via `mammoth`, TXT lu directement. Limite de 200 pages. Une erreur d'extraction passe la ligne en `failed` avec la raison.
  - **DoD :** `node mobile-api/tests/extraction.test.mjs` : un PDF de 3 pages, un DOCX et un TXT de fixture renvoient le mot-clé attendu, sur la bonne page.

- [X] **Tâche 19.9 : Découpage en chunks** (tests/chunking.test.mjs 5/5)
  - **Fichiers :** `mobile-api/lib/chunking.ts` (nouveau)
  - **Action :** Chunks d'environ 3 200 caractères (≈ 800 tokens), recouvrement de 10 %, sans franchir une limite de page.
  - **DoD :** test : la concaténation des chunks couvre tout le texte source ; aucun chunk ne dépasse 3 200 caractères.

- [X] **Tâche 19.10 : Récupération sécurisée d'une URL (anti-SSRF)** (tests/safe-fetch.test.mjs 5/5, dont récupération réelle de example.com)
  - **Fichiers :** `mobile-api/lib/safe-fetch.ts` (nouveau)
  - **Action :** Résolution DNS puis vérification de l'IP : refus des plages privées, loopback, link-local (dont `169.254.169.254`) et ULA IPv6. Redirections revalidées (3 maximum). Timeout 10 s, 5 Mo maximum. Types acceptés : `text/html`, `text/plain`, `application/pdf`. Extraction du texte depuis le HTML (bibliothèque à choisir pendant la tâche).
  - **DoD :** `http://127.0.0.1/`, `http://localhost/` et `http://169.254.169.254/` sont refusés ; une URL publique de test renvoie du texte.

- [X] **Tâche 19.11 : Route des sources (fichier & URL)** (URL interne → 400 « adresse interne » dans l’app ; note et page Wikipédia ajoutées, statut prêt)
  - **Fichiers :** `mobile-api/app/api/mobile/documents/[id]/sources/route.ts`, `mobile-api/lib/documents-db.ts`
  - **Action :** Accepter `sourceUrl` ou un fichier déjà uploadé (19.6). Supprimer le fallback factice `https://campus360b.site/documents/source`. Après extraction, insérer les chunks et passer la source en `ready`.
  - **DoD :** POST sans URL ni fichier → 400 ; URL interne → 400 `url_refusee` ; source ajoutée → `status=ready` et chunks présents.

- [/] **Tâche 19.12 : Recherche lexicale** (recherche validée par le chat (note citée) ; test d’isolation à deux comptes non exécuté : identifiants E2E_EMAIL(_B) requis)
  - **Fichiers :** `mobile-api/lib/document-files-db.ts`
  - **Action :** `searchChunks(documentId, userId, sourceIds, question, k=8)` : `websearch_to_tsquery('french', ...)`, classement `ts_rank`, filtré sur les sources cochées et sur `user_id`.
  - **DoD :** requête testée avec deux utilisateurs : zéro chunk de l'autre utilisateur ; sans correspondance, liste vide.

- [/] **Tâche 19.13 : Chat avec citations** (citations affichées dans l’app (réponse juste + [Source 1]) ; cas « sans source » couvert par tests/document-files.test.mjs, non exécuté sans identifiants)
  - **Fichiers :** `mobile-api/app/api/mobile/documents/[id]/chat/route.ts`
  - **Action :** Remplacer le `slice(0, 1500)` par les chunks retournés par 19.12, pour les `sourceIds` fournis. Libeller chaque extrait `[Source n, p.x]`. Consigne au modèle : citer, ne pas inventer. Réponse enrichie de `citations: [{ sourceId, page, excerpt }]`. Sans source, comportement inchangé.
  - **DoD :** requête avec `sourceIds` → réponse avec `citations` non vide ; requête sans source → aucune clé `citations` ajoutée.

### 4. Exports avec images
- [/] **Tâche 19.14 : Export PDF avec images** (insertion base64 testée (tests/html-images.test.mjs) ; export PDF réel non vérifié : le moteur Chrome CLI existant échoue en local (« Moteur de génération PDF indisponible »))
  - **Fichiers :** `mobile-api/app/api/mobile/documents/[id]/export/pdf/route.ts`
  - **Action :** Résoudre chaque `data-file-id` en URL signée fraîche juste avant Puppeteer. Une URL expirée ne doit jamais atteindre le rendu.
  - **DoD :** PDF généré contenant l'image (`pdfimages -list` ou inspection) ; export refait 15 minutes plus tard : image toujours présente.

- [X] **Tâche 19.15 : Export DOCX avec images** (export DOCX réel 200 avec word/media ; ImageRun testé)
  - **Fichiers :** `mobile-api/app/api/mobile/documents/[id]/export/docx/route.ts`
  - **Action :** Lire chaque image depuis le disque (19.4), insérer un `ImageRun` de taille bornée dans le paragraphe de figure. Garder la politique d'export existante (`document-export-policy.ts`).
  - **DoD :** le DOCX s'ouvre sans erreur ; `unzip -l` liste `word/media/*` ; la politique d'export (plan sans DOCX) reste respectée.

### 5. Frontend : images locales
- [/] **Tâche 19.16 : Dépendances Expo** (paquets installés (SDK 54), tsc 0 ; expo-doctor signale 4 écarts de patch préexistants (expo, constants, file-system, updates))
  - **Fichiers :** `package.json`
  - **Action :** `npx expo install expo-image-picker expo-document-picker` (versions compatibles SDK 54).
  - **DoD :** `npx tsc --noEmit` à la racine code 0 ; `npx expo-doctor` ne signale aucune version incompatible.

- [X] **Tâche 19.17 : Client API fichiers & configuration** (tsc 0 ; EXPO_PUBLIC_FILES_URL lu en accès littéral)
  - **Fichiers :** `src/config/env.ts`, `src/features/documents/documentFilesApi.ts` (nouveau)
  - **Action :** Ajouter `filesUrl` (`EXPO_PUBLIC_FILES_URL`, défaut `https://files.campus360b.site`). Fonctions `pickImage`, `uploadDocumentFile` (FormData, `authFetch`, progression), `resolveFileUrl(fileId)`.
  - **DoD :** `npx tsc --noEmit` code 0 ; les variables `EXPO_PUBLIC_*` sont lues en accès littéral (règle du fichier `env.ts`).

- [/] **Tâche 19.18 : Refonte de `DocumentImagesModal`** (modal vérifié dans l’app web (liste, miniature signée, légende, insertion) ; sélection d’une photo sur appareil réel non testée)
  - **Fichiers :** `src/features/documents/DocumentImagesModal.tsx`
  - **Action :** Supprimer le champ URL (l.249) et sa validation. Ajouter « Choisir depuis le téléphone », un aperçu, une légende suggérée, une barre de progression, et un état d'erreur avec « réessayer ».
  - **DoD :** le modal ne contient plus de `TextInput` pour une URL ; sur appareil ou émulateur, la sélection d'une photo ajoute une image à la liste.

- [X] **Tâche 19.19 : Insertion et résolution dans l'éditeur** (figure insérée, éditeur rouvert : image resignée (expire dans 599 s) ; HTML enregistré sans « sig= »)
  - **Fichiers :** `src/features/documents/DocumentEditorScreen.tsx` (`insertFigure`, l.480 et l.1338), `mobile-api/app/api/mobile/documents/[id]/sections/[sectionId]/route.ts` (si le HTML est normalisé à l'enregistrement)
  - **Action :** Insérer `<img data-file-id="...">` sans URL. À l'ouverture de l'éditeur, résoudre chaque `data-file-id` en URL signée (19.7).
  - **DoD :** insérer une image, quitter l'éditeur, rouvrir : l'image s'affiche toujours (URL resignée) ; le HTML enregistré ne contient aucune URL `files.campus360b.site` avec paramètre de signature.

### 6. Frontend : sources & assistant
- [/] **Tâche 19.20 : Refonte de `DocumentSourcesModal`** (note et URL publique « prêtes » dans l’app ; ajout d’un PDF par le sélecteur de fichiers non testé (pas de sélecteur pilotable ici))
  - **Fichiers :** `src/features/documents/DocumentSourcesModal.tsx`
  - **Action :** Sélecteur de fichier (PDF, DOCX, TXT) et champ URL validé. États « en cours / prête / échec » avec réessai. Suppression. Supprimer le fallback `https://campus360b.site/documents/source` (l.94). Texte collé conservé en repli (à confirmer).
  - **DoD :** `npx tsc --noEmit` code 0 ; ajouter un PDF puis une URL publique : les deux passent à « prête ».

- [X] **Tâche 19.21 : Éditeur à 3 onglets & sélection des sources** (tsc 0 ; captures 375 px des trois onglets (.agent/screenshots/e2e-doc-*.jpg))
  - **Fichiers :** `src/features/documents/DocumentEditorScreen.tsx`
  - **Action :** Onglets `Document | Sources | Assistant` (barre basse de l'éditeur). Case « utiliser » par source ; la sélection est mémorisée par document.
  - **DoD :** `npx tsc --noEmit` code 0 ; capture 390 px des trois onglets (tâche 19.26).

- [/] **Tâche 19.22 : Assistant : sources envoyées et citations cliquables** (question → réponse avec citation visible ; cas « source décochée » non testé)
  - **Fichiers :** `src/features/documents/EditorAiChat.tsx`
  - **Action :** Envoyer `sourceIds` (sources cochées) à `/chat`. Afficher les `citations` sous la réponse ; un toucher ouvre l'extrait et sa page.
  - **DoD :** question sur une source cochée → réponse avec au moins une citation visible ; source décochée → cette source n'apparaît plus dans les citations.

### 7. Câblage, sécurité & vérification
- [/] **Tâche 19.23 : Vhost Nginx `files.campus360b.site` (versionné)** (vhost et procédure écrits (docs/deploy/) ; nginx -t, certificat et DNS à faire sur le VPS (action utilisateur))
  - **Fichiers :** `docs/deploy/nginx-files.conf` (nouveau), `scripts/deploy-vps.sh` (si la config doit être déployée par le script)
  - **Action :** Vhost HTTPS qui proxifie vers la mobile-api du VPS (`127.0.0.1:3002`, port à confirmer), `client_max_body_size 25m`, en-têtes de sécurité. Certificat via certbot. Variables VPS : `UPLOAD_ROOT`, `FILES_SIGNING_SECRET`. **Action utilisateur :** enregistrement DNS `A files → 164.68.109.206`.
  - **DoD :** `nginx -t` code 0 ; `curl -I https://files.campus360b.site/api/files/inexistant` renvoie 404 ou 403, et non une erreur TLS.

- [X] **Tâche 19.24 : Sauvegarde & purge disque** (suppression du document de test → fichier disque, lignes et chunks supprimés ; purge testée (orphelin ancien supprimé, récent conservé))
  - **Fichiers :** `scripts/` (job de purge à créer), `docs/deploy/` (sauvegarde)
  - **Action :** Suppression d'un document → suppression des fichiers et chunks associés (cascade BDD + purge disque). Job de purge des fichiers orphelins. Sauvegarde quotidienne de `UPLOAD_ROOT`.
  - **DoD :** supprimer un document de test fait disparaître ses fichiers du disque et de la base ; le job de purge s'exécute sans erreur sur un dossier vide.

- [/] **Tâche 19.25 : Tests d'intégration** (npm test : 45 tests, 44 réussis, 1 ignoré (scénario authentifié : E2E_EMAIL/E2E_PASSWORD requis))
  - **Fichiers :** `mobile-api/tests/document-files.test.mjs` (nouveau)
  - **Action :** Upload, refus sans session, traversée de chemin, quota, URL signée expirée, isolation entre utilisateurs, chat avec citations, export avec image.
  - **DoD :** `node mobile-api/tests/document-files.test.mjs` code 0 ; `npx tsc --noEmit` dans `mobile-api/` code 0.

- [/] **Tâche 19.26 : Vérification E2E & preuves visuelles** (captures produites ; parcours note/URL/assistant/image validé dans l’app ; export PDF non vérifié (moteur local))
  - **Fichiers :** `scripts/e2e-screenshots.cjs` (étendre), `.agent/screenshots/e2e-doc-*.png` (nouveaux)
  - **Action :** Parcours complet : ajout d'une photo, ajout d'un PDF et d'une URL, question à l'assistant avec citation, export. Captures des trois onglets à 390 px.
  - **DoD :** captures produites ; 0 erreur console ; l'image apparaît dans l'export PDF (vérifiée).


---

## 🎨 MODULE 20 : Style du Document & Mise en Page Académique (rapport de stage et mémoire)

> Cadrage validé le 2026-10-15 (voir `contexte.md` §14, Lot 1). Rapport et mémoire partagent le même moteur de style. Le CV est hors périmètre (V2).
> **Décisions :** 4 styles prêts (Classique universitaire, Moderne, Sobre, Institutionnel) puis réglages fins ; pagination à la norme académique (page de garde sans numéro, préliminaires en i, ii, iii, corps à partir de 1) ; une seule source de vérité `document_style` (JSON) lue par l'éditeur, l'aperçu, le PDF et le Word.
> **Choix techniques :** en-têtes, pieds de page, bordures et numéros posés sur le PDF après rendu avec `pdf-lib` (on connaît alors la page de chaque titre) ; vrais numéros du sommaire par rendu en deux passes ; Word : sections distinctes (préliminaires / corps), sommaire et listes en champs Word natifs.

### 1. Données & modèle de style
- [X] **Tâche 20.1 : Migration `0007_document_style.sql`** (appliquée 2 fois sans erreur ; 21/21 documents avec un style (20 Times New Roman, 1 Georgia ex-Lora))
  - **Fichiers :** `mobile-api/sql/0007_document_style.sql` (nouveau)
  - **Action :** Colonne `document_style jsonb` sur `app_documents`, remplie à partir des colonnes existantes (police, interligne, marges, couleurs, modèle de page de garde). Idempotente.
  - **DoD :** exécution deux fois via `node scripts/run-sql.cjs mobile-api/sql/0007_document_style.sql` sans erreur ; aucun document existant sans `document_style`.

- [X] **Tâche 20.2 : Modèle `DocumentStyle` et les 4 styles prêts** (tests/document-style.test.mjs 7/7, dont parité serveur/app et schéma Zod strict)
  - **Fichiers :** `mobile-api/lib/document-style.ts` (nouveau), `src/features/documents/documentStyle.ts` (nouveau, copie client), `mobile-api/tests/document-style.test.mjs` (nouveau)
  - **Action :** Type complet (typographie titres/texte, taille, interligne ; titres : numérotation 1./1.1/I./A., majuscules, couleur, filet ; page : marges, bordure ; en-tête/pied : contenu gauche/droite, format du numéro, logo ; page de garde : modèle, logos, champs ; tableaux : style, couleur d'en-tête). 4 presets, fusion avec valeurs par défaut, validation Zod, polices limitées à Times New Roman, Georgia, Arial, Calibri, Garamond, Cambria.
  - **DoD :** `node --test tests/document-style.test.mjs` : presets valides, fusion correcte, valeurs invalides rejetées ; test de parité presets serveur = presets client.

- [X] **Tâche 20.3 : API du style** (tsc 0 ; schéma strict testé (police hors liste, couleur ou clé invalide → rejet, donc 400 dans la route) ; écriture JSON vérifiée en base dans une transaction annulée)
  - **Fichiers :** `mobile-api/app/api/mobile/documents/[id]/route.ts`, `mobile-api/lib/documents-db.ts`
  - **Action :** `GET` renvoie `document_style` complet (défauts fusionnés) ; `PATCH` accepte `document_style` (Zod) ou `style_preset` ; les colonnes historiques restent synchronisées.
  - **DoD :** `npx tsc --noEmit` code 0 ; test : PATCH d'une police hors liste → 400.

### 2. Rendu commun (éditeur, aperçu, PDF)
- [X] **Tâche 20.4 : Générateur CSS du style** (fait dans `lib/document-render.ts` + copie `src/features/documents/documentRender.ts` au lieu d'un fichier séparé ; test de parité octet par octet)
  - **Fichiers :** `mobile-api/lib/document-style-css.ts` (nouveau), `src/features/documents/documentStyleCss.ts` (nouveau)
  - **Action :** `styleToCss(style)` produit polices, tailles, interligne, styles de titres, tableaux, encadrés ; utilisé par l'éditeur, l'aperçu et l'export PDF.
  - **DoD :** test : même CSS côté serveur et côté client pour les 4 presets.

- [X] **Tâche 20.5 : Titres numérotés automatiquement** (compteurs CSS à l'écran ; `lib/document-numbering.ts` écrit les numéros en texte pour PDF et Word ; `normalizeHeadings` remonte les titres IA h2/h3 et retire les numéros tapés — tests document-render 4/4)
  - **Fichiers :** `document-style-css.ts` (compteurs CSS), `mobile-api/lib/html-to-docx.ts` (numérotation Word des titres)
  - **Action :** 1. / 1.1 / 1.1.1, I. / A., ou aucune ; numérotation relative au chapitre ; même résultat à l'écran, en PDF et en Word.
  - **DoD :** tests : HTML de 2 chapitres → numéros attendus dans le PDF (texte extrait) et dans `word/document.xml`.

- [X] **Tâche 20.6 : Légendes numérotées des figures et tableaux** (numérotation dans `document-numbering.ts` ; « + Légende » dans la barre Tableau ; tests PDF et Word)
  - **Fichiers :** `mobile-api/lib/document-captions.ts` (nouveau), `src/features/documents/editorTemplate.ts`
  - **Action :** « Figure 2.1 », « Tableau 2.1 » numérotés au rendu selon le chapitre ; légende de tableau insérable depuis la barre « Tableau ».
  - **DoD :** test : 3 figures sur 2 chapitres → 1.1, 2.1, 2.2.

### 3. Export PDF
- [X] **Tâche 20.7 : Pagination académique et en-têtes / pieds de page (PDF)** (double passe Puppeteer + marqueurs invisibles + tampon `pdf-lib` ; tests document-pdf 4/4 : i/ii/iii, 1…n, « Page n », « n / total », sans numéro)
  - **Fichiers :** `mobile-api/lib/pdf-render.ts`, `mobile-api/lib/pdf-pagination.ts` (nouveau), `mobile-api/package.json` (ajouter `pdf-lib`)
  - **Action :** Rendu sans numéros, puis tampon `pdf-lib` page par page : page de garde vierge, préliminaires en romain, corps à partir de 1 ; en-tête (titre ou chapitre courant, nom, établissement, logo) et pied (« 3 », « Page 3 », « 3 / 42 ») selon le style ; bordure de page (simple, double, page de garde seule).
  - **DoD :** test : PDF de 1 + 3 + 5 pages → numéros extraits « ii », « iii », « 1 »…« 5 », aucun sur la page de garde ; en-tête du chapitre 2 présent sur ses pages.

- [X] **Tâche 20.8 : Vrai sommaire et listes des figures / tableaux (PDF)** (page réelle des titres via pdfjs, re-mesure si le nombre de pages change ; liste des figures/tableaux générée, plus aucun texte inventé)
  - **Fichiers :** `mobile-api/app/api/mobile/documents/[id]/export/pdf/route.ts`, `mobile-api/lib/pdf-pagination.ts`
  - **Action :** Première passe → page réelle de chaque titre et légende (via `pdfjs-dist`) ; seconde passe avec sommaire et listes complétés. Suppression du calcul estimé actuel (`runningPage`).
  - **DoD :** test : chaque entrée du sommaire pointe vers la page où le titre apparaît réellement.

- [X] **Tâche 20.9 : Pages de garde (4 modèles) et logos** (4 modèles dans `document-render.ts` (`coverHtml`), en-tête République du Cameroun en option, logos importés depuis le téléphone ; captures m20-print-*.png, m20-preview-cover-375.jpg)
  - **Fichiers :** `mobile-api/lib/cover-templates.ts` (nouveau), route PDF, `src/features/documents/editorTemplate.ts` (aperçu)
  - **Action :** 4 modèles alignés sur les styles ; logos de l'établissement et de l'entreprise (fichiers image du document) ; champs libres (ex. jury, date de soutenance).
  - **DoD :** rendu PDF des 4 modèles sans erreur ; logos visibles ; captures `.agent/screenshots/m20-cover-*.png`.

- [X] **Tâche 20.10 : Pages préliminaires mises en forme** (`classifySection` ; dédicace italique à droite en PDF et Word, testée ; sigles : mise en page simple, le tableau reste à saisir par l'étudiant)
  - **Fichiers :** `mobile-api/lib/document-sections.ts` (nouveau), CSS du style, route PDF, `html-to-docx.ts`
  - **Action :** Reconnaissance des sections (dédicace, remerciements, résumé / abstract, sigles) ; dédicace en italique calée en bas à droite ; sigles en tableau à deux colonnes ; ces pages comptent dans la numérotation romaine.
  - **DoD :** test : section « Dédicace » rendue avec la classe attendue en PDF et en Word.

### 4. Export Word
- [X] **Tâche 20.11 : Sections, numérotation, en-têtes et pieds (Word)** (`lib/document-docx.ts` ; test : 3 sectPr, lowerRoman puis decimal, en-têtes/pieds, bordures)
  - **Fichiers :** `mobile-api/app/api/mobile/documents/[id]/export/docx/route.ts`, `mobile-api/lib/html-to-docx.ts`
  - **Action :** Trois sections Word : page de garde (sans numéro), préliminaires (`lowerRoman`), corps (`decimal` à partir de 1) ; en-tête et pied selon le style ; bordures de page ; polices, titres numérotés et tableaux selon le style.
  - **DoD :** test : `word/document.xml` contient 3 `w:sectPr` et les formats `lowerRoman` puis `decimal` ; `word/header*.xml` présent.

- [X] **Tâche 20.12 : Sommaire et listes natifs (Word)** (TOC `\o`, listes `	 "Légende figure,1"` avec entrées pré-remplies, `updateFields` ; légendes en style de paragraphe au lieu de champs SEQ — même résultat dans Word)
  - **Fichiers :** `docx/route.ts`, `html-to-docx.ts`
  - **Action :** Champ sommaire Word (mise à jour à l'ouverture) ; légendes en champs de séquence ; listes des figures et tableaux en champs Word.
  - **DoD :** test : présence des champs `TOC` et `SEQ Figure` dans le XML ; le fichier s'ouvre sans erreur.

### 5. Interface
- [X] **Tâche 20.13 : Panneau « Style du document »** (`DocumentStylePanel.tsx` : 4 cartes, 6 sections repliables, aperçu en direct, enregistrement optimiste ; tsc 0, lint:colors 193/193)
  - **Fichiers :** `src/features/documents/DocumentStylePanel.tsx` (nouveau), `src/features/documents/DocumentEditorScreen.tsx`
  - **Action :** Remplace le panneau « Aa ». 4 cartes de styles, puis sections repliables (Typographie, Titres, Page, En-tête / pied, Page de garde, Tableaux) ; aperçu miniature mis à jour à chaque réglage ; enregistrement automatique.
  - **DoD :** `npx tsc --noEmit` code 0 ; `npm run lint:colors` sans hausse ; captures 375 px des 4 styles.

- [X] **Tâche 20.14 : Éditeur et aperçu pilotés par le style** (`buildWysiwygHtml(content, title, style)` et `buildPreviewHtml(doc, sections, style, logos)` ; numéros simulés i/ii puis 1…n dans l'aperçu ; vérifié à 375 px sans défilement horizontal, capture m20-preview-pages-375.jpg)
  - **Fichiers :** `src/features/documents/editorTemplate.ts`, `DocumentEditorScreen.tsx`
  - **Action :** L'éditeur et l'aperçu lisent `document_style` (titres numérotés, tableaux, légendes) ; l'aperçu montre en-têtes, pieds et numéros simulés.
  - **DoD :** changement de style → éditeur et aperçu mis à jour sans perte de texte (test navigateur).

- [X] **Tâche 20.15 : Images et tableaux plus simples à insérer** (largeur pleine / moitié / petite à l'insertion et dans la barre Figure ; 50 % à l'écran et en PDF, 300 px en Word)
  - **Fichiers :** `src/features/documents/DocumentImagesModal.tsx`, `editorTemplate.ts`
  - **Action :** Largeur de l'image (pleine, moitié, petite) au moment de l'insertion et modifiable ensuite ; barre « Tableau » avec « Ajouter une légende » et choix du style.
  - **DoD :** test navigateur : image insérée en « moitié » → largeur 50 % à l'écran, en PDF et en Word.

### 6. Validation
- [X] **Tâche 20.16 : Tests et preuves visuelles** (npm test mobile-api : 0 échec ; tsc app et mobile-api : 0 ; captures `.agent/screenshots/m20-*`)
  - **Fichiers :** `mobile-api/tests/*.test.mjs`, `.agent/screenshots/m20-*.png`
  - **Action :** Export PDF et Word d'un rapport et d'un mémoire dans chacun des 4 styles ; captures des pages clés (garde, sommaire, chapitre, page avec tableau).
  - **DoD :** `npm test` (mobile-api) 0 échec ; `npx tsc --noEmit` code 0 (app et mobile-api) ; captures produites.

---

## ✍️ MODULE 21 : Rédaction en Voix Étudiante & Mode Entretien

> Cadrage validé le 2026-10-15 (voir `contexte.md` §14, Lot 2). À démarrer après le Module 20.
> **Décisions :** l'IA interroge l'étudiant puis rédige à partir de ses réponses et des sources cochées ; voix étudiante, registre académique ; liste noire des tics d'IA (règles `idiomaticite-fr`, sans familiarités) ; rien d'inventé, manques signalés entre crochets ; plans par filière.

### 1. Backend
- [X] **Tâche 21.1 : Règles d'écriture partagées** (`lib/writing-rules.ts` : voix étudiante, liste noire de 37 expressions, règle des crochets, `findAiTics`, `stripRepeatedTitle` ; tests writing-rules 9/9)
  - **Fichiers :** `mobile-api/lib/writing-rules.ts` (nouveau), `mobile-api/tests/writing-rules.test.mjs` (nouveau)
  - **Action :** Consignes de voix étudiante (« je » ou « nous », voix active, rythme varié, registre académique) ; liste noire (« dans un monde en constante évolution », « il est important de souligner / noter que », « plongeons dans le vif du sujet », « sans plus tarder », « en somme », « révolutionnaire », « paysage », « crucial », « incontournable »…) ; règle des crochets ; fonction `findAiTics(text)`.
  - **DoD :** tests : `findAiTics` détecte chaque expression de la liste et ignore un texte naturel.

- [X] **Tâche 21.2 : Consignes réécrites dans toutes les routes de rédaction** (chat, ai, generate-full, onboard-chat réécrites + pdf-chat ; `grep "Élite|percutant|élégant" app` → 0 ; generate (CV/lettre) laissé pour le chantier CV ; repli sans clé de `ai` : XSS corrigé (texte échappé))
  - **Fichiers :** `mobile-api/app/api/mobile/documents/[id]/chat/route.ts`, `documents/ai/route.ts`, `documents/generate/route.ts`, `documents/generate-full/route.ts`, `documents/onboard-chat/route.ts`
  - **Action :** Remplacer « Rédacteur Universitaire d'Élite », « denses, soutenus et élégants », « percutants » par les règles de 21.1.
  - **DoD :** `grep -rn "Élite\|percutant\|élégants" mobile-api/app` ne renvoie rien ; `npx tsc --noEmit` code 0.

- [X] **Tâche 21.3 : Suppression du contenu fictif codé en dur** (fiche d'identification remplie depuis la page de garde ou entre crochets, sigles en tableau vide, listes vides (générées à l'export), bibliographie sans référence inventée, schémas SVG et tableau « Campus 360 » retirés)
  - **Fichiers :** `mobile-api/app/api/mobile/documents/generate-full/route.ts`
  - **Action :** Retirer les fausses listes (figures « Campus 360 », tableaux inventés) ; ces listes viennent désormais des vraies légendes (Module 20).
  - **DoD :** `grep -n "Campus 360\|Figure 1.1 :" generate-full/route.ts` ne renvoie rien ; génération de test sans contenu fictif.

- [X] **Tâche 21.4 : Plans par filière** (`lib/document-outlines.ts` + copie app identique, migration `0008` (colonne `field`), `createDocument(…, field)`, filière déduite du profil ; tests document-outlines 4/4)
  - **Fichiers :** `mobile-api/lib/document-outlines.ts` (nouveau), `mobile-api/lib/documents-db.ts`, `mobile-api/app/api/mobile/documents/route.ts`
  - **Action :** Plans rapport et mémoire pour : informatique ; gestion et comptabilité ; marketing et commerce ; BTP et génie ; droit et sciences sociales. Création d'un document avec `field` (filière), déduite par défaut du profil.
  - **DoD :** test : chaque filière produit un plan avec page de garde, préliminaires, introduction, chapitres, conclusion, bibliographie, annexes.

- [X] **Tâche 21.5 : API du mode entretien** (`sql/0008_section_interviews.sql` appliquée 2 fois, `lib/interview.ts` (banque de questions par section et filière, sans appel IA), route GET/PUT/POST `sections/[sectionId]/interview`, `lib/source-context.ts`, `lib/llm.ts` ; tests interview 5/5 dont 401 réel sans session)
  - **Fichiers :** `mobile-api/sql/0008_section_interviews.sql` (nouveau), `mobile-api/app/api/mobile/documents/[id]/sections/[sectionId]/interview/route.ts` (nouveau), `mobile-api/lib/interview.ts` (nouveau)
  - **Action :** `GET` → 5 à 6 questions adaptées à la section et à la filière ; `PUT` → réponses enregistrées (colonne `interview_answers jsonb`) ; `POST /draft` → rédaction à partir des réponses et des sources cochées, avec citations.
  - **DoD :** test HTTP sans session → 401 ; tests unitaires de la construction de la consigne (réponses et règles présentes, aucune donnée inventée demandée).

- [X] **Tâche 21.6 : Relecture anti-tics après génération** (`polishAiTics` : une passe ciblée seulement si tics, réponse rejetée si tronquée ou pire ; branchée sur chat (rédaction), ai, generate-full, entretien ; testée avec modèle simulé)
  - **Fichiers :** `mobile-api/lib/writing-rules.ts`, routes de rédaction
  - **Action :** Après chaque génération, `findAiTics` ; si des tics restent, une seule passe de réécriture ciblée ; sinon le texte est rendu tel quel.
  - **DoD :** test : texte contenant 3 tics → passe de réécriture déclenchée (modèle simulé).

### 2. Interface
- [X] **Tâche 21.7 : Écran « Rédiger avec moi » (entretien)** (`SectionInterview.tsx` + bascule « Rédiger avec moi / Discuter » dans `EditorAiChat.tsx`, helpers `aiHtml.ts` ; tsc 0, lint:colors 193/193 ; parcours non cliqué dans le navigateur : session de l'app expirée, à vérifier par l'utilisateur)
  - **Fichiers :** `src/features/documents/SectionInterview.tsx` (nouveau), `src/features/documents/EditorAiChat.tsx`
  - **Action :** Dans l'onglet Assistant : une question à la fois, réponse libre, « passer », progression ; puis « Rédiger la section » → aperçu → insérer ou remplacer. Les réponses sont gardées pour reprendre plus tard.
  - **DoD :** `npx tsc --noEmit` code 0 ; parcours vérifié dans le navigateur (captures `.agent/screenshots/m21-*.png`).

- [X] **Tâche 21.8 : Choix de la filière à la création** (puces de filière dans `DocumentsScreen.tsx`, proposée d'après le profil, envoyée aux 3 créations ; bouton « Vierge » renommé « Plan vide » ; tsc 0)
  - **Fichiers :** `src/features/documents/DocumentsScreen.tsx`
  - **Action :** Filière proposée d'après le profil, modifiable avant de créer le rapport ou le mémoire.
  - **DoD :** `npx tsc --noEmit` code 0 ; création d'un rapport « Gestion » → plan de gestion.

### 3. Validation
- [X] **Tâche 21.9 : Contrôle qualité de la rédaction** (`tests/writing-quality.test.mjs`, exécuté avec la vraie clé : 3 sections, 0 tic, 0 chiffre inventé, crochets présents dans les chapitres ; ignoré proprement dans `npm test` sans clé)
  - **Fichiers :** `mobile-api/tests/writing-quality.test.mjs` (nouveau)
  - **Action :** Avec le vrai modèle (si `OPENROUTER_API_KEY`), rédiger 3 sections à partir de réponses d'entretien fictives ; vérifier 0 tic de la liste noire, aucun chiffre absent des réponses, crochets là où l'information manque.
  - **DoD :** test exécuté (ou ignoré proprement sans clé) ; rapport des tics trouvés = 0.

---

## 🎬 MODULE 22 : Landing immersive & film de démo (`landing-site/`, `../motion-design-claude-code/campus360-demo/`)

> Demande du 2026-10-15 : landing attractive (animations, 3D, vidéos de démo) mais légère pour les petites connexions ; chaque scène du film doit montrer le **bon écran pour la bonne action** ; toutes les pages au même niveau d'immersion. Rien n'est déployé sans accord.

### 1. Accueil (fait)
- [X] **Tâche 22.1 : Hero 3D, bandeau, parcours au scroll, grille inclinable** — `app/page.tsx`, `components/landing/*`, polices `app/fonts/` (`next/font/local`). DoD : `next build` exit 0 ; JS accueil 127 Ko ; premier chargement mobile ≈ 380 Ko ; 0 erreur console ; captures `.agent/screenshots/landing-v2-*.png`.
- [X] **Tâche 22.2 : Film de démo v1 (18 s, muet)** — HyperFrames `campus360-demo/`, versions web `public/motion/`. Défaut constaté : scènes « Postule », « Relance J+7 » et « Soutenance » montrent l'accueil ou l'écran Créer au lieu de l'action → 22.3 à 22.5.

### 2. Film : le bon écran pour la bonne action
- [X] **Tâche 22.3 : Nouvelles captures de l'app (thème clair actuel)** — `scripts/e2e-screenshots.cjs` étendu : détail d'une offre + bouton Postuler, modale de candidature (onglets Correspondance / CV / Lettre), choix du canal d'envoi, candidature envoyée, suivi avec relance J+7, Coach IA de soutenance (slides + question piège). Fait via `scripts/demo-captures.cjs` (compte de démo local `.env.e2e.local`, ignoré par git ; appels coach et rapports redirigés vers mobile-api :3002) → `.agent/screenshots/demo/`.
- [X] **Tâche 22.4 : Storyboard scène ↔ écran** — 1 scène = 1 action = 1 capture : Trouve (liste des stages) → Correspondance (onglet score) → CV (onglet CV) → Envoi (canaux + envoyée) → Relance J+7 (suivi) → Soutenance (coach) → carte finale. Le téléphone zoome sur la zone de l'action (bouton, score, badge J+7).
- [X] **Tâche 22.5 : Rendu & encodage** — `npx hyperframes check` 0 erreur, planche de contrôle relue, versions web < 1 Mo, affiche.

### 3. Pages au même niveau d'immersion
- [X] **Tâche 22.6 : Composant d'en-tête de page commun** (aurore, grille, apparition) — `components/landing/page-hero.tsx`.
- [X] **Tâche 22.7 : Fonctionnalités, Tarifs, Aide, Contact, À propos, Télécharger** — en-tête commun, cartes inclinables, apparitions au scroll ; FAQ et formulaires au thème sombre.
- [X] **Tâche 22.8 : Pages secondaires** (Inscription, Connexion, Mot de passe oublié, pages légales, 404, Blog) — en-tête commun, sans animation lourde.
- [X] **Tâche 22.9 : Vérification** (build exit 0, JS accueil 127 Ko, 0 erreur console, captures `.agent/screenshots/landing-v3-*` et `pages-v2/`) — `next build` exit 0, captures bureau + 390 px de chaque page, poids de chargement, 0 erreur console.

### 4. App mobile (demandes du 2026-10-15)
- [X] **Tâche 22.10 : Section « Recommandé pour toi »** — `src/ui/screens/HomeScreen.tsx` : titre sans hashtag, pastille « Sélection IA » en dégradé, ligne « Classées selon ta filière », vrai score de correspondance (même calcul que l'onglet Stages) au lieu du « 95% » en dur, badge « Meilleur choix », plus de lieu ni d'indemnité inventés. DoD : `tsc` OK, garde-fou couleurs OK, capture `demo/02-recommande.png`.
- [X] **Tâche 22.11 : Icône provisoire = logo du site** — `assets/icon.png`, `android-icon-*.png`, `splash-icon.png`, `favicon.png` (carré dégradé + « C »), fond adaptatif `#7C4DFF` dans `app.json`. Visible sur le téléphone après un **nouveau build APK** (une mise à jour OTA ne change pas l'icône).
- [X] **Tâche 22.12 : Lisibilité du Coach de soutenance** — `DefenseCoachModal.tsx` : textes « Ce que tu dois dire au jury », « Ce que le jury teste », « Réponse modèle » devenus lisibles (restes du thème sombre), couleurs via jetons (garde-fou 199 → 193).
- [X] **Tâche 22.13 : V1 entièrement gratuite (lancement)** — réglage serveur `FREE_LAUNCH_MODE` (gratuit par défaut, `false` pour revenir au payant) dans `mobile-api` et `recruiter-web` (`lib/free-launch.ts`) : génération IA (rapport, mémoire) à 0 crédit, PDF et packs à 0 FCFA ; indicateur `wallet.freeLaunch` renvoyé par `/api/mobile/account` ; app (`src/config/launch.ts`) : plus de blocage crédits pour postuler ni générer, pastille « Recharge MoMo » masquée, prix affichés « Gratuit » ; landing : « Tout est gratuit pendant le lancement », futurs tarifs affichés en petit. DoD : `tsc` app + 2 backends OK, build landing OK, parcours réel vérifié avec 0 crédit (dossier généré sans recharge, captures `demo/06-*`, `demo/13-atelier-ia.png`).
- [ ] **Tâche 22.14 : Nettoyage du compte de démo** — `landing-demo+campus360@example.com` (créé en local sur la base partagée, e-mail marqué vérifié, 5 crédits IA, profil de test). À supprimer quand les captures ne sont plus utiles.

---

## 🚦 MODULE 23 : Préparation V1 — Vérité des états, sécurité, conformité stores, exploitation

> Cadrage : audit V1 du 2026-10-15 (5 agents, points bloquants revérifiés dans le code). Objectif : rien de faux à l'écran, aucun argent ni donnée perdu, publication Play/App Store possible, prod reproductible.
> **Règles :** un échec s'affiche comme un échec (jamais de succès simulé) ; aucune donnée inventée (personne, entreprise, numéro, prix, document) ; aucun envoi vers un numéro qui n'est pas celui de l'entreprise ; tout ce qui coûte (paiement, IA, WhatsApp) est authentifié, plafonné et journalisé.
> **Ordre :** Lot A → Lot B → Lot C → Lot D. Les actions utilisateur sont listées à la fin.

### Guide pour l'IA exécutante (Module 23)

**À lire avant toute tâche.** Ce guide vaut pour les 26 tâches du module. Chaque tâche est écrite pour être exécutée seule avec ce guide ; les numéros de ligne sont ceux du 2026-10-15 et peuvent avoir bougé : relocalise toujours par le nom de la fonction (Grep) avant d'éditer.

**1. Rôle des dossiers**
- `src/` : app Expo (React Native, SDK 54). Pas de react-navigation : la navigation est un état (`activeSection`) dans `src/AppShell.tsx`, qui tient tout l'état (useState/useEffect) et délègue le rendu à `src/ui/screens/*`. L'app ne parle jamais à Postgres ; elle appelle le serveur avec `authFetch` / `authFetchRaw` / `mobileApiFetch` (`src/features/auth/betterAuth.ts`).
- `mobile-api/` : backend de l'app (Next 15, port 3002 en dev, prod `https://api.campus360b.site` sur le VPS 164.68.109.206 derrière Nginx, pm2 `campus360-mobile-api`). Accès base par `pg` direct (`lib/database.ts`), auth Better Auth (`lib/auth.ts`), validation Zod v4. Tests : `mobile-api/tests/*.test.mjs` lancés par `npm test` (`node --test tests/*.test.mjs`).
- `recruiter-web/` : admin web (package `campus-360-admin`, port 3001, `https://admin.campus360b.site`). Contient des **copies divergentes** de 25 routes `/api/mobile/*` et de libs (`lib/mobile-access.ts`, `lib/free-launch.ts`, `lib/rate-limit.ts`…). En dev, l'app appelle encore ces copies pour une partie des routes (via `authBaseUrl` = `:3001`) ; en prod elle appelle `mobile-api`. La tâche 23.22 supprime ces copies. **Règle :** tant que 23.22 n'est pas faite, toute correction d'une route ou d'une lib qui a une copie dans `recruiter-web/` doit être reportée dans la copie (chaque tâche liste les copies concernées). Si 23.22 est faite, ignorer les copies.
- `landing-site/` : site public (Next 15, port 3000, `https://campus360b.site`), pages légales comprises.
- Le dossier `admin-app/` n'existe pas (le corps de `CLAUDE.md` le cite à tort).

**2. Conventions de code (obligatoires)**
- Messages visibles par l'utilisateur en français ; commentaires de code en anglais ; pas d'emoji dans les nouveaux messages.
- TypeScript strict, aucun `any` nouveau (utiliser `unknown` puis un garde de type).
- Toute entrée d'API est validée par Zod (`z.object({...}).strict()` quand c'est un corps JSON).
- Toute route `mobile-api` authentifiée commence par `const access = await requireMobileUser(request)` puis `if (access.response) return access.response;` ; ajoute `await enforceRateLimit(request, { bucket, max, windowMs, userId: access.user.id })` (`lib/route-rate-limit.ts`) ; le `catch` final renvoie `mobileErrorResponse(error, request)` (`lib/mobile-access.ts`).
- Argent : transaction explicite `const client = await databasePool.connect(); await client.query('begin') … commit … rollback`, `select … for update` sur le wallet et la transaction, `client.release()` dans `finally`.
- Couleurs de l'app : uniquement `stitchColors` (`src/theme/stitch.ts`). Le garde-fou `npm run lint:colors` (`scripts/check-hardcoded-colors.mjs`, référence `scripts/hardcoded-colors-baseline.json`, total 193 au 2026-10-15) échoue à toute hausse ; fichiers exclus : `theme/stitch.ts`, `features/stages/pdfExportService.ts`, `features/stages/OfficialCvView.tsx`, `features/documents/documentStyle.ts`, `features/documents/documentRender.ts`. Si tu retires des couleurs en dur, baisse la référence avec `npm run lint:colors:update`.
- Variables `EXPO_PUBLIC_*` : toujours lues comme `process.env.EXPO_PUBLIC_NOM` (sans `?.`), sinon Metro ne les intègre pas (`src/config/env.ts`).

**3. Fichiers jumeaux (doivent rester identiques)**
| Serveur | App | Test de parité |
|---|---|---|
| `mobile-api/lib/document-style.ts` | `src/features/documents/documentStyle.ts` | `mobile-api/tests/document-style.test.mjs` (égalité stricte) |
| `mobile-api/lib/document-outlines.ts` | `src/features/documents/documentOutlines.ts` | `mobile-api/tests/document-outlines.test.mjs` |
| `mobile-api/lib/document-render.ts` | `src/features/documents/documentRender.ts` | **aucun** : identiques sauf l'import `./document-style` ↔ `./documentStyle` (ligne 7). Le test est créé en 24.1 ; si tu modifies ce fichier avant, crée-le d'abord (voir 24.1). |

**4. Migrations SQL (numérotation fixée pour tout le plan)**
| Fichier `mobile-api/sql/` | Tâche | Contenu |
|---|---|---|
| `0000_baseline.sql` | 23.19 | schéma complet hors migrations (base vide) |
| `0009_document_kind.sql` | 23.26 | `documents.kind`, `documents.always_free` |
| `0010_wallet_transactions_hardening.sql` | 23.8 | `pack_type`, statuts `pending/success/failed`, contrainte `type` |
| `0011_scraped_reports_status.sql` | 23.12 | `scraped_stage_reports.status` |
| `0012_account_deletion.sql` | 23.14 | transactions anonymisables, journal des suppressions |
| `0013_document_templates.sql` | 24.3 | `app_document_templates`, `app_template_assets`, `app_documents.template_id` |
- Chaque migration est idempotente (`create table if not exists`, `add column if not exists`, contraintes via `drop constraint if exists` puis `add constraint`, ou bloc `do $$ … if not exists (select 1 from pg_constraint where conname = …)` comme `0005_stage_jobs_quality.sql`). Elle doit pouvoir s'appliquer deux fois de suite sans erreur : c'est la preuve d'idempotence demandée par les DoD.
- Avant 23.19, on applique à la main : `node scripts/run-sql.cjs mobile-api/sql/<fichier>.sql` (depuis la racine). **Ce script lit `DATABASE_URL` dans `mobile-api/.env.local`, qui pointe sur la base partagée (production).** Demande l'accord explicite de l'utilisateur avant chaque application. Après 23.19, on utilise `npm run migrate` (dans `mobile-api/`), qui rejoue tous les fichiers dans l'ordre du nom : comme ils sont idempotents, un fichier déjà appliqué à la main ne pose pas de problème.

**5. Outils (Windows)**
- Préférer les outils Read / Edit / Write. Ne jamais lancer `grep -r` sur la racine sans exclure `node_modules` (blocage de plus de 2 minutes) : cibler `src`, `mobile-api/app`, `mobile-api/lib`, `recruiter-web/app`, `recruiter-web/lib`, `landing-site/app`, `landing-site/components`.
- Les scripts Python ou Node passés en heredoc dans Bash perdent les antislashs (`\n`, `\\`) : écrire le script dans un fichier (outil Write, dans le dossier scratchpad de la session), puis l'exécuter.
- Requêtes de lecture sur la base : écrire un petit script Node dans le scratchpad qui lit `DATABASE_URL` dans `mobile-api/.env.local` (même méthode que `scripts/run-sql.cjs`), exécute un `select` et affiche les lignes. Ne jamais afficher la valeur de `DATABASE_URL` ni d'aucune variable d'environnement ; ne lire les fichiers `.env*` que pour y chercher des NOMS de variables.
- Charger un module TS dans un test : `mobile-api/tests/helpers/load-ts.mjs`.
  - `loadTs('lib/x.ts')` : module sans import autre que `node:*` ou `import type` (chemin relatif à `mobile-api/`, donc `loadTs('../src/features/…/x.ts')` fonctionne pour un fichier de l'app qui n'importe que des types).
  - `loadTsWithPackages('lib/x.ts', ['lib/dep1.ts', …])` : pour un module qui importe un paquet npm (`pg`, `docx`, `zod`…) ; chaque import relatif `./dep` doit être listé dans le 2ᵉ argument.
  - Simuler la base : `lib/database.ts` lit `globalThis.campusDatabasePool` au chargement. Avant `loadTsWithPackages`, poser `globalThis.campusDatabasePool = { query: async (sql, params) => ({ rows: [], rowCount: 0 }), on() {}, connect: async () => ({ query: async () => ({ rows: [] }), release() {} }) }`. Pour simuler une panne, `query` lève `new Error('connect ECONNREFUSED')`. Sans `DATABASE_URL` et sans faux pool, tout accès à `databasePool` lève `DATABASE_URL is required.`.
  - Une route Next (`app/api/**/route.ts`) importe `next/server` et l'alias `@/` : elle n'est pas chargeable. Extraire la décision dans une fonction pure de `lib/` (sans import de `next/*`) et tester cette fonction.
  - Tests HTTP : sur le modèle de `mobile-api/tests/document-files.test.mjs` (`BASE_URL` par défaut `http://localhost:3002`, test `serverUp` sur `/api/health`, `{ skip: NO_SERVER }`). Un test qui exige un serveur ou un compte doit être ignoré (`skip`), jamais en échec, quand il manque.
- App dans le navigateur : `npm run web` (expo-web) ou l'outil `preview_start` ; vérifier à 375 px de large ; captures dans `.agent/screenshots/m23-<tâche>-<état>.png` (dossier existant).

**6. Règles de sécurité de l'exécutant**
- Ne jamais saisir d'identifiants dans un formulaire ni les recopier dans le chat, un commit ou un log. Les identifiants de test sont dans `.env.e2e.local` (racine, ignoré par git : `E2E_EMAIL`, `E2E_PASSWORD` seulement).
- Ne jamais créer de compte réel ni envoyer de message WhatsApp ou e-mail réel sans accord explicite de l'utilisateur.
- Ne jamais commit, push, déployer, ni appliquer une migration sur la base partagée sans accord explicite.
- Ne jamais modifier les variables d'environnement de production. Les actions sur le VPS, le DNS, la Play Console, EAS, Google Cloud et Notch Pay sont des **actions utilisateur** : les décrire pas à pas et attendre son retour.

**7. Cycle par tâche**
1. Passer la case de la tâche à `[/]` dans `plan.md`.
2. Lire la rubrique « Dépendances ». Une décision marquée « À demander à l'utilisateur » est **déjà tranchée** dans le tableau « Décisions arbitrées le 2026-10-15 » ci-dessous : appliquer ce tableau. Ne poser une question que pour les lignes **🔒 Bloquant utilisateur**, et seulement à l'étape qui en dépend.
3. Exécuter les étapes dans l'ordre, puis les tests, puis la vérification (DoD). Chaque commande de la DoD doit sortir avec le code 0.
4. Cocher `[X]` avec une note courte (fichiers, résultat des commandes), puis ajouter une entrée au journal `contexte.md` §8 (« Journal d'Implémentation & Statut Réel ») au format des entrées existantes : `- **[Tâche 23.x validée — titre (date)]** : fichiers — Validation CLI : … — Preuve : …`.

### Décisions arbitrées le 2026-10-15 (prioritaires sur les « À demander » des tâches)

L'utilisateur a demandé que les questions ouvertes soient tranchées sans lui. Les choix ci-dessous s'appliquent tels quels : une tâche dont la rubrique « Dépendances » contient « À demander à l'utilisateur » applique la ligne correspondante de ce tableau et ne pose pas la question. Seules les lignes marquées **🔒 Bloquant utilisateur** restent à obtenir de lui (on ne les invente jamais) ; la tâche avance sur tout le reste et s'arrête uniquement à l'étape qui en dépend.

| # | Sujet | Décision | Tâches |
|---|---|---|---|
| 1 | Plafond IA | **60 appels IA par jour et par utilisateur** (`AI_DAILY_LIMIT=60`), remis à zéro à minuit heure de Douala (UTC+1), même pendant le lancement gratuit. | 23.10 |
| 2 | Fin du lancement gratuit | `FREE_LAUNCH_UNTIL` = date du déploiement de la release `v1.0.0` + 3 mois (l'exécutant de 23.24 calcule la date et l'écrit dans la case de la tâche et dans `contexte.md`). Avant ce déploiement, `FREE_LAUNCH_MODE=true`. | 23.9, 23.24 |
| 3 | Barème IA après les 3 mois | Barème réduit : rédaction ou amélioration d'un passage (`documents/ai`, chat, entretien) **1 crédit** ; génération d'un CV ou d'une lettre **2 crédits** ; génération d'un rapport ou mémoire complet **3 crédits** (au lieu de 5). Valeurs en variables (`AI_COST_PASSAGE`, `AI_COST_CAREER_DOC`, `AI_COST_FULL_DOC`). | 23.9, 23.10 |
| 4 | Solde de départ | 3 000 coins une seule fois à la création du compte (`STARTING_COINS=3000`), 1 coin = 1 FCFA. | 23.9 |
| 5 | WhatsApp du support | `EXPO_PUBLIC_SUPPORT_WHATSAPP=237690273500` (numéro déjà affiché dans l'app, `src/AppShell.tsx`). | 23.3 |
| 6 | Retrait d'une candidature | Nouveau statut **`WITHDRAWN`** (« Retirée ») : l'historique reste visible pour l'étudiant et le recruteur ; pas de suppression. Seul statut que l'étudiant peut poser lui-même. | 23.12 |
| 7 | Rapports scrapés | Relus avant publication : colonne `status` (`pending`/`published`/`rejected`), les nouveaux arrivent en `pending` ; **les lignes déjà présentes passent en `published`** dans la migration (elles sont visibles aujourd'hui, on ne les fait pas disparaître). | 23.12 |
| 8 | Classement des PDF existants | La migration 0009 classe automatiquement d'après `title`, `subject` et `description` : contient « cours » → `cours` ; « sujet », « épreuve », « examen », « partiel », « td » (mot entier) → `ancien_sujet` ; « corrigé » → `corrige` ; « rapport » → `rapport` ; « mémoire » → `memoire` ; sinon `autre`. `always_free = true` pour `cours` et `ancien_sujet`. L'admin corrige ensuite dans l'écran PDF. | 23.26 |
| 9 | Packs avec PDF gratuits | Prix d'un pack = somme des prix des PDF **non** gratuits avec la remise du pack ; un pack qui ne contient que des PDF gratuits est gratuit. | 23.26 |
| 10 | Vérification d'e-mail | Obligatoire en production pour tous les comptes, admins compris. | 23.11 |
| 11 | Domaines Vercel | Plus aucun joker `*.vercel.app` : liste explicite `https://campus360b.site`, `https://www.campus360b.site`, `https://admin.campus360b.site`, `https://api.campus360b.site` + `TRUSTED_EXTRA_ORIGINS` pour un domaine de prévisualisation ponctuel. | 23.11 |
| 12 | Projet EAS | **`49ce85c3-c644-4a6c-a492-2596e5047c74` / owner `miguelvinijr237`** : c'est celui de `app.json` depuis le 2026-10-02 (historique git) et celui des builds et des OTA ; `098589af…` n'a jamais été dans `app.json`. Corriger `CLAUDE.md`. | 23.17 |
| 13 | Version de l'app | `1.2.0` reste la version (l'APK diffusé est en 1.1.9) ; `package.json` aligné sur `1.2.0` ; `runtimeVersion` inchangé (`appVersion`). Le tag git de release s'appelle quand même `v1.0.0` (première version publique sur les stores). | 23.17, 23.24 |
| 14 | Hébergement de `api.campus360b.site` | **VPS uniquement** (Chromium pour l'export PDF, fichiers sur disque). Le workflow `.github/workflows/vercel-mobile-api.yml` est désactivé (déclencheur manuel `workflow_dispatch` seulement, sans suppression du projet Vercel). L'utilisateur vérifie le DNS (Actions utilisateur). | 23.20 |
| 15 | Rédaction depuis l'admin web | **Retirée de la navigation de l'admin pour la V1** (les étudiants rédigent dans l'app) ; le code reste dans le dépôt, non lié. Cela débloque la suppression des routes `/api/mobile/*` de `recruiter-web` (23.22). | 23.22 |
| 16 | `.agents/` et `.agent/` | `.agents/` (370 fichiers de travail) retiré du suivi git et ajouté au `.gitignore` ; `.agent/` ignoré **sauf** `.agent/screenshots/` (preuves visuelles des tâches). | 23.23 |
| 17 | Surveillance externe | UptimeRobot, offre gratuite : sonde HTTPS sur `https://api.campus360b.site/api/health` toutes les 5 minutes, alerte e-mail (compte créé par l'utilisateur, étapes décrites). | 23.21 |
| 18 | Base de test pour migrations et restauration | PostgreSQL 16 local en Docker (`docker run --rm -e POSTGRES_PASSWORD=test -p 54329:5432 postgres:16`), `MIGRATE_TEST_DATABASE_URL=postgres://postgres:test@localhost:54329/postgres`. Si Docker est absent, la DoD concernée est marquée « reportée » et l'utilisateur est prévenu. Jamais la base partagée. | 23.19, 23.21 |
| 19 | Choix d'architecture du rédacteur | Validés : logique des modèles dans `mobile-api`, `recruiter-web` relaie avec `ADMIN_SERVICE_SECRET` ; suppression de compte confirmée en tapant « SUPPRIMER » ; interrupteurs de notifications sans effet retirés ; logos des modèles dans `app_template_assets`. | 23.6, 23.14, 24.3, 24.9 |
| 20 | IA de vision (import PDF) | Autorisée via OpenRouter, **image de la page de garde uniquement**, pour reconnaître la disposition des blocs ; l'image n'est pas conservée par Campus 360 après l'import ; repli sans vision si le modèle échoue. | 24.8 |
| 21 | Logos de l'IUT dans un modèle public | **Non** : un modèle publié ne contient aucun logo d'établissement ou d'entreprise ; il contient des **emplacements** de logos que l'étudiant remplit avec ses propres fichiers. Les logos importés restent visibles seulement dans l'atelier admin pour l'aperçu. | 24.7, 24.8, 24.12 |
| 22 | Rapport de référence | Téléchargement autorisé dans le scratchpad (jamais dans le dépôt) ; pas de `.docx` d'origine disponible : import PDF + retouches dans l'atelier. | 24.12 |
| 23 | Informations légales de l'éditeur | **🔒 Bloquant utilisateur** : raison sociale, forme juridique, RCCM, NIU, adresse, responsable de publication. En attendant, `mentions-legales` affiche ces champs comme « à compléter » et la publication sur les stores attend. | 23.16 |
| 24 | Comptes et clés de test E2E | **🔒 Bloquant utilisateur** : compte B, compte jetable pour la suppression (dans `.env.e2e.local`), clés Notch Pay en mode test. Sans eux, 23.25 exécute tout le reste et note les parcours non joués. | 23.25 |
| 25 | Accès VPS, DNS, Play Console | **🔒 Bloquant utilisateur** : actions décrites dans « Actions utilisateur » en fin de module. | 23.17, 23.20, 23.21 |
| 26 | Commit, tag, déploiement | **🔒 Bloquant utilisateur** : l'accord explicite est demandé au moment de 23.24 (règle permanente du projet). | 23.24 |

### Lot A — Vérité des états (aucun faux succès, aucune donnée fictive)

- [X] **Tâche 23.1 : Stages côté serveur sans repli fictif** — validée le 2026-10-15 : `lib/stages-errors.ts` (nouveau), `lib/stages-db.ts`, routes `stages`, `stages/apply`, `stages/applications`, `stages/dispatch` (404 offre inconnue, 502 + statut FAILED si n8n échoue, 503 si base injoignable) ; `tests/stages-truth.test.mjs` 6/6 ; `npm test` 95 tests, 0 échec ; `tsc` 0. Restent hors périmètre : e-mails de repli de `wallet/topup/route.ts` et `lib/payments.ts` (traités en 23.8) ; copies `recruiter-web` non corrigées (supprimées en 23.22).
  - **Pourquoi :** quand la base est vide ou en panne, l'étudiant voit 12 offres inventées (MTN, Orange…) et une candidature « envoyée » qui n'existe nulle part. Il croit avoir postulé alors que rien n'est parti.
  - **État actuel :**
    - `mobile-api/lib/stages-db.ts` (1004 lignes) : `FALLBACK_STAGE_JOBS` (l.127 à ~273, 12 offres avec de vrais contacts comme `+2250708091011`, `+237670009988`) ; `listStageJobs` (l.275) renvoie ce tableau si la requête renvoie 0 ligne ou échoue (l.294-312) ; `getStageJob` (l.315) renvoie `FALLBACK_STAGE_JOBS.find(...) || FALLBACK_STAGE_JOBS[0]` pour un id inconnu ou en erreur (l.325) ; `createStageApplication` (l.366) et `dispatchStageApplicationRecord` (l.701) renvoient un faux `{ id: 'app-offline-' + Date.now() }` en erreur (l.392, l.818) ; `ensureStageStudent` (l.25) renvoie `user.id || 'student-stage-id'` en erreur (l.54) ; `listStudentApplications` (l.328) renvoie `[]` en erreur ; `updateApplicationDispatchStatus` (l.831) renvoie `{ id, status }` même si rien n'a été écrit.
    - `mobile-api/app/api/mobile/stages/route.ts` : le `catch` rappelle `listStageJobs({})` (l.17-18).
    - `stages/apply/route.ts` : le `catch` (l.27-41) répond **200** `{ success: true, offline: true, application: { id: 'app-offline-…' } }`.
    - `stages/dispatch/route.ts` (289 l.) : `studentEmail = input.studentEmail || user.email || 'etudiant@campus360.cm'` (l.99) ; aucune vérification que l'offre existe (l.116-119 : `companyName = job?.company.name || 'Entreprise Partenaire'`) ; si l'appel n8n échoue (l.198-212) la route répond quand même 200 `success: true, status: 'SENT_PENDING'` (l.215-229) ; le callback `PATCH` (l.246-289) répond 200 même si la candidature n'existe pas.
    - `stages/applications/route.ts` GET : le `catch` renvoie `{ success: true, applications: [] }` (l.22-25).
    - `lib/mobile-access.ts` `mobileErrorResponse` (l.326-369) : une panne de base (`isDbDown`, l.351) renvoie **HTTP 200** `{ offline: true }` (l.365). La tâche 23.6 corrige ce helper pour tout le serveur ; ici, les routes stages renvoient leur 503 elles-mêmes pour ne pas dépendre de l'ordre des tâches.
  - **Fichiers :** modifiés : `mobile-api/lib/stages-db.ts`, `mobile-api/app/api/mobile/stages/route.ts`, `stages/apply/route.ts`, `stages/dispatch/route.ts`, `stages/applications/route.ts` ; créés : `mobile-api/lib/stages-errors.ts`, `mobile-api/tests/stages-truth.test.mjs`. Copies à corriger si 23.22 n'est pas faite : `recruiter-web/app/api/mobile/stages/route.ts`, `stages/apply/route.ts`, `stages/applications/route.ts` et `recruiter-web/lib/stages-db.ts` (même logique de repli).
  - **Étapes :**
    1. Créer `mobile-api/lib/stages-errors.ts` (aucun import) : `export const isDatabaseUnavailable = (error: unknown): boolean` (vrai si le code ou le message contient `ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT`, `DATABASE_URL is required`, `fetch failed`, `Connection terminated`) et `export const stageErrorStatus = (error: unknown): 503 | 500` (503 si `isDatabaseUnavailable`, sinon 500).
    2. Dans `stages-db.ts`, supprimer entièrement `FALLBACK_STAGE_JOBS` (définition et usages).
    3. `listStageJobs` : retirer le `try/catch` et le repli ; renvoyer `rows.map(mapJob)` (tableau vide compris). Une erreur SQL remonte.
    4. `getStageJob(jobId)` : si `jobId` n'est pas un UUID (regex `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`, insensible à la casse), renvoyer `null` sans requête ; sinon garder la requête actuelle (`status = 'published'`, `expires_at > now()`, entreprise non `SUSPENDED`) et renvoyer `rows[0] ? mapJob(rows[0]) : null`. Plus de `catch`.
    5. `ensureStageStudent` : supprimer le repli `user.id || 'student-stage-id'` ; laisser l'erreur remonter.
    6. `listStudentApplications`, `createStageApplication`, `dispatchStageApplicationRecord` : supprimer les `catch` qui renvoient `[]` ou `app-offline-…`. Garder le second essai de `dispatchStageApplicationRecord` sur l'erreur d'enum (statut `PENDING` + note `[Status: X]`), mais renvoyer le statut réellement écrit.
    7. `updateApplicationDispatchStatus(applicationId, status)` : renvoyer `null` si aucune ligne n'est mise à jour ; en erreur SQL (hors cas d'enum déjà géré), lever l'erreur ; renvoyer le statut lu dans `returning status`.
    8. `stages/route.ts` GET : supprimer le second appel dans le `catch` ; en erreur, répondre `NextResponse.json({ error: 'Offres indisponibles pour le moment. Réessaie dans un instant.' }, { status: stageErrorStatus(error) })` passé par `withCors`.
    9. `stages/apply/route.ts` : garder le 404 `{ error: 'Offre de stage indisponible.' }` quand `getStageJob` renvoie `null` ; dans le `catch`, `ZodError` → 400 `{ error: 'Requête invalide.' }`, sinon `{ error: "Ta candidature n'a pas pu être enregistrée. Réessaie." }` avec `stageErrorStatus(error)`. Supprimer `offline` et `app-offline-`.
    10. `stages/dispatch/route.ts` POST : (a) après `ensureStageStudent`, si `input.studentEmail || user.email` est vide, répondre 400 `{ error: 'Ajoute ton adresse e-mail dans ton profil avant de postuler.' }` ; (b) `const job = await getStageJob(input.jobId)` ; si `null` → 404 `{ error: 'Offre de stage indisponible.' }` avant tout envoi ; remplacer `'Entreprise Partenaire'` par `job.company.name` ; (c) si l'appel n8n répond non 2xx ou lève une exception : garder `notifyAdmin`, appeler `updateApplicationDispatchStatus(applicationId, 'FAILED')`, puis répondre **502** `{ error: "L'envoi de ta candidature a échoué. Réessaie dans quelques minutes.", applicationId, status: 'FAILED' }` ; (d) succès inchangé : `{ success: true, applicationId, status: 'SENT_PENDING', cvUrl?, message }` ; (e) dans le `catch` final, `ZodError` → 400, sinon `stageErrorStatus(error)` avec `{ error: "Ta candidature n'a pas pu être envoyée. Réessaie." }`.
    11. `stages/dispatch/route.ts` PATCH (callback n8n) : si `updateApplicationDispatchStatus` renvoie `null`, répondre 404 `{ error: 'Candidature introuvable.' }`.
    12. `stages/applications/route.ts` GET : dans le `catch`, répondre `{ error: 'Candidatures indisponibles pour le moment.' }` avec `stageErrorStatus(error)` au lieu de `applications: []`.
    13. Ne pas toucher à `uploadStageApplicationCvPdf` (repli `data:` l.657-672) : hors périmètre, noté dans les pièges.
  - **Tests à écrire :** `mobile-api/tests/stages-truth.test.mjs`.
    - Chargement : poser `globalThis.campusDatabasePool` (faux pool, voir guide §5) puis `await loadTsWithPackages('lib/stages-db.ts', ['lib/database.ts'])` ; `loadTs('lib/stages-errors.ts')`.
    - Pool `query → { rows: [] }` : `listStageJobs({})` → `[]` ; `getStageJob('00000000-0000-0000-0000-000000000000')` → `null`.
    - `getStageJob('job-1')` → `null` et le faux pool n'a reçu aucune requête (compter les appels).
    - Pool qui lève `connect ECONNREFUSED` : `await assert.rejects(listStageJobs({}))`, `await assert.rejects(createStageApplication({...}))`.
    - `updateApplicationDispatchStatus` avec pool `{ rows: [], rowCount: 0 }` → `null`.
    - `stageErrorStatus(new Error('connect ECONNREFUSED'))` → 503 ; `stageErrorStatus(new Error('boom'))` → 500.
    - Garde de source : lire `lib/stages-db.ts` en texte et vérifier l'absence de `FALLBACK_STAGE_JOBS` et `app-offline`.
    - Comme `loadTsWithPackages` réévalue `database.ts` à chaque appel, recharger le module après chaque changement de faux pool.
  - **Vérification (DoD) :**
    - `grep -rnE "FALLBACK_STAGE_JOBS|app-offline|etudiant@campus360|Entreprise Partenaire|student-stage-id" mobile-api/app mobile-api/lib` → aucune ligne.
    - `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` → code 0.
    - Manuel (serveur `npm run dev` lancé) : `curl -i http://localhost:3002/api/mobile/stages` sans session → 401 (pas 200).
  - **Pièges :**
    - `mobileErrorResponse` renvoie 200 sur panne de base tant que 23.6 n'est pas faite : ne pas l'utiliser pour les erreurs stages.
    - Les statuts `FAILED`/`DELIVERED`/`SENT_PENDING` peuvent manquer dans l'enum `stage_app_status` (le `ALTER TYPE` de `dispatchStageApplicationRecord` est silencieux). Vérifier avec `select enum_range(null::stage_app_status)` (script de requête, guide §5) et noter le résultat dans la case.
    - `on conflict (student_id, job_id) do update set status = excluded.status` : une nouvelle tentative remet `SENT_PENDING` sur une ligne `FAILED`. C'est voulu (nouvel essai).
    - L'app (`src/features/stages/stagesApi.ts`) avale encore ces erreurs jusqu'à 23.2 : tester 23.1 au niveau serveur, pas dans l'app.
    - Les scripts ad hoc `scripts/test-stage-dispatch.mjs` et `scripts/test-challenger-*.mjs` simulent `app-offline-` en local : ils ne font pas partie de `npm test` ; ne pas les « réparer ».
  - **Dépendances :** aucune tâche avant. Aucune décision utilisateur requise.

- [X] **Tâche 23.2 : Stages côté app sans offres ni candidatures fictives** — validée le 2026-10-15 sauf vérification visuelle (regroupée en fin de Lot A) : `stagesApi.ts` (seeds, repli Supabase et faux succès supprimés ; `submitStageApplication(job, …)`), `applicationsCache.ts` (nouveau, purge des anciennes entrées locales), `AiApplyModal.tsx` (vraies erreurs, « transmise » seulement après un 1-clic réussi), `StagesScreen.tsx` et `ApplicationsTimelineScreen.tsx` (état d'erreur + Réessayer), `ApplicationDetailModal.tsx` ; grep DoD vide ; `tsc` 0 ; `lint:colors` 193/193 ; `stages-app-cache.test.mjs` 4/4 ; `npm test` 99 tests, 0 échec.
  - **Pourquoi :** l'app affiche 12 offres inventées et 3 fausses candidatures quand la liste est vide, et crée une candidature « locale » quand l'envoi échoue. L'étudiant croit avoir postulé et suit une candidature qui n'existe pas.
  - **État actuel (`src/features/stages/stagesApi.ts`, 1346 l.) :**
    - `SEED_COMPANIES` (l.8-153), `SEED_JOBS` (l.155-372), `SEED_OFFICIAL_CV_1/_2`, `SEED_LETTER_1/_2` (l.380-534) ; `let localApplications` (l.536-591) démarre avec 3 candidatures `app-seed-1/2/3`.
    - `fetchStageJobs` (l.645-802) : avale les erreurs (l.683-685), tente un repli Supabase REST direct (l.688-736), puis `if (!jobsList.length) jobsList = [...SEED_JOBS]` (l.739-741).
    - `submitStageApplication` (l.993-1039) : si le serveur échoue, crée `app-local-<ts>` (l.1017) avec `SEED_JOBS[0]` (l.1021) et la persiste.
    - `dispatchStageApplication` (l.1071-1158) : non-OK → `console.warn` ; exception → `isOffline = true` ; sans id → `app-dispatch-<ts>` ; renvoie toujours `success: true`.
    - `getStoredApplicationsAsync` (l.1201-1227) : relit SecureStore (natif) ou `localStorage` (web), remappe `job` avec `SEED_JOBS[0]` (l.1215), ne purge rien. `getStoredApplications` (l.1229-1247) n'est jamais appelée.
    - `fetchStudentApplications` (l.1267-1279) : en erreur, renvoie le cache local sans le dire. `updateApplicationStatus` (l.1281-1296) renvoie `true` en dur.
    - `src/features/stages/AiApplyModal.tsx` (2140 l.) : `persistApplication` (~l.272-283) ; `handleOneClickApply` (l.433-492), `handleManualWhatsAppApply` (l.495-541), `handleManualEmailApply` (l.543-563), `handleInAppApply` (l.568-584) passent tous à `setStep('sent')` ; écran « Candidature transmise avec succès ! » (l.1036) avec la référence de repli `'APP-2026'` (l.1046).
    - `src/ui/screens/StagesScreen.tsx` `loadData` (l.217-232) : `catch` qui ne fait que `console.error` ; liste vide → « Aucune offre trouvée » (l.478).
    - `src/ui/screens/ApplicationsTimelineScreen.tsx` `loadData` (l.65-70) : pas de `try/catch` ; `handleStatusChange` affiche « Félicitations » même si l'enregistrement échoue.
    - Autres consommateurs : `HomeScreen.tsx` l.104-105 (`Promise.allSettled`), `ProfileScreen.tsx` l.170-180 (compteur avec `.catch(() => null)`).
  - **Fichiers :** modifiés : `src/features/stages/stagesApi.ts`, `src/features/stages/AiApplyModal.tsx`, `src/ui/screens/StagesScreen.tsx`, `src/ui/screens/ApplicationsTimelineScreen.tsx`, `src/features/stages/ApplicationDetailModal.tsx` (appel à `updateApplicationStatus`) ; créé : `src/features/stages/applicationsCache.ts` (fonctions pures) ; test : `mobile-api/tests/stages-app-cache.test.mjs`.
  - **Étapes :**
    1. Créer `src/features/stages/applicationsCache.ts` sans import autre que `import type { StageApplication } from '../../types'` : `export const FAKE_APPLICATION_PREFIXES = ['app-seed-', 'app-local-', 'app-dispatch-', 'app-offline-'] as const;` et `export const purgeFakeApplications = (list: StageApplication[]): StageApplication[]` (retire toute entrée dont l'`id` commence par un de ces préfixes ou dont `job` est absent). Y déplacer aussi, sans les renommer, `getUtf8ByteLength`, `pruneBulkyApplicationFields`, `fitSecureStoreBudget` si elles sont pures, et les réexporter depuis `stagesApi.ts` (des scripts ad hoc les extraient par nom).
    2. Dans `stagesApi.ts`, supprimer `SEED_COMPANIES`, `SEED_JOBS`, `SEED_OFFICIAL_CV_*`, `SEED_LETTER_*`, `getTopThreeMatches` et `fetchJobById` (sans appelant), `getStoredApplications` (jamais appelée). `let localApplications: StageApplication[] = [];`.
    3. `fetchStageJobs(params)` : un seul appel `authFetchRaw('/api/mobile/stages?...')` ; si `!response.ok` ou exception, `throw new Error(payload.error || 'Offres indisponibles pour le moment.')`. Supprimer le second fetch direct et le repli Supabase REST (le serveur filtre déjà les offres publiées et non expirées ; la lecture REST contourne ce filtre). Liste vide → renvoyer `[]`. Garder le calcul `analyzeJobMatch` et le tri.
    4. `submitStageApplication(...)` : si `!response.ok` ou pas de `payload.application.id`, `throw new Error(payload.error || "Ta candidature n'a pas pu être enregistrée.")`. Ne créer d'entrée locale qu'avec l'id serveur et le `job` passé en paramètre.
    5. `dispatchStageApplication(params)` : si `!response.ok` → `throw new Error(payload.error || "L'envoi a échoué. Réessaie.")` ; si exception réseau → `throw new Error('Pas de connexion au serveur. Vérifie ta connexion et réessaie.')`. Supprimer `isOffline`, `app-dispatch-`, `success: true` par défaut, et le champ `offline` du type `DispatchStageApplicationResult`. `targetJob = params.job` (plus de `SEED_JOBS`).
    6. `getStoredApplicationsAsync()` : appliquer `purgeFakeApplications` à la lecture ; si la liste a changé, la réécrire avec `persistApplicationsLocally` (chemins natif et web). Supprimer le remappage `SEED_JOBS`.
    7. `fetchStudentApplications()` : en erreur réseau ou HTTP, lever l'erreur (plus de repli silencieux sur le cache). En succès, remplacer `localApplications` par la liste serveur et la persister.
    8. `updateApplicationStatus(id, status)` : renvoyer `false` si le PATCH échoue, sans modifier le local ; `true` seulement si `response.ok`. `updateApplicationNotes` reste local mais l'UI doit dire « Note enregistrée sur ce téléphone ».
    9. `StagesScreen.tsx` : ajouter `const [loadError, setLoadError] = useState<string | null>(null)` ; `loadData` met `setLoadError(null)` au début et `setLoadError(error.message)` dans le `catch`. Rendu : si `loadError`, afficher un bloc « Impossible de charger les offres » + le message + bouton « Réessayer » (appelle `loadData`) ; sinon si la liste est vide, garder « Aucune offre trouvée » avec « Réinitialiser les filtres » uniquement si un filtre est actif, sinon « Aucune offre publiée pour le moment. ».
    10. `ApplicationsTimelineScreen.tsx` : même schéma (`loadError`, bouton « Réessayer ») ; `handleStatusChange` n'affiche « Félicitations » que si `updateApplicationStatus` a renvoyé `true`, sinon `Alert.alert('Erreur', "Le statut n'a pas pu être enregistré.")`.
    11. `AiApplyModal.tsx` : dans les 4 actions, entourer l'appel serveur d'un `try/catch` ; `setStep('sent')` seulement après un `await` réussi ; en erreur, `Alert.alert('Envoi impossible', error.message)` et rester sur l'étape courante ; remettre `setDispatchReceipt(null)` au début de chaque tentative ; référence affichée = `applicationId` renvoyé par le serveur (supprimer `'APP-2026'`) ; statut affiché = statut renvoyé (« En cours d'acheminement » pour `SENT_PENDING`, « Délivrée » pour `DELIVERED`).
    12. Pour les canaux manuels (WhatsApp, e-mail, in-app), le titre de l'écran final devient « Candidature enregistrée » (l'étudiant envoie lui-même) ; « Candidature transmise » reste réservé au 1-clic réussi.
    13. `HomeScreen` et `ProfileScreen` : vérifier qu'une erreur ne casse pas l'écran (le `Promise.allSettled` et le `.catch(() => null)` suffisent) ; le compteur affiche « — » quand il vaut `null`.
  - **Tests à écrire :** `mobile-api/tests/stages-app-cache.test.mjs` : `const m = await loadTs('../src/features/stages/applicationsCache.ts')`.
    - `purgeFakeApplications([{ id: 'app-seed-1', job: {...} }, { id: 'app-local-9', job: {...} }, { id: '<uuid>', job: {...} }])` → seule l'entrée UUID reste.
    - Entrée sans `job` → retirée.
    - Liste vide → `[]`.
  - **Vérification (DoD) :**
    - `grep -rnE "SEED_JOBS|SEED_COMPANIES|SEED_OFFICIAL_CV|SEED_LETTER|app-seed|app-local-|app-dispatch-|APP-2026" src` → aucune ligne hors `applicationsCache.ts` (qui contient les préfixes à purger : vérifier que c'est le seul fichier).
    - `npx tsc --noEmit` (racine) → code 0 ; `cd mobile-api && npm test` → 0 échec ; `npm run lint:colors` → pas de hausse.
    - Navigateur (expo-web, 375 px) avec `mobile-api` arrêté : écran Stages → bloc d'erreur + « Réessayer » (capture `.agent/screenshots/m23-2-stages-erreur.png`) ; candidature 1-clic → message d'erreur, pas d'écran « transmise » (capture `m23-2-envoi-erreur.png`) ; écran Suivi → bloc d'erreur, aucune candidature fictive.
  - **Pièges :**
    - SecureStore est limité (~2048 octets) : toujours réécrire par `persistApplicationsLocally` (qui applique `fitSecureStoreBudget`).
    - `localApplications` est un tableau de module : s'il garde un seed en mémoire, la prochaine écriture le remet. Le vider à l'initialisation.
    - Les scripts `scripts/test-challenger-m5-it2-persistence-followup.mjs` et `scripts/test-application-detail-view.mjs` extraient des fonctions de `stagesApi.ts` par regex et utilisent `app-seed-1` : ils casseront. Ils ne sont pas dans `npm test` ; les supprimer ou les mettre à jour, et le noter dans la case.
    - En dev, `/api/mobile/stages/dispatch` n'existe que dans `mobile-api` alors que l'app vise `:3001` (recruiter-web) pour `authFetchRaw` : un 404 en dev est normal tant que 23.22 n'est pas faite ; tester avec `EXPO_PUBLIC_AUTH_URL=http://localhost:3002` ou après 23.22.
  - **Dépendances :** 23.1 (le serveur renvoie de vraies erreurs). Aucune décision utilisateur.

- [X] **Tâche 23.3 : Aucun envoi vers un numéro ou une adresse codés en dur** — validée le 2026-10-15 sauf vérification visuelle (fin de Lot A) : `contactTargets.ts` et `mobile-api/lib/dispatch-target.ts` (nouveaux) ; boutons WhatsApp/e-mail désactivés sans contact réel (`StagesScreen`, `AiApplyModal`) ; relances sans repli (`ApplicationDetailModal`, `ApplicationsTimelineScreen`) ; lien fictif `campus360.app/candidatures` retiré du message WhatsApp ; `dispatch` répond 422 sans destinataire ; support via `EXPO_PUBLIC_SUPPORT_WHATSAPP` (`env.ts`, `.env.example`, `eas.json` = décision 5) ; grep DoD : seul le placeholder de `PaymentModal.tsx` (23.5) ; `tsc` 0 (app et mobile-api) ; `npm test` 101 tests, 0 échec ; `lint:colors` 193/193. Écart au guide : `StageCompany.contactEmail` laissé requis dans `types.ts` (les helpers gèrent la chaîne vide) ; boutons de relance de `ApplicationDetailModal` gardés actifs avec un message clair au lieu d'être désactivés.
  - **Pourquoi :** quand l'entreprise n'a pas de contact, l'app ouvre WhatsApp ou l'e-mail vers des numéros et adresses codés en dur (dont de vrais numéros). Le CV de l'étudiant part chez un inconnu.
  - **État actuel (valeurs relevées) :**
    | Valeur | Fichier:ligne | Contexte |
    |---|---|---|
    | `237672364124` | `src/features/stages/AiApplyModal.tsx:501` | repli de `handleManualWhatsAppApply` |
    | `237690123456` | `src/ui/screens/StagesScreen.tsx:283` | `handleRecruiterWhatsapp` |
    | `237690123456` | `src/features/stages/ApplicationDetailModal.tsx:214` | `handleSendReminderWhatsapp` |
    | `2250708091011` | `src/features/stages/stagesApi.ts:971` | `generateIaApplication` → `whatsappUrl` |
    | `237670009988` | `src/ui/screens/ApplicationsTimelineScreen.tsx:93` | `handleSendReminder` (relance J+7) |
    | `recrutement@campus360.app` | `StagesScreen.tsx:296` | `handleRecruiterEmail` |
    | `contact@recrutement.org` | `ApplicationDetailModal.tsx:224` | `handleSendEmail` |
    | `rh@entreprise.com` | `stagesApi.ts:988` | `generateIaApplication` → `recipientEmail` |
    | `237690273500` | `src/AppShell.tsx:1629` | bouton « Discuter sur WhatsApp » du support |
    - Le placeholder `237690123456` de `src/features/wallet/PaymentModal.tsx:243` est traité en 23.5. `etudiant@campus360.app` (`ApplicationDetailModal.tsx:117`) est traité en 23.4. Les valeurs de `SEED_*` disparaissent avec 23.2.
    - `cleanPhoneNumber('')` (`src/features/whatsapp/whatsappService.ts` l.36-44) renvoie `''` : sans garde, `https://wa.me/?text=…` s'ouvre sans destinataire.
    - `src/types.ts` `StageCompany.contactEmail: string` est requis ; en base la colonne est `not null`, donc « pas d'e-mail » = chaîne vide.
    - Serveur : `stages/dispatch/route.ts` transmet `targetPhone`/`targetEmail` à n8n sans vérifier qu'ils existent pour le canal choisi.
  - **Fichiers :** modifiés : `AiApplyModal.tsx`, `StagesScreen.tsx`, `ApplicationDetailModal.tsx`, `ApplicationsTimelineScreen.tsx`, `stagesApi.ts`, `src/AppShell.tsx`, `src/config/env.ts`, `src/types.ts`, `mobile-api/app/api/mobile/stages/dispatch/route.ts`, `.env.example` (racine), `eas.json` ; créés : `src/features/stages/contactTargets.ts`, `mobile-api/lib/dispatch-target.ts` ; tests : `mobile-api/tests/stages-truth.test.mjs` (ajout de cas).
  - **Étapes :**
    1. Créer `src/features/stages/contactTargets.ts` (sans import RN) : `export const companyWhatsapp = (company?: { contactWhatsapp?: string | null }): string | null` (chiffres seulement, `null` si moins de 8 chiffres) et `export const companyEmail = (company?: { contactEmail?: string | null }): string | null` (`null` si vide ou sans `@`).
    2. `src/types.ts` : `StageCompany.contactEmail?: string` (optionnel) ; corriger les erreurs de type qui en découlent.
    3. `StagesScreen.tsx` : `handleRecruiterWhatsapp` et `handleRecruiterEmail` utilisent ces fonctions ; si elles renvoient `null`, le bouton (`btn-contact-whatsapp` l.~1041, `btn-contact-email` l.~1049) est rendu désactivé (`disabled`, opacité via un style existant) avec le libellé « Contact de l'entreprise indisponible ». Supprimer les libellés inventés « Service Recrutement & RH » (l.1029) et « Réponse rapide garantie » (l.1034) : afficher le nom réel de l'entreprise, rien sinon.
    4. `ApplicationDetailModal.tsx` : `handleSendReminderWhatsapp` et `handleSendEmail` sans repli ; boutons désactivés avec le même libellé si la cible manque.
    5. `ApplicationsTimelineScreen.tsx` `handleSendReminder` : sans numéro, ne pas ouvrir WhatsApp ; afficher `Alert.alert('Relance impossible', "Cette entreprise n'a pas de numéro WhatsApp. Copie le message et envoie-le par un autre moyen.")`.
    6. `stagesApi.ts` `generateIaApplication` : `whatsappUrl` et `recipientEmail` deviennent optionnels dans `GeneratedApplicationResult` et valent `undefined` sans cible (aucun repli).
    7. `AiApplyModal.tsx` : désactiver les boutons WhatsApp (1-clic l.~909, manuel l.~927 et l.~966) quand `companyWhatsapp(job.company)` est `null`, et les boutons e-mail (1-clic l.~989, manuel l.~1007) quand `companyEmail(job.company)` est `null` ; libellé « Contact de l'entreprise indisponible ». Supprimer le repli `'237672364124'`. `handleManualEmailApply` n'ouvre jamais `mailto:` sans destinataire.
    8. Créer `mobile-api/lib/dispatch-target.ts` (aucun import) : `export const missingDispatchTarget = (channel: 'whatsapp' | 'email', target: { phone?: string | null; email?: string | null }): string | null` qui renvoie le message d'erreur (« Cette entreprise n'a pas de numéro WhatsApp. » / « Cette entreprise n'a pas d'adresse e-mail. ») ou `null`. Dans `stages/dispatch/route.ts`, après le 404 de l'offre (23.1), répondre **422** `{ error: <message> }` si une cible manque, avant l'insertion et avant n8n. Vérifier le nom réel du champ de canal dans le schéma Zod de la route avant d'écrire.
    9. Support : `src/config/env.ts` : ajouter `supportWhatsapp: string` à `PublicEnv` et `supportWhatsapp: process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP || ''` (aucune valeur de repli). Dans `AppShell.tsx`, importer `publicEnv` ; lire en entier la ligne 1629 (JSX très long) avant l'édition ; le bouton « Discuter sur WhatsApp » n'est rendu que si `publicEnv.supportWhatsapp` est non vide et ouvre `https://wa.me/${publicEnv.supportWhatsapp}` ; sinon afficher « Support WhatsApp indisponible pour le moment. ».
    10. Documenter `EXPO_PUBLIC_SUPPORT_WHATSAPP=` (valeur vide) dans `.env.example` racine, et l'ajouter (valeur vide, à remplir par l'utilisateur) aux blocs `env` des profils `preview` et `production` de `eas.json`. La valeur réelle est fournie par l'utilisateur (Actions utilisateur).
  - **Tests à écrire :** dans `mobile-api/tests/stages-truth.test.mjs` :
    - `missingDispatchTarget('whatsapp', { phone: null })` → message ; `('whatsapp', { phone: '237600000000' })` → `null` ; `('email', { email: '' })` → message.
    - `loadTs('../src/features/stages/contactTargets.ts')` : `companyWhatsapp({ contactWhatsapp: '' })` → `null` ; `companyEmail({ contactEmail: 'rh@exemple.cm' })` → `'rh@exemple.cm'`.
  - **Vérification (DoD) :**
    - `grep -rnE "237672364124|237690123456|2250708091011|237670009988|237690273500|recrutement@campus360|contact@recrutement\.org|rh@entreprise\.com" src mobile-api/app mobile-api/lib` → aucune ligne (le placeholder de `PaymentModal.tsx` doit avoir été retiré par 23.5 ; si 23.5 n'est pas faite, ce seul hit est toléré et noté).
    - `npx tsc --noEmit` (racine et `mobile-api`) → code 0 ; `npm test` (mobile-api) → 0 échec ; `npm run lint:colors` → pas de hausse.
    - Navigateur : une offre dont l'entreprise n'a pas de `contact_whatsapp` affiche le bouton désactivé (capture `m23-3-contact-indisponible.png`). Pour obtenir ce cas sans toucher la base de prod, demander à l'utilisateur une offre de test, ou vérifier avec une offre réelle sans WhatsApp trouvée par une requête de lecture.
  - **Pièges :**
    - Ne remplacer aucun repli par une autre valeur en dur, même « temporaire ».
    - `recruiter-web/lib/admin-platform-service.ts` contient les mêmes numéros de démonstration : hors périmètre (admin), ils sortent dans un grep global ; ne pas les confondre.
    - Une variable `EXPO_PUBLIC_*` est figée au moment du build ou de l'export OTA : une valeur ajoutée après le build n'apparaît qu'au build ou à la mise à jour suivante.
  - **Dépendances :** 23.2 (suppression des seeds, même fichier `stagesApi.ts`). Décision utilisateur : le numéro de support WhatsApp à mettre dans `EXPO_PUBLIC_SUPPORT_WHATSAPP` (à demander ; le code fonctionne sans, bouton masqué).

- [X] **Tâche 23.4 : CV et lettres sans identité inventée** — validée le 2026-10-15 sauf vérification visuelle (fin de Lot A) : `cvHtml.ts` (nouveau : gabarits PDF déplacés depuis `pdfExportService.ts`, échappement de toutes les valeurs, photo limitée à https/data:image, `[à compléter]`, `missingCvFields`) ; CV construits uniquement depuis le profil (`DocumentsScreen`, `generateIaApplication`, sans attente factice) ; `OfficialCvView` et `ApplicationDetailModal` sans repli (« CV non disponible », récapitulatif réel au lieu du faux certificat) ; export et envoi 1-clic bloqués si nom ou contact manquent ; libellés « certifié / homologué / AI Verified » retirés ; `types.ts` : nationalité, âge, adresse optionnels ; `cv-html.test.mjs` 6/6 ; `npm test` 107 tests, 0 échec ; `tsc` 0 ; `lint:colors` 192 (référence abaissée, `cvHtml.ts` exclu comme couleurs d'impression). Seul hit du grep : placeholder de `PaymentModal.tsx` (23.5).
  - **Pourquoi :** un étudiant au profil incomplet exporte un CV au nom de « KAMENI Dave Lionel », avec un faux téléphone, un faux stage et de fausses compétences, présenté comme « certifié Campus 360 ». Il peut l'envoyer à un recruteur sans s'en rendre compte. Le HTML injecté dans les PDF n'est pas échappé.
  - **État actuel :**
    - `src/features/documents/DocumentsScreen.tsx` : `officialCvData` (useMemo ~l.162-213) avec replis `'KAMENI Dave Lionel'` (l.163-165), `nationalite: 'Camerounaise'`, `age: '22 ans'` (l.171-172), `email: … || 'etudiant@campus360.org'` (l.174), `telephone: … || '690123456'` (l.175), adresse `'Yaoundé, Cameroun'`, expérience inventée (l.177-186), formation (l.189-196), compétences, langues, loisirs par défaut (l.199-213). Libellés : badge `'IA'` (l.17), `'CV RH Officiel'` (l.34), `'Lettre IA'` (l.35), `'Gabarit Officiel RH'` (l.557), `'Curriculum Vitae Certifié Campus 360'` (l.561), `'Gabarit 2 Colonnes Homologué'` (l.914). Export l.937 : `exportOfficialCvPdf(officialCvData)` puis `Alert 'Succès'` même en faux succès.
    - `src/features/stages/OfficialCvView.tsx` l.11-12 : replis `'KAMENI'`, `'Dave Lionel'`.
    - `src/features/stages/ApplicationDetailModal.tsx` : prop par défaut `studentName = 'Dave Lionel Kameni'` (l.78) ; CV de repli l.108-160 (`'etudiant@campus360.app'` l.117, `'+237 690 12 34 56'` l.118, faux stage, `'Université de Yaoundé I'`) ; lettre de repli (~l.176) ; bloc « Certificat de Candidature Officiel » / « Attestation de Dépôt Institutionnel » / « protocoles certifiés » (l.528-553) ; le `catch` de `handleDownloadPdf` affiche un message trompeur.
    - `src/features/stages/stagesApi.ts` `generateIaApplication` (l.822-~1000) : attente factice de 1 800 ms, aucun appel IA ; replis `nom='KAMENI'` (l.840-847), `telephone … || '672364124'` (l.860), nationalité, âge, langues, loisirs ; `notes: 'Candidature IA générée & transmise avec succès.'` (l.1032).
    - `src/features/stages/pdfExportService.ts` : `buildApplicationHtml` (~l.19-125) et `generateOfficialCvHtml` (~l.126-385) interpolent toutes les valeurs sans échappement (`photoUrl` dans un attribut `src`) ; badge `Campus 360 AI Verified` (l.104) ; pied « … stages académiques certifiés » (l.119).
    - Autres « certifi » relevés par le grep : `WhatsAppPairingModal.tsx:266`, `HomeScreen.tsx:190`, `ProfileScreen.tsx:381` (`'Étudiant Certifié'`, repli de nom), `LibraryScreen.tsx:44`, `src/types.ts:5` (commentaire).
    - Profil réel : `StudentProfile` (`src/features/auth/betterAuth.ts` l.26-37) n'a ni âge, ni nationalité, ni adresse, ni expérience.
  - **Fichiers :** modifiés : `DocumentsScreen.tsx`, `OfficialCvView.tsx`, `ApplicationDetailModal.tsx`, `stagesApi.ts`, `pdfExportService.ts`, `AiApplyModal.tsx` (libellés), `src/types.ts`, `WhatsAppPairingModal.tsx`, `HomeScreen.tsx`, `ProfileScreen.tsx`, `LibraryScreen.tsx` ; créé : `src/features/stages/cvHtml.ts` ; test : `mobile-api/tests/cv-html.test.mjs`.
  - **Étapes :**
    1. Créer `src/features/stages/cvHtml.ts` (seul import autorisé : `import type { OfficialCvData } from '../../types'`) : `export const escapeHtml = (value: unknown): string` (remplace `& < > " '` par `&amp; &lt; &gt; &quot; &#39;`) ; `export const safeImageUrl = (url?: string | null): string | null` (accepte seulement `https://…` ou `data:image/(png|jpeg|webp);base64,…`) ; `export const TO_COMPLETE = '[à compléter]'` ; `export const missingCvFields = (cv: OfficialCvData): string[]` (renvoie les libellés « Nom », « Prénom », « E-mail ou téléphone » manquants) ; `buildApplicationHtml` et `generateOfficialCvHtml` déplacés depuis `pdfExportService.ts`, avec `escapeHtml` sur **chaque** valeur interpolée et `safeImageUrl` pour la photo (pas d'`<img>` si `null`) ; tout champ vide rendu `[à compléter]`.
    2. `pdfExportService.ts` importe ces deux builders depuis `./cvHtml` ; supprimer le badge « AI Verified » ; pied : « Document préparé avec Campus 360 ».
    3. `src/types.ts` : rendre `nationalite`, `age`, `adresse` optionnels dans `CvPersonalDetails` (le profil ne les connaît pas) ; corriger les usages (`(nom ?? '')` avant `.toUpperCase()`).
    4. `DocumentsScreen.tsx` `officialCvData` : uniquement les données du profil (`name` découpé en nom/prénom, `email`, `whatsappPhone || phone`, `university`, `faculty`, `level`, `skills`) ; expériences et formations = `[]` si inconnues ; compétences = `skills` ou `[]` ; langues et loisirs = `[]`. Aucune valeur inventée.
    5. Bloquer l'export : avant `exportOfficialCvPdf`, si `missingCvFields(cv).length > 0`, `Alert.alert('Profil incomplet', 'Complète ton nom et ton contact (e-mail ou téléphone) dans ton profil avant d'exporter ton CV.')` et ne pas exporter. Même contrôle dans `ApplicationDetailModal` et dans `AiApplyModal` avant `exportApplicationPdf` et avant l'envoi 1-clic.
    6. `OfficialCvView.tsx` : supprimer les replis ; un champ vide s'affiche `[à compléter]` (texte en `stitchColors.inkMuted` si disponible) ; une section vide (expériences, formations, langues, loisirs) affiche une ligne `[à compléter]`.
    7. `ApplicationDetailModal.tsx` : supprimer la prop par défaut `studentName` (la rendre requise et la passer depuis l'appelant avec le nom réel ou `''`) ; si `application.officialCv` est absent, afficher « CV non disponible pour cette candidature. » au lieu d'un CV reconstitué ; supprimer la lettre de repli ; remplacer le bloc « Certificat… / Attestation… / protocoles certifiés » par « Récapitulatif de la candidature » (date, entreprise, canal, statut réels).
    8. `stagesApi.ts` `generateIaApplication` : supprimer tous les replis d'identité ; si `student.fullName` est vide, `throw new Error('Ajoute ton nom dans ton profil avant de préparer une candidature.')` ; supprimer l'attente factice de 1 800 ms ; nationalité, âge, adresse non renseignés ; `notes: 'Candidature préparée par l\'étudiant.'`. Renommer dans l'UI tout libellé « Candidature IA » en « Candidature préparée » (grep `Candidature IA` dans `src`).
    9. Libellés de `DocumentsScreen.tsx` : `'CV RH Officiel'` → `'CV'` ; `'Gabarit Officiel RH'` → `'Modèle 2 colonnes'` ; `'Curriculum Vitae Certifié Campus 360'` → `'Curriculum vitae'` ; supprimer « Homologué » et la phrase sur les « normes des recruteurs ». Garder le badge `IA` seulement sur les tuiles qui appellent réellement `/api/mobile/documents/generate` (rapport, mémoire, et CV/lettre si leur flux appelle bien le serveur : vérifier dans le code avant de décider, et le noter).
    10. Reformuler les autres « certifi » : `WhatsAppPairingModal.tsx:266` (« ton CV »), `HomeScreen.tsx:190` (« Trouve ton stage »), `LibraryScreen.tsx:44` (« débloque des PDF vérifiés par l'équipe » ou plus simple « débloque des PDF »), `types.ts:5` (commentaire). `ProfileScreen.tsx:381` : repli `'Étudiant Certifié'` → `''` et afficher « Ajoute ton nom » si vide.
  - **Tests à écrire :** `mobile-api/tests/cv-html.test.mjs` : `const m = await loadTs('../src/features/stages/cvHtml.ts')`.
    - `m.escapeHtml('<script>alert(1)</script>')` → `'&lt;script&gt;alert(1)&lt;/script&gt;'`.
    - `m.generateOfficialCvHtml(cv)` avec `nom: '<script>x</script>'` → le résultat contient `&lt;script&gt;` et pas `<script>x`.
    - `photoUrl: 'javascript:alert(1)'` → aucun `<img` ; `photoUrl: 'x" onerror="y'` → aucun `onerror`.
    - `missingCvFields` d'un CV vide → `['Nom', 'Prénom', 'E-mail ou téléphone']` ; CV avec nom, prénom et téléphone → `[]`.
    - CV sans expérience → le HTML contient `[à compléter]`.
  - **Vérification (DoD) :**
    - `grep -rniE "KAMENI|Dave Lionel|690123456|672364124|certifi|AI Verified|Homologu|etudiant@campus360" src` → aucune ligne.
    - `npx tsc --noEmit` (racine) → code 0 ; `cd mobile-api && npm test` → 0 échec ; `npm run lint:colors` → pas de hausse.
    - Navigateur : compte au profil incomplet → aperçu du CV avec `[à compléter]`, export refusé avec le message (capture `m23-4-cv-incomplet.png`).
  - **Pièges :**
    - `cvHtml.ts` ne doit importer ni `react-native` ni `expo-*`, sinon `loadTs` échoue.
    - `generateCvPdfBase64` (web) renvoie une constante de PDF factice : traité en 23.6, pas ici, mais ne pas l'appeler depuis le nouveau code.
    - Les seeds `SEED_OFFICIAL_CV_*` sont supprimés par 23.2 ; si 23.2 n'est pas faite, le grep DoD les trouve encore.
    - Le badge `IA` de `DocumentsScreen.tsx` : un flux qui appelle réellement le serveur IA garde le badge ; le gabarit local de candidature ne l'a pas.
  - **Dépendances :** 23.2 (même fichier `stagesApi.ts`). Aucune décision utilisateur.

- [X] **Tâche 23.5 : Wallet côté app sans paiement simulé** — validée le 2026-10-15 sauf vérification visuelle (fin de Lot A) : `paymentStatus.ts` (nouveau, `mapServerPaymentStatus`) ; `walletApi.ts` (vraies erreurs, `pollPaymentStatus`, plus de `demo_`/`mock`) ; `PaymentModal.tsx` (polling serveur 3 s × 20, arrêté à la fermeture, plus de succès après 2,5 s ni de numéro par défaut) ; `AiApplyModal.tsx` relit le solde (`getStudentAccount`) au lieu de l'additionner ; `AppShell.tsx` ne crée plus de transaction locale ; `betterAuth.ts` `checkTopUpStatus` mappe le statut ; grep DoD vide ; `payment-status.test.mjs` 1/1 ; `npm test` 108 tests, 0 échec ; `tsc` 0 ; `lint:colors` 192/192.
  - **Pourquoi :** si le serveur de paiement ne répond pas, l'app affiche « Notification USSD simulée » puis « Paiement réussi » au bout de 2,5 s, et ajoute des crédits sur l'écran sans aucun paiement. L'étudiant croit avoir payé ; le solde affiché est faux.
  - **État actuel :**
    - `src/features/wallet/walletApi.ts` : `initiateMobileMoneyPayment` (l.81-109) ne lit pas `res.ok` ; en erreur, renvoie `{ success: true, reference: 'demo_…', mock: true, message: '… simulée …' }` (l.96-107). `checkPaymentReferenceStatus` (l.113-129) transforme `failed` en `pending` et renvoie `completed` par défaut ; elle n'a aucun appelant.
    - `src/features/wallet/PaymentModal.tsx` : numéro par défaut `'+237 690 12 34 56'` (l.~47) ; `handleInitiate` (l.~52-86) ignore la réponse puis `setTimeout(() => setSuccess(true), 2500)` (l.74-78).
    - Seul appelant : `src/features/stages/AiApplyModal.tsx` l.1135-1155 ; `onPaymentSuccess` ajoute localement `pack.tokensReward` à `currentProfile.tokens` (l.1147-1151).
    - Chemin de recharge principal (déjà honnête) : `src/AppShell.tsx` `rechargeWallet` (~l.931-988) → `topUpStudentWallet` puis polling `checkTopUpStatus` toutes les 3 s, 20 essais. `topUpStudentWallet` et `checkTopUpStatus` (`src/features/auth/betterAuth.ts` l.636-645) ne vérifient pas `res.ok`.
    - Serveur : `PaymentModal` appelle `/api/mobile/payments/initiate`, dont les références `c360_…` ne sont jamais créditées en mode sans clé, et le webhook associé écrit `completed` que la route de polling ne reconnaît pas (corrigé côté serveur en 23.8).
  - **Fichiers :** modifiés : `src/features/wallet/walletApi.ts`, `src/features/wallet/PaymentModal.tsx`, `src/features/stages/AiApplyModal.tsx`, `src/features/auth/betterAuth.ts`, `src/AppShell.tsx` ; créé : `src/features/wallet/paymentStatus.ts` ; test : `mobile-api/tests/payment-status.test.mjs`.
  - **Étapes :**
    1. Créer `src/features/wallet/paymentStatus.ts` (aucun import) : `export type PaymentStatus = 'pending' | 'success' | 'failed';` et `export const mapServerPaymentStatus = (raw: unknown): PaymentStatus` (`'success'` ou `'completed'` → `'success'` ; `'failed'` → `'failed'` ; tout le reste → `'pending'`). Aucun chemin ne renvoie `'success'` par défaut.
    2. `walletApi.ts` : `initiateMobileMoneyPayment` lève `new Error(payload.error || 'Paiement impossible pour le moment. Réessaie.')` si `!res.ok` ou exception ; supprimer le repli `demo_`, `Math.random`, le champ `mock` du type et du retour. Remplacer `checkPaymentReferenceStatus` par `pollPaymentStatus(reference: string): Promise<{ status: PaymentStatus; balanceCoins?: number }>` qui appelle `GET /api/mobile/wallet/topup/${encodeURIComponent(reference)}`, renvoie `pending` sur erreur réseau ou HTTP 5xx, et lève une erreur sur 404 (« Paiement introuvable. »).
    3. `betterAuth.ts` `topUpStudentWallet` et `checkTopUpStatus` : lever une erreur avec `payload.error` si `!res.ok` ; `checkTopUpStatus` passe par `mapServerPaymentStatus`.
    4. `PaymentModal.tsx` : numéro initial = `defaultPhone ?? ''` (placeholder « Ex. 6XX XX XX XX ») ; bouton « Valider » désactivé pendant le chargement (anti double clic) ; après `initiate` réussi, état « En attente de validation sur ton téléphone » puis polling (`setInterval` 3 s, 20 essais, nettoyé dans un `useEffect` de démontage et à la fermeture) ; `success` → écran « Recharge confirmée » ; `failed` → message « Le paiement a été refusé ou annulé. » ; délai dépassé → « Paiement en attente. Ton solde sera mis à jour dès que l'opérateur confirme. » (aucun succès).
    5. `onPaymentSuccess` ne reçoit plus le pack : `onPaymentSuccess?: () => void`. Dans `AiApplyModal.tsx`, remplacer le calcul local `tokens + pack.tokensReward` par une relecture serveur : `const account = await getStudentAccount();` puis `setCurrentProfile(prev => ({ ...prev, tokens: <solde lu> }))` (vérifier quel champ du compte représente les jetons de candidature avant d'écrire). En erreur de relecture, afficher « Paiement reçu, solde en cours de mise à jour. » sans chiffre inventé.
    6. `AppShell.tsx` `rechargeWallet` : ne plus ajouter de transaction locale (`makeTransaction`) avant `syncStudentAccount` ; laisser la liste serveur faire foi.
  - **Tests à écrire :** `mobile-api/tests/payment-status.test.mjs` : `loadTs('../src/features/wallet/paymentStatus.ts')` : `'success'` → `success` ; `'completed'` → `success` ; `'failed'` → `failed` ; `undefined`, `'error'`, `{}` → `pending`.
  - **Vérification (DoD) :**
    - `grep -rnE "mock|demo_|simul|690 12 34 56|Math\.random" src/features/wallet` → aucune ligne.
    - `npx tsc --noEmit` (racine) → code 0 ; `npm test` (mobile-api) → 0 échec ; `npm run lint:colors` → pas de hausse.
    - Navigateur avec `mobile-api` arrêté : ouvrir le paiement (depuis `AiApplyModal`, solde à 0, mode payant) → message « Paiement impossible… », jamais « réussi » (capture `m23-5-paiement-erreur.png`). Si le lancement gratuit est actif, `AiApplyModal` n'ouvre pas le paiement : tester avec `FREE_LAUNCH_MODE=false` sur le serveur de dev.
  - **Pièges :**
    - Deux chaînes de recharge coexistent (`/wallet/topup` depuis `AppShell`, `/payments/initiate` depuis `PaymentModal`) ; 23.8 décide côté serveur ; ici, l'app doit seulement afficher le statut serveur.
    - Ne pas mélanger « coins » (wallet, 1 coin = 1 FCFA) et « jetons de candidature » (`stage_students.tokens`) dans les messages.
    - Le polling doit s'arrêter à la fermeture de la modale, sinon il continue en arrière-plan.
  - **Dépendances :** idéalement après 23.8 (statuts serveur unifiés) ; sinon `mapServerPaymentStatus` accepte déjà `completed`. Aucune décision utilisateur.

- [X] **Tâche 23.6 : Les autres faux contenus** — validée le 2026-10-15 sauf vérification visuelle (fin de Lot A) : serveur — `lib/db-errors.ts` (nouveau, liste unique réutilisée par `stages-errors.ts`), `mobileErrorResponse` panne de base → 503, `/api/health` → 503 `db: unreachable` (prouvé : `curl` sur un serveur de test avec base invalide → `HTTP/1.1 503`), plus de code d'appairage fabriqué (`evolution-api.ts`, route `whatsapp/instance` → 503), plus de réponse locale de l'assistant PDF (503) ; app — rémunération « Non précisée », catalogue sans documents d'exemple (erreur affichée par l'écran Explorer existant), assistant PDF sans réponse inventée, plan et quiz « non disponibles » au lieu d'être fabriqués, exports en échec annoncés comme tels, plus de PDF vide sur le web (avertissement « CV non joint »), notifications = état réel de la permission + réglages du téléphone (interrupteurs factices retirés), bloc « sessions actives » factice retiré (repli prévu par le guide, `listSessions` non câblé), écran de chargement au lieu d'un écran blanc si les polices échouent, `whatsappService` sans générateur de code ni faux « connecté » ; `health-and-errors.test.mjs` 2/2 (+1 ignoré sans serveur) ; greps DoD vides ; `npm test` 111 tests, 0 échec ; `tsc` 0 (app et mobile-api) ; `lint:colors` 192/192.
  - **Pourquoi :** plusieurs écrans montrent des informations fausses : une rémunération de 75 000 FCFA inventée, une session « Connecté depuis Yaoundé », des interrupteurs de notifications qui ne font rien, des réponses d'assistant fabriquées, un catalogue d'exemple, des exports « réussis » qui ont échoué, un code d'appairage WhatsApp fabriqué, un serveur « en bonne santé » quand la base est tombée.
  - **État actuel :**
    1. Rémunération : `src/ui/screens/StagesScreen.tsx` l.1067-1073, `selectedDetailJob.stipend ? … : '75 000 FCFA'` suivi de « /mois ».
    2. Sécurité : `src/AppShell.tsx` modale sécurité (~l.1575-1610), carte statique « Appareil Actuel (Web) » / « Connecté depuis Yaoundé » (l.~1602) / « Actif ». `authClient` (`betterAuth.ts` l.302) est un client Better Auth : `authClient.listSessions()` et `authClient.revokeSession({ token })` existent côté serveur (`/list-sessions`), aucun wrapper n'est écrit.
    3. Notifications : `AppShell.tsx` l.284-286 (`notifNewPdf`, `notifPromos`, `notifAlerts`), jamais enregistrées ; modale « Gérer les notifications » l.1540-1560. Aucune préférence n'existe côté serveur et `@react-native-async-storage/async-storage` n'est pas une dépendance.
    4. Polices : `AppShell.tsx` l.244 `const [fontsLoaded] = useFonts(...)` (erreur ignorée) et l.1025 `if (!fontsLoaded) return null;` → écran blanc si le chargement échoue.
    5. Assistant PDF : `src/features/pdf/pdfAssistant.ts` `localAnswer` (l.27-45) utilisé en repli (l.67-69, l.83, l.89) ; le serveur `mobile-api/app/api/ai/pdf-chat/route.ts` renvoie aussi `{ answer: localPdfAnswer(...), local: true }` (l.158-159, l.218-219). `src/features/pdf/SimplePdfReaderModal.tsx` (~l.205-226) fabrique un plan d'étude et un quiz quand ils manquent.
    6. Catalogue : `src/features/pdf/pdfApi.ts` `SAMPLE_DOCUMENTS` (l.228-~297) renvoyé par `listPublishedPdfDocuments` (l.299-320) dans 4 cas (non configuré, non-OK, vide, exception). Appelant : `AppShell.tsx` l.561.
    7. Exports : `src/features/stages/pdfExportService.ts` : `exportOfficialCvPdf` et `exportApplicationPdf` affichent « Prêt » et renvoient `true` dans leur `catch` ; `generateCvPdfBase64` renvoie sur le web une constante de PDF minimal, envoyée ensuite à `dispatchStageApplication`.
    8. WhatsApp : `mobile-api/lib/evolution-api.ts` `generateFallbackPairingCode` (l.~108-124) et `requestPairingCode` (l.~248) qui renvoie un code fabriqué si Evolution n'est pas configuré ou échoue (l.~256-263, ~363, ~372) ; la route `whatsapp/instance` POST renvoie `success: true` avec ce code dans son `catch` (l.~106-127).
    9. Santé : `mobile-api/app/api/health/route.ts` renvoie 200 `{ status: 'ok', db: 'offline_resilient' }` quand `select 1` échoue.
    10. `mobile-api/lib/mobile-access.ts` `mobileErrorResponse` (l.326-369) : panne de base → HTTP 200 `{ error: 'Mode hors-ligne temporaire.', offline: true }`.
  - **Fichiers :** `src/ui/screens/StagesScreen.tsx`, `src/AppShell.tsx`, `src/features/auth/betterAuth.ts`, `src/features/pdf/pdfAssistant.ts`, `src/features/pdf/SimplePdfReaderModal.tsx`, `src/features/pdf/PdfStudentSection.tsx`, `src/features/pdf/pdfApi.ts`, `src/features/stages/pdfExportService.ts`, `src/features/stages/AiApplyModal.tsx`, `src/features/whatsapp/whatsappService.ts`, `src/features/whatsapp/WhatsAppPairingModal.tsx`, `mobile-api/app/api/ai/pdf-chat/route.ts`, `mobile-api/lib/evolution-api.ts`, `mobile-api/app/api/mobile/whatsapp/instance/route.ts`, `mobile-api/app/api/health/route.ts`, `mobile-api/lib/mobile-access.ts` ; créé : `mobile-api/lib/db-errors.ts` ; tests : `mobile-api/tests/health-and-errors.test.mjs`. Copie si 23.22 n'est pas faite : `recruiter-web/lib/mobile-access.ts` (même `mobileErrorResponse`).
  - **Étapes :**
    1. Rémunération : remplacer `'75 000 FCFA'` par `'Non précisée'` et n'afficher « /mois » que si `stipend` existe. Sur la carte de liste (l.590-593), le repli `'Gratification'` devient `'Rémunération non précisée'`.
    2. Sessions : dans `betterAuth.ts`, ajouter `listActiveSessions()` (appelle `authClient.listSessions()`, renvoie `{ id, userAgent, createdAt, current }[]` ; `current` = comparaison avec le jeton courant lu par la fonction qui lit déjà le cookie, ~l.542) et `revokeOtherSession(token)`. Vérifier les types renvoyés par `listSessions` dans `node_modules/better-auth` (lecture seule) avant d'écrire. Dans la modale Sécurité : liste réelle (appareil = `userAgent` simplifié, « Ouverte le <date> »), bouton « Déconnecter » sur les autres sessions ; en erreur, « Sessions indisponibles pour le moment. ». Supprimer « Connecté depuis Yaoundé ». Si `listSessions` n'est pas disponible côté client, retirer le bloc « Sessions actives » (et le noter).
    3. Notifications : décision appliquée (aucune préférence serveur n'existe) : retirer les trois interrupteurs factices et la modale associée ; à la place, afficher l'état réel de la permission (`Notifications.getPermissionsAsync()` d'`expo-notifications`) avec le texte « Notifications activées » / « Notifications désactivées » et un bouton « Ouvrir les réglages » (`Linking.openSettings()`). Retirer les props `onToggleNotif*` de l'écran profil.
    4. Polices : `const [fontsLoaded, fontError] = useFonts(...)` ; rendre l'app si `fontsLoaded || fontError` ; ajouter un minuteur de 4 s (`useState` + `setTimeout`) après lequel l'app s'affiche avec les polices système ; pendant l'attente, un écran simple avec `ActivityIndicator` sur fond `stitchColors` (pas `null`).
    5. Assistant PDF : supprimer `localAnswer` ; `askPdfAssistant` lève `new Error("L'assistant est indisponible pour le moment. Réessaie plus tard.")` en erreur réseau ou HTTP (garder les messages réels des 403/429) ; ne lire que `payload.answer`. Côté serveur, supprimer `localPdfAnswer` et `local: true` : en échec du LLM, répondre 503 `{ error: "L'assistant est indisponible pour le moment." }`. `PdfStudentSection.tsx` (l.~556-570) et `SimplePdfReaderModal.tsx` (l.~170-183) affichent déjà `error.message` : vérifier. Dans `SimplePdfReaderModal.tsx`, remplacer le plan et le quiz fabriqués par « Plan d'étude non disponible pour ce document. » / « Quiz non disponible pour ce document. ».
    6. Catalogue : supprimer `SAMPLE_DOCUMENTS` ; `listPublishedPdfDocuments` lève une erreur (« Catalogue indisponible pour le moment. ») si non configuré, non-OK ou exception, et renvoie `[]` si vide. Dans `AppShell.tsx` (l.561), gérer l'erreur : état `catalogError` passé à l'écran Explorer, qui affiche le message et « Réessayer » ; liste vide → « Aucun document publié pour le moment. ».
    7. Exports : dans `pdfExportService.ts`, les `catch` de `exportOfficialCvPdf` et `exportApplicationPdf` renvoient `false` et affichent `Alert.alert('Export impossible', "Le PDF n'a pas pu être créé. Réessaie.")` ; les appelants n'affichent « Succès » que si la fonction renvoie `true`. Sur le web, si `window.open` est bloqué, le fichier téléchargé est nommé `.html` et le message dit « Ton navigateur a bloqué l'impression : un fichier HTML a été téléchargé, ouvre-le puis choisis Imprimer > Enregistrer en PDF. ». `generateCvPdfBase64` renvoie `undefined` sur le web (plus de constante) ; `dispatchStageApplication` n'envoie alors pas de `cvPdfBase64` et l'UI d'`AiApplyModal` prévient « Sur le web, ton CV n'est pas joint automatiquement. ».
    8. WhatsApp : supprimer `generateFallbackPairingCode` et tous ses appels ; `requestPairingCode` renvoie `{ success: false, error: 'Appairage WhatsApp indisponible.' }` si Evolution n'est pas configuré ou échoue ; la route `whatsapp/instance` POST répond 503 `{ error: "L'appairage WhatsApp est indisponible pour le moment. Réessaie plus tard." }` dans ces cas et dans son `catch` (plus de `success: true`). `whatsappService.ts` (l.236, 295, 310) : sur `!response.ok`, lever l'erreur avec `payload.error` ; `WhatsAppPairingModal.tsx` n'affiche aucun code en erreur.
    9. Créer `mobile-api/lib/db-errors.ts` (aucun import) : `export const isDatabaseUnavailable = (error: unknown): boolean` (mêmes critères que `isDbDown` de `mobile-access.ts`). Si `lib/stages-errors.ts` (23.1) existe, y réexporter cette fonction pour n'avoir qu'une seule liste.
    10. `mobileErrorResponse` : utiliser `isDatabaseUnavailable` ; panne de base → **503** `{ error: 'Service momentanément indisponible. Réessaie dans un instant.', offline: true }` ; autre erreur → 500 (inchangé).
    11. `health/route.ts` : succès → 200 `{ status: 'ok', db: 'connected' }` ; échec de `select 1` → **503** `{ status: 'error', db: 'unreachable' }` (sans message d'erreur détaillé).
    12. Avant l'étape 10, chercher dans `src` les lectures de `offline` (`grep -rn "offline" src`) et vérifier que chaque appelant traite `!response.ok` comme une erreur ; corriger ceux qui ne le font pas.
  - **Tests à écrire :** `mobile-api/tests/health-and-errors.test.mjs` :
    - `loadTs('lib/db-errors.ts')` : `isDatabaseUnavailable(new Error('connect ECONNREFUSED 127.0.0.1:5432'))` → `true` ; `new Error('DATABASE_URL is required.')` → `true` ; `new Error('Invalid input')` → `false`.
    - Test HTTP (`skip` sans serveur) : `GET ${BASE_URL}/api/health` → 200 et `db: 'connected'` quand la base répond.
    - Garde de source : `lib/evolution-api.ts` ne contient plus `generateFallbackPairingCode` ; `app/api/ai/pdf-chat/route.ts` ne contient plus `local: true`.
  - **Vérification (DoD) :**
    - `grep -rnE "SAMPLE_DOCUMENTS|localAnswer|75 000|Connecté depuis|notifPromos" src` → aucune ligne ; `grep -rnE "generateFallbackPairingCode|localPdfAnswer|offline_resilient" mobile-api/app mobile-api/lib` → aucune ligne.
    - `npx tsc --noEmit` (racine et `mobile-api`) → code 0 ; `npm test` (mobile-api) → 0 échec ; `npm run lint:colors` → pas de hausse.
    - Health 503 : lancer `cd mobile-api && DATABASE_URL=postgres://invalide@127.0.0.1:1/x npx next dev -p 3012` (port à part, base injoignable), puis `curl -i http://localhost:3012/api/health` → `HTTP/1.1 503`. Arrêter ce serveur ensuite.
    - Navigateur (API arrêtée) : catalogue → message + « Réessayer » ; assistant PDF → message d'indisponibilité ; modale Sécurité sans « Yaoundé » (captures `m23-6-*.png`).
  - **Pièges :**
    - `mobileErrorResponse` est utilisé par presque toutes les routes : le passage de 200 à 503 change le comportement de l'app partout ; l'étape 12 est obligatoire.
    - Le workflow `.github/workflows/vercel-mobile-api.yml` vérifie `/api/health` après déploiement : avec le 503, une base en panne fera échouer cette vérification (c'est le but).
    - `AppShell.tsx` est très long et contient beaucoup de styles en ligne : n'ajouter aucune couleur en dur.
    - `listSessions` peut renvoyer le jeton complet des autres sessions : ne jamais l'afficher, seulement l'utiliser pour la révocation.
  - **Dépendances :** 23.4 (même fichier `pdfExportService.ts`) ; 23.1 (fonction d'erreur de base partagée). Aucune décision utilisateur (le retrait des interrupteurs de notifications est la seule option honnête sans préférence serveur ; si l'utilisateur veut de vraies préférences, ce sera une tâche nouvelle).

### Lot B — Sécurité, argent et coûts

> Ordre conseillé dans le lot : 23.9 (mode gratuit, lu par 23.10 et 23.26) → 23.11 (sessions, dont dépend 23.7) → 23.7 → 23.8 → 23.10 → 23.12 → 23.13 → 23.26. Les numéros restent ceux du plan.

- [X] **Tâche 23.7 : Appairage WhatsApp authentifié** — validée le 2026-10-20 : `lib/whatsapp-target.ts` (résolution cible et ownership sans imports), route `whatsapp/instance` sécurisée sans condition (`isStrictProd` et `VERCEL_ENV` supprimés, rate limits 5/10min pairing, 60/min status, 10/10min logout), `stages-db.ts` (`setStageStudentWhatsAppStatusById` et `getStageStudentWhatsAppStatusById` avec erreurs propagées), app `whatsappService.ts` et `WhatsAppPairingModal.tsx` (numéro en lecture seule relié au profil, pas de saisie libre) ; `whatsapp-instance.test.mjs` 6/6 (+3 HTTP ignorés sans serveur), `test-stage-dispatch.mjs` 36/36, `npm test` (mobile-api) 130 pass / 0 fail / 10 skipped, `tsc` ×4 OK, `lint:colors` 192/192.
  - **Pourquoi :** hors production stricte, n'importe qui peut, sans être connecté, demander un code d'appairage pour n'importe quel numéro, lire l'état de l'instance d'un autre étudiant ou la déconnecter. Un étudiant peut aussi relier un numéro qui n'est pas le sien, et les candidatures partent alors depuis ce numéro.
  - **État actuel :**
    - `mobile-api/app/api/mobile/whatsapp/instance/route.ts` : POST (l.38-130), GET (l.137-243), DELETE (l.249-299). Les trois n'exigent la session que si `NODE_ENV === 'production' && VERCEL_ENV === 'production'` (`isStrictProd`, l.44-46, 146-148, 258-260). Le numéro du corps (`parsed.data.phone`) prime sur le profil (l.66-70) ; GET et DELETE acceptent `?phone=` et `?instance=` sans contrôle de propriété (l.154-163, 263-272) ; DELETE appelle `logoutInstance(instanceName)` sur n'importe quelle instance (l.274) ; les `catch` de POST et DELETE répondent `success: true` (l.106-127, 288-297).
    - `mobile-api/lib/stages-db.ts` : `updateStageStudentWhatsAppStatus(phoneOrInstance, instanceName, connected)` (l.872-894) met à jour **toutes** les lignes `where phone_whatsapp = $3 or phone_whatsapp = $4 or whatsapp_instance = $2`, erreurs avalées ; `getStageStudentWhatsAppStatus` (l.900) lit de la même façon.
    - `mobile-api/lib/evolution-api.ts` : `normalizePhoneNumber` (l.65), `getInstanceName` (l.84 → `student-<numéro>`), `requestPairingCode` (l.248 ; `forceNew` appelle `logoutInstance`, l.269), `getConnectionState` (l.384), `logoutInstance` (l.459).
    - App : `src/features/whatsapp/whatsappService.ts` envoie toujours le numéro (`requestPairingCode(phone)` l.199, `checkConnectionStatus(phone)` l.268, `clearWhatsAppStatus(phone)` l.176) ; `WhatsAppPairingModal.tsx` laisse saisir n'importe quel numéro (`TextInput` l.321-326).
  - **Fichiers :** modifiés : `mobile-api/app/api/mobile/whatsapp/instance/route.ts`, `mobile-api/lib/stages-db.ts`, `src/features/whatsapp/whatsappService.ts`, `src/features/whatsapp/WhatsAppPairingModal.tsx` ; créé : `mobile-api/lib/whatsapp-target.ts` ; test : `mobile-api/tests/whatsapp-instance.test.mjs`. Pas de copie dans `recruiter-web`.
  - **Étapes :**
    1. Créer `mobile-api/lib/whatsapp-target.ts` (aucun import ; recopier la logique de `normalizePhoneNumber` et `getInstanceName` sans les importer, ou les déplacer ici et les réexporter depuis `evolution-api.ts`) : `export const resolveWhatsAppTarget = (profile: { whatsappPhone?: string | null; phone?: string | null }): { phone: string; instanceName: string } | null` (numéro du profil normalisé, `null` s'il manque) et `export const isOwnInstance = (requested: string | null, own: string): boolean` (vrai si `requested` est vide ou égal à `own`).
    2. Dans les trois handlers : supprimer `isStrictProd` ; `const access = await requireMobileUser(request); if (access.response) return access.response;` sans condition.
    3. Cible : `const target = resolveWhatsAppTarget(access.user)` ; si `null` → 400 `{ error: 'Ajoute ton numéro WhatsApp dans ton profil avant de relier WhatsApp.' }`. Le champ `phone` du corps (POST) et `?phone=` (GET, DELETE) : s'ils sont présents et que leur forme normalisée diffère de `target.phone` → 400 `{ error: 'Tu ne peux relier que le numéro WhatsApp de ton profil.' }`. `?instance=` : si `!isOwnInstance(instance, target.instanceName)` → 403 `{ error: 'Accès refusé.' }`.
    4. POST : `await enforceRateLimit(request, { bucket: 'whatsapp-pairing', max: 5, windowMs: 10 * 60_000, userId: access.user.id })`. GET : bucket `whatsapp-status`, `max: 60`, `windowMs: 60_000`. DELETE : bucket `whatsapp-logout`, `max: 10`, `windowMs: 10 * 60_000`.
    5. Dans `stages-db.ts`, ajouter `setStageStudentWhatsAppStatusById(studentId: string, instanceName: string, connected: boolean): Promise<void>` (`update public.stage_students set whatsapp_connected = $3, whatsapp_instance = $2, whatsapp_linked_at = case when $3 then now() else whatsapp_linked_at end where id = $1` ; vérifier le nom exact des colonnes dans `updateStageStudentWhatsAppStatus` avant d'écrire ; erreur propagée) et `getStageStudentWhatsAppStatusById(studentId)`. Les handlers appellent `const studentId = await ensureStageStudent(access.user)` puis ces fonctions. Supprimer `updateStageStudentWhatsAppStatus` et `getStageStudentWhatsAppStatus` s'ils n'ont plus d'appelant (grep).
    6. Erreurs : plus de `success: true` dans les `catch` ; Evolution indisponible → 503 `{ error: "L'appairage WhatsApp est indisponible pour le moment. Réessaie plus tard." }` (cohérent avec 23.6) ; échec de déconnexion → 502 `{ error: "La déconnexion de WhatsApp a échoué. Réessaie." }`.
    7. App : `whatsappService.ts` n'envoie plus de numéro (corps POST `{ action, force }`, GET et DELETE sans query) ; `WhatsAppPairingModal.tsx` affiche le numéro du profil en lecture seule (« Numéro relié : … ») avec un lien « Modifier mon numéro dans le profil » ; plus de `TextInput` libre.
  - **Tests à écrire :** `mobile-api/tests/whatsapp-instance.test.mjs` :
    - `loadTs('lib/whatsapp-target.ts')` : profil `{ whatsappPhone: '690000000' }` → `{ phone: '237690000000', instanceName: 'student-237690000000' }` (adapter au format réel de `getInstanceName`) ; profil vide → `null` ; `isOwnInstance('student-237699999999', 'student-237690000000')` → `false` ; `isOwnInstance(null, …)` → `true`.
    - HTTP (`skip` sans serveur) : `POST /api/mobile/whatsapp/instance` sans session → 401 ; `GET …?instance=student-237699999999` sans session → 401 ; avec le compte E2E (si `E2E_EMAIL` défini, connexion comme dans `document-files.test.mjs`) : `GET …?instance=student-237699999999` → 403.
  - **Vérification (DoD) :**
    - `grep -n "isStrictProd\|VERCEL_ENV" mobile-api/app/api/mobile/whatsapp/instance/route.ts` → aucune ligne.
    - `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` (mobile-api et racine) → code 0.
    - Manuel, serveur de dev lancé : `curl -i -X POST http://localhost:3002/api/mobile/whatsapp/instance` → 401.
  - **Pièges :**
    - `ensureStageStudent` renvoyait `user.id` en cas d'erreur (corrigé par 23.1) : si 23.1 n'est pas faite, l'`update … where id = $1` ne touche rien sans le dire. Faire 23.1 d'abord.
    - Deux formes de numéro coexistent (`237…` à 12 chiffres pour Evolution, 9 chiffres dans `stage_students.phone_whatsapp`) : l'écriture par `id` évite d'avoir à choisir.
    - Retirer la garde `isStrictProd` rend les tests manuels en dev impossibles sans session : utiliser le compte E2E.
    - `forceNew` déconnecte l'instance avant de redemander un code : maintenant limité à l'instance de l'utilisateur, c'est correct.
  - **Dépendances :** 23.1 (`ensureStageStudent` sans repli) ; 23.11 conseillée avant (requête de session durcie). Aucune décision utilisateur.

- [X] **Tâche 23.8 : Paiements fiables (Notch Pay)** — Migration 0010 créée (schéma durci, pack_type, contraintes check statuts/types) ; `lib/payment-rules.ts` (PAYMENT_PACKS, signature HMAC timingSafeEqual, decideWebhookCredit, isMockAllowed) ; `lib/payments.ts` (initiateMobileMoneyPayment insère pending d'abord, fail-closed 503 sans clé/mock et 502 sur échec Notch ; webhook unifié processNotchWebhook avec verrou for update, contrôle montant et crédit atomique) ; routes `payments/initiate`, `payments/webhook`, `wallet/topup`, `wallet/topup/[reference]`, `wallet/webhook` (et copies recruiter-web) durcies ; opérateur Wave retiré de l'app (`walletApi.ts`, `PaymentModal.tsx`) ; `payments.test.mjs` 5/5, `npm test` 134 pass / 0 fail / 11 skipped, typecheck ×3 OK, hardcoded colors 191/191.
  - **Pourquoi :** aujourd'hui une recharge peut être payée sans laisser de trace en base (l'enregistrement est fait après l'appel Notch et son erreur est ignorée), un webhook sans montant crédite quand même, une recharge de 500 FCFA donne 5 candidatures au lieu de 500 coins, et en production sans clé Notch le serveur crédite des recharges « mock » sans paiement.
  - **État actuel :**
    - `mobile-api/lib/payments.ts` (295 l.) : `PaymentPackType` est un `string` (l.6) ; `initiateMobileMoneyPayment` (l.48-148) appelle Notch (l.62-119), avale l'échec, puis insère la transaction **après** (l.121-136, `type = momo_<packType>`, erreur avalée) ; `verifyAndProcessMobilePaymentWebhook` (l.153-295) : signature HMAC obligatoire (correct), contrôle du montant sauté si le montant reçu vaut 0 (l.237-241), statut écrit `completed` (l.244-249), `isDiscovery = tx.type.includes('500') || tx.amount_coins === 500` (l.251) → 5 jetons de candidature et 0 coin.
    - `app/api/mobile/payments/initiate/route.ts` (l.12-23) : `amount` sans maximum, `packType: z.string()`, pas de rate limit, répond toujours `success: true`.
    - `app/api/mobile/payments/webhook/route.ts` : montant `Number(... || 0)` (l.38).
    - `app/api/mobile/wallet/topup/route.ts` (POST) : rate limit `wallet-topup` 20/min (l.64-75) ; sans `NOTCHPAY_PRIVATE_KEY`, référence `mock_pay_<uuid>` même en production (l.148-150) ; insertion `type='topup'` dont l'erreur est avalée (l.152-165).
    - `app/api/mobile/wallet/topup/[reference]/route.ts` (GET de polling) : si la référence commence par `mock_` et qu'il n'y a pas de clé, crédite le wallet après 2 s (l.56-58, 90-131) ; ne reconnaît que `status === 'success'` (l.72).
    - `app/api/mobile/wallet/webhook/route.ts` : secret absent → 503 en production, sinon signature sautée (l.43-61) ; crédite `transaction.amount_coins` sans comparer au montant payé (l.122-131) ; écrit `success`.
    - Schéma : `recruiter-web/scripts/setup-better-auth-mobile.mjs` l.73-81 crée `app_wallet_transactions` avec `check (type in ('topup','purchase','withdrawal','commission','subscription','ia_pack'))` : les insertions `momo_*` de `payments.ts` violent probablement ce CHECK (à vérifier sur la base).
    - Copie : `recruiter-web/app/api/mobile/wallet/topup/route.ts` et `topup/[reference]/route.ts` (même mock).
  - **Fichiers :** créés : `mobile-api/sql/0010_wallet_transactions_hardening.sql`, `mobile-api/lib/payment-rules.ts`, `mobile-api/tests/payments.test.mjs` ; modifiés : `mobile-api/lib/payments.ts`, `app/api/mobile/payments/initiate/route.ts`, `payments/webhook/route.ts`, `wallet/topup/route.ts`, `wallet/topup/[reference]/route.ts`, `wallet/webhook/route.ts`, `mobile-api/.env.example`. Copies si 23.22 n'est pas faite : les deux routes `wallet/topup` de `recruiter-web`.
  - **Étapes :**
    1. Lire la base (script de requête, guide §5) : `select type, status, count(*) from public.app_wallet_transactions group by 1,2;` et `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.app_wallet_transactions'::regclass;`. Noter le résultat dans la case. Si des valeurs de `type` ou `status` sortent des listes ci-dessous, s'arrêter et demander à l'utilisateur.
    2. Écrire `0010_wallet_transactions_hardening.sql` (idempotent) : `add column if not exists pack_type text` ; `update … set pack_type = substring(type from 6), type = 'topup' where type like 'momo\_%'` ; `update … set status = 'success' where status = 'completed'` ; `drop constraint if exists app_wallet_transactions_type_check` puis `add constraint app_wallet_transactions_type_check check (type in ('topup','purchase','withdrawal','commission','subscription','ia_pack'))` ; même chose pour `app_wallet_transactions_status_check` `check (status in ('pending','success','failed'))` ; `create unique index if not exists app_wallet_transactions_topup_ref_uidx on public.app_wallet_transactions (reference_id) where type = 'topup' and reference_id is not null`. Appliquer deux fois (avec l'accord de l'utilisateur, guide §4).
    3. Créer `mobile-api/lib/payment-rules.ts` (seul import `node:crypto`) : `export const PAYMENT_PACKS = { recharge_500: 500, recharge_1000: 1000, recharge_2000: 2000, recharge_5000: 5000, discovery_500: 500 } as const` ; `export type PaymentPackType = keyof typeof PAYMENT_PACKS` ; `export const verifyNotchSignature(rawBody: string, signature: string | null, secret: string): boolean` (HMAC-SHA256 hex, `timingSafeEqual`, longueurs comparées d'abord) ; `export const decideWebhookCredit(tx: { status: string; amount_coins: number }, paid: { amount: number | null; success: boolean }): 'credit' | 'ignore-already-processed' | 'reject-amount' | 'mark-failed'` (statut ≠ `pending` → ignore ; `amount` absent ou différent → reject ; `success` faux → mark-failed ; sinon credit) ; `export const isMockAllowed(env: Record<string, string | undefined>): boolean` (faux si `NODE_ENV === 'production'` ou `VERCEL_ENV === 'production'`, ou si `NOTCHPAY_PRIVATE_KEY` est présent).
    4. `payments/initiate/route.ts` : schéma `{ packType: z.enum([...clés de PAYMENT_PACKS]), operator: z.enum(['mtn','orange']), phone: <regex actuelle>, currency: z.literal('XAF').default('XAF') }.strict()` (le champ `amount` du client est ignoré : le montant vient de `PAYMENT_PACKS`) ; `enforceRateLimit` bucket `payments-initiate`, `max: 10`, `windowMs: 10 * 60_000`, `userId`. Vérifier avec l'app (`walletApi.ts`) que `wave` n'est pas proposé ; s'il l'est, le retirer de l'app.
    5. `initiateMobileMoneyPayment` : (a) si `!isMockAllowed(process.env)` et pas de clé → lever `new MobileApiError('Paiement indisponible pour le moment.', 503)` ; (b) insérer la ligne `pending` (`type='topup'`, `pack_type`, `amount_coins`, `reference_id`) **avant** l'appel Notch, sans `try/catch` silencieux : échec → erreur 500, aucun appel Notch ; (c) appeler Notch ; s'il échoue, `update … set status = 'failed'` et lever 502 `{ error: "L'opérateur n'a pas répondu. Réessaie." }` ; (d) retour `{ reference, status: 'pending' }` (supprimer `mock` côté production).
    6. Une seule logique de webhook : déplacer le traitement dans `processNotchWebhook(rawBody, headers)` de `payments.ts`, appelé par `payments/webhook/route.ts` **et** `wallet/webhook/route.ts` (l'URL configurée chez Notch reste valable quelle qu'elle soit). Règles : secret `NOTCHPAY_WEBHOOK_SECRET` absent → 503 ; signature absente ou fausse → 401 ; transaction introuvable → 404 ; `decideWebhookCredit` : `reject-amount` → 400 `{ error: 'Montant incohérent.' }` + `notifyAdmin` ; `ignore-already-processed` → 200 `{ ok: true }` (rejeu idempotent) ; `mark-failed` → statut `failed` ; `credit` → dans la même transaction `for update` : statut `success`, puis si `pack_type = 'discovery_500'` → `stage_students.tokens + 5`, sinon `app_wallets.balance_coins + amount_coins`. Supprimer `isDiscovery` basé sur le texte. Reçu (`sendTopUpReceipt`) après `commit`.
    7. `wallet/topup/route.ts` : si pas de clé Notch et `!isMockAllowed(process.env)` → 503 `{ error: 'Paiement indisponible pour le moment.' }` ; insertion `pending` avant l'appel Notch, erreur propagée (plus de `Transaction record skipped`).
    8. `wallet/topup/[reference]/route.ts` : le crédit automatique `mock_` n'est permis que si `isMockAllowed(process.env)` ; statut `completed` traité comme `success` pendant la transition ; le crédit après confirmation Notch (GET `payments/<ref>`, l.153) contrôle aussi le montant renvoyé par Notch.
    9. `.env.example` : ajouter `NOTCHPAY_PRIVATE_KEY=`, `NOTCHPAY_WEBHOOK_SECRET=` (valeurs vides, commentaire « obligatoires en production si le paiement est actif »).
  - **Tests à écrire :** `mobile-api/tests/payments.test.mjs` :
    - `loadTs('lib/payment-rules.ts')` : signature valide → `true` ; signature absente ou modifiée d'un caractère → `false`.
    - `decideWebhookCredit({ status: 'pending', amount_coins: 1000 }, { amount: 1000, success: true })` → `credit` ; montant `500` → `reject-amount` ; montant `null` → `reject-amount` ; `status: 'success'` → `ignore-already-processed` (rejeu) ; `success: false` → `mark-failed`.
    - `isMockAllowed({ NODE_ENV: 'production' })` → `false` ; `{ NODE_ENV: 'development' }` → `true` ; `{ NODE_ENV: 'development', NOTCHPAY_PRIVATE_KEY: 'x' }` → `false`.
    - Enregistrement KO → pas d'appel Notch : `globalThis.campusDatabasePool` dont `query` lève, `globalThis.fetch` remplacé par un espion ; `loadTsWithPackages('lib/payments.ts', ['lib/database.ts', 'lib/payment-rules.ts', <autres imports relatifs de payments.ts>])` ; `await assert.rejects(initiateMobileMoneyPayment(...))` et l'espion n'a pas été appelé. Si `payments.ts` importe un module qui n'est pas chargeable (`next/server`, `@/`), injecter les dépendances en paramètre (`deps = { pool, fetch }`) plutôt que de contourner.
    - HTTP (`skip` sans serveur) : `POST /api/mobile/payments/webhook` sans signature → 401 (ou 503 si le secret n'est pas configuré en dev : accepter l'un des deux et le noter).
  - **Vérification (DoD) :**
    - Migration 0010 appliquée deux fois sans erreur ; `select status, count(*) …` ne montre plus `completed`.
    - `grep -rn "Transaction record skipped\|Payment DB Record Skipped\|includes('500')" mobile-api/app mobile-api/lib` → aucune ligne.
    - `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` → code 0.
  - **Pièges :**
    - Les deux webhooks pouvaient créditer la même transaction : après l'étape 6, la garde `status != 'pending'` sous `for update` rend le double appel sans effet.
    - Notch envoie le montant dans `amount` ou `data.amount` selon l'événement : lire les deux, sans repli à 0.
    - Ne jamais utiliser de clé Notch « live » pour tester ; le mode test du fournisseur avec ses clés de test est fourni par l'utilisateur.
    - Le contrôle de montant suppose 1 coin = 1 FCFA (décision du plan) : si Notch renvoie des centimes, adapter et le noter.
  - **Dépendances :** 23.9 (le mode gratuit ne doit pas masquer les tests de paiement). Décision utilisateur : aucune pour le code ; l'utilisateur doit indiquer quelle URL de webhook est configurée dans le tableau de bord Notch Pay (les deux restent valides) et fournir les clés de test pour la recette 23.25.

- [X] **Tâche 23.9 : Mode gratuit et solde de départ explicites** — `lib/free-launch.ts` (mobile-api = recruiter-web, test de parité), coûts IA par requête, 3000 coins via STARTING_COINS, app off par défaut + date de fin ; test free-launch 6/6, npm test 0 échec, tsc ×3 OK, lint:colors 192.
  - **Pourquoi :** si la variable `FREE_LAUNCH_MODE` est oubliée en production, tout devient gratuit sans que personne le sache, et le gratuit ne s'arrête jamais. Chaque nouveau compte reçoit 5 000 coins codés en dur au lieu des 3 000 décidés.
  - **État actuel :**
    - `mobile-api/lib/free-launch.ts` l.3 : `export const isFreeLaunch = (): boolean => process.env.FREE_LAUNCH_MODE !== 'false';` (absent = gratuit). Copie identique `recruiter-web/lib/free-launch.ts`. `FREE_LAUNCH_UNTIL` n'existe pas.
    - Calculé au chargement du module (figé jusqu'au redémarrage) : `app/api/mobile/documents/generate/route.ts` l.12 et `generate-full/route.ts` l.22 (`IA_CREDITS_PER_GENERATION = isFreeLaunch() ? 0 : 5`). À chaque requête : `purchase/document/route.ts` l.74, `purchase/pack/route.ts` l.83, `account/route.ts` l.101 (`wallet.freeLaunch`).
    - App : `src/config/launch.ts` (`let freeLaunch = true`, `isFreeLaunch`, `setFreeLaunch`, `FREE_LABEL = 'Gratuit'`) ; `src/AppShell.tsx` l.587 `setFreeLaunch(account.wallet.freeLaunch ?? false)` (contradiction avec le défaut `true`).
    - Solde de départ : `mobile-api/lib/mobile-access.ts` l.140 `Number(legacyRow?.balance_coins ?? 5000)` ; copies `recruiter-web/lib/mobile-access.ts` l.139 et `recruiter-web/lib/access.ts` l.59 (`role === 'admin' ? 0 : 5000`) ; défaut SQL `balance_coins … default 5000` dans `recruiter-web/scripts/setup-better-auth-mobile.mjs` l.46.
  - **Fichiers :** modifiés : `mobile-api/lib/free-launch.ts`, `mobile-api/lib/mobile-access.ts`, `app/api/mobile/documents/generate/route.ts`, `generate-full/route.ts`, `purchase/document/route.ts`, `purchase/pack/route.ts`, `account/route.ts`, `mobile-api/.env.example`, `src/config/launch.ts`, `src/AppShell.tsx` ; `recruiter-web/lib/free-launch.ts`, `recruiter-web/lib/access.ts` (toujours, car `access.ts` sert aussi l'admin) ; copies si 23.22 n'est pas faite : `recruiter-web/lib/mobile-access.ts` et les routes `recruiter-web/app/api/mobile/{documents/generate,documents/generate-full,purchase/document,purchase/pack,account}` ; test : `mobile-api/tests/free-launch.test.mjs`.
  - **Étapes :**
    1. `free-launch.ts` (aucun import) : `export const resolveFreeLaunch = (env: Record<string, string | undefined>, now: Date = new Date()): { active: boolean; until: string | null }`. Règles : `FREE_LAUNCH_MODE` vaut exactement `'true'` ou `'false'` ; absent ou autre valeur → si `env.NODE_ENV === 'production'`, lever `new Error('FREE_LAUNCH_MODE doit valoir true ou false en production.')`, sinon `active: true` avec un `console.warn` unique ; si `'true'` et `FREE_LAUNCH_UNTIL` présent : date ISO valide obligatoire (sinon erreur « FREE_LAUNCH_UNTIL n'est pas une date ISO valide. ») et `active = now < until` ; si `'true'` en production sans `FREE_LAUNCH_UNTIL` → erreur « FREE_LAUNCH_UNTIL est obligatoire en production quand le lancement gratuit est actif. ». `export const isFreeLaunch = (): boolean => resolveFreeLaunch(process.env).active;` (l'erreur survient au premier usage, pas au build, comme `lib/database.ts`).
    2. `export const resolveStartingCoins = (env): number` dans le même fichier : `STARTING_COINS` absent → `3000` ; entier entre 0 et 100 000 sinon erreur « STARTING_COINS doit être un entier entre 0 et 100000. ».
    3. `generate/route.ts` et `generate-full/route.ts` : remplacer la constante de module par un calcul dans le handler (`const cost = isFreeLaunch() ? 0 : 5;`).
    4. `account/route.ts` : renvoyer `wallet.freeLaunch` (booléen) et `wallet.freeLaunchUntil` (chaîne ISO ou `null`).
    5. `mobile-access.ts` l.140 : `Number(legacyRow?.balance_coins ?? resolveStartingCoins(process.env))`. Le solde legacy reste prioritaire ; le `on conflict (user_id) do nothing` existant garantit que le crédit n'est donné qu'une fois. `recruiter-web/lib/access.ts` l.59 : `role === 'admin' ? 0 : resolveStartingCoins(process.env)` (copier la fonction dans `recruiter-web/lib/free-launch.ts`, identique).
    6. `recruiter-web/lib/free-launch.ts` : remplacer par une copie identique du nouveau fichier de `mobile-api`.
    7. App : `src/config/launch.ts` : `let freeLaunch = false;` et `let freeLaunchUntil: string | null = null;` + `setFreeLaunch(active: boolean, until: string | null)`. `AppShell.tsx` l.587 : `setFreeLaunch(account.wallet.freeLaunch === true, account.wallet.freeLaunchUntil ?? null)`. Là où l'app affiche « Tout est gratuit », ajouter « jusqu'au <date au format français> » quand `until` existe.
    8. `.env.example` : `FREE_LAUNCH_MODE=true`, `FREE_LAUNCH_UNTIL=` (commentaire : « date ISO de fin du lancement gratuit, ex. 2027-01-15T00:00:00Z, obligatoire en production si FREE_LAUNCH_MODE=true »), `STARTING_COINS=3000` (commentaire : « coins offerts une seule fois à la création du compte, 1 coin = 1 FCFA »).
  - **Tests à écrire :** `mobile-api/tests/free-launch.test.mjs` (`loadTs('lib/free-launch.ts')`) :
    - `{ NODE_ENV: 'production' }` → `throws`.
    - `{ NODE_ENV: 'production', FREE_LAUNCH_MODE: 'false' }` → `active: false`.
    - `{ NODE_ENV: 'production', FREE_LAUNCH_MODE: 'true' }` → `throws` (date manquante).
    - `{ NODE_ENV: 'production', FREE_LAUNCH_MODE: 'true', FREE_LAUNCH_UNTIL: '2027-01-15T00:00:00Z' }` avec `now = 2026-12-01` → `active: true` ; `now = 2027-02-01` → `active: false`.
    - `FREE_LAUNCH_UNTIL: 'demain'` → `throws`.
    - `{ NODE_ENV: 'development' }` → `active: true`.
    - `resolveStartingCoins({})` → 3000 ; `{ STARTING_COINS: '2500' }` → 2500 ; `'-1'` et `'abc'` → `throws`.
    - Parité : `recruiter-web/lib/free-launch.ts` identique à `mobile-api/lib/free-launch.ts` (lecture des deux fichiers).
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` dans `mobile-api`, `recruiter-web` et à la racine → code 0 ; `grep -rn "5000" mobile-api/lib/mobile-access.ts recruiter-web/lib/access.ts` → aucune ligne de solde ; `.env.example` contient les trois variables.
  - **Pièges :**
    - Ne pas lever d'erreur au chargement du module : `next build` évalue les routes sans variables d'environnement.
    - Un `FREE_LAUNCH_UNTIL` dépassé fait passer tout le monde en payant sans redéploiement : c'est voulu, mais le barème réduit des crédits IA doit être fixé avant (décision ouverte).
    - Le défaut SQL de 5 000 dans le script de setup sera aligné dans le baseline (23.19), qui fixera `default 0` (le code écrit toujours la valeur explicite).
  - **Dépendances :** aucune tâche avant. **À demander à l'utilisateur avant la mise en production (pas avant le code) :** la date de mise en ligne pour calculer `FREE_LAUNCH_UNTIL` (+3 mois) et le barème réduit des crédits IA après la fin. Valeurs déjà décidées : 3 000 coins, 1 coin = 1 FCFA, 3 mois.

- [X] **Tâche 23.10 : Quotas IA, même en lancement gratuit** — `lib/ai-quota-rules.ts` (plafond 60/j `AI_DAILY_LIMIT`, burst limits par route, réservation atomique dans `app_ia_usage_logs`), `lib/ai-quota.ts` (`enforceAiQuota` fail-closed avec calcul `retryAfter`), intégration dans les 9 routes IA (`generate`, `generate-full`, `onboard-chat`, `defense-coach`, `diagram`, `ai-editor`, `document-chat`, `section-interview-draft`, `ai-pdf-chat`) et les copies `recruiter-web` ; suppression du courtesy topup `ia_credits = 10` dans `documents/ai` ; `defense-coach` refondu avec `callLlm` et sans `GEMINI_API_KEY` ; `ai-quota.test.mjs` 5/5, `npm test` 138 pass / 0 fail / 12 skipped, typecheck ×3 code 0, lint:colors 191/191.
  - **Pourquoi :** pendant le lancement gratuit, les générations coûtent 0 crédit, donc rien ne limite un compte qui appelle l'IA en boucle ; la facture OpenRouter peut exploser. Une route recharge même 10 crédits gratuits à chaque épuisement. `defense-coach` envoie la clé Gemini à OpenRouter.
  - **État actuel :**
    | Route (`mobile-api/app/api/…`) | Rate limit actuel | Débit crédits |
    |---|---|---|
    | `mobile/documents/generate/route.ts` | aucun | oui (`IA_CREDITS_PER_GENERATION`, 0 en gratuit) |
    | `mobile/documents/generate-full/route.ts` | aucun | oui (0 en gratuit) |
    | `mobile/documents/onboard-chat/route.ts` | aucun | non |
    | `mobile/documents/defense-coach/route.ts` | aucun | non ; clé `OPENROUTER_API_KEY || GEMINI_API_KEY` (l.31), modèle en dur `openai/gpt-4o-mini` (l.83) |
    | `mobile/documents/ai/diagram/route.ts` | aucun | non |
    | `mobile/documents/ai/route.ts` | `ai-editor` 60/min (l.75-81) | oui, mais recharge à 10 crédits quand le solde est à 0 (l.117-124) |
    | `mobile/documents/[id]/chat/route.ts` | `document-chat` 40/10 min (l.49) | non |
    | `mobile/documents/[id]/sections/[sectionId]/interview/route.ts` | `section-interview-draft` 20/10 min (l.116) | non |
    | `ai/pdf-chat/route.ts` | `ai-pdf-chat` 60/min (l.85-91) | non |
    - `app_ia_usage_logs` (`sql/0004…` l.40-45 : `id`, `user_id`, `tokens_used int not null default 0`, `created_at`) existe mais n'est jamais écrite.
    - `lib/llm.ts` : `callLlm(messages, options)` (l.22-53), `isLlmConfigured` (l.20).
    - `lib/rate-limit.ts` `rateLimit` laisse passer la requête si la base est en erreur (l.121-123, « fail-open ») ; corrigé par 23.11.
  - **Fichiers :** créés : `mobile-api/lib/ai-quota.ts`, `mobile-api/lib/ai-quota-rules.ts`, `mobile-api/tests/ai-quota.test.mjs` ; modifiés : les 9 routes du tableau, `mobile-api/.env.example`. Copies si 23.22 n'est pas faite : `recruiter-web/app/api/mobile/documents/{generate,generate-full,ai,ai/diagram,onboard-chat}/route.ts` (voir Pièges).
  - **Étapes :**
    1. Faire confirmer par l'utilisateur la valeur du plafond quotidien (proposition : 60 appels par jour et par utilisateur, toutes routes IA confondues). Noter la réponse dans la case.
    2. `lib/ai-quota-rules.ts` (aucun import) : `export const readDailyLimit = (env): number` (`AI_DAILY_LIMIT` absent → 60 ; entier de 1 à 1000, sinon erreur) ; `export const AI_ROUTE_LIMITS = { generate: { max: 10, windowMs: 600_000 }, 'generate-full': { max: 5, windowMs: 600_000 }, 'onboard-chat': { max: 30, windowMs: 600_000 }, 'defense-coach': { max: 20, windowMs: 600_000 }, diagram: { max: 20, windowMs: 600_000 }, 'ai-editor': { max: 60, windowMs: 60_000 }, 'document-chat': { max: 40, windowMs: 600_000 }, 'section-interview-draft': { max: 20, windowMs: 600_000 }, 'ai-pdf-chat': { max: 60, windowMs: 60_000 } } as const` ; `export type AiRoute = keyof typeof AI_ROUTE_LIMITS` ; `export const DAILY_LIMIT_MESSAGE = "Tu as atteint la limite d'utilisation de l'IA pour aujourd'hui. Réessaie demain."`.
    3. `lib/ai-quota.ts` : `export const enforceAiQuota = async (request: NextRequest, options: { userId: string; route: AiRoute }): Promise<void>` : (a) `enforceRateLimit(request, { bucket: \`ai-${route}\`, ...AI_ROUTE_LIMITS[route], userId })` ; (b) réservation atomique dans le journal : `with c as (select count(*)::int as n from public.app_ia_usage_logs where user_id = $1 and created_at > now() - interval '1 day') insert into public.app_ia_usage_logs (user_id, tokens_used) select $1, 0 from c where c.n < $2 returning id` ; aucune ligne → lever `new RateLimitError(DAILY_LIMIT_MESSAGE, <secondes jusqu'à expiration de la plus ancienne ligne du jour, ou 3600>)` (vérifier le constructeur de `RateLimitError` dans `lib/rate-limit.ts`). `userId` = `access.user.id` (UUID de `app_users`, la clé étrangère de `app_ia_usage_logs`).
    4. Dans chacune des 9 routes, appeler `await enforceAiQuota(request, { userId: access.user.id, route: '<clé>' })` juste après `requireMobileUser` et avant tout appel au modèle ; supprimer les `enforceRateLimit` IA devenus doublons dans ces routes (garder `section-interview-save`, qui n'appelle pas le modèle). Le contrôle s'applique même quand le coût en crédits vaut 0.
    5. `documents/ai/route.ts` : supprimer la recharge automatique à 10 crédits (l.117-124) ; solde à 0 → 402 `{ error: "Tu n'as plus de crédits IA." }` sauf en lancement gratuit (coût 0).
    6. `defense-coach/route.ts` : remplacer le `fetch` direct par `callLlm(messages, { … })` ; supprimer `GEMINI_API_KEY` et le modèle en dur ; si `!isLlmConfigured()` → 503 `{ error: 'Coach indisponible pour le moment.' }`.
    7. `.env.example` : `AI_DAILY_LIMIT=60` (commentaire : « appels IA max par utilisateur et par 24 h, toutes routes »).
  - **Tests à écrire :** `mobile-api/tests/ai-quota.test.mjs` :
    - `loadTs('lib/ai-quota-rules.ts')` : `readDailyLimit({})` → 60 ; `{ AI_DAILY_LIMIT: '0' }` → `throws`.
    - Garde de source : pour chacun des 9 fichiers de route, le texte contient `enforceAiQuota(` ; `defense-coach/route.ts` ne contient pas `GEMINI_API_KEY` ; `documents/ai/route.ts` ne contient pas `ia_credits = 10`.
    - Plafond : `globalThis.campusDatabasePool` dont `query` renvoie `{ rows: [] }` pour la requête de réservation (plafond atteint) ; charger `lib/ai-quota.ts` avec `loadTsWithPackages` si ses imports le permettent (`next/server` est importé par `route-rate-limit.ts` : si le chargement échoue, extraire la réservation dans `reserveDailyAiCall(pool, userId, limit): Promise<boolean>` de `ai-quota-rules.ts` avec le pool en paramètre, et la tester avec un faux pool) → résultat `false` ; avec `{ rows: [{ id: 'x' }] }` → `true`.
    - HTTP (`skip` sans serveur ou sans compte E2E) : avec `AI_DAILY_LIMIT=2` sur le serveur de test, 3 appels `POST /api/mobile/documents/ai/diagram` → le 3ᵉ renvoie 429.
  - **Vérification (DoD) :** `grep -rln "enforceAiQuota(" mobile-api/app | wc -l` → 9 ; `grep -rn "GEMINI_API_KEY" mobile-api/app mobile-api/lib` → aucune ligne ; `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` → code 0.
  - **Pièges :**
    - Compter des lignes, pas des tokens (`tokens_used` vaut 0 par défaut).
    - Sans `userId`, `enforceRateLimit` retombe sur l'IP (falsifiable avant 23.11) : toujours passer `userId`.
    - Les copies IA de `recruiter-web` sont joignables en dev par l'app et en prod via `admin.campus360b.site/api/mobile/...` : sans quota, elles contournent le plafond. Si 23.22 n'est pas faite, demander à l'utilisateur s'il préfère faire 23.22 d'abord (recommandé) ou copier `ai-quota*.ts` dans `recruiter-web/lib` et l'appliquer aux 5 copies.
  - **Dépendances :** 23.9 (le coût dépend du mode gratuit) ; 23.11 conseillée (limiteur fail-closed). **À demander à l'utilisateur au début :** confirmer le plafond quotidien (proposition 60 appels/jour/utilisateur).

- [X] **Tâche 23.11 : Sessions et origines durcies** — `lib/origins.ts`, `lib/client-ip.ts`, `lib/db-ssl.ts` (copies identiques dans recruiter-web, test de parité) ; plus de `?token=` ni `s.id` ; legacy seulement si e-mail vérifié, conflit d'e-mail → 409 ; vérification d'e-mail obligatoire en prod (mobile-api, recruiter-web ; landing laissée à false car elle n'envoie aucun e-mail, la vérification se fait dans l'app) ; limiteur fail-closed pour `ai-`/`payments-`/`purchase-`/`wallet-`/`whatsapp-` ; TLS base vérifié en prod. Tests : sessions-origins 5/5 (+1 HTTP ignoré sans serveur), npm test 0 échec, tsc ×4 OK, grep jokers vide. **Au déploiement :** 14/22 comptes non vérifiés dont 1 admin (code à saisir à la prochaine connexion) ; `RESEND_API_KEY` obligatoire en prod sur mobile-api et recruiter-web ; poser le certificat CA Supabase + `DATABASE_SSL_CA_FILE` et `TRUST_PROXY=true` sur le VPS (🔒 utilisateur).
  - **Pourquoi :** un jeton de session peut être passé dans l'URL (il finit dans les logs), une session est aussi retrouvée par son identifiant interne, des domaines qui ne sont pas à nous (`*.vercel.app`, `*.expo.dev`) sont de confiance, un compte créé avec l'e-mail d'un ancien utilisateur récupère son wallet sans vérification d'e-mail, le limiteur laisse tout passer si la base hésite, l'IP lue est falsifiable et le certificat TLS de la base n'est pas vérifié.
  - **État actuel :**
    - `mobile-api/lib/mobile-access.ts` (369 l.) : `requireMobileUser` (l.168) lit `?token=` (l.174-181) ; requête de session `where (s.token = $1 or s.token = $2 or s.id = $1 or s.id = $2)` (l.204) ; `ensureMobileUser` (l.83-158) lit le legacy par e-mail seul (l.95-100) et fait `on conflict (email) do update set better_auth_user_id = excluded.better_auth_user_id` (l.110-111) ; `isTrustedOrigin` (l.277-296) accepte `.vercel.app`, `.expo.dev` et `CORS_ALLOWED_ORIGINS` ; `withCors` (l.300-324) renvoie `*` sans en-tête `Origin` (nécessaire pour l'app native, à garder).
    - `mobile-api/lib/auth.ts` (397 l.) : `PRODUCTION_ORIGINS` (l.26-40) avec `https://*.vercel.app`, `https://*.expo.dev`, `https://*.exp.direct`, `exp://*`, `campus-bordes://*` ; `TRUSTED_EXTRA_ORIGINS` (l.100) ; `requireEmailVerification: emailDeliveryConfigured` (l.194 : désactivé si `RESEND_API_KEY` manque).
    - `mobile-api/middleware.ts` : troisième liste `ALLOWED_ORIGINS` (accepte tout `exp://` et `campus-bordes://`, plus `TRUSTED_EXTRA_ORIGINS`).
    - `mobile-api/lib/rate-limit.ts` : `getClientIp` (l.27-37) prend le premier élément de `x-forwarded-for` ; `rateLimit` (l.66-126) laisse passer en cas d'erreur (l.121-123). `lib/login-throttle.ts` l.52 : même lecture d'IP.
    - `mobile-api/lib/database.ts` : `rejectUnauthorized` vaut `false` par défaut (l.17-18).
    - Côté app, `src/features/auth/betterAuth.ts` gère déjà `EMAIL_NOT_VERIFIED` à la connexion (l.401) et l'écran `AuthScreen` a un mode `verify-email` (code à 6 chiffres).
    - Copies : `recruiter-web/lib/mobile-access.ts` (`?token=` l.169-174, `s.id` l.196-203, option morte `allowDirectUserIdentityFallback` l.160 et l.218-240, origines l.297-313), `recruiter-web/lib/auth.ts` (origines l.26-40, `requireEmailVerification: false` l.209), `recruiter-web/lib/database.ts`, `recruiter-web/lib/supabase-pdf.ts` l.97 (`rejectUnauthorized: false` en dur), `recruiter-web/lib/rate-limit.ts` ; `landing-site/lib/auth.ts` (origines l.14-17 et 48-58, `requireEmailVerification: false` l.103).
  - **Fichiers :** créés : `mobile-api/lib/origins.ts`, `mobile-api/lib/client-ip.ts`, `mobile-api/tests/sessions-origins.test.mjs` ; modifiés : `mobile-api/lib/mobile-access.ts`, `lib/auth.ts`, `middleware.ts`, `lib/rate-limit.ts`, `lib/login-throttle.ts`, `lib/database.ts`, `.env.example`, `landing-site/lib/auth.ts`, `recruiter-web/lib/auth.ts`, `recruiter-web/lib/database.ts`, `recruiter-web/lib/supabase-pdf.ts`, `recruiter-web/lib/mobile-access.ts`, `recruiter-web/lib/rate-limit.ts`.
  - **Étapes :**
    1. `lib/origins.ts` (aucun import) : `export const PRODUCTION_WEB_ORIGINS = ['https://api.campus360b.site', 'https://admin.campus360b.site', 'https://campus360b.site', 'https://campus-360-hi97.vercel.app', 'https://campus-360.vercel.app', 'https://campus-360-bimai-s-projects.vercel.app']` (les domaines Vercel sont ceux déjà listés dans `middleware.ts` ; demander à l'utilisateur s'ils servent encore et retirer ceux qui ne servent plus) ; `export const APP_SCHEMES = ['campus-bordes://']` (devient `campus360://` en 23.17) ; `export const isTrustedOrigin = (origin: string, env: Record<string, string | undefined>): boolean` : vrai pour une origine exacte de la liste, un schéma de `APP_SCHEMES`, une entrée exacte de `TRUSTED_EXTRA_ORIGINS` (liste séparée par des virgules), et seulement hors production : `exp://…`, `http://localhost:<port>`, `http://127.0.0.1:<port>`, IP LAN privées (reprendre `LAN_ORIGIN_PATTERN` de `middleware.ts`). Aucun joker `*`.
    2. Utiliser `isTrustedOrigin` dans `mobile-access.ts` (`withCors`) et dans `middleware.ts` ; construire `trustedOrigins` de `auth.ts` à partir des mêmes listes (sans `*.vercel.app`, `*.expo.dev`, `*.exp.direct`). Fusionner `CORS_ALLOWED_ORIGINS` dans `TRUSTED_EXTRA_ORIGINS` (lire les deux pendant la transition et documenter que `CORS_ALLOWED_ORIGINS` est obsolète).
    3. `requireMobileUser` : supprimer la lecture de `searchParams.get('token')` ; requête `where (s.token = $1 or s.token = $2) and s."expiresAt" > now()` (jeton brut et partie avant le point du cookie signé ; plus de `s.id`). Avant de supprimer `s.id`, chercher dans `src` si un client envoie un identifiant de session (grep `session.id`) ; noter le résultat.
    4. `ensureMobileUser` : ajouter `u."emailVerified"` au `select` de session et le passer à `ensureMobileUser` ; ne lire le legacy (`profiles` par e-mail) et n'appeler `copyLegacyData` que si `emailVerified === true`. Remplacer le `on conflict (email) do update …` par `… do update set … where public.app_users.better_auth_user_id is null or public.app_users.better_auth_user_id = excluded.better_auth_user_id returning *` ; aucune ligne renvoyée → `throw new MobileApiError('Cette adresse e-mail est déjà liée à un autre compte.', 409)`.
    5. `auth.ts` : `requireEmailVerification: process.env.NODE_ENV === 'production' ? true : emailDeliveryConfigured` ; en production sans `RESEND_API_KEY`, `buildBetterAuthConfig` lève `new Error('RESEND_API_KEY est obligatoire en production (vérification des e-mails).')` (le Proxy existant renvoie l'erreur à l'usage). Avant de livrer, compter les comptes concernés : `select count(*) from public."user" where "emailVerified" = false;` et donner le chiffre à l'utilisateur (ils devront saisir un code à leur prochaine connexion ; le flux `EMAIL_NOT_VERIFIED` existe déjà).
    6. `lib/client-ip.ts` (aucun import) : `export const clientIpFrom = (headers: { get(name: string): string | null }, env): string` : si `env.TRUST_PROXY === 'true'`, prendre la **dernière** entrée de `x-forwarded-for` (ajoutée par Nginx), sinon `x-real-ip` si `TRUST_PROXY === 'true'`, sinon `'unknown'`. L'utiliser dans `rate-limit.ts` (`getClientIp`) et `login-throttle.ts`.
    7. `rate-limit.ts` : ajouter `failMode?: 'open' | 'closed'` aux options de `rateLimit` (défaut `'open'`) ; en erreur de base avec `'closed'`, lever `new RateLimitError('Service momentanément indisponible. Réessaie dans un instant.', 30)`. `enforceRateLimit` passe `failMode: 'closed'` quand le seau commence par `ai-`, `payments-`, `wallet-` ou `whatsapp-` ; le throttle de connexion (`login-throttle.ts`) refuse aussi en cas d'erreur.
    8. `database.ts` : en production, `rejectUnauthorized` vaut `true` par défaut ; si `DATABASE_SSL_CA_FILE` est défini, lire ce fichier et passer `ssl: { ca, rejectUnauthorized: true }`. `DATABASE_SSL_REJECT_UNAUTHORIZED=false` reste une dérogation explicite. Même règle dans `recruiter-web/lib/database.ts` et `recruiter-web/lib/supabase-pdf.ts` (plus de `false` en dur).
    9. `recruiter-web/lib/mobile-access.ts` : supprimer `?token=`, `s.id`, et tout le code de `allowDirectUserIdentityFallback` (aucun appelant). `landing-site/lib/auth.ts` et `recruiter-web/lib/auth.ts` : mêmes origines sans joker ; `requireEmailVerification` : appliquer la règle de l'étape 5 à `landing-site` ; pour `recruiter-web`, voir Dépendances.
    10. `.env.example` : `TRUST_PROXY=true` (commentaire : « true seulement derrière Nginx »), `TRUSTED_EXTRA_ORIGINS=`, `DATABASE_SSL_CA_FILE=` (commentaire : « chemin du certificat CA Supabase »).
  - **Tests à écrire :** `mobile-api/tests/sessions-origins.test.mjs` :
    - `loadTs('lib/origins.ts')` : `isTrustedOrigin('https://evil.vercel.app', { NODE_ENV: 'production' })` → `false` ; `'https://admin.campus360b.site'` → `true` ; `'exp://192.168.1.5:8081'` en production → `false`, en développement → `true` ; origine dans `TRUSTED_EXTRA_ORIGINS` → `true`.
    - `loadTs('lib/client-ip.ts')` : XFF `'1.1.1.1, 2.2.2.2'` avec `TRUST_PROXY=true` → `'2.2.2.2'` ; sans `TRUST_PROXY` → `'unknown'`.
    - Garde de source : `lib/mobile-access.ts` ne contient ni `searchParams.get('token')` ni `s.id =` ; `recruiter-web/lib/mobile-access.ts` ne contient pas `allowDirectUserIdentityFallback`.
    - HTTP (`skip` sans serveur ou sans compte E2E) : se connecter, récupérer le jeton, puis `GET /api/mobile/account?token=<jeton>` **sans** cookie ni en-tête → 401 ; requête `OPTIONS` avec `Origin: https://evil.vercel.app` → pas d'en-tête `Access-Control-Allow-Origin` égal à cette origine.
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` dans `mobile-api`, `landing-site`, `recruiter-web` → code 0 ; `grep -rn "\*\.vercel\.app\|\*\.expo\.dev" mobile-api/lib mobile-api/middleware.ts landing-site/lib recruiter-web/lib` → aucune ligne.
  - **Pièges :**
    - L'app native n'envoie pas d'en-tête `Origin` : `withCors` doit continuer à répondre sans restriction dans ce cas.
    - Vérifier le TLS de la base peut empêcher le serveur de se connecter à Supabase si le certificat CA n'est pas fourni : tester en local avec `DATABASE_SSL_CA_FILE` avant tout déploiement, et ne pas déployer sans l'accord de l'utilisateur.
    - `TRUST_PROXY=true` hors Nginx permet de falsifier l'IP : ne le mettre que sur le VPS.
    - Une prévisualisation Vercel de l'équipe non listée sera refusée : c'est voulu ; l'ajouter par `TRUSTED_EXTRA_ORIGINS` si besoin.
  - **Dépendances :** aucune tâche avant. **À demander à l'utilisateur avant de commencer :** (1) quels domaines Vercel servent encore ; (2) pour `recruiter-web`, rendre la vérification d'e-mail obligatoire en production (risque de bloquer un compte admin non vérifié : compter d'abord avec `select email from public."user" where role in ('admin','super_admin') and "emailVerified" = false;` sans afficher d'autre donnée) ; (3) l'utilisateur devra télécharger le certificat CA Supabase et le poser sur le VPS (Actions utilisateur).

- [X] **Tâche 23.12 : Règles métier des candidatures** — `lib/application-rules.ts` (seul `WITHDRAWN` autorisé pour l'étudiant), migration `0011_scraped_reports_status.sql` appliquée ×2, routes `applications` (contrôle de transition strict, 400 si non autorisé), `direct-reach` (validation `getStageJob` 404 avant insertion), `scraped-reports` (`requireMobileUser`, rate limit, `status = 'published'`, `source_url` masqué), UI mobile (`withdrawStageApplication`, retrait avec confirmation, suppression du cycle de statut au clic), tests `application-rules.test.mjs` 4/4, `npm test` 154/0 pass, `tsc` ×3 code 0, `lint:colors` 191.
  - **Pourquoi :** un étudiant peut marquer lui-même sa candidature « Acceptée » ou « Entretien », ce qui fausse son suivi et les statistiques ; il peut contacter une entreprise pour une offre expirée ou retirée ; la bibliothèque de rapports est ouverte sans connexion ni limite et expose des liens sources.
  - **État actuel :**
    - `mobile-api/app/api/mobile/stages/applications/route.ts` (41 l.) : `updateSchema` (l.7-10) accepte `PENDING|REVIEWING|INTERVIEW|ACCEPTED|REJECTED` ; `PATCH` (l.27-41) appelle `updateStudentApplicationStatus(studentId, applicationId, status)` (`stages-db.ts` l.401-413, filtre bien `student_id`) sans contrôle de transition.
    - `stages/direct-reach/route.ts` (~100 l.) : requête l.28-41 `… where j.id = $1` sans `j.status = 'published'`, `j.expires_at > now()`, `c.status != 'SUSPENDED'` ; insertion `on conflict … do update` (l.68-75). Le filtre de référence est dans `getStageJob` (`stages-db.ts` l.315-326).
    - `documents/scraped-reports/route.ts` (~130 l.) : pas de `requireMobileUser`, pas de rate limit, pas de filtre de statut ; renvoie `file_url` et `source_url`. La table `scraped_stage_reports` n'a pas de colonne `status` (DDL `scripts/create-scraped-reports-table.mjs` l.37-53). L'app (`src/ui/screens/ScrapedReportsView.tsx`) utilise `file_url` (l.251-254), pas `source_url`, et appelle la route avec session.
    - App : `ApplicationDetailModal.tsx` l.235-239 (cycle `PENDING → REVIEWING → INTERVIEW → ACCEPTED → REJECTED` au clic) ; `ApplicationsTimelineScreen.tsx` l.82-84 (cycle similaire).
    - Copie : `recruiter-web/app/api/mobile/stages/applications/route.ts`.
  - **Fichiers :** créés : `mobile-api/lib/application-rules.ts`, `mobile-api/sql/0011_scraped_reports_status.sql`, `mobile-api/tests/application-rules.test.mjs` ; modifiés : `stages/applications/route.ts`, `stages/direct-reach/route.ts`, `documents/scraped-reports/route.ts`, `mobile-api/lib/stages-db.ts`, `src/features/stages/ApplicationDetailModal.tsx`, `src/ui/screens/ApplicationsTimelineScreen.tsx`, `src/features/stages/stagesApi.ts`, `scripts/agents/database_ingestor.py` (seulement si nécessaire, voir étape 6). Copie si 23.22 n'est pas faite : `recruiter-web/app/api/mobile/stages/applications/route.ts`.
  - **Étapes :**
    1. Obtenir la décision de l'utilisateur sur le « retrait » (voir Dépendances), puis créer `lib/application-rules.ts` (aucun import) : `export const canStudentSetStatus = (current: string, next: string): boolean` selon la décision (option recommandée : seul `next === 'WITHDRAWN'` est permis, depuis `PENDING`, `SENT_PENDING`, `DELIVERED`, `FAILED` ou `REVIEWING`).
    2. `stages/applications/route.ts` PATCH : schéma `{ applicationId: z.string().uuid(), status: z.enum([...valeurs permises à l'étudiant]) }.strict()` ; lire le statut courant (`select status from stage_applications where id = $1 and student_id = $2`) ; introuvable → 404 ; `!canStudentSetStatus(current, next)` → 400 `{ error: 'Seule l\'entreprise ou un administrateur peut changer ce statut.' }`.
    3. Avant de toucher au flux recruteur : chercher qui met `INTERVIEW`/`ACCEPTED`/`REJECTED` aujourd'hui (`grep -rn "INTERVIEW\|ACCEPTED" recruiter-web/app/api/admin mobile-api/app`). Si aucune route admin ne le fait, le noter (le statut ne sera alors modifiable que par la base ou une future route admin) ; ne pas créer de route recruteur dans cette tâche.
    4. `stages/direct-reach/route.ts` : remplacer la requête par `getStageJob(jobId)` (ou ajouter les trois conditions) ; `null` → 404 `{ error: 'Offre de stage indisponible.' }` **avant** l'insertion et la construction des liens.
    5. `0011_scraped_reports_status.sql` : `alter table public.scraped_stage_reports add column if not exists status text not null default 'published';` puis contrainte `scraped_stage_reports_status_check check (status in ('published','pending_review','rejected'))` (drop if exists puis add). Le défaut `published` garde le comportement actuel pour les rapports existants et ceux que le scraper insère. Appliquer deux fois (accord utilisateur).
    6. `scraped-reports/route.ts` : `requireMobileUser` ; `enforceRateLimit` bucket `scraped-reports`, `max: 60`, `windowMs: 60_000`, `userId` ; `where status = 'published'` ajouté aux conditions ; retirer `source_url` du `select` et de la réponse. Si l'utilisateur veut une relecture humaine des nouveaux rapports (question en Dépendances), changer le défaut de la colonne en `pending_review` est une tâche à part (il faut un écran de relecture).
    7. App : `ApplicationDetailModal.tsx` et `ApplicationsTimelineScreen.tsx` : supprimer le cycle de statuts au clic ; afficher le statut en lecture seule et un bouton « Retirer ma candidature » (confirmation « Retirer cette candidature ? L'entreprise ne sera pas prévenue automatiquement. ») selon la décision ; en erreur, `Alert.alert('Erreur', <message serveur>)`.
  - **Tests à écrire :** `mobile-api/tests/application-rules.test.mjs` :
    - `loadTs('lib/application-rules.ts')` : `canStudentSetStatus('PENDING', 'ACCEPTED')` → `false` ; `('PENDING', 'INTERVIEW')` → `false` ; `('PENDING', 'WITHDRAWN')` → `true` (ou la valeur décidée) ; `('ACCEPTED', 'WITHDRAWN')` → `false`.
    - Garde de source : `direct-reach/route.ts` contient `getStageJob(` ou les trois conditions ; `scraped-reports/route.ts` contient `requireMobileUser` et `status = 'published'` et ne contient pas `source_url`.
    - HTTP (`skip` sans serveur ou sans compte E2E) : `PATCH /api/mobile/stages/applications` `{ status: 'ACCEPTED' }` → 400 ; `GET /api/mobile/documents/scraped-reports` sans session → 401.
  - **Vérification (DoD) :** migration 0011 appliquée deux fois sans erreur ; `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` (mobile-api, racine, et recruiter-web si la copie est modifiée) → code 0.
  - **Pièges :**
    - Ajouter une valeur à l'enum `stage_app_status` (`alter type … add value if not exists 'WITHDRAWN'`) ne peut pas s'exécuter dans un bloc de transaction sur certaines versions de Postgres : l'écrire seul dans la migration, hors `do $$`, et vérifier la version (`select version()`).
    - `direct-reach` a des effets de bord (insertion, liens) : le 404 doit venir avant.
    - Le scraper Python écrit dans `scraped_stage_reports` : avec un défaut `published`, il n'a pas besoin d'être modifié.
  - **Dépendances :** 23.1 (`getStageJob` fiable). **À demander à l'utilisateur avant de commencer :** (1) « retirer sa candidature » = nouveau statut `WITHDRAWN` (recommandé : garde l'historique) ou suppression de la ligne ; (2) les nouveaux rapports scrapés doivent-ils être relus avant publication (si oui, tâche supplémentaire).

- [X] **Tâche 23.13 : Un seul assainisseur HTML** — `lib/sanitize-html.ts` enrichi (`stripCodeFence`, balises de structure `section/article/header/footer/main/aside`), copie dans `recruiter-web/lib/sanitize-html.ts`, remplacement de `sanitizeHtmlFragment` dans les 3 routes IA (`generate`, `ai`, `generate-full`) et leurs copies `recruiter-web`, suppression du code mort `buildCvPrompt`/`buildLettrePrompt`, tests `sanitize-images.test.mjs` 7/7 pass, `npm test` 159/0 pass, `tsc` ×3 code 0.
  - **Pourquoi :** trois routes d'IA nettoient le HTML généré avec des expressions régulières maison qui gardent les attributs `style` et `class`, et l'une ne retire aucune balise. Du HTML piégé renvoyé par le modèle peut s'exécuter dans l'éditeur ou l'aperçu de l'étudiant.
  - **État actuel :**
    - Référence : `mobile-api/lib/sanitize-html.ts` (`sanitizeHtml`, l.88-173 : liste blanche de balises l.10-19, attributs `on*` ignorés, `style` filtré par `sanitizeCssStyle`, URL filtrées par `sanitizeUrl`). Déjà utilisé par `documents/[id]/sections/[sectionId]/route.ts` (l.55) et `…/interview/route.ts` (l.166). Testé par `mobile-api/tests/sanitize-images.test.mjs`.
    - Copies locales : `documents/generate/route.ts` l.37-51 (`sanitizeHtmlFragment`, appelée l.257) ; `documents/ai/route.ts` l.47-61 (appelée l.212, l.225) ; `documents/generate-full/route.ts` l.60-67 (ne retire que les balises de bloc de code et `html|body|head`, appelée l.415).
    - Code mort : `buildCvPrompt` (l.53) et `buildLettrePrompt` (l.103) dans `documents/generate/route.ts`, sans appelant.
    - Copies `recruiter-web/app/api/mobile/documents/{ai,generate,generate-full}/route.ts` (mêmes fonctions) ; `recruiter-web/lib` n'a pas `sanitize-html.ts`.
  - **Fichiers :** modifiés : `mobile-api/lib/sanitize-html.ts`, `app/api/mobile/documents/generate/route.ts`, `documents/ai/route.ts`, `documents/generate-full/route.ts`, `mobile-api/tests/sanitize-images.test.mjs` (ou nouveau `sanitize-html.test.mjs`). Copies si 23.22 n'est pas faite : les trois routes de `recruiter-web` + copie de `sanitize-html.ts` dans `recruiter-web/lib/`.
  - **Étapes :**
    1. Dans `sanitize-html.ts`, ajouter `export const stripCodeFence = (raw: string): string` (retire un bloc de code markdown englobant et les balises `<html>`, `<head>`, `<body>`), sur le modèle du pré-traitement actuel de `generate-full`.
    2. Avant de remplacer, lire `lib/academic-stage-template.ts` et `lib/editor-html.ts` (gabarits HTML attendus par l'app) : relever les balises utilisées ; si certaines manquent dans `ALLOWED_TAGS` (`section`, `article`, `header`…), décider de les ajouter à la liste blanche (balises sans risque) et le noter.
    3. Dans les trois routes, `import { sanitizeHtml, stripCodeFence } from '@/lib/sanitize-html'` et remplacer `sanitizeHtmlFragment(x)` par `sanitizeHtml(stripCodeFence(x))` ; supprimer les fonctions locales.
    4. Supprimer `buildCvPrompt` et `buildLettrePrompt` après un grep confirmant l'absence d'appel (`grep -rn "buildCvPrompt\|buildLettrePrompt" mobile-api`).
  - **Tests à écrire :** dans `mobile-api/tests/sanitize-images.test.mjs` (déjà chargé par `loadTs('lib/sanitize-html.ts')`) :
    - `<p onclick="alert(1)">x</p>` → contient `<p>x</p>` sans `onclick`.
    - `<img src="javascript:alert(1)">` → aucun `javascript:`.
    - `<a href="javascript:alert(1)">x</a>` → pas de `href` dangereux.
    - `<script>alert(1)</script><p>ok</p>` → `<p>ok</p>` seul.
    - `<p style="position:fixed;background:url(x)">t</p>` → pas de `url(` ni `position`.
    - `stripCodeFence('```html\n<p>a</p>\n```')` → `'<p>a</p>'`.
  - **Vérification (DoD) :** `grep -rn "sanitizeHtmlFragment\|buildCvPrompt\|buildLettrePrompt" mobile-api/app mobile-api/lib` → aucune ligne ; `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` → code 0.
  - **Pièges :**
    - `sanitizeHtml` garde `<img>` avec une URL `https` : une image externe proposée par l'IA serait conservée ; si ce n'est pas voulu, la retirer dans ces trois routes seulement (option `allowExternalImages: false`), sans changer le comportement des sections.
    - `generate-full` ne filtrait rien : vérifier sur une génération réelle (serveur de dev, compte E2E) que le rendu dans l'éditeur reste correct ; capture `m23-13-generation.png`.
  - **Dépendances :** aucune. Aucune décision utilisateur.

- [X] **Tâche 23.26 : PDF du catalogue toujours gratuits (cours et anciens sujets)**
  - **Pourquoi :** décision du 2026-10-15 : les cours et les anciens sujets restent gratuits même après le lancement gratuit. Aujourd'hui rien ne distingue un cours d'un corrigé, et l'accès au PDF dépend seulement du prix.
  - **État actuel :**
    - Table `documents` (catalogue) : pas de colonne `kind` ni `always_free` (DDL `recruiter-web/scripts/setup-supabase-pdf.mjs` l.59-88 ; `price_coins integer default 0`, `status` en `draft|analyzing|needs_review|published|archived`).
    - Achat : `mobile-api/app/api/mobile/purchase/document/route.ts` : `select id, price_coins … for update` (l.67-72), `price = isFreeLaunch() ? 0 : price_coins` (l.74), wallet, achat, débit et une ligne `app_wallet_transactions` de `-price` même à 0 (l.83-96). `purchase/pack/route.ts` : même logique (l.83).
    - Accès : `pdf/signed-url/route.ts` l.36 et `pdf/stream/route.ts` l.29 : `if (Number(document.price_coins ?? 0) <= 0) return true;`.
    - App : `src/features/pdf/pdfApi.ts` lit `documents` en REST Supabase (`select=*`, l.305 et l.483) et `mapDocumentRow` (l.150-180) ne garde que `price` ; `src/types.ts` `CampusDocument` (l.~110-130) n'a ni `kind` ni `alwaysFree` ; `PdfStudentSection.tsx` : aperçu payant si `price > 0` (l.388), ouverture si `price === 0` (l.453), libellés de prix l.946, 1024, 1179 ; aucun badge « Gratuit » pour un PDF.
    - Admin : `recruiter-web/app/admin/pdf/PdfDashboardClient.tsx` (formulaire `priceCoins` l.376 et l.995-1010) ; API `recruiter-web/app/api/pdf/route.ts` (zod l.33, formData l.150-168) ; écriture `recruiter-web/lib/supabase-pdf.ts` (insert/upsert l.184 et suivantes, liste de colonnes explicite) ; `recruiter-web/lib/course-db.ts` (`updatePdfPrice` l.281-287, mapping).
    - Copies : `recruiter-web/app/api/mobile/purchase/{document,pack}/route.ts`, `pdf/{signed-url,stream}/route.ts`.
  - **Fichiers :** créés : `mobile-api/sql/0009_document_kind.sql`, `mobile-api/lib/purchase-price.ts`, `mobile-api/tests/purchase-price.test.mjs` ; modifiés : `purchase/document/route.ts`, `purchase/pack/route.ts`, `pdf/signed-url/route.ts`, `pdf/stream/route.ts` (mobile-api), `recruiter-web/app/admin/pdf/PdfDashboardClient.tsx`, `recruiter-web/app/api/pdf/route.ts`, `recruiter-web/lib/supabase-pdf.ts`, `recruiter-web/lib/course-db.ts`, `src/types.ts`, `src/features/pdf/pdfApi.ts`, `src/features/pdf/PdfStudentSection.tsx`. Copies si 23.22 n'est pas faite : les 4 routes `recruiter-web/app/api/mobile/{purchase,pdf}/…`.
  - **Étapes :**
    1. `0009_document_kind.sql` (idempotent, sur le modèle de `0005`) : `alter table public.documents add column if not exists kind text not null default 'autre';` ; `alter table public.documents add column if not exists always_free boolean not null default false;` ; contrainte `documents_kind_check check (kind in ('cours','ancien_sujet','corrige','rapport','memoire','autre'))` via bloc `do $$ … pg_constraint`. Pas de reclassement automatique des PDF existants sans la décision de l'utilisateur (voir Dépendances). Appliquer deux fois (accord utilisateur).
    2. `lib/purchase-price.ts` (aucun import) : `export const resolvePurchasePrice = (input: { alwaysFree: boolean; priceCoins: number; freeLaunch: boolean }): number` (0 si `alwaysFree` ou `freeLaunch`, sinon `priceCoins`) et `export const isFreeAccess = (doc: { always_free?: boolean | null; price_coins?: number | string | null }): boolean` (vrai si `always_free` ou prix ≤ 0).
    3. `purchase/document/route.ts` : `select id, price_coins, always_free …` ; `const price = resolvePurchasePrice({ alwaysFree: doc.always_free === true, priceCoins: Number(doc.price_coins), freeLaunch: isFreeLaunch() })` ; si `price === 0` : insérer seulement `app_document_purchases` (montant 0) et incrémenter `sales_count`, **sans** toucher au wallet ni insérer de ligne `app_wallet_transactions` ; sinon logique actuelle.
    4. `purchase/pack/route.ts` : appliquer la décision utilisateur sur les packs (voir Dépendances) ; en attendant, ne rien changer au prix du pack.
    5. `pdf/signed-url/route.ts` et `pdf/stream/route.ts` : ajouter `always_free` au `select` et remplacer la règle par `isFreeAccess(document)`.
    6. Admin : dans le bloc « options avancées » de `PdfDashboardClient.tsx`, ajouter `<select name="kind">` (Cours, Ancien sujet, Corrigé, Rapport, Mémoire, Autre) et une case `alwaysFree`, cochée automatiquement quand on choisit Cours ou Ancien sujet (modifiable) ; quand elle est cochée, le champ prix est désactivé et affiche « Gratuit ». `api/pdf/route.ts` : zod `kind: z.enum([...]).default('autre')`, `alwaysFree: z.coerce.boolean().default(false)` ; `supabase-pdf.ts` : ajouter `kind` et `always_free` aux colonnes de l'insert et de l'upsert ; `course-db.ts` : mapping `kind`/`alwaysFree` et `updatePdfPrice` refuse un prix > 0 sur un document `always_free` (erreur « Ce document est gratuit par nature. »). Utiliser les classes de tokens existantes (`bg-stitch-*`), puis `npm run css:build` dans `recruiter-web`.
    7. App : `CampusDocument` reçoit `kind?: string` et `alwaysFree?: boolean` ; `mapDocumentRow` les lit (`row.kind`, `row.always_free`) ; dans `PdfStudentSection.tsx`, `const isFree = document.price === 0 || document.alwaysFree === true` remplace les tests de prix (l.388, l.453) ; badge `FREE_LABEL` (« Gratuit », `src/config/launch.ts`) à la place du prix (l.946, l.1024) et bouton « Ouvrir » au lieu de « Acheter » (l.1179).
  - **Tests à écrire :** `mobile-api/tests/purchase-price.test.mjs` (`loadTs('lib/purchase-price.ts')`) :
    - `{ alwaysFree: true, priceCoins: 300, freeLaunch: false }` → 0 ; `{ alwaysFree: false, priceCoins: 300, freeLaunch: false }` → 300 ; `{ alwaysFree: false, priceCoins: 300, freeLaunch: true }` → 0.
    - `isFreeAccess({ always_free: true, price_coins: 300 })` → `true` ; `{ always_free: false, price_coins: '0' }` → `true` ; `{ always_free: false, price_coins: 300 }` → `false`.
    - Garde de source : `purchase/document/route.ts` contient `resolvePurchasePrice(` ; `signed-url` et `stream` contiennent `isFreeAccess(`.
    - HTTP (`skip` sans serveur, sans compte E2E ou sans document de test `always_free`) : serveur lancé avec `FREE_LAUNCH_MODE=false`, achat du document de test → 200, solde inchangé (lu avant/après par `GET /api/mobile/account`), puis `signed-url` → 200. Le document de test est créé par l'utilisateur dans l'admin (jamais par le test).
  - **Vérification (DoD) :** migration 0009 appliquée deux fois sans erreur ; `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` (racine, `mobile-api`, `recruiter-web`) → code 0 ; `npm run lint:colors` → pas de hausse ; navigateur : un document `always_free` affiche « Gratuit » dans le catalogue (capture `m23-26-gratuit.png`).
  - **Pièges :**
    - Deux règles de gratuité coexistent (`always_free` et lancement gratuit) : les combiner, ne pas en remplacer une par l'autre.
    - La lecture REST Supabase de l'app passe par la RLS : vérifier après la migration que `kind` et `always_free` arrivent bien dans la réponse (`select=*`).
    - Ne plus écrire de transaction à 0 coin : le bruit comptable disparaît aussi pour les achats en lancement gratuit (c'est voulu, à noter dans la case).
  - **Dépendances :** 23.9 (`isFreeLaunch` fiable). **À demander à l'utilisateur avant de commencer :** (1) faut-il reclasser les PDF déjà publiés (lesquels sont des cours ou des anciens sujets) ou les laisser en `autre` jusqu'à leur relecture dans l'admin ; (2) règle des packs qui contiennent des documents `always_free` (prix du pack inchangé, ou prix recalculé sans ces documents).

### Lot C — Conformité stores et légal

- [X] **Tâche 23.14 : API de suppression de compte**
  - **Pourquoi :** Google Play et l'App Store exigent qu'un utilisateur puisse supprimer son compte et ses données. Aujourd'hui aucune route ne le permet. La loi impose en parallèle de garder une trace des paiements.
  - **État actuel :**
    - `mobile-api/app/api/mobile/account/route.ts` exporte `OPTIONS` (l.10), `GET` (l.53), `PATCH` (l.123) ; pas de `DELETE`. `lib/account-deletion.ts` et le test n'existent pas. Better Auth n'a pas `user.deleteUser` activé (`lib/auth.ts`, `buildBetterAuthConfig` l.152-353).
    - Données liées à un utilisateur (clé `app_users.id` = UUID ; clé Better Auth = `app_users.better_auth_user_id` = `session.user.id`) :
      | Table | Lien | Effet de la suppression de `app_users` aujourd'hui |
      |---|---|---|
      | `app_wallets`, `app_document_purchases`, `app_pack_purchases`, `app_ia_usage_logs`, `app_user_push_tokens`, `app_documents` (→ `app_document_sections`), `app_document_files`, `app_document_chunks`, `app_document_sources`, `app_document_images` | `user_id` / `buyer_id` | `on delete cascade` (supprimées) |
      | `app_wallet_transactions` | `user_id` **NOT NULL**, `on delete cascade` | supprimées : **contraire** à « transactions anonymisées et conservées » |
      | `stage_students` (→ `stage_applications` en cascade) | `app_user_id` (cascade), mais aussi `auth_id` et `email` | une ancienne ligne sans `app_user_id` resterait |
      | `document_events` | `user_id`, `better_auth_user_id`, pas de clé étrangère connue | restent |
      | `app_rate_limits` (seau `user:<id Better Auth>`), `app_login_attempts` (clé hachée) | aucune | restent |
      | Better Auth `user`, `session`, `account`, `verification` (l'e-mail est dans `identifier`) | `session.userId`, `account.userId` | non touchées |
    - Fichiers disque : `app_document_files.storage_key` ; `lib/file-storage.ts` `deleteStoredFile(key)` (l.78-84), `canStoreFiles()` (l.25, faux sur Vercel). Modèle à reprendre : `documents/[id]/route.ts` DELETE (l.141-168 : clés lues avant, fichiers supprimés après la base).
    - WhatsApp : `lib/evolution-api.ts` `getInstanceName` (l.84), `logoutInstance` (l.459-478, renvoie un booléen).
  - **Fichiers :** créés : `mobile-api/sql/0012_account_deletion.sql`, `mobile-api/lib/account-deletion.ts`, `mobile-api/tests/account-deletion.test.mjs` ; modifié : `mobile-api/app/api/mobile/account/route.ts`. Aucune copie dans `recruiter-web` (la suppression n'existe que dans `mobile-api`).
  - **Étapes :**
    1. Lire la base (script de requête) : clés étrangères vers `app_users` et vers `public."user"` (`select conrelid::regclass, conname, pg_get_constraintdef(oid) from pg_constraint where confrelid in ('public.app_users'::regclass, 'public."user"'::regclass);`). Noter dans la case si `session`/`account` sont en cascade et si `document_events` a une clé étrangère.
    2. `0012_account_deletion.sql` (idempotent) : `alter table public.app_wallet_transactions alter column user_id drop not null;` ; `add column if not exists anonymized_at timestamptz` ; bloc `do $$` qui supprime la contrainte de clé étrangère existante de `app_wallet_transactions.user_id` (trouvée dans `pg_constraint`) puis ajoute `app_wallet_transactions_user_id_fkey foreign key (user_id) references public.app_users(id) on delete set null` si elle n'existe pas ; `create table if not exists public.app_account_deletions (id uuid primary key default gen_random_uuid(), deleted_at timestamptz not null default now(), counts jsonb not null default '{}'::jsonb, whatsapp_logout text not null default 'skipped')` (aucune donnée personnelle). Appliquer deux fois (accord utilisateur).
    3. `lib/account-deletion.ts` : `export const ACCOUNT_DELETION_CONFIRM = 'SUPPRIMER';` et `export const deleteAccount = async (input: { appUserId: string; betterAuthUserId: string; email: string }, deps: { pool: Pool; logoutWhatsApp: () => Promise<boolean>; deleteFile: (key: string) => Promise<void>; canStoreFiles: () => boolean }): Promise<{ counts: Record<string, number>; whatsapp: 'ok' | 'failed' | 'skipped' }>`. Ordre :
       a. Avant la transaction : lire `storage_key` de `app_document_files` du compte et le numéro WhatsApp du profil ; appeler `logoutWhatsApp()` si un numéro existe (échec = `failed`, n'empêche pas la suppression, est journalisé).
       b. `begin` ; `update app_wallet_transactions set user_id = null, anonymized_at = now() where user_id = $1` ; `delete from document_events where user_id = $1 or better_auth_user_id = $2` ; `delete from stage_students where app_user_id = $1 or auth_id = $2 or lower(email) = lower($3)` ; `delete from app_rate_limits where bucket = 'user:' || $2 or key in ($1, $2)` ; `delete from app_users where id = $1` (cascade) ; `delete from public."session" where "userId" = $2` ; `delete from public."account" where "userId" = $2` ; `delete from public."verification" where identifier ilike '%' || $3 || '%'` ; `delete from public."user" where id = $2` ; `insert into app_account_deletions (counts, whatsapp_logout) values ($json, $status)` ; `commit`. Compter les lignes de chaque instruction (`rowCount`) dans `counts`.
       c. En cas d'erreur : `rollback`, relancer l'erreur, **aucun** fichier supprimé.
       d. Après `commit` seulement : si `canStoreFiles()`, `Promise.allSettled(keys.map(deleteFile))` ; les fichiers restants seront purgés par `scripts/purge-orphan-uploads.cjs` (23.21).
       Vérifier les noms exacts des colonnes Better Auth (`"userId"` en camelCase) avant d'écrire.
    4. `account/route.ts` : `export async function DELETE(request: NextRequest)` : `requireMobileUser` ; `enforceRateLimit` bucket `account-delete`, `max: 3`, `windowMs: 60 * 60_000`, `userId` ; corps limité à 1 Ko, schéma `z.object({ confirm: z.literal('SUPPRIMER') }).strict()` → sinon 400 `{ error: 'Tape SUPPRIMER pour confirmer la suppression.' }` ; appel `deleteAccount` avec les vraies dépendances ; succès → 200 `{ success: true, whatsapp }` + en-tête `Set-Cookie` qui expire `better-auth.session_token` ; erreur → `mobileErrorResponse`. Ajouter `DELETE` aux méthodes de `OPTIONS` si besoin (déjà présent l.13).
    5. La confirmation par mot de passe n'est pas retenue : la saisie « SUPPRIMER » fonctionne aussi pour les comptes Google sans mot de passe (le plan accepte l'une ou l'autre).
  - **Tests à écrire :** `mobile-api/tests/account-deletion.test.mjs` :
    - Unitaire : `loadTsWithPackages('lib/account-deletion.ts', [<imports relatifs>])` ; faux `pool.connect()` dont le client enregistre chaque requête et renvoie `rowCount: 1`. Vérifier : la 1ʳᵉ requête de la transaction est `begin`, la dernière `commit` ; l'anonymisation des transactions précède `delete from app_users` ; `deleteFile` est appelé après `commit`.
    - Échec : le client lève sur `delete from app_users` → `rollback` est appelé, `deleteFile` n'est jamais appelé, la promesse est rejetée.
    - `logoutWhatsApp` qui renvoie `false` → résultat `whatsapp: 'failed'` et suppression faite.
    - HTTP (`skip` si `E2E_DELETE_EMAIL`/`E2E_DELETE_PASSWORD` ne sont pas définis ; compte jetable créé par l'utilisateur, jamais le compte E2E principal) : connexion, `DELETE /api/mobile/account` `{ confirm: 'SUPPRIMER' }` → 200, puis `GET /api/mobile/account` avec l'ancien jeton → 401 ; `DELETE` avec `{ confirm: 'oui' }` sur un autre compte → 400.
    - Contrôle base après le test HTTP (script de requête) : plus aucune ligne liée à l'ancien `app_users.id` hors `app_wallet_transactions` à `user_id` nul.
  - **Vérification (DoD) :** migration 0012 appliquée deux fois sans erreur ; `grep -n "export async function DELETE" mobile-api/app/api/mobile/account/route.ts` → 1 ligne ; `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` → code 0.
  - **Pièges :**
    - Lire le numéro WhatsApp et les clés de fichiers **avant** de supprimer `app_users`.
    - L'appel Evolution est un appel réseau : jamais dans la transaction.
    - `app_document_purchases` et `app_pack_purchases` sont des droits d'accès, supprimés avec le compte ; la trace financière est dans `app_wallet_transactions` (anonymisée). Le noter dans la page légale (23.16).
    - Ne jamais lancer le test HTTP contre le compte E2E principal : il serait détruit.
  - **Dépendances :** 23.8 (migration 0010 sur la même table, à appliquer avant 0012). Aucune décision utilisateur ; l'utilisateur doit créer le compte jetable `E2E_DELETE_*` pour le test HTTP (Actions utilisateur).

- [X] **Tâche 23.15 : Suppression de compte et liens légaux dans l'app**
  - **Pourquoi :** sans bouton de suppression ni liens vers les CGU et la politique de confidentialité dans l'app, la publication est refusée par Google Play et l'App Store, et l'étudiant ne peut pas exercer ses droits.
  - **État actuel :**
    - Aucune UI de suppression de compte ; aucun lien légal dans `src` ; `EXPO_PUBLIC_LANDING_URL` n'existe nulle part.
    - `src/config/env.ts` : `PublicEnv` (l.12-20), `publicEnv` (l.32-41).
    - `src/ui/screens/ProfileScreen.tsx` : props (l.60-80, dont `onSignOut` l.72) ; menu avec l'entrée `key: 'signout'` (l.284-291, `danger: true`).
    - `src/AppShell.tsx` : `signOutStudent` (l.788-801) remet l'état à zéro ; `src/features/auth/betterAuth.ts` `clearStudentSession()` (l.516-522), `mobileApiFetch` (l.577, vise `mobile-api` en dev comme en prod).
    - `src/ui/screens/AuthScreen.tsx` : mode `sign-up` ; aucun lien légal sous le formulaire.
  - **Fichiers :** modifiés : `src/config/env.ts`, `src/ui/screens/ProfileScreen.tsx`, `src/AppShell.tsx`, `src/ui/screens/AuthScreen.tsx`, `src/features/auth/betterAuth.ts`, `.env.example` (racine), `eas.json` ; créés : `src/features/account/DeleteAccountModal.tsx`, `src/config/legalLinks.ts`.
  - **Étapes :**
    1. `env.ts` : `landingUrl: string` dans `PublicEnv` ; `landingUrl: process.env.EXPO_PUBLIC_LANDING_URL || 'https://campus360b.site'`. Ajouter `EXPO_PUBLIC_LANDING_URL=https://campus360b.site` à `.env.example` et aux `env` des profils `preview` et `production` de `eas.json`.
    2. `src/config/legalLinks.ts` (aucun import RN) : `export const legalLinks = (base: string) => ({ conditions: \`${base}/conditions\`, privacy: \`${base}/confidentialite\`, legal: \`${base}/mentions-legales\`, deletion: \`${base}/suppression-compte\` })` (retirer un `/` final de `base`).
    3. `betterAuth.ts` : `export const deleteStudentAccount = async (): Promise<void>` → `mobileApiFetch('/api/mobile/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'SUPPRIMER' }) })` ; lève l'erreur du serveur telle quelle.
    4. `DeleteAccountModal.tsx` : étape 1 « Supprimer ton compte » avec deux listes : **Supprimé définitivement** (profil, documents et rédactions, sources et images, candidatures et profil de stage, achats de PDF, notifications, liaison WhatsApp) ; **Conservé sans ton nom** (historique des paiements, obligation légale) ; boutons « Annuler » / « Continuer ». Étape 2 : champ « Tape SUPPRIMER pour confirmer », bouton « Supprimer mon compte » actif seulement si la saisie vaut exactement `SUPPRIMER` ; pendant l'appel, indicateur et boutons désactivés ; succès → fermer, `signOutStudent()`, `Alert.alert('Compte supprimé', 'Ton compte et tes données ont été supprimés.')` ; erreur → `Alert.alert('Suppression impossible', error.message)` sans déconnexion. Couleurs `stitchColors` uniquement (le rouge de danger doit venir d'un jeton existant ; vérifier `src/theme/stitch.ts`).
    5. `ProfileScreen.tsx` : nouvelle prop `onDeleteAccount: () => void` ; entrée de menu « Supprimer mon compte » (`danger: true`) sous « Déconnexion » ; section « Informations légales » avec trois liens (Conditions d'utilisation, Confidentialité, Mentions légales) ouverts par `Linking.openURL` (ou `expo-web-browser`, déjà dans `app.json`).
    6. `AppShell.tsx` : état `deleteAccountVisible`, rendu de `DeleteAccountModal`, passage de `onDeleteAccount` au profil.
    7. `AuthScreen.tsx` (mode `sign-up`) : sous le bouton, texte « En créant un compte, tu acceptes les Conditions d'utilisation et la Politique de confidentialité. » avec les deux mentions cliquables.
  - **Tests à écrire :** pas de framework de test côté app. Ajouter à un test existant léger ou à `mobile-api/tests/legal-links.test.mjs` : `loadTs('../src/config/legalLinks.ts')` : `legalLinks('https://campus360b.site/').privacy` → `'https://campus360b.site/confidentialite'`.
  - **Vérification (DoD) :** `npx tsc --noEmit` (racine) → code 0 ; `npm run lint:colors` → pas de hausse ; `cd mobile-api && npm test` → 0 échec ; navigateur (expo-web, 375 px) : profil → « Informations légales » (3 liens qui ouvrent les bonnes pages), « Supprimer mon compte » → 2 étapes, bouton inactif tant que « SUPPRIMER » n'est pas tapé ; écran d'inscription → liens visibles (captures `m23-15-profil-legal.png`, `m23-15-suppression-etape2.png`, `m23-15-inscription.png`). Ne pas valider réellement la suppression sur un compte réel.
  - **Pièges :**
    - Ne pas modifier `storagePrefix` ni les clés `campus-bordes_*` (déconnexion de tous les utilisateurs).
    - `ProfileScreen` expose encore `onPremium` (vestige d'abonnement) : ne pas réintroduire de mention d'abonnement.
    - `authFetch` vise `recruiter-web` en dev tant que 23.22 n'est pas faite : utiliser `mobileApiFetch`.
  - **Dépendances :** 23.14 (route `DELETE`) ; 23.16 (pages cibles, dont `/suppression-compte`). Aucune décision utilisateur.

- [X] **Tâche 23.16 : Pages légales cohérentes avec le produit réel**
  - **Pourquoi :** les pages actuelles décrivent des abonnements Basique/Pro/Elite qui n'existent pas, un hébergement à Francfort qui est faux, une société au capital et au siège inventés, une purge automatique qui n'existe pas, et il manque la page web de suppression de compte exigée par Google Play.
  - **État actuel (`landing-site/`, Next 15) :**
    - `components/legal-page.tsx` : `LegalPage` (l.8-25, date « juillet 2026 » en dur l.19), `LegalSection` (l.27-36).
    - `app/confidentialite/page.tsx` : données incomplètes (pas de téléphone, WhatsApp, établissement, documents, candidatures, jetons push) ; « suppression automatique 30 jours… » (l.31, non implémenté) ; « Supabase (Frankfurt) et Vercel » (l.34, faux).
    - `app/conditions/page.tsx` : éditeur « Campus 360 SAS… Douala, Akwa » (l.17, inventé) ; abonnements Basique/Pro/Elite (l.29).
    - `app/remboursement/page.tsx` : garantie 14 jours sur abonnement (l.17) ; délais à valider (l.19-27).
    - `app/mentions-legales/page.tsx` : capital 1 000 000 FCFA, siège Akwa (l.18-19, inventés) ; directeur de publication « Équipe Campus 360 » (l.21) ; hébergeurs incomplets (l.23-25).
    - `app/compte/page.tsx` l.87 : « Compare Basique, Pro et Elite ».
    - `app/suppression-compte/` n'existe pas ; `app/sitemap.ts` et `components/footer.tsx` à mettre à jour.
    - Sous-traitants réels (d'après le code) : OpenRouter (IA), Notch Pay (paiement), Evolution API sur le VPS (WhatsApp), Resend (e-mail), Supabase (base Postgres, région `eu-north-1`, et stockage d'une partie des PDF), Cloudinary (PDF du catalogue), Expo (notifications, mises à jour), n8n sur le VPS (envoi des candidatures), VPS 164.68.109.206 (API, admin, fichiers ; hébergeur à préciser par l'utilisateur), Vercel (si encore utilisé).
  - **Fichiers :** modifiés : `landing-site/components/legal-page.tsx`, `app/confidentialite/page.tsx`, `app/conditions/page.tsx`, `app/remboursement/page.tsx`, `app/mentions-legales/page.tsx`, `app/compte/page.tsx`, `app/sitemap.ts`, `components/footer.tsx` ; créé : `landing-site/app/suppression-compte/page.tsx`.
  - **Étapes :**
    1. Demander à l'utilisateur les informations d'éditeur (voir Dépendances). Tant qu'elles manquent, écrire `[à compléter]` à leur place : rien n'est inventé.
    2. `legal-page.tsx` : prop `updatedAt: string` (ex. « octobre 2026 ») au lieu de la date en dur ; chaque page la passe.
    3. Confidentialité : sections « Données collectées » (tableau : identité — nom, e-mail ; contact — téléphone, WhatsApp ; parcours — établissement, filière, niveau ; contenus — documents rédigés, sources et images importées ; candidatures — offres, entreprises contactées, CV et lettre ; appareil — jeton de notification ; paiements — montant, opérateur, référence ; techniques — journaux de sécurité), « Finalités », « Durée de conservation » (compte : jusqu'à sa suppression ; paiements : conservés sans nom après suppression du compte ; journaux techniques : durée à confirmer par l'utilisateur), « Sous-traitants » (liste ci-dessus avec le pays quand il est connu, sinon `[à compléter]`), « Tes droits » (accès, rectification, suppression depuis l'app ou la page de suppression), « Contact » (adresse fournie par l'utilisateur). Supprimer « Frankfurt » et la purge à 30 jours.
    4. Conditions : paiement à l'usage, wallet en coins (1 coin = 1 FCFA), 3 000 coins offerts une seule fois à l'inscription, lancement gratuit jusqu'à la date publiée, cours et anciens sujets toujours gratuits, aucun abonnement ; éditeur : informations fournies.
    5. Remboursement : supprimer toute mention d'abonnement ; garder seulement les règles validées par l'utilisateur (recharge non utilisée, PDF non ouvert, délais) ; à défaut, `[à compléter]`.
    6. Mentions légales : raison sociale, forme, RCCM, NIU, capital, siège, directeur de la publication, contact, hébergeurs : valeurs fournies ou `[à compléter]`.
    7. `suppression-compte/page.tsx` (accessible sans connexion) : comment supprimer depuis l'app (Profil > Supprimer mon compte) ; comment demander la suppression sans l'app (adresse e-mail fournie par l'utilisateur, en indiquant l'e-mail du compte) ; ce qui est supprimé et ce qui est conservé (repris de 23.15) ; délai de traitement fourni par l'utilisateur.
    8. `compte/page.tsx` l.87 : retirer la comparaison Basique/Pro/Elite. Ajouter `/suppression-compte` à `sitemap.ts` et au pied de page.
  - **Tests à écrire :** aucun test automatisé (contenu) ; les vérifications ci-dessous suffisent.
  - **Vérification (DoD) :** `cd landing-site && npx tsc --noEmit` → code 0 et `npm run build` (`next build`) → code 0 ; `grep -rniE "Basique|Elite|Frankfurt|1 000 000|Akwa|30 jours" landing-site/app landing-site/components` → aucune ligne (sauf si l'utilisateur fournit lui-même une de ces valeurs) ; navigateur (`npm run dev` dans `landing-site`, 375 px) : les 5 pages s'affichent sans défilement horizontal (captures `m23-16-*.png`).
  - **Pièges :**
    - Ne jamais inventer adresse, capital, RCCM, NIU, nom de responsable ni délai.
    - `privacy@`, `legal@`, `support@campus360b.site` cités aujourd'hui ne sont pas vérifiés : demander quelles adresses existent (la boîte de réception dépend de la tâche 18.7, MX ImprovMX).
  - **Dépendances :** 23.14 et 23.15 (contenu de la page de suppression). **À demander à l'utilisateur avant de commencer :** raison sociale et forme juridique, RCCM, NIU, capital (s'il existe), adresse du siège, nom du directeur de la publication, adresses e-mail de contact réelles, hébergeur du VPS (nom et pays), règles de remboursement et délais, durée de conservation des journaux techniques.

- [X] **Tâche 23.17 : Configuration de build pour les stores**
  - **Pourquoi :** le profil de production produit un APK alors que Google Play exige un AAB, la soumission automatique n'est pas configurée, l'écran de démarrage et le plugin de notifications manquent, les versions divergent, deux projets EAS différents sont cités, et le schéma de lien `campus-bordes` (plus le `campus-360` cassé du lien de réinitialisation) doit devenir `campus360`.
  - **État actuel :**
    - `eas.json` : `build.production.android.buildType = "apk"`, pas d'`autoIncrement` ; `build.preview` en APK (pour le site) ; `submit.production` vide ; les `EXPO_PUBLIC_*` sont dupliqués dans `preview` et `production`.
    - `app.json` : `scheme: "campus-bordes"` (l.5), `version: "1.2.0"` (l.6), pas de `splash`, pas de plugin `expo-notifications` (la dépendance `~0.32.17` est utilisée par `src/AppShell.tsx`), pas de liste de permissions ; `extra.eas.projectId = 49ce85c3-c644-4a6c-a492-2596e5047c74`, `owner = miguelvinijr237` ; `runtimeVersion.policy = appVersion`.
    - `package.json` : `version: "1.0.0"`. `CLAUDE.md` cite un autre projet EAS (`098589af-…`, `campus360s-team`).
    - Usages du **schéma** à changer : `src/features/auth/betterAuth.ts` l.310 (`expoClient({ scheme })`), l.420 et l.445 (`callbackURL: 'campus-bordes://'`), l.548 (`Expo-Origin`) ; `app.json` l.5 ; `mobile-api/lib/auth.ts` l.40 et l.44 (origines) ; `mobile-api/middleware.ts` (liste d'origines et test `startsWith('campus-bordes://')`) ; `mobile-api/lib/origins.ts` si 23.11 est faite (`APP_SCHEMES`) ; `recruiter-web/lib/auth.ts` l.35, l.39 ; `landing-site/lib/auth.ts` l.18, l.24 ; `mobile-api/app/api/mobile/reset-password-redirect/route.ts` l.35 (`campus-360://reset-password`, 3ᵉ schéma, déjà cassé).
    - **À ne pas changer** (clés de stockage) : `storagePrefix: 'campus-bordes'` (`betterAuth.ts` l.311), clés `campus-bordes_session_token`, `campus-bordes_user`, `campus-bordes_better-auth.session_token` (`betterAuth.ts` l.228-234, 343-396, 517-534, 613-623), `campus-bordes.onboarding-seen` et `campus-bordes.intro-seen` (`AppShell.tsx` l.109-110).
  - **Fichiers :** `eas.json`, `app.json`, `package.json`, `CLAUDE.md`, `src/features/auth/betterAuth.ts`, `mobile-api/lib/auth.ts`, `mobile-api/middleware.ts`, `mobile-api/lib/origins.ts` (si présent), `mobile-api/app/api/mobile/reset-password-redirect/route.ts`, `recruiter-web/lib/auth.ts`, `landing-site/lib/auth.ts`, `.github/workflows/eas-android.yml` (commentaire).
  - **Étapes :**
    1. Obtenir les décisions de l'utilisateur (voir Dépendances) avant toute modification d'`app.json`.
    2. `eas.json` : `build.production` → `"android": { "buildType": "app-bundle" }`, `"autoIncrement": true` ; `build.preview` inchangé (APK). `submit.production` → `{ "android": { "serviceAccountKeyPath": "./secrets/play-service-account.json", "track": "internal" } }` ; ajouter `secrets/` à `.gitignore` (le fichier est fourni par l'utilisateur et ne doit jamais être commité).
    3. `app.json` : `scheme: "campus360"` ; `splash: { "image": "./assets/splash-icon.png", "resizeMode": "contain", "backgroundColor": "<couleur de fond de l'icône adaptative déjà dans app.json>" }` ; plugin `["expo-notifications", { "icon": "./assets/android-icon-monochrome.png", "color": "<même couleur>" }]` (vérifier que les fichiers existent dans `assets/`) ; `version` selon la décision utilisateur.
    4. Permissions : lancer `npx expo config --type introspect` et lister les permissions Android finales ; garder celles qui servent (notifications, accès photos via `expo-image-picker` si l'app l'utilise) ; bloquer les autres avec `android.blockedPermissions` ; écrire la justification de chacune dans la note de la case (servira à la fiche « Data safety »).
    5. Schéma : remplacer `campus-bordes://` par `campus360://` aux emplacements listés (sauf clés de stockage). Origines serveur : accepter `campus360://` **et** garder `campus-bordes://` pendant la transition (les APK déjà installés continuent d'envoyer l'ancien `Expo-Origin`) ; noter dans la case qu'on retirera l'ancien schéma quand tous les utilisateurs auront le nouveau build. `reset-password-redirect` : `campus360://reset-password`.
    6. `package.json` : `version` aligné sur `app.json`.
    7. `CLAUDE.md` : corriger la ligne EAS (projectId et owner confirmés) et le schéma.
  - **Tests à écrire :** dans `mobile-api/tests/sessions-origins.test.mjs` (créé en 23.11) : `isTrustedOrigin('campus360://', { NODE_ENV: 'production' })` → `true` ; `'campus-bordes://'` → `true` (transition) ; `'evil://'` → `false`.
  - **Vérification (DoD) :**
    - `npx expo config --type public` → sans erreur ; `npx expo-doctor` → aucun problème bloquant (copier la sortie résumée dans la case).
    - `grep -rn "campus-bordes" src mobile-api/lib mobile-api/app mobile-api/middleware.ts recruiter-web/lib landing-site/lib app.json eas.json` → seulement des clés de stockage (`campus-bordes_`, `campus-bordes.`, `storagePrefix`) et l'origine de transition.
    - `grep -rn "campus-360://" src mobile-api` → aucune ligne.
    - `npx tsc --noEmit` (racine, `mobile-api`, `recruiter-web`, `landing-site`) → code 0 ; `npm test` (mobile-api) → 0 échec.
    - Build de production Android : lancé par l'utilisateur (Actions utilisateur), pas par l'exécutant.
  - **Pièges :**
    - Changer `version` avec `runtimeVersion.policy: appVersion` crée un nouveau runtime : les APK installés ne reçoivent plus les mises à jour OTA de `production` tant qu'ils ne sont pas réinstallés.
    - Le schéma est intégré au binaire : il faut un nouveau build natif, une mise à jour OTA ne suffit pas.
    - Le `callbackURL` Google OAuth doit être déclaré dans la console Google Cloud (Actions utilisateur), sinon la connexion Google échoue.
    - Ne jamais commiter `secrets/play-service-account.json`.
  - **Dépendances :** 23.11 (liste d'origines unique). **À demander à l'utilisateur avant de commencer :** (1) quel projet EAS est le bon (`49ce85c3…` / `miguelvinijr237` ou `098589af…` / `campus360s-team`) ; (2) la version de l'app pour les stores (garder `1.2.0` et aligner `package.json`, ou autre) en sachant l'effet sur les mises à jour OTA ; (3) la piste Play Console visée (`internal` par défaut).

### Lot D — Exploitation et release

- [X] **Tâche 23.18 : Variables d'environnement vérifiées au démarrage** - validée le 2026-10-20 : `mobile-api/lib/env-check.ts` (nouveau), `mobile-api/instrumentation.ts` (nouveau hook Next 15 startup), `mobile-api/.env.example` restructuré en 11 sections sans fuite de secrets, `mobile-api/tests/env-check.test.mjs` 6/6 pass, `next build` validé 35/35 pages, rejet du démarrage certifié sans secret dans le message d'erreur, npm test 177/0 pass, tsc code 0.
  - **Pourquoi :** aujourd'hui, si une variable critique manque en production, le serveur démarre quand même : l'authentification est morte (secret absent), tout devient gratuit (mode gratuit absent) ou les fichiers ne sont pas signés, et on ne le découvre qu'avec les plaintes des étudiants.
  - **État actuel :**
    - `mobile-api/instrumentation.ts` et `mobile-api/lib/env-check.ts` n'existent pas.
    - `mobile-api/.env.example` (suivi par git) ne contient que : `ADMIN_ALERT_EMAIL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`, `DATABASE_SSL_REJECT_UNAUTHORIZED`, `DATABASE_URL`, `MAIL_FROM`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`.
    - Variables lues par le code et absentes de `.env.example` : `FREE_LAUNCH_MODE`, `FILES_SIGNING_SECRET`, `FILES_PUBLIC_URL`, `UPLOAD_ROOT` (`lib/file-storage.ts` l.20), `NOTCHPAY_PRIVATE_KEY`, `NOTCHPAY_WEBHOOK_SECRET`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `N8N_INGESTION_SECRET`, `N8N_STAGE_WEBHOOK_URL`, `STAGES_REVIEW_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_ALLOWED_EMAILS`, `ADMIN_BOOTSTRAP_EMAIL`, `EXPO_APP_ORIGIN`, `TRUSTED_EXTRA_ORIGINS`, `CORS_ALLOWED_ORIGINS`, `PUPPETEER_EXECUTABLE_PATH`, `CHROME_BIN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_KEY` ; plus celles ajoutées par ce module (`FREE_LAUNCH_UNTIL`, `STARTING_COINS`, `AI_DAILY_LIMIT`, `TRUST_PROXY`, `DATABASE_SSL_CA_FILE`, `HEALTH_PDF_SECRET`).
    - `BETTER_AUTH_SECRET` absent en production : `buildBetterAuthConfig` lève, l'erreur est avalée (`lib/auth.ts` l.365-373) et `auth` devient un Proxy qui échoue à l'usage.
    - `next.config.ts` : pas d'option `instrumentation` (inutile en Next 15, le fichier racine suffit).
  - **Fichiers :** créés : `mobile-api/lib/env-check.ts`, `mobile-api/instrumentation.ts`, `mobile-api/tests/env-check.test.mjs` ; modifié : `mobile-api/.env.example`.
  - **Étapes :**
    1. Lister toutes les variables lues : `grep -rhoE "process\.env\.[A-Z0-9_]+" mobile-api/app mobile-api/lib mobile-api/middleware.ts | sort -u` ; comparer avec `.env.example`.
    2. `lib/env-check.ts` (aucun import) : `export const missingProductionEnv = (env: Record<string, string | undefined>): string[]` qui renvoie les **noms** manquants ou invalides parmi : `BETTER_AUTH_SECRET` (au moins 32 caractères), `BETTER_AUTH_URL`, `DATABASE_URL`, `FREE_LAUNCH_MODE` (exactement `true` ou `false`), `FREE_LAUNCH_UNTIL` (si `FREE_LAUNCH_MODE=true`, date ISO), `FILES_SIGNING_SECRET`, `UPLOAD_ROOT` (sauf si `VERCEL` est défini), `OPENROUTER_API_KEY`, `RESEND_API_KEY`, `NOTCHPAY_PRIVATE_KEY` et `NOTCHPAY_WEBHOOK_SECRET` (sauf si `PAYMENTS_ENABLED=false`, nouvelle variable explicite). `export const assertProductionEnv = (env) => { if (env.NODE_ENV !== 'production') return; const missing = missingProductionEnv(env); if (missing.length) throw new Error(\`Variables d'environnement manquantes ou invalides : ${missing.join(', ')}\`); }`. Ne jamais inclure de valeur dans le message.
    3. `mobile-api/instrumentation.ts` (racine du projet, pas dans `app/`) : `export async function register() { if (process.env.NEXT_RUNTIME !== 'nodejs') return; const { assertProductionEnv } = await import('./lib/env-check'); assertProductionEnv(process.env); }`.
    4. Vérifier que `next build` sans variables passe (le hook ne s'exécute qu'au démarrage du serveur) : `cd mobile-api && npm run build` dans un shell où `NODE_ENV=production` et sans `.env` de prod… si le build lit `.env.local`, renommer temporairement n'est pas autorisé : à la place, lancer `npx next build` et constater qu'aucune erreur `Variables d'environnement manquantes` n'apparaît.
    5. Démarrage refusé : `NODE_ENV=production npx next start -p 3013` avec une variable critique absente (dans un shell dédié, par exemple sans `FREE_LAUNCH_MODE`) → le processus s'arrête avec le message listant le nom. Arrêter le processus ensuite.
    6. `.env.example` : ajouter toutes les variables manquantes, regroupées par service (Base, Auth, Fichiers, IA, Paiement, WhatsApp, n8n, Admin, PDF, Lancement), valeurs vides ou factices explicites (`<à remplir>`), une ligne de commentaire en français par variable. Aucune vraie valeur. `PAYMENTS_ENABLED=true` (commentaire : « false pour désactiver le paiement ; les clés Notch ne sont alors plus exigées »).
  - **Tests à écrire :** `mobile-api/tests/env-check.test.mjs` (`loadTs('lib/env-check.ts')`) :
    - environnement complet valide → `[]`.
    - sans `FREE_LAUNCH_MODE` → contient `'FREE_LAUNCH_MODE'` ; `FREE_LAUNCH_MODE: 'oui'` → contient `'FREE_LAUNCH_MODE'`.
    - `VERCEL: '1'` sans `UPLOAD_ROOT` → ne contient pas `'UPLOAD_ROOT'`.
    - `PAYMENTS_ENABLED: 'false'` sans clés Notch → ne les contient pas.
    - `assertProductionEnv({ NODE_ENV: 'production' })` → lève une erreur dont le message contient `BETTER_AUTH_SECRET` et aucune valeur ; `NODE_ENV: 'development'` → ne lève pas.
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` → code 0 ; étape 5 constatée (message copié sans valeur dans la case) ; chaque nom sorti par la commande de l'étape 1 figure dans `.env.example` (hors variables de test `BASE_URL`, `TEST_*`, `E2E_*`).
  - **Pièges :**
    - Ne pas exiger `UPLOAD_ROOT` sur Vercel (`canStoreFiles()` y est faux).
    - Les variables Google sont optionnelles (connexion Google activée seulement si elles sont présentes) : ne pas les exiger.
    - Avant de déployer ce contrôle, vérifier avec l'utilisateur que toutes les variables exigées sont posées sur le VPS (Actions utilisateur), sinon le serveur de production ne redémarrera plus.
  - **Dépendances :** 23.9 (`FREE_LAUNCH_*`), 23.11 et 23.20 (nouvelles variables). Aucune décision utilisateur pour le code ; vérification des variables du VPS par l'utilisateur avant déploiement.

- [X] **Tâche 23.19 : Migrations versionnées et appliquées au déploiement** - validée le 2026-10-20 : `mobile-api/sql/0000_baseline.sql` (schéma de base complet idempotent, extensions, types enum, tables Better Auth, catalogue, app_users, app_wallets default 0, tables de stages), `mobile-api/scripts/migrate.mjs` (runner sécurisé, table public.schema_migrations avec checksums SHA-256, flag --dry-run et --help, transactions isolées sauf header -- migrate:no-transaction), script `"migrate": "node scripts/migrate.mjs"` dans `mobile-api/package.json`, DDL dynamique supprimé de `documents-db.ts`, `login-throttle.ts` et `rate-limit.ts` (grep create table dans lib vide), `scripts/deploy-vps.sh` intègre npm run migrate avant build, tests unitaires `migrate.test.mjs` 4/4 pass (1 skip), npm test 182/0 pass, tsc ×3 code 0, bash -n deploy-vps.sh code 0.
  - **Pourquoi :** une base vide ne peut pas être reconstruite avec le dépôt (les tables de base sont créées par des scripts épars et par le code au moment des requêtes), on ne sait pas quelles migrations ont été appliquées en production, et le déploiement n'applique rien : un nouveau code peut tourner sur un ancien schéma.
  - **État actuel :**
    - `mobile-api/sql/` : `0004` à `0008` (+ celles de ce module : `0009` à `0012`, et `0013` en 24.3). Aucun `0000_baseline.sql`, aucun `scripts/migrate.mjs`, aucune table `schema_migrations`, pas de script `migrate` dans `mobile-api/package.json`.
    - DDL hors migrations à reprendre : `recruiter-web/scripts/setup-better-auth-mobile.mjs` (l.20-155 : `app_users`, `app_wallets` (défaut 5 000), `app_document_purchases`, `app_pack_purchases`, `app_wallet_transactions`, `app_ia_usage_logs`, `app_user_push_tokens`, `app_documents`, `app_document_sections`, colonnes ajoutées à `public."user"`) ; `scripts/create-backend-files.js` (l.116-200) et `docs/STAGES_SUPABASE.sql` (types `company_status`, `apply_method`, `job_source`, `stage_app_status` ; tables `stage_students`, `stage_companies`, `stage_jobs`, `stage_applications`) ; `scripts/create-scraped-reports-table.mjs` (l.37-53) ; `scripts/check-and-update-supabase-whatsapp.mjs` (l.47, colonnes WhatsApp de `stage_students`) ; `recruiter-web/scripts/setup-supabase-pdf.mjs` (`documents`, `pdf_packs`, `pdf_pack_items`, tables legacy `profiles`, `wallets`…) ; tables Better Auth (`recruiter-web/lib/auth-schema.ts` l.7-52 + champs des plugins).
    - DDL exécuté par le code : `mobile-api/lib/documents-db.ts` `ensureDocumentAuxiliaryTables` (l.423-460 : `app_document_sources`, `app_document_images`), `lib/login-throttle.ts` (l.36-47 : `app_login_attempts`), `lib/rate-limit.ts` (l.50-62 : `app_rate_limits`).
    - `scripts/run-sql.cjs` : applique un fichier à la main, sans suivi. `scripts/deploy-vps.sh` (65 l.) : `git reset --hard origin/main`, puis par service `npm ci`, `npm run build`, `pm2 restart` ; aucune migration.
  - **Fichiers :** créés : `mobile-api/sql/0000_baseline.sql`, `mobile-api/scripts/migrate.mjs`, `mobile-api/tests/migrate.test.mjs` ; modifiés : `mobile-api/package.json` (script `migrate`), `scripts/deploy-vps.sh`, `mobile-api/lib/documents-db.ts`, `lib/login-throttle.ts`, `lib/rate-limit.ts`.
  - **Étapes :**
    1. Instantané du schéma réel (lecture seule, script de requête) : pour chaque table citée ci-dessus, lire `information_schema.columns` (nom, type, défaut, nullabilité), `pg_constraint` (clés, CHECK, clés étrangères) et `pg_indexes`. Enregistrer la sortie dans le scratchpad (jamais dans le dépôt : elle peut contenir des noms de rôles).
    2. Écrire `0000_baseline.sql` à partir de cet instantané : `create extension if not exists pgcrypto;` ; types enum dans des blocs `do $$ begin create type … ; exception when duplicate_object then null; end $$;` ; `create table if not exists` pour toutes les tables (Better Auth comprises : `user`, `session`, `account`, `verification`, avec les champs ajoutés par les plugins `admin` et les champs `role`, `phone`, `whatsappPhone`, `university`, `faculty`, `level`) ; `add column if not exists` pour les colonnes ajoutées après coup ; index `if not exists`. `app_wallets.balance_coins` : `default 0` (le code écrit la valeur de `STARTING_COINS`). Ne rien mettre que les migrations `0004`-`0013` ajoutent déjà (le baseline représente l'état d'avant `0004`, plus les tables jamais migrées).
    3. `mobile-api/scripts/migrate.mjs` (Node, `pg`) : lit `DATABASE_URL` dans l'environnement, sinon dans `mobile-api/.env.production` puis `.env.local` (même méthode que `scripts/run-sql.cjs`, sans jamais afficher la valeur) ; crée `public.schema_migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())` ; lit `sql/*.sql` triés par nom ; pour chaque fichier absent de la table : exécution dans une transaction (`begin` / `commit`, `rollback` et arrêt avec code 1 en cas d'erreur), sauf si la première ligne du fichier est `-- migrate:no-transaction` (pour `alter type … add value`) ; insère `name` + SHA-256 du contenu. Pour un fichier déjà appliqué dont le SHA-256 a changé : arrêt avec le message « La migration <nom> a été modifiée après application. Crée une nouvelle migration. ». Affiche `appliquée : <nom>` ou `déjà appliquée : <nom>`. Option `--dry-run` qui liste sans appliquer.
    4. `mobile-api/package.json` : `"migrate": "node scripts/migrate.mjs"`.
    5. Supprimer le DDL du code : `ensureDocumentAuxiliaryTables` (et ses appels), les `ensureTable` de `login-throttle.ts` et `rate-limit.ts` ; s'assurer que ces tables sont dans le baseline.
    6. `scripts/deploy-vps.sh`, bloc mobile-api : après `npm ci` et **avant** `npm run build` et `pm2 restart`, ajouter `npm run migrate`. Avec `set -e`, un échec arrête le déploiement avant le redémarrage.
    7. Première exécution en production : action de l'utilisateur, après une sauvegarde (23.21). Comme toutes les migrations sont idempotentes, la première exécution rejoue `0000` à `0013` sans rien casser et remplit `schema_migrations`.
  - **Tests à écrire :** `mobile-api/tests/migrate.test.mjs` :
    - Sans base : garde de source sur chaque fichier `sql/*.sql` : aucun `create table ` sans `if not exists`, aucun `add column ` sans `if not exists`, aucun `create type` hors bloc `exception when duplicate_object`.
    - Avec base de test (`skip` si `MIGRATE_TEST_DATABASE_URL` n'est pas défini) : lancer `node scripts/migrate.mjs` avec `DATABASE_URL=$MIGRATE_TEST_DATABASE_URL` deux fois ; 1ʳᵉ fois code 0 ; 2ᵉ fois code 0 et uniquement des lignes `déjà appliquée`.
  - **Vérification (DoD) :** `grep -rniE "create table" mobile-api/lib` → aucune ligne ; `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` → code 0 ; sur la base de test vide fournie par l'utilisateur, `npm run migrate` deux fois → 0 erreur, 2ᵉ passage sans changement (sortie copiée dans la case) ; `bash -n scripts/deploy-vps.sh` → code 0.
  - **Pièges :**
    - Ne **jamais** lancer `npm run migrate` sur la base de `.env.local` (base partagée de production) sans l'accord de l'utilisateur et sans sauvegarde.
    - Le baseline ne doit rien supprimer ni modifier sur une base existante : uniquement des créations conditionnelles.
    - `alter type … add value` ne passe pas dans une transaction sur toutes les versions : utiliser l'en-tête `-- migrate:no-transaction`.
    - Un rollback de code (23.21) ne défait pas une migration : n'écrire que des migrations additives.
    - `deploy-vps.sh` fait `git reset --hard` : un fichier SQL non commité sur le VPS n'est pas appliqué.
  - **Dépendances :** 23.8, 23.12, 23.14, 23.26 (migrations 0009-0012 écrites). **À demander à l'utilisateur :** une base PostgreSQL vide de test (`MIGRATE_TEST_DATABASE_URL`) pour la DoD, et l'accord pour la première exécution en production.

- [X] **Tâche 23.20 : Export PDF opérationnel sur le VPS** - validée le 2026-10-20 : `mobile-api/lib/health-secret.ts` (validation timing-safe), route `mobile-api/app/api/health/pdf/route.ts` (GET protégé par secret avec timeout 10s et code 503 sans fuite d'erreur technique), `scripts/deploy-vps.sh` (installation automatique de Chromium si absent et sonde health check PDF après redémarrage PM2), `mobile-api/.env.example` synchronisé (`HEALTH_PDF_SECRET`), tests unitaires `health-pdf.test.mjs` 2/2 pass (1 skip live), npm test 185/0 pass, tsc ×3 code 0, bash -n deploy-vps.sh code 0.
  - **Pourquoi :** l'export PDF d'un rapport a besoin d'un navigateur Chromium sur le serveur. Rien ne garantit qu'il est installé sur le VPS, rien ne le vérifie, et si `api.campus360b.site` pointe vers Vercel (qui n'a pas Chrome), tous les exports échouent.
  - **État actuel :**
    - `mobile-api/lib/pdf-render.ts` (99 l.) : `SYSTEM_BROWSERS` (l.12-23 : `PUPPETEER_EXECUTABLE_PATH`, `CHROME_BIN`, chemins Windows, `/usr/bin/google-chrome-stable`, `/usr/bin/chromium-browser`, `/usr/bin/chromium`…) ; `renderWithPuppeteer` (l.35-61, `puppeteer.executablePath()` puis navigateur système, réseau bloqué sauf `data:`) ; `renderWithCli` (l.63-90) ; `renderHtmlToPdf(html)` (l.92-99). Dépendance `puppeteer ^25.1.0` (télécharge Chrome dans `~/.cache/puppeteer` à l'installation).
    - Aucune route `app/api/health/pdf`. `scripts/deploy-vps.sh` n'installe ni ne vérifie Chromium.
    - Deux déploiements du même code : `.github/workflows/vercel-mobile-api.yml` (Vercel `--prod`) et `deploy-vps.yml` (VPS). D'après `contexte.md` §6.5, Nginx sur le VPS sert `api.campus360b.site` → `127.0.0.1:3002`.
    - `scripts/test-chrome-pdf.cjs` existe (à lire avant usage).
  - **Fichiers :** créés : `mobile-api/app/api/health/pdf/route.ts`, `mobile-api/lib/health-secret.ts`, `mobile-api/tests/health-pdf.test.mjs` ; modifiés : `scripts/deploy-vps.sh`, `mobile-api/.env.example`, éventuellement `.github/workflows/vercel-mobile-api.yml` (voir Dépendances).
  - **Étapes :**
    1. Faire vérifier par l'utilisateur où pointe `api.campus360b.site` (`nslookup api.campus360b.site` : l'adresse attendue est celle du VPS, 164.68.109.206). Si c'est le VPS, proposer de retirer le déploiement Vercel de production de `mobile-api` (passer `vercel-mobile-api.yml` en `workflow_dispatch` seul) ; ne rien changer sans accord.
    2. `lib/health-secret.ts` (seul import `node:crypto`) : `export const isValidHealthSecret = (provided: string | null, expected: string | undefined): boolean` (faux si `expected` est vide ; comparaison `timingSafeEqual` après contrôle des longueurs).
    3. `app/api/health/pdf/route.ts` (`export const runtime = 'nodejs'`) : GET ; `x-health-secret` comparé à `HEALTH_PDF_SECRET` → sinon 401 `{ error: 'Non autorisé.' }` ; rend `<html><body><h1>Campus 360</h1><p>Test PDF</p></body></html>` avec `renderHtmlToPdf` ; succès → 200, `Content-Type: application/pdf`, `Cache-Control: no-store` ; échec → 503 `{ error: 'Moteur PDF indisponible.' }` (message technique seulement dans `console.error`). Pas de rate limit nécessaire (secret), mais refuser après 10 s de rendu.
    4. `scripts/deploy-vps.sh`, bloc mobile-api, après `npm ci` : `CHROME=$(node -e "import('puppeteer').then(p => process.stdout.write(p.default.executablePath()))")` ; si `[ ! -x "$CHROME" ]`, lancer `npx puppeteer browsers install chrome` puis recalculer ; si toujours absent, `echo "Chromium introuvable : export PDF impossible." && exit 1`. Puis `"$CHROME" --version`.
    5. Après `pm2 restart campus360-mobile-api`, si `HEALTH_PDF_SECRET` est défini dans l'environnement du script, `curl -fsS -o /dev/null -H "x-health-secret: $HEALTH_PDF_SECRET" http://127.0.0.1:3002/api/health/pdf` ; échec → message et code 1 (le retour arrière automatique est ajouté en 23.21).
    6. `.env.example` : `HEALTH_PDF_SECRET=` et `PUPPETEER_EXECUTABLE_PATH=` (commentaire : « laisser vide pour utiliser le Chrome téléchargé par Puppeteer »).
  - **Tests à écrire :** `mobile-api/tests/health-pdf.test.mjs` : `loadTs('lib/health-secret.ts')` : bon secret → `true` ; mauvais → `false` ; `expected` vide → `false` ; HTTP (`skip` sans serveur ou sans `HEALTH_PDF_SECRET` dans l'environnement du test) : sans en-tête → 401 ; avec en-tête → 200 et `content-type` `application/pdf`, corps commençant par `%PDF-`.
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` → code 0 ; `bash -n scripts/deploy-vps.sh` → code 0 ; sur le VPS (action utilisateur, après déploiement) : `curl -sS -o /tmp/test.pdf -w "%{http_code} %{content_type}\n" -H "x-health-secret: <secret>" https://api.campus360b.site/api/health/pdf` → `200 application/pdf` ; export réel d'un rapport depuis l'app (garde, sommaire, numéros de page) téléchargé et ouvert par l'utilisateur.
  - **Pièges :**
    - Sur Ubuntu, Chrome peut manquer de bibliothèques système : `ldd "$CHROME" | grep "not found"` liste ce qu'il faut installer (action utilisateur avec `apt`).
    - `--no-sandbox` reste nécessaire si pm2 tourne en root (cas actuel, journaux dans `/root/.pm2/logs/`).
    - Le réseau est bloqué pendant le rendu : les images doivent être en `data:` (c'est déjà le cas pour les exports).
    - `npm ci` lancé par root télécharge Chrome dans `/root/.cache/puppeteer` : le processus pm2 doit tourner sous le même utilisateur.
  - **Dépendances :** 23.18 (variable `HEALTH_PDF_SECRET` documentée). **À demander à l'utilisateur :** confirmer que `api.campus360b.site` pointe vers le VPS et décider du sort du déploiement Vercel de `mobile-api` ; poser `HEALTH_PDF_SECRET` sur le VPS.

- [X] **Tâche 23.21 : Sauvegardes, surveillance et rollback** - validée le 2026-10-20 : `scripts/backup-db.sh` (sauvegarde custom pg_dump avec rotation 7j quotidiens / 28j hebdomadaires), `scripts/backup-uploads.sh` (archive tar.gz uploads avec rotation identique), `scripts/purge-orphan-uploads.cjs` (plafond de sécurité --max-delete 200 et seuil 20%), `scripts/deploy-vps.sh` (mémorisation PREV_SHA, health check curl 5x5s et rollback automatique en cas d'échec vers PREV_SHA sans rollback SQL), `docs/deploy/OPERATIONS.md` (guide exhaustif sauvegardes, restauration, rollback, purge et sonde), `docs/deploy/FILES_HOST.md` aligné, bash -n code 0 sur les 3 scripts, test purge seuil d'avortement certifié code 1.
  - **Pourquoi :** il n'existe aucune sauvegarde de la base, les fichiers ne sont gardés que 14 jours, la restauration n'a jamais été testée, un déploiement cassé laisse le service en panne sans retour arrière, et personne n'est prévenu quand l'API tombe.
  - **État actuel :**
    - `scripts/backup-db.sh`, `scripts/backup-uploads.sh`, `docs/deploy/OPERATIONS.md` : absents.
    - `docs/deploy/FILES_HOST.md` §5 : cron de purge à 3 h et archive `tar` de `UPLOAD_ROOT` à 3 h 30 dans `/var/backups/campus360-uploads-*.tgz`, rétention 14 jours ; aucun `pg_dump`.
    - `scripts/purge-orphan-uploads.cjs` : `--dry-run` existe (l.7-11), garde les fichiers de moins d'une heure (`MIN_AGE_MS`, l.10), sans plafond de suppression.
    - `scripts/deploy-vps.sh` : pas de mémorisation de la version précédente, pas de contrôle de santé, pas de retour arrière.
    - `.github/workflows/vercel-mobile-api.yml` vérifie `/api/health`, qui renvoyait 200 même base en panne (corrigé en 23.6).
  - **Fichiers :** créés : `scripts/backup-db.sh`, `scripts/backup-uploads.sh`, `docs/deploy/OPERATIONS.md` ; modifiés : `scripts/deploy-vps.sh`, `scripts/purge-orphan-uploads.cjs`, `docs/deploy/FILES_HOST.md`.
  - **Étapes :**
    1. `scripts/backup-db.sh` (`set -euo pipefail`) : lit `DATABASE_URL` dans l'environnement ou dans `/opt/campus-360/mobile-api/.env.production` sans l'afficher ; `pg_dump --format=custom --no-owner "$DATABASE_URL" -f "$DIR/daily/campus360-db-$(date +%Y%m%d).dump"` avec `DIR=${BACKUP_DIR:-/var/backups/campus360/db}` ; le dimanche, copie dans `weekly/` ; rotation : `find daily -mtime +7 -delete`, `find weekly -mtime +28 -delete` ; échec → code 1 et message.
    2. `scripts/backup-uploads.sh` : même structure, `tar -czf` de `UPLOAD_ROOT` vers `/var/backups/campus360/uploads/{daily,weekly}`, même rotation.
    3. `scripts/purge-orphan-uploads.cjs` : option `--max-delete <n>` (défaut 200) ; si plus de `n` fichiers seraient supprimés, ou plus de 20 % du total, s'arrêter avec code 1 sauf `--force`.
    4. `scripts/deploy-vps.sh` : avant `git reset --hard`, `PREV_SHA=$(git rev-parse HEAD)` et l'écrire dans `/var/lib/campus360/last-good-sha` seulement après un déploiement réussi ; après chaque `pm2 restart`, contrôle de santé (`curl -fsS` sur `http://127.0.0.1:3002/api/health`, `:3001/` et `:3000/`, 5 essais espacés de 5 s) ; en échec : `git reset --hard "$PREV_SHA"`, puis `npm ci`, `npm run build`, `pm2 restart` des services touchés, puis `exit 1` avec « Déploiement annulé : retour à <sha court>. ». Ne jamais défaire une migration.
    5. `docs/deploy/OPERATIONS.md` : sauvegarde (commandes, cron proposé `15 2 * * *` pour la base, `30 3 * * *` pour les fichiers), restauration testée (`createdb` de test, `pg_restore --clean --if-exists --no-owner -d <base de test> <fichier>`, contrôle par `select count(*)` sur `app_users`, `app_documents`, `app_wallet_transactions`), retour arrière manuel (`git reset --hard <sha>` + rebuild), purge (`--dry-run` d'abord), sonde externe (service de surveillance choisi par l'utilisateur qui interroge `https://api.campus360b.site/api/health` toutes les 5 minutes et alerte par e-mail sur un code autre que 200).
    6. `FILES_HOST.md` : aligner la rétention sur 7 jours + 4 semaines et renvoyer vers `OPERATIONS.md`.
  - **Tests à écrire :** pas de test Node ; contrôles de syntaxe et essais sur base de test (Vérification).
  - **Vérification (DoD) :** `bash -n scripts/backup-db.sh scripts/backup-uploads.sh scripts/deploy-vps.sh` → code 0 ; `node scripts/purge-orphan-uploads.cjs --dry-run --max-delete 0` → code 1 si au moins un orphelin est détecté (sinon code 0, noter le résultat) ; sur le VPS, par l'utilisateur : une sauvegarde produite puis restaurée sur une base de test (comptages identiques à la source) ; déploiement volontairement cassé (branche de test avec une erreur de build, avec accord) → le service reste sur l'ancienne version et le script sort en code 1.
  - **Pièges :**
    - `pg_dump` doit être de la même version majeure que le serveur ou plus récent (`select version()`) : installation du client à faire par l'utilisateur.
    - Ne jamais écrire `DATABASE_URL` dans un log ni dans un nom de fichier.
    - Le retour arrière reconstruit l'ancienne version (plusieurs minutes) : prévenir l'utilisateur de la durée.
    - Les sauvegardes contiennent des données personnelles : dossier lisible par root seulement (`chmod 700`).
  - **Dépendances :** 23.6 (santé honnête), 23.19 (migrations au déploiement). **À demander à l'utilisateur :** le service de surveillance externe à utiliser, une base de test pour la restauration, et l'accord pour le test de déploiement cassé.

- [X] **Tâche 23.22 : Fin du doublon recruiter-web** — validée le 2026-10-20 : src/features/auth/betterAuth.ts avec baseUrlFor(path) routant /api/mobile/ et /api/ai/ vers mobileApiBaseUrl, authFetchRawAt utilisé par authFetchRaw ; metro.config.js avec DEV_AUTH_PORT=3001 et DEV_MOBILE_API_PORT=3002 ; recruiter-web/app/api/admin/auth-capabilities créé et LoginClient.tsx mis à jour ; suppression complète de recruiter-web/app/api/mobile/ (25 routes) et recruiter-web/app/api/ai/ ; suppression des 15 libs orphelines dans recruiter-web/lib/ (dont documents-db.ts avec guest-student) ; suppression de guest-student de tout le code source (0 occurrences) ; suppression de Rédactions dans NAV_GROUPS de layout.tsx ; middleware.ts nettoyé ; pdf-viewer.html mis à jour avec api parameter ; tests mobile-api/tests/app-routing.test.mjs (3/3) et suite complète 170/170 passés ; tsc racine 0, tsc recruiter-web 0, build recruiter-web 0 (20/20 pages).
  - **Pourquoi :** en développement, l'app envoie une partie de ses appels à des copies anciennes et divergentes des routes dans `recruiter-web`, et d'autres à `mobile-api` : les corrections de ce module ne s'appliquent qu'à moitié, et ces copies restent joignables en production (`admin.campus360b.site/api/mobile/...`) sans quota ni durcissement.
  - **État actuel :**
    - `recruiter-web/app/api/mobile/` contient 25 routes, toutes présentes aussi dans `mobile-api/app/api/mobile/` (qui en a 45 : les 20 autres n'existent que là, dont `stages/dispatch`, `payments/*`, `whatsapp/instance`, `onboarding/complete`, `notifications/register`, `documents/defense-coach`, `documents/scraped-reports`).
    - App (`src/features/auth/betterAuth.ts`) : `authFetch`/`authFetchRaw` visent `authBaseUrl` (en dev `http://<IP LAN>:3001` = recruiter-web, en prod `https://api.campus360b.site`) ; `getMobileApiBaseUrl()` (l.~192-210) remplace le port 3001 par 3002 en dev ; `mobileApiFetch` (l.577) et `authFetchRawAt(mobileApiBaseUrl, …)` visent déjà `mobile-api`. Appels `/api/mobile/*` encore faits par `authFetch` : `account`, `wallet/topup*`, `ia-packs/purchase`, `onboarding/complete`, `notifications/register` (`betterAuth.ts`), `documents*` (`DocumentsScreen.tsx`, `DocumentEditorScreen.tsx`), `events`, `purchase/*`, `pdf/signed-url` (`pdfApi.ts`), `stages/*` (`stagesApi.ts`), `payments/initiate` (`walletApi.ts`), `whatsapp/instance` (`whatsappService.ts`), `documents/defense-coach` (`DefenseCoachModal.tsx`), `documents/scraped-reports` (`ScrapedReportsView.tsx`) ; et `/api/ai/pdf-chat` (`pdfAssistant.ts`).
    - L'admin web utilise lui-même des copies : `recruiter-web/app/admin/login/LoginClient.tsx` (`/api/mobile/auth-capabilities`), `app/admin/documents/DocumentsListClient.tsx` et `new/NewDocumentClient.tsx` (`/api/mobile/documents…`), `app/documents/[id]/page.tsx` (`/api/mobile/documents/…`, `onboard-chat`, `generate-full`, `ai`, `export/pdf`).
    - `recruiter-web/next.config.ts` : aucun rewrite. `recruiter-web/lib/documents-db.ts:139` et `wallet/topup/route.ts:152` : cas `guest-student`.
  - **Fichiers :** modifiés : `src/features/auth/betterAuth.ts` (et appelants si besoin), `metro.config.js` (si le relais du tunnel doit inclure le port 3002) ; supprimés : `recruiter-web/app/api/mobile/**` (sauf décision contraire), libs `recruiter-web/lib/*` devenues sans appelant ; éventuellement modifiés : pages admin de rédaction (voir Dépendances).
  - **Étapes :**
    1. Obtenir la décision sur la rédaction depuis l'admin web (voir Dépendances).
    2. App : dans `betterAuth.ts`, faire passer **tout** chemin commençant par `/api/mobile/` ou `/api/ai/` par `mobileApiBaseUrl` (dans `authFetch` et `authFetchRaw`, une seule fonction de choix d'URL `baseUrlFor(path)`), et garder `/api/auth/*` sur `authBaseUrl`. Vérifier le cas tunnel (`*.exp.direct`) : `getMobileApiBaseUrl()` doit renvoyer une URL joignable ; si Metro relaie `/api` vers 3001 (commentaire `betterAuth.ts` l.76-82), adapter `metro.config.js` pour relayer `/api/mobile` et `/api/ai` vers 3002, ou documenter que le tunnel n'est pas supporté pour l'API.
    3. `auth-capabilities` : soit pointer `LoginClient.tsx` vers `mobile-api` (URL publique de l'API), soit garder cette seule route dans `recruiter-web` sous un autre chemin (`/api/admin/auth-capabilities`) ; choisir la solution la plus simple après lecture du fichier.
    4. Selon la décision de l'étape 1 : (a) rédaction admin abandonnée → supprimer `app/admin/documents/**`, `app/documents/[id]/**`, l'entrée « Rédactions » de `NAV_GROUPS` (`recruiter-web/app/admin/layout.tsx`) et les routes ; (b) rédaction admin conservée → déplacer les routes utilisées par ces pages sous `recruiter-web/app/api/admin/documents/…`, protégées par `requireAdminApi()` (`recruiter-web/lib/access.ts`), et mettre à jour les `fetch` des pages.
    5. Supprimer `recruiter-web/app/api/mobile/` ; puis, pour chaque fichier de `recruiter-web/lib/` (`mobile-access.ts`, `free-launch.ts`, `route-rate-limit.ts`, `documents-db.ts`…), vérifier par grep s'il est encore importé ; supprimer ceux qui ne le sont plus. Retirer `guest-student` s'il en reste.
    6. Mettre à jour `CLAUDE.md` (le paragraphe sur `documents-db.ts` dupliqué) si la copie disparaît.
  - **Tests à écrire :** `mobile-api/tests/app-routing.test.mjs` (garde de source) : lire `src/features/auth/betterAuth.ts` et vérifier la présence de `baseUrlFor` ; lire tous les fichiers de `src` et vérifier qu'aucun appel `authFetch('/api/mobile` ne contourne cette fonction (selon l'implémentation retenue, adapter le motif et l'expliquer dans la case).
  - **Vérification (DoD) :** `find recruiter-web/app/api/mobile -name route.ts | wc -l` → 0 (ou dossier absent) ; `grep -rn "guest-student" recruiter-web mobile-api/app mobile-api/lib --include=*.ts` → aucune ligne ; `npx tsc --noEmit` (racine et `recruiter-web`) → code 0 ; `cd recruiter-web && npm run build` → code 0 ; parcours de l'app en dev (expo-web) avec seulement `mobile-api` (`:3002`) et `recruiter-web` (`:3001`, pour la connexion) lancés : connexion, liste des offres, documents, compte, sans 404 dans la console réseau (capture `m23-22-dev.png`) ; connexion à l'admin web toujours possible.
  - **Pièges :**
    - Better Auth en dev reste sur `recruiter-web` (`authClient` sur `authBaseUrl`) : les deux services doivent garder le même `BETTER_AUTH_SECRET` et la même base.
    - Trois chaînes de déploiement touchent `recruiter-web` (`vercel-backend.yml`, `deploy-vps.yml`) : supprimer des routes change les trois hôtes.
    - Les tests `mobile-api/tests` ciblent `:3002` : ne pas les rediriger.
  - **Dépendances :** idéalement **avant** le Lot B (elle supprime le besoin de corriger les copies) : à proposer à l'utilisateur. **À demander à l'utilisateur avant de commencer :** la rédaction de documents depuis l'admin web (`/admin/documents`, `/documents/[id]`) sert-elle encore (garder et déplacer sous `/api/admin/…`) ou peut-elle être retirée ?

- [X] **Tâche 23.23 : Nettoyage et documentation à jour** — validée le 2026-10-20 : .gitignore mis à jour (error-*.txt, /*.png) ; 31 fichiers indésirables (logs, root png, error-b64, scratch/, generated_reports/, __pycache__) retirés de l'index git avec git rm --cached sans suppression disque ; code mort supprimé (handleCreateWithAi dans DocumentsScreen.tsx, recruiter-web/app/admin/AdminShell.tsx) ; CLAUDE.md et README.md réécrits avec les 4 services réels et zéro mention admin-app ; PROJECT.md préfixé comme document historique ; docs/ARCHITECTURE_MAP.md §8 mis à jour avec les 9 résolutions de sécurité du Module 23 ; tsc racine 0, tsc recruiter-web 0, lint:colors 191 baseline maintenue.
  - **Pourquoi :** des journaux, captures et fichiers temporaires sont suivis par git (dont des fichiers déjà listés dans `.gitignore`), du code mort traîne, et la documentation que lisent les humains et les assistants (`CLAUDE.md`, `README.md`, `docs/ARCHITECTURE_MAP.md`) décrit une architecture et des réglages faux.
  - **État actuel :**
    - Suivis par git malgré `.gitignore` (`*.log`, `generated_reports/`) : 11 journaux à la racine (`expo-phone.err.log`, `expo-phone.out.log`, `expo-stderr*.log`, `expo-stdout*.log`, `expo-web.*.log`, `ngrok-admin.log`), `generated_reports/Rapport_de_Stage_Campus360_18d11794.pdf`. Autres : `error-b64.txt`, PNG racine (`error-screenshot.png`, `expo-phone-qr-current.png`, `expo-phone-qr.png`, `expo-qr.png`, `test_detail_check.png`), `scratch/` (5 fichiers), `scripts/agents/__pycache__/` (8 `.pyc`), `.agents/` (370 fichiers), `.agent/` (28 fichiers, captures de preuve).
    - Code mort : `src/features/documents/DocumentsScreen.tsx:269` `handleCreateWithAi` (aucun appel) ; `recruiter-web/app/admin/AdminShell.tsx` (importé nulle part ; le vrai shell est `app/admin/layout.tsx`) ; `buildCvPrompt`/`buildLettrePrompt` (traités en 23.13).
    - `CLAUDE.md` : corps encore faux (`admin-app/` au lieu de `recruiter-web/`, abonnements `free/basic/premium`, `requireEmailVerification = false` « volontaire », projet EAS, palette « ink/paper/sienna » décrite avec les anciennes valeurs, scripts sans `lint:colors`). `docs/ARCHITECTURE_MAP.md` §8 (l.74 et suivantes) : constats de sécurité à mettre à jour après 23.11/23.12. `README.md` et `PROJECT.md` : Supabase Auth et admin-app comme passerelle (faux).
    - `DefenseCoachModal` est conservé (monté depuis `src/ui/screens/ScrapedReportsView.tsx`).
  - **Fichiers :** `.gitignore`, `CLAUDE.md`, `README.md`, `PROJECT.md`, `docs/ARCHITECTURE_MAP.md`, `src/features/documents/DocumentsScreen.tsx`, `recruiter-web/app/admin/AdminShell.tsx` (supprimé) ; index git (retrait du suivi, sans supprimer les fichiers du disque).
  - **Étapes :**
    1. `.gitignore` : ajouter `error-*.txt`, `/scratch/`, `__pycache__/`, `/*.png` (PNG de la racine seulement), `secrets/` (si 23.17 ne l'a pas fait), et `.agents/` / `.agent/` selon la décision de l'utilisateur.
    2. Avec l'accord de l'utilisateur (l'index git change) : `git rm --cached` sur les journaux, `error-b64.txt`, les PNG racine, `scratch/`, `generated_reports/`, `scripts/agents/__pycache__/`, et `.agents/` / `.agent/` selon la décision. Ne rien supprimer du disque. Ne pas commiter (23.24 s'en charge).
    3. Supprimer `handleCreateWithAi` (après grep) et `recruiter-web/app/admin/AdminShell.tsx` (après `grep -rn "AdminShell" recruiter-web/app recruiter-web/lib` → seulement le fichier lui-même).
    4. `CLAUDE.md` : remplacer partout `admin-app/` par `recruiter-web/` et retirer le bandeau de corrections devenu inutile en intégrant ses faits au corps ; ajouter `landing-site/` aux services ; abonnements → « pas d'abonnement, wallet en coins, lancement gratuit (`FREE_LAUNCH_MODE`, `FREE_LAUNCH_UNTIL`) » ; vérification d'e-mail obligatoire en production (23.11) ; projet EAS et schéma confirmés (23.17) ; palette réelle de `src/theme/stitch.ts` ; scripts `lint:colors` et `npm test` ; tableau des fichiers jumeaux ; numérotation des migrations et `npm run migrate` (23.19).
    5. `docs/ARCHITECTURE_MAP.md` §8 : statut réel de chaque constat après le Lot B (corrigé, avec la tâche, ou encore ouvert).
    6. `README.md` : architecture réelle en quelques lignes (4 services, ports, commandes de dev et de test) ; `PROJECT.md` : en-tête « document historique, voir CLAUDE.md » si le contenu n'est pas mis à jour.
  - **Tests à écrire :** aucun.
  - **Vérification (DoD) :** `git ls-files | grep -E "\.log$|error-b64|^scratch/|__pycache__|^generated_reports/"` → vide ; `grep -n "admin-app" CLAUDE.md README.md` → aucune ligne ; `npx tsc --noEmit` (racine et `recruiter-web`) → code 0 ; `npm run lint:colors` → pas de hausse.
  - **Pièges :**
    - Ne pas retirer `.env.example` (suivi volontairement) ni rendre suivi `.env.e2e.local`.
    - `CLAUDE.md` est une instruction lue par les assistants : relire le texte final avec l'utilisateur.
    - Les captures `.agent/screenshots/` servent de preuves aux tâches cochées : ne pas les retirer sans décision.
  - **Dépendances :** 23.11, 23.12, 23.17, 23.19, 23.22 (la documentation décrit leur résultat). **À demander à l'utilisateur :** garder `.agents/` (370 fichiers de travail d'agents) et `.agent/` (captures de preuve) dans git, ou les retirer du suivi.

- [X] **Tâche 23.24 : Figer la release V1** — validée le 2026-10-20 : découpage conventionnel en 8 commits par module (api, documents, wallet, deploy, scraping, mobile, stages), deploy-vps.sh supporte --ref <tag>, tag annoté v1.0.0 prêt à être posé sur main.
  - **Pourquoi :** le dépôt contient environ 200 changements non commités sur une branche de travail, aucun tag, et le VPS déploie la tête de `main` : on ne peut pas dire quelle version tourne en production ni revenir proprement à la V1.
  - **État actuel :** branche `fix/security-hardening-fake-sessions` ; `git status --short` ≈ 198 entrées (75 modifiées, 5 supprimées, 118 non suivies ; surtout `mobile-api`, `.agent`, `landing-site`, `src`) ; aucun tag ; `scripts/deploy-vps.sh` fait `git fetch origin main` puis `git reset --hard origin/main` ; `.github/workflows/deploy-vps.yml` se déclenche à chaque push sur `main` (chemins des 3 services).
  - **Fichiers :** dépôt git ; `scripts/deploy-vps.sh` (déploiement d'un tag).
  - **Étapes :**
    1. Prérequis : 23.23 faite (artefacts retirés), `git status` relu avec l'utilisateur.
    2. Proposer à l'utilisateur un découpage en commits conventionnels par module (un commit ou plus par module 19, 20, 21, 22, 23 ; préfixes `feat(…)`, `fix(…)`, `chore(…)`, `docs(…)`), avec la liste des fichiers de chaque commit. Attendre son accord explicite.
    3. Créer les commits (`git add <fichiers>` par lot, jamais `git add -A` aveugle), chaque message se terminant par la ligne d'attribution demandée par l'environnement (`Co-Authored-By: …`).
    4. `scripts/deploy-vps.sh` : accepter un argument `--ref <tag>` : `git fetch --tags origin` puis `git checkout --force <tag>` au lieu de `reset --hard origin/main` ; sans argument, comportement actuel.
    5. Avec accord : fusion dans `main` (par une pull request `gh pr create` si l'utilisateur le souhaite), tag annoté `git tag -a v1.0.0 -m "Campus 360 V1"` sur le commit fusionné, `git push origin main --follow-tags`. Rappeler que le push sur `main` déclenche `deploy-vps.yml` immédiatement.
    6. Déploiement du tag sur le VPS (action utilisateur ou `deploy-vps.sh --ref v1.0.0` avec accord), puis contrôle de santé.
  - **Tests à écrire :** aucun.
  - **Vérification (DoD) :** `git status --short | wc -l` → 0 au moment du tag ; `git tag --list v1.0.0` → `v1.0.0` ; `git log --oneline -n 15 main` montre les commits par module ; `curl -fsS https://api.campus360b.site/api/health` → `{"status":"ok","db":"connected"}`.
  - **Pièges :**
    - Ne jamais commit, fusionner, tagger ni pousser sans accord explicite et séparé pour chaque étape.
    - Le tag doit être posé sur le commit réellement déployé ; un commit après le tag casse la promesse « ce qui tourne = v1.0.0 ».
    - Le nom du tag `v1.0.0` (release du dépôt) peut différer de la version de l'app dans `app.json` (décidée en 23.17) : l'écrire dans le message du tag.
  - **Dépendances :** toutes les tâches 23.1 à 23.23 et 23.26 (au minimum validées ou explicitement reportées par l'utilisateur), 23.25 de préférence avant le tag. **À demander à l'utilisateur :** accord pour chaque étape git (commits, fusion, tag, push, déploiement).

- [ ] **Tâche 23.25 : Recette V1 de bout en bout**
  - **Pourquoi :** les tests unitaires ne prouvent pas que le parcours réel d'un étudiant fonctionne, ni que deux comptes ne voient pas les données l'un de l'autre. Les stores demandent aussi des captures et des déclarations exactes.
  - **État actuel :**
    - `.env.e2e.local` (racine, ignoré par git) contient seulement `E2E_EMAIL` et `E2E_PASSWORD` ; `E2E_EMAIL_B` / `E2E_PASSWORD_B` (isolation, lus par `mobile-api/tests/document-files.test.mjs` l.6 et l.19) n'existent pas.
    - `npm test` (`node --test tests/*.test.mjs`) ne charge aucun fichier `.env` : les tests authentifiés sont donc ignorés. `mobile-api/tests/documents.test.mjs` utilise `TEST_EMAIL`/`TEST_PASSWORD` et prend `BETTER_AUTH_URL` comme `BASE_URL` (l.48-50 : risque d'écrire en production).
    - Node local : v22.14 (`--env-file` disponible).
    - Scripts E2E de la racine (`scripts/e2e-screenshots.cjs`, `demo-captures.cjs`, `webapp-e2e-test.mjs`, `test-*.mjs`…) : beaucoup ciblent Supabase REST ou l'ancienne admin ; à trier avant usage.
    - Aucune capture `m23-*` ; aucune checklist stores.
  - **Fichiers :** modifiés : `mobile-api/package.json` (script `test:e2e`), `mobile-api/tests/documents.test.mjs` ; créés : `docs/deploy/STORE_CHECKLIST.md`, captures `.agent/screenshots/m23-25-*.png`.
  - **Étapes :**
    1. Demander à l'utilisateur de créer le 2ᵉ compte de test et le compte jetable de suppression, et d'ajouter lui-même `E2E_EMAIL_B`, `E2E_PASSWORD_B`, `E2E_DELETE_EMAIL`, `E2E_DELETE_PASSWORD` dans `.env.e2e.local` (l'exécutant ne voit ni ne recopie ces valeurs).
    2. `mobile-api/package.json` : `"test:e2e": "node --env-file=../.env.e2e.local --test tests/*.test.mjs"`.
    3. `documents.test.mjs` : lire `E2E_EMAIL`/`E2E_PASSWORD` (garder `TEST_*` en repli) et `BASE_URL` (défaut `http://localhost:3002`), jamais `BETTER_AUTH_URL`.
    4. Lancer `mobile-api` en local (`npm run dev`, base partagée : prévenir l'utilisateur que les tests écrivent des données de test, puis les suppriment) et lancer `npm run test:e2e` ; corriger jusqu'à 0 échec et 0 test authentifié ignoré.
    5. Parcours navigateur (expo-web, 375 px), capture à chaque étape : inscription (compte de test fourni par l'utilisateur, pas de création par l'exécutant) → profil → liste d'offres → candidature envoyée **et** échec affiché (API arrêtée) → recharge en mode test Notch (clés de test posées par l'utilisateur sur le serveur local ; aucun vrai paiement) → document de stage (style, mode entretien, export PDF et Word) → suppression du compte jetable. Avant toute candidature 1-clic, vérifier avec l'utilisateur que l'envoi WhatsApp/e-mail réel est désactivé ou dirigé vers une entreprise de test (aucun message vers une vraie entreprise).
    6. Isolation : avec le compte B, tenter de lire un document et un fichier du compte A (identifiants relevés pendant le parcours) → 404 ou 403 ; déjà couvert par `document-files.test.mjs` une fois `E2E_*_B` présents.
    7. `docs/deploy/STORE_CHECKLIST.md` : cases pour la fiche Play (Data safety reprenant le tableau des données de 23.16, URL de confidentialité, URL de suppression de compte, classification du contenu, public cible, captures de téléphone 1080×1920 ou proches, icône 512 px, bannière 1024×500), AAB de production signé, piste de test interne, et l'équivalent App Store si visé. Cocher ce qui est vérifiable dans le dépôt ; le reste est coché par l'utilisateur.
  - **Tests à écrire :** pas de nouveau fichier ; les tests HTTP existants et ceux des tâches 23.x doivent tourner (non ignorés) avec `npm run test:e2e`.
  - **Vérification (DoD) :** `cd mobile-api && npm run test:e2e` → 0 échec et aucun test authentifié ignoré (compter les `# skip` dans la sortie, seuls les tests sans clé IA réelle peuvent l'être, à justifier) ; captures `m23-25-*.png` produites pour chaque étape du parcours ; `STORE_CHECKLIST.md` rempli pour la partie dépôt ; données de test supprimées (vérifié par requête de lecture).
  - **Pièges :**
    - Ne jamais recopier les identifiants de `.env.e2e.local` dans le chat, un log ou un commit.
    - Les tests écrivent dans la base partagée : chaque scénario doit nettoyer ce qu'il crée.
    - Les clés Notch de test ne doivent jamais aller sur le VPS de production.
  - **Dépendances :** toutes les tâches 23.1 à 23.22 et 23.26. **À demander à l'utilisateur :** création des comptes B et « suppression », clés de test Notch, désactivation ou cible de test pour l'envoi réel des candidatures.

### Actions utilisateur (hors code, en parallèle)

> L'IA exécutante ne fait aucune de ces actions elle-même. Elle les rappelle au bon moment et attend le retour de l'utilisateur. Les valeurs (adresses, secrets, numéros) sont fournies par l'utilisateur et ne sont jamais recopiées dans le chat.

1. **Hôte de fichiers `files.campus360b.site` (tâche 19.23) et e-mail (18.7)**
   - Chez le registraire du domaine : enregistrement `A` `files` → `164.68.109.206`.
   - Sur le VPS (`ssh root@164.68.109.206`) : suivre `docs/deploy/FILES_HOST.md` (copie de `docs/deploy/nginx-files.conf` dans `/etc/nginx/sites-available/`, lien dans `sites-enabled/`, `nginx -t`, `systemctl reload nginx`, `certbot --nginx -d files.campus360b.site`, création du dossier `UPLOAD_ROOT` avec les droits indiqués), puis renseigner `UPLOAD_ROOT` et `FILES_PUBLIC_URL` dans l'environnement de `mobile-api` et `pm2 restart campus360-mobile-api --update-env`.
   - ImprovMX : recopier chez le registraire les enregistrements `MX` (et `TXT` SPF) affichés par le tableau de bord ImprovMX, puis créer les alias réellement utilisés (contact, support, confidentialité) et les communiquer pour 23.16.
2. **Variables du VPS** (`/opt/campus-360/mobile-api`, fichier d'environnement utilisé par pm2) : vérifier la **présence** sans afficher les valeurs (`grep -c '^NOM=' <fichier>` pour chaque nom) de : `NODE_ENV=production`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `FREE_LAUNCH_MODE`, `FREE_LAUNCH_UNTIL`, `STARTING_COINS`, `AI_DAILY_LIMIT`, `FILES_SIGNING_SECRET`, `UPLOAD_ROOT`, `FILES_PUBLIC_URL`, `OPENROUTER_API_KEY`, `RESEND_API_KEY`, `NOTCHPAY_PRIVATE_KEY`, `NOTCHPAY_WEBHOOK_SECRET` (ou `PAYMENTS_ENABLED=false`), `EVOLUTION_API_KEY`, `TRUST_PROXY=true`, `DATABASE_SSL_CA_FILE` (certificat CA téléchargé depuis le tableau de bord Supabase, rubrique des paramètres de la base, déposé sur le VPS), `HEALTH_PDF_SECRET`, et pour le Module 24 `ADMIN_SERVICE_SECRET` (identique dans `recruiter-web`). Ajouter les manquantes, puis `pm2 restart campus360-mobile-api --update-env`. À faire **avant** de déployer 23.18 (sinon le serveur refuse de démarrer).
3. **EAS et Play Console**
   - Dans le dossier du projet : `npx eas-cli whoami` puis `npx eas-cli project:info` ; indiquer lequel des deux projets (`49ce85c3…` / `miguelvinijr237` ou `098589af…` / `campus360s-team`) est le bon (23.17).
   - Play Console : créer l'application (nom « Campus 360 », paquet `com.campus360b.app`), remplir la fiche « Sécurité des données » à partir du tableau de 23.16, renseigner l'URL de confidentialité (`https://campus360b.site/confidentialite`) et l'URL de suppression de compte (`https://campus360b.site/suppression-compte`).
   - Google Cloud (projet lié à la Play Console) : créer un compte de service, télécharger sa clé JSON, l'inviter dans Play Console (Utilisateurs et autorisations, droits de publication) ; déposer le fichier dans `secrets/play-service-account.json` (jamais commité).
   - Lancer le build de production : `npx eas-cli build --platform android --profile production` (ou le workflow `eas-android.yml` avec `profile=production`).
   - Google Cloud Console (identifiants OAuth) : ajouter le nouveau schéma `campus360://` aux redirections autorisées si la connexion Google est active.
4. **Informations légales de l'éditeur (23.16)** : raison sociale et forme, RCCM, NIU, capital (s'il existe), adresse du siège, directeur de la publication, adresses e-mail de contact, hébergeur du VPS (nom, pays), règles et délais de remboursement, durée de conservation des journaux.
5. **Décisions produit restantes** (à donner avant la tâche concernée) : plafond IA quotidien (proposition 60 appels/jour/utilisateur, 23.10) ; date de mise en ligne pour `FREE_LAUNCH_UNTIL` et barème réduit des crédits IA après le lancement gratuit (23.9) ; numéro WhatsApp du support (23.3) ; forme du retrait de candidature et relecture des rapports scrapés (23.12) ; reclassement des PDF existants et règle des packs (23.26) ; vérification d'e-mail des comptes admin et domaines Vercel encore utilisés (23.11) ; version de l'app et projet EAS (23.17) ; rédaction depuis l'admin web (23.22) ; suivi git de `.agents/` et `.agent/` (23.23) ; hôte unique de `api.campus360b.site` et sort du déploiement Vercel de `mobile-api` (23.20) ; service de surveillance externe (23.21). Déjà décidés : 3 000 coins offerts une fois (1 coin = 1 FCFA), lancement gratuit de 3 mois, cours et anciens sujets toujours gratuits, schéma `campus360` (clés de stockage inchangées), `defense-coach` conservé.
6. **Comptes et moyens de test** : 2ᵉ compte E2E (`E2E_EMAIL_B`/`E2E_PASSWORD_B`) et compte jetable de suppression (`E2E_DELETE_EMAIL`/`E2E_DELETE_PASSWORD`) ajoutés par l'utilisateur dans `.env.e2e.local` ; clés de test Notch Pay ; une base PostgreSQL vide de test (`MIGRATE_TEST_DATABASE_URL`) ; client `pg_dump` installé sur le VPS à la version du serveur ; URL de webhook configurée chez Notch Pay (23.8).
7. **Nettoyage** : supprimer le compte de démo `landing-demo+campus360@example.com` (22.14) quand les captures ne servent plus.

---

## 🏛️ MODULE 24 : Galerie de modèles de rapports — recopier et modeler un design

> **Décisions du 2026-10-15 :** l'admin importe des rapports de référence ; Campus 360 en recopie le design ; l'admin le retouche puis le publie comme modèle nommé (ex. « IUT de Douala — DUT ») ; l'étudiant choisit un modèle dans une galerie, l'applique à son rapport ou mémoire, puis le modifie librement. Import **Word (.docx) d'abord** (copie quasi exacte), **PDF ensuite** (analyse des pages, approximative, corrigée par l'admin).
> **Premier modèle :** le rapport de référence de l'utilisateur (DUT Génie Informatique, IUT de Douala, 39 pages, table `documents`, id `pdf_55f6da9bd04448a198`, fichier sur Cloudinary). Seule la mise en page est recopiée ; son contenu (noms, entreprise, textes) ne va jamais dans le code, les tests, les fixtures ni le modèle.
> **Ce que montre la référence :**
> - **Page de garde :** en-tête bilingue sur deux colonnes (FR à gauche, EN à droite : République / devise, ministère, université, institut, BP, téléphone, email) ; logo de l'établissement au centre ; logo du département à gauche et de l'entreprise à droite ; « RAPPORT DE STAGE ACADÉMIQUE » ; thème en majuscules dans un bandeau coloré « THÈME : … » ; « Stage effectué du … au … en vue de l'obtention du … » ; « Rédigé et présenté par : » souligné, nom en gras, matricule ; « Sous l'encadrement de : » puis encadreurs académique et professionnel sur deux colonnes ; année académique dans un bandeau en bas.
> - **Chaque page après la garde :** titre du rapport en majuscules, blanc sur un bandeau coloré en en-tête ; pied « Rédigé et présenté par : NOM » à gauche sous un filet, numéro dans un petit cadre à droite (i, ii… puis 1, 2…).
> - **Texte :** Times New Roman 12, justifié, interligne 1,5 ; titres des pages préliminaires centrés, gras, majuscules ; « CHAPITRE 1 : … » centré ; « SECTION 1 : … » et « I. … » gras majuscules ; puces ❖ ou • ; légendes italiques centrées « Figure 1 : … » numérotées sur tout le document ; tableaux à en-tête gris ; abréviations en tableau à deux colonnes.
> - **Ordre :** Dédicace, Remerciements, Sommaire, Résumé, Abstract, Liste des figures, Liste des tableaux, Liste des abréviations, Introduction générale, Chapitres (sections), Conclusion générale, Références bibliographiques, Table des matières.
> - **Non reproduit :** sommaire sans numéros de page, titres collés, coquilles.

### Guide pour l'IA exécutante (Module 24)

> Les décisions 19 à 22 du tableau « Décisions arbitrées le 2026-10-15 » (Module 23) s'appliquent ici : architecture validée, IA de vision autorisée pour la page de garde seulement, aucun logo d'établissement dans un modèle publié (emplacements à remplir par l'étudiant), import du rapport de référence en PDF.

**À lire avant toute tâche.** Le guide du Module 23 (dossiers, conventions, outils, sécurité, cycle par tâche) s'applique aussi ici ; ce qui suit le complète pour le rendu des documents et les modèles. Les numéros de ligne datent du 2026-10-15 : relocaliser par nom de fonction avant d'éditer.

**1. Où vit chaque chose (décision d'architecture de ce module)**
- **Toute la logique des modèles vit dans `mobile-api`** : style, blocs de garde, rendu, import .docx/.pdf, stockage, aperçus, API admin et API étudiant. Raisons : c'est là que se trouvent le rendu (`lib/document-render.ts`, `document-pdf.ts`, `document-docx.ts`), les dépendances (`docx`, `pdfjs-dist`, `puppeteer`, `mammoth`), la validation des fichiers et les tests ; `recruiter-web` n'a ni ces bibliothèques ni l'accès au disque des fichiers, et ne peut pas importer `mobile-api/lib`.
- **`recruiter-web` ne contient que l'écran admin et un relais** : chaque appel de l'écran admin va vers `recruiter-web/app/api/admin/templates/[...path]/route.ts`, qui vérifie la session admin (`requireAdminApi()`, `recruiter-web/lib/access.ts`) puis relaie la requête côté serveur vers `mobile-api` (`${MOBILE_API_INTERNAL_URL}/api/admin/templates/...`) avec deux en-têtes : `x-admin-service-key: ${ADMIN_SERVICE_SECRET}` et `x-admin-user-id: <id Better Auth de l'admin>`. `mobile-api` vérifie le secret (comparaison à temps constant) et que cet utilisateur a bien le rôle `admin` en base. Variables nouvelles : `ADMIN_SERVICE_SECRET` (même valeur dans les deux services, 32 caractères aléatoires au moins) et `MOBILE_API_INTERNAL_URL` (dans `recruiter-web` ; `http://127.0.0.1:3002` sur le VPS).
- **Logos et aperçus des modèles** : stockés en base (`bytea`) dans `app_template_assets` (24.3), pas sur le disque : la table `app_document_files` exige un `document_id` et un propriétaire étudiant. Quand un étudiant applique un modèle, chaque logo est **copié** dans ses propres fichiers (`saveFile` + ligne `app_document_files` de son document), puis référencé par son style.
- **Les blocs de garde d'un document** vivent dans son style : `document_style.cover.blocks` (`null` = blocs déduits du gabarit `cover.template`, comportement actuel). Un modèle stocke un `DocumentStyle` complet (blocs compris) dans `app_document_templates.document_style`.

**2. Carte des fichiers de rendu**
| Rôle | Serveur (`mobile-api/lib/`) | Copie app (`src/features/documents/`) |
|---|---|---|
| Type et presets du style, `resolveStyle`, `applyStylePatch` | `document-style.ts` | `documentStyle.ts` (identique au caractère près) |
| Schéma Zod des patchs | `document-style-schema.ts` | — |
| Blocs de garde (nouveau, 24.2) | `document-cover.ts` | `documentCover.ts` (identique sauf chemins d'import) |
| CSS, types de sections, garde | `document-render.ts` | `documentRender.ts` (identique sauf chemins d'import) |
| Numérotation des titres et légendes, sommaire | `document-numbering.ts` | — |
| PDF (HTML, deux passes) / tampon pdf-lib | `document-pdf.ts` / `pdf-pagination.ts` | — |
| Word / HTML vers Word | `document-docx.ts` / `html-to-docx.ts` | — |
| Éditeur et aperçu | — | `editorTemplate.ts` |
| Panneau Style | — | `DocumentStylePanel.tsx` |
- Les types `CoverBlock` sont déclarés dans `document-style.ts` (pour que la copie `documentStyle.ts` reste identique au caractère près) ; `document-cover.ts` n'importe que `./document-style`.
- Une nouvelle option de style se branche toujours à 5 endroits : type + `PRESETS` + `resolveStyle` (`document-style.ts`), schéma (`document-style-schema.ts`), copie app, rendu (CSS, PDF, Word), panneau. Une clé oubliée dans `resolveStyle` est **supprimée sans erreur** à la sauvegarde suivante.

**3. Tests du rendu**
- `npm test` dans `mobile-api` exécute `document-style.test.mjs` (parité + presets), `document-render.test.mjs`, `document-pdf.test.mjs` (Puppeteer + un navigateur système ; jusqu'à 120 s), `document-docx.test.mjs` (JSZip), `html-to-docx.test.mjs`.
- Tout nouveau fichier `.ts` importé par un module chargé doit être ajouté aux listes `LOCAL` de ces tests (`document-pdf.test.mjs` l.9, `document-docx.test.mjs` l.8) ; si `document-render.ts` importe une valeur de `document-cover.ts`, `document-render.test.mjs` doit passer de `loadTs` à `loadTsWithPackages('lib/document-render.ts', ['lib/document-style.ts', 'lib/document-cover.ts'])`.
- Lire le texte d'un PDF : modèle `pageTexts` de `document-pdf.test.mjs` (pdfjs, éléments joints par des espaces) ; le dernier texte d'une page (`lastToken`) est le numéro de page : **le dessiner en dernier**.
- Lire un Word : `JSZip.loadAsync(buffer)` puis `word/document.xml`, `word/header*.xml`, `word/footer*.xml`, `word/numbering.xml` ; comparer le texte concaténé des `<w:t>`, pas la chaîne brute.
- Données de test : uniquement des noms fictifs évidents (« Awa Test », « Entreprise Exemple SA », « Université Exemple »). Rien qui vienne du rapport de référence.

**4. Couleurs et garde-fou**
- `npm run lint:colors` scanne `src/` ; `documentStyle.ts` et `documentRender.ts` sont exclus, **pas** `editorTemplate.ts`, `DocumentStylePanel.tsx` ni le futur `documentCover.ts`. Ne mettre aucun littéral hexadécimal dans ces fichiers : les couleurs du document viennent du style (valeurs par défaut déclarées dans `documentStyle.ts`), celles de l'interface de `stitchColors`.
- Côté `recruiter-web`, utiliser les classes de tokens (`bg-stitch-*`, `text-stitch-*`) et relancer `npm run css:build` après ajout de classes (le CSS compilé `app/globals.compiled.css` n'est pas régénéré sinon).

**5. Données personnelles**
- Le PDF de référence est le rapport réel d'un étudiant : il n'est jamais commité, jamais copié dans `mobile-api/tests/fixtures`, jamais joint à une réponse d'API, jamais envoyé à un service externe sans accord écrit de l'utilisateur. Il est téléchargé dans le scratchpad de la session et supprimé à la fin de 24.12.
- Un modèle publié ne contient que des libellés génériques (« Rédigé et présenté par : », « THÈME : », « Sous l'encadrement de : ») et des champs à remplir (`{studentName}`, `{year}`…), jamais un nom, un matricule ou une entreprise.

**6. Migrations** : la numérotation du Module 23 s'applique ; ce module ajoute `0013_document_templates.sql` (24.3). Aucune migration n'est nécessaire pour 24.1 et 24.2 (le style est un `jsonb` complété par `resolveStyle`).

### 1. Ce qu'un modèle sait décrire
- [ ] **Tâche 24.1 : Options de style manquantes**
  - **Pourquoi :** la mise en page de la référence (bandeau d'en-tête coloré, pied « Rédigé et présenté par » avec numéro encadré, titres CHAPITRE / SECTION / I., puces ❖, légendes numérotées sur tout le document, dédicace encadrée) ne peut pas être décrite avec le style actuel. Sans ces options, aucun modèle fidèle n'est possible.
  - **État actuel :**
    - `mobile-api/lib/document-style.ts` (244 l.) : type `DocumentStyle` (l.21-61 : `version`, `preset`, `typography`, `headings { numbering: 'none' | 'decimal' | 'roman-alpha', uppercaseChapters, color, rule }`, `page { margins, border, accentColor }`, `headerFooter { headerLeft, headerRight, footerLeft, footerCenter, footerRight, numberFormat, logoInHeader, headerRule }`, `cover { template, schoolLogoFileId, companyLogoFileId, extraLines }`, `tables { style, headerColor }`) ; `PRESETS` (l.70-123) ; `resolveStyle` (l.154-210, ne recopie que les clés listées) ; `applyStylePatch` (l.217-236, un changement de preset garde seulement `cover.schoolLogoFileId`, `companyLogoFileId`, `extraLines`, l.221-224) ; palettes `STYLE_COLOR_PALETTE` (l.128) et `TABLE_HEADER_PALETTE` (l.129).
    - `mobile-api/lib/document-style-schema.ts` (81 l.) : `documentStylePatchSchema` strict, sous-objets `.partial().strict()` (l.12-79).
    - Copie `src/features/documents/documentStyle.ts`, parité testée par `mobile-api/tests/document-style.test.mjs` (l.11-15).
    - `mobile-api/lib/document-render.ts` (433 l.) : `styleToCss` (l.141-251 : compteurs de légendes `dfig`/`dtab` remis à zéro par section, l.158-176 ; listes l.214-215 avec puces du navigateur ; légende de tableau non italique l.236 ; `figcaption` italique centrée l.242 ; dédicace l.244-245). Aucun test de parité avec `documentRender.ts`.
    - `mobile-api/lib/document-numbering.ts` (131 l.) : `numberDocument` (l.40-131) numérote h1/h2 dans un chapitre ; légende = `chapitre.n` dans un chapitre, compteur cumulé hors chapitre (l.94-115).
    - `src/features/documents/DocumentStylePanel.tsx` (407 l.) : sections repliables `typo`, `titles`, `page`, `hf`, `cover`, `tables`.
  - **Fichiers :** modifiés : `mobile-api/lib/document-style.ts` + `src/features/documents/documentStyle.ts` (identiques), `mobile-api/lib/document-style-schema.ts`, `mobile-api/lib/document-render.ts` + `src/features/documents/documentRender.ts`, `mobile-api/lib/document-numbering.ts`, `src/features/documents/DocumentStylePanel.tsx`, `mobile-api/tests/document-style.test.mjs` ; créé : `mobile-api/tests/twin-files.test.mjs`. Le rendu PDF et Word des nouvelles options est fait en 24.5 et 24.6, l'écran en 24.4.
  - **Étapes :**
    1. **D'abord** créer `mobile-api/tests/twin-files.test.mjs` : pour chaque paire (`lib/document-render.ts` ↔ `../src/features/documents/documentRender.ts`, et plus tard `lib/document-cover.ts` ↔ `documentCover.ts`), lire les deux fichiers, remplacer dans la copie app `'./documentStyle'` → `'./document-style'`, `'./documentCover'` → `'./document-cover'`, `'./documentRender'` → `'./document-render'`, puis exiger l'égalité stricte (message « modifier les deux fichiers ensemble »). Lancer `npm test` : il doit passer avant toute modification.
    2. Ajouter au type `DocumentStyle` (valeurs par défaut identiques pour les 4 presets, pour ne rien changer aux documents existants) :
       - `headings.numbering` : nouvelle valeur `'chapter-section-roman'` (ne pas renommer `roman-alpha`).
       - `headerFooter.headerStyle: 'plain' | 'band'` (défaut `'plain'`) ; `headerFooter.headerTextColor: string` (hex, défaut `'#FFFFFF'`) ; `headerFooter.authorLabel: string` (0 à 60 caractères, défaut `''`) ; `headerFooter.footerRule: boolean` (défaut `false`) ; `headerFooter.pageNumberFrame: 'none' | 'box'` (défaut `'none'`).
       - `page.bandColor: string` (hex, défaut = `accentColor` du preset).
       - Nouveau bloc `captions: { scope: 'chapter' | 'document'; style: 'italic-center' | 'bold-left' }` (défaut `{ scope: 'chapter', style: 'italic-center' }`).
       - Nouveau bloc `lists: { bullet: 'disc' | 'diamond' }` (défaut `'disc'`).
       - Nouveau bloc `dedication: { frame: boolean }` (défaut `false`).
       Ajouter `'#FFFFFF'` à `STYLE_COLOR_PALETTE` si absent (couleur de texte du bandeau).
    3. `resolveStyle` : lire chaque nouvelle clé avec les aides existantes (`pick`, `color`, `bool`, et une aide `text(value, max)` qui tronque à 60 caractères), valeur du preset sinon. `applyStylePatch` : lors d'un changement de preset, conserver aussi `headerFooter.authorLabel` (texte saisi par l'étudiant).
    4. `document-style-schema.ts` : ajouter les champs aux sous-objets existants (`headings.numbering` enum élargi, `headerFooter` : `headerStyle`, `headerTextColor: hex`, `authorLabel: z.string().max(60)`, `footerRule`, `pageNumberFrame` ; `page.bandColor: hex`) et trois sous-objets `captions`, `lists`, `dedication` en `.partial().strict()`.
    5. Recopier `document-style.ts` dans `documentStyle.ts` (fichier entier).
    6. `document-numbering.ts` : (a) `captions.scope === 'document'` → légendes numérotées « Figure n » et « Tableau n » avec des compteurs cumulés sur tout le document (dans et hors chapitre) ; `'chapter'` → comportement actuel ; (b) schéma `chapter-section-roman` dans un chapitre : h1 → préfixe `SECTION ${n} : `, h2 → `${toRoman(n)}. `, h3 → `${n}. ` (h3 numéroté seulement pour ce schéma) ; les entrées de sommaire restent h1 et h2.
    7. `document-render.ts` (+ copie) `styleToCss` : légendes selon `captions.style` (`italic-center` : italique, centré ; `bold-left` : gras, aligné à gauche) appliqué à `figcaption` **et** `.doc-table-caption` ; compteurs CSS : en `scope: 'document'`, remettre `dfig`/`dtab` à zéro sur le conteneur racine et non par section, et libellé `"Figure " counter(dfig)` ; branche CSS du schéma `chapter-section-roman` (h1 `"SECTION " counter(dh1) " : "`, h2 `counter(dh2, upper-roman) ". "`) ; puces : `diamond` → `ul > li::marker { content: "❖  "; }` (niveau 1) et `"•  "` pour les niveaux imbriqués ; dédicace encadrée : `.doc-section[data-kind="dedication"] .doc-body { border: 1pt solid <accent>; padding: 12pt 16pt; }` quand `dedication.frame`. Aucune couleur littérale : utiliser les valeurs du style.
    8. `DocumentStylePanel.tsx` : section « En-tête / pied » : choix « En-tête simple / Bandeau coloré », couleur du bandeau (`STYLE_COLOR_PALETTE`), champ « Libellé avant le nom » (placeholder « Rédigé et présenté par : »), interrupteur « Filet au-dessus du pied », choix « Numéro de page : sans cadre / encadré » ; section « Titres » : ajouter « CHAPITRE / SECTION / I. » au choix de numérotation ; nouvelles sections repliables « Légendes » (numérotation par chapitre / sur tout le document ; italique centrée / gras à gauche), « Listes » (puce ronde / losange ❖), « Pages préliminaires » (dédicace encadrée). Couleurs de l'interface : `stitchColors` seulement.
  - **Tests à écrire :** dans `mobile-api/tests/document-style.test.mjs` :
    - Les 4 presets contiennent les nouvelles clés avec les défauts ci-dessus (`headerStyle: 'plain'`, `captions.scope: 'chapter'`…).
    - Style partiel sans les nouvelles clés (cas des documents existants) → `resolveStyle` renvoie les défauts du preset.
    - Valeurs invalides corrigées par `resolveStyle` : `headerStyle: 'neon'` → `'plain'` ; `bandColor: 'rouge'` → défaut ; `authorLabel` de 200 caractères → tronqué à 60.
    - Schéma : `{ captions: { scope: 'page' } }` → rejeté ; `{ headerFooter: { authorLabel: 'x'.repeat(61) } }` → rejeté ; `{ lists: { bullet: 'diamond' } }` → accepté ; clé inconnue `{ lists: { couleur: 'x' } }` → rejeté.
    - Changement de preset avec `authorLabel` rempli → `authorLabel` conservé.
    - `document-render.test.mjs` : `numberDocument` avec `chapter-section-roman` sur un chapitre « Chapitre 1 : Présentation » contenant h1, h2, h3 → préfixes `SECTION 1 : `, `I. `, `1. ` ; `captions.scope: 'document'` avec deux chapitres contenant chacun une figure → « Figure 1 : » puis « Figure 2 : ».
    - `twin-files.test.mjs` : parité de `document-render.ts`.
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec (les tests PDF/Word existants inchangés passent : les défauts reproduisent l'existant) ; `npx tsc --noEmit` (racine et `mobile-api`) → code 0 ; `npm run lint:colors` → pas de hausse.
  - **Pièges :**
    - Toute clé ajoutée au type mais oubliée dans `resolveStyle` disparaît à la sauvegarde suivante.
    - Le schéma est strict : une ancienne version de l'app qui n'envoie pas les nouvelles clés passe ; une app qui enverrait une clé inconnue reçoit 400.
    - `--chapter` n'est posé qu'à l'écran (`editorTemplate.ts` `sectionAttributes`) : en PDF, la numérotation est faite en texte par `numberDocument` ; garder les deux cohérents.
    - Le glyphe ❖ n'existe pas dans les polices standard de pdf-lib : il ne doit apparaître que dans le HTML (rendu par Chromium), jamais dans le tampon d'en-tête ou de pied.
  - **Dépendances :** aucune. Aucune décision utilisateur.

- [ ] **Tâche 24.2 : Page de garde modulable par blocs**
  - **Pourquoi :** les 4 pages de garde actuelles sont codées en dur ; la garde de la référence (en-tête bilingue, trois logos, bandeau « THÈME : », bloc auteur, encadreurs sur deux colonnes, bandeau d'année) ne peut pas être reproduite, ni réglée par l'admin.
  - **État actuel :**
    - `mobile-api/lib/document-render.ts` : `CoverData` (l.255-273 : `university, school, faculty, kindLabel, degree, title, subtitle, studentName, matricule, specialty, company, period, tutorCorporate, tutorAcademic, year, nationalHeader, extraLines`) ; `CoverLogos` (l.275 : `{ school?, company? }`, URL ou data URI) ; `coverDataFrom` (l.279-306) ; aides `line`, `logoImg`, `nationalHeader` (l.314-325, « RÉPUBLIQUE DU CAMEROUN » / « REPUBLIC OF CAMEROON » en dur), `institutionBlock`, `supervision` (l.330-342 : « Présenté par », « Sous la direction de »), `extraLines`, `placeLine` ; **`coverHtml(d, style, logos)`** (l.352-386, branches `modern`, `minimal`, `classic`/`institutional`) ; **`coverCss(style, pageHeight, withBorder)`** (l.391-433). Une ligne dont la valeur est vide disparaît déjà (`line()`).
    - Appelants : `document-pdf.ts` l.84 et l.114 ; `src/features/documents/editorTemplate.ts` (aperçu et `coverCss(style, 'auto', true)` l.~728).
    - Word : `mobile-api/lib/document-docx.ts` `coverBlocks(d, style, logos)` (l.91-148), réécriture indépendante sans branche `modern` ni `minimal`.
    - Aucun test de la garde aujourd'hui.
  - **Fichiers :** créés : `mobile-api/lib/document-cover.ts` + `src/features/documents/documentCover.ts`, `mobile-api/tests/document-cover.test.mjs`, `mobile-api/tests/fixtures/cover-classic.txt`, `cover-modern.txt`, `cover-minimal.txt`, `cover-institutional.txt` ; modifiés : `document-style.ts` + copie (types des blocs, `cover.blocks`, `cover.departmentLogoFileId`), `document-style-schema.ts` (ou nouveau `lib/document-cover-schema.ts`), `document-render.ts` + copie, `mobile-api/tests/twin-files.test.mjs`, listes `LOCAL` de `document-pdf.test.mjs`, `document-docx.test.mjs`, `document-render.test.mjs`. Le Word est réécrit en 24.6.
  - **Étapes :**
    1. **Avant toute modification** : écrire un petit script (scratchpad) qui charge `coverHtml` actuel avec `loadTs`, rend les 4 gabarits avec des données fictives fixes (tous les champs remplis, `nationalHeader: true`) et `presetStyle(<preset correspondant>)`, retire les balises, normalise les espaces, et écrit `mobile-api/tests/fixtures/cover-<gabarit>.txt`. Ces fichiers sont la référence de non-régression.
    2. `document-style.ts` (+ copie) : déclarer `CoverAlign = 'left' | 'center' | 'right'` ; `CoverTextStyle = { align: CoverAlign; size: number /* pt, 8-28 */; bold: boolean; uppercase: boolean; underline: boolean; color: string | null }` ; union `CoverBlock` (chaque bloc a `id: string` et `style: CoverTextStyle`) :
       - `{ type: 'bilingual-header'; left: string[]; right: string[] }` (lignes, 0 à 8 par colonne, 120 caractères max) ;
       - `{ type: 'logos'; left: CoverLogoSlot | null; center: CoverLogoSlot | null; right: CoverLogoSlot | null; height: number }` avec `CoverLogoSlot = 'school' | 'company' | 'department'` ;
       - `{ type: 'title-banner'; prefix: string; variant: 'band' | 'frame' | 'plain' }` (rend `{title}` avec le préfixe, ex. « THÈME : ») ;
       - `{ type: 'heading'; text: string }` (texte fixe, ex. « RAPPORT DE STAGE ACADÉMIQUE », ou `{kindLabel}`) ;
       - `{ type: 'text'; template: string }` (phrase à trous : `{university}`, `{school}`, `{faculty}`, `{degree}`, `{title}`, `{subtitle}`, `{studentName}`, `{matricule}`, `{specialty}`, `{company}`, `{period}`, `{tutorCorporate}`, `{tutorAcademic}`, `{year}`, `{kindLabel}`) ;
       - `{ type: 'author'; label: string; matriculeLabel: string }` ;
       - `{ type: 'supervisors'; label: string; academicLabel: string; corporateLabel: string }` (deux colonnes) ;
       - `{ type: 'year-banner'; template: string; variant: 'band' | 'plain' }` ;
       - `{ type: 'spacer'; height: number /* mm, 2-60 */ }` ;
       - `{ type: 'extra-lines' }` (rend `cover.extraLines`).
       Ajouter `cover.blocks: CoverBlock[] | null` (défaut `null`, 0 à 30 blocs) et `cover.departmentLogoFileId: string | null` ; `resolveStyle` valide chaque bloc (type connu, longueurs, bornes), retire les blocs invalides ; `applyStylePatch` conserve `cover.blocks` et `departmentLogoFileId` au changement de preset.
    3. Schéma Zod des blocs (serveur seulement, `z.discriminatedUnion('type', [...])`, objets `.strict()`, mêmes bornes) branché dans `documentStylePatchSchema.cover`.
    4. `document-cover.ts` (n'importe que `./document-style` ; aucun littéral hexadécimal) : `export const coverBlocksFor = (template: CoverTemplate, nationalHeader: boolean): CoverBlock[]` (les 4 gardes actuelles exprimées en blocs, avec les mêmes textes : « RÉPUBLIQUE DU CAMEROUN », « Présenté par », « Sous la direction de », « Thème »…, qui existent déjà dans le code et ne viennent pas de la référence) ; `export const fillTemplate = (template: string, data: CoverFields): string | null` (renvoie `null` si un champ utilisé est vide : la ligne disparaît) ; `export const coverBlocksHtml = (blocks: CoverBlock[], data: CoverFields, style: DocumentStyle, logos: { school?: string | null; company?: string | null; department?: string | null }): string` (échappe toute valeur ; un bloc sans contenu ne produit rien ; `title-banner` `band` = fond `style.page.bandColor`, texte `style.headerFooter.headerTextColor`) ; `export const coverBlocksCss = (style: DocumentStyle): string`. Déclarer ici `CoverFields` (copie des champs de `CoverData`) pour éviter d'importer `document-render.ts` (pas d'import circulaire).
    5. `document-render.ts` (+ copie) : `coverHtml(d, style, logos)` garde sa signature et devient : `const blocks = style.cover.blocks ?? coverBlocksFor(style.cover.template, d.nationalHeader); return wrapper(coverBlocksHtml(blocks, d, style, logos))` (même conteneur `div.cover cover-<template>` qu'aujourd'hui) ; `coverCss` ajoute `coverBlocksCss(style)` aux règles existantes. `CoverLogos` gagne `department?`. `coverDataFrom` inchangé.
    6. Mettre à jour les listes `LOCAL` des tests (`lib/document-cover.ts`) et `document-render.test.mjs` (passage à `loadTsWithPackages`) ; ajouter la paire `document-cover.ts` ↔ `documentCover.ts` à `twin-files.test.mjs`.
  - **Tests à écrire :** `mobile-api/tests/document-cover.test.mjs` :
    - Non-régression : pour chaque gabarit, `coverHtml` (nouvelle version) avec les mêmes données et le même style que l'étape 1 → texte aplati égal à `fixtures/cover-<gabarit>.txt`.
    - Garde « de type référence » décrite en blocs **fictifs** (en-tête bilingue « Université Exemple » / « Example University », trois logos, `heading` « RAPPORT DE STAGE ACADÉMIQUE », `title-banner` « THÈME : », `text` « Stage effectué du {period} en vue de l'obtention du {degree} », `author` « Rédigé et présenté par : », `supervisors`, `year-banner`) : rendu avec tous les champs → contient « THÈME : <titre> », « Rédigé et présenté par : », le nom « Awa Test », « Sous l'encadrement de : » ; rendu avec seulement `title` et `studentName` → ne contient ni « Stage effectué », ni « Matricule », ni « Année académique », ni libellé d'encadreur orphelin.
    - Échappement : `studentName: '<script>x</script>'` → `&lt;script&gt;`.
    - `fillTemplate('du {period} au', { period: '' })` → `null`.
    - Bloc invalide (`type: 'video'`) → retiré par `resolveStyle`.
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec (dont `document-pdf` et `document-docx` existants) ; `npx tsc --noEmit` (racine et `mobile-api`) → code 0 ; `npm run lint:colors` → pas de hausse (si `documentCover.ts` devait contenir une couleur, revoir le code plutôt que l'exclure du garde-fou).
  - **Pièges :**
    - Créer les fixtures de non-régression **avant** de toucher au code, sinon la comparaison ne prouve rien.
    - En PDF, la bordure de garde est dessinée par pdf-lib (`coverCss(..., withBorder = false)`) : ne pas ajouter de cadre CSS qui ferait double emploi.
    - Le Word ne reproduisait déjà pas les gardes `modern` et `minimal` : 24.6 aligne le Word sur les blocs ; le noter dans la case de 24.6.
    - Les logos de l'aperçu sont des URL signées, ceux du PDF des data URI : `coverBlocksHtml` reçoit des chaînes déjà prêtes.
  - **Dépendances :** 24.1 (fichiers et test de parité). Aucune décision utilisateur.

- [ ] **Tâche 24.3 : Table des modèles**
  - **Pourquoi :** il faut un endroit en base pour enregistrer un modèle (style complet, garde, plan des sections, logos, aperçu, statut de publication, trace de l'import) et savoir de quel modèle un document est parti.
  - **État actuel :** dernière migration du dépôt `0008_section_interviews.sql` ; numéros réservés par le Module 23 : `0009` à `0012`. Type `Document` dans `mobile-api/lib/documents-db.ts` (l.4-25, sans `template_id`) ; copie divergente `recruiter-web/lib/documents-db.ts` (si 23.22 ne l'a pas supprimée). `app_document_files.document_id` est `not null` (`0006_document_files.sql`) : impossible d'y ranger les logos d'un modèle.
  - **Fichiers :** créés : `mobile-api/sql/0013_document_templates.sql`, `mobile-api/lib/templates-db.ts`, `mobile-api/lib/template-schema.ts`, `mobile-api/tests/templates-db.test.mjs` ; modifiés : `mobile-api/lib/documents-db.ts` (type `Document`), `recruiter-web/lib/documents-db.ts` (si elle existe encore).
  - **Étapes :**
    1. `0013_document_templates.sql` (idempotent) :
       - `create table if not exists public.app_document_templates (id uuid primary key default gen_random_uuid(), name text not null, establishment text not null default '', degree text not null default '', kind text not null default 'both', document_style jsonb not null, outline jsonb not null default '[]'::jsonb, logo_assets jsonb not null default '{}'::jsonb, preview_asset_id uuid, status text not null default 'draft', source_format text, source_report jsonb, created_by uuid references public.app_users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz)` ;
       - contraintes nommées (drop if exists / add) : `kind in ('stage','memoire','both')`, `status in ('draft','published','archived')`, `source_format is null or source_format in ('docx','pdf','manual')`, `char_length(name) between 1 and 120` ;
       - `create table if not exists public.app_template_assets (id uuid primary key default gen_random_uuid(), template_id uuid not null references public.app_document_templates(id) on delete cascade, role text not null, mime text not null, width integer not null default 0, height integer not null default 0, bytes integer not null, data bytea not null, sha256 text not null, created_at timestamptz not null default now())` + contraintes `role in ('logo','preview')`, `mime in ('image/png','image/jpeg','image/webp')`, `bytes <= 2097152` ;
       - `create index if not exists app_document_templates_status_idx on public.app_document_templates (status, establishment)` ;
       - `alter table public.app_documents add column if not exists template_id uuid references public.app_document_templates(id) on delete set null` (informatif : le document ne suit pas le modèle).
       Le plan des sections `outline` = tableau `{ title: string; system?: boolean }[]` ; `logo_assets` = `{ school?: <asset id>, company?: <asset id>, department?: <asset id> }`. Les blocs de garde sont dans `document_style.cover.blocks` (pas de colonne séparée) ; dans un modèle, `cover.schoolLogoFileId`, `companyLogoFileId`, `departmentLogoFileId` valent toujours `null` (les logos passent par `logo_assets`).
    2. Appliquer deux fois (accord utilisateur, guide du Module 23 §4).
    3. `lib/template-schema.ts` (zod) : `templateInputSchema = z.object({ name: z.string().trim().min(1).max(120), establishment: z.string().trim().max(120).default(''), degree: z.string().trim().max(120).default(''), kind: z.enum(['stage','memoire','both']), documentStyle: <schéma complet du style : documentStylePatchSchema + résolution>, outline: z.array(z.object({ title: z.string().trim().min(1).max(160), system: z.boolean().optional() }).strict()).max(40) }).strict()`.
    4. `lib/templates-db.ts` (fonctions qui prennent le pool en paramètre optionnel pour les tests) : `listTemplates({ status?, establishment? })`, `getTemplate(id)`, `createTemplate(input, adminAppUserId, source?)`, `updateTemplate(id, patch)` (refuse si `status = 'archived'`), `setTemplateStatus(id, next)` (transitions permises : `draft → published`, `published → draft`, `draft|published → archived` ; publier exige un nom, un style valide et au moins une section dans `outline`), `addTemplateAsset(templateId, role, file)` (contrôle du type réel par `detectFileType` de `lib/file-validation.ts`, 2 Mo max), `getTemplateAsset(id)`, `listPublishedTemplates({ establishment? })` (colonnes légères + aperçu). `document_style` est toujours passé par `resolveStyle` à la lecture et à l'écriture.
    5. Ajouter `template_id?: string | null` au type `Document` (et à la copie `recruiter-web` si elle existe).
  - **Tests à écrire :** `mobile-api/tests/templates-db.test.mjs` :
    - `loadTsWithPackages('lib/template-schema.ts', ['lib/document-style.ts', 'lib/document-style-schema.ts', …])` : entrée valide → acceptée ; `name: ''` → rejetée ; `kind: 'cv'` → rejetée ; clé inconnue → rejetée ; `outline` de 41 sections → rejetée.
    - Transitions (fonction pure `canTransition(current, next)` exportée par `templates-db.ts` ou un module sans import) : `draft → published` vrai ; `archived → published` faux ; `published → draft` vrai.
    - Garde de source sur `0013_document_templates.sql` : chaque `create table` / `add column` contient `if not exists`.
  - **Vérification (DoD) :** migration 0013 appliquée deux fois sans erreur (sortie notée) ; `select column_name from information_schema.columns where table_name = 'app_documents' and column_name = 'template_id'` → 1 ligne ; `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` (mobile-api, et recruiter-web si modifié) → code 0.
  - **Pièges :**
    - `on delete set null` sur `template_id` : un modèle supprimé ne supprime aucun document. Préférer de toute façon l'archivage à la suppression.
    - `bytea` : renvoyer les images en data URI ou en flux binaire, jamais en JSON brut de `Buffer`.
    - `0013` doit s'appliquer après `0012` (les deux touchent des tables différentes, mais garder l'ordre).
  - **Dépendances :** 24.1 et 24.2 (le style complet avec `cover.blocks`). Aucune décision utilisateur.

### 2. Rendu fidèle partout
- [ ] **Tâche 24.4 : Écran (éditeur et aperçu)**
  - **Pourquoi :** l'étudiant doit voir dans l'éditeur et dans l'aperçu exactement ce que donneront le PDF et le Word : bandeau d'en-tête, pied auteur avec numéro encadré, titres CHAPITRE / SECTION / I., légendes, puces ❖, dédicace encadrée et garde par blocs.
  - **État actuel :** `src/features/documents/editorTemplate.ts` (785 l., aucun littéral hexadécimal, `const c = stitchColors` l.49) : `frameCss(style)` (l.52-108), `sectionAttributes` (l.110-115, pose `--chapter`), `buildWysiwygHtml` (l.117, `styleToCss(style, { cssNumbering: true })` l.196), `runningStrip(slots, values)` (l.664-668), `buildPreviewHtml(doc, sections, style, logos)` (l.671 et suivantes : valeurs des emplacements l.698-705, en-tête seulement dans le corps l.706, pied l.707, CSS l.720-740 dont `coverCss(style, 'auto', true)` l.728), `buildStyleSampleHtml(style)` (l.762-785). `DocumentEditorScreen.tsx` : `COVER_FIELDS` (l.44-58), logos de l'aperçu résolus par `resolveFileUrls` (l.476-487).
  - **Fichiers :** modifiés : `src/features/documents/editorTemplate.ts`, `src/features/documents/DocumentEditorScreen.tsx` (logo de département, champ « Libellé auteur » si besoin), `mobile-api/lib/document-render.ts` + `documentRender.ts` (règles CSS partagées seulement).
  - **Étapes :**
    1. Les règles qui doivent apparaître partout (titres, légendes, puces, dédicace, blocs de garde) vont dans `styleToCss`/`coverCss` (fichier partagé, faits en 24.1/24.2) ; vérifier simplement qu'elles s'affichent dans l'éditeur et l'aperçu.
    2. Aperçu : `runningStrip` reçoit le style ; si `headerFooter.headerStyle === 'band'`, l'en-tête du corps devient une bande pleine largeur (fond `style.page.bandColor`, texte `style.headerFooter.headerTextColor`, majuscules, gras) portant le titre du document ; pied : si `authorLabel` est non vide, l'emplacement `author` affiche « <authorLabel> <nom> » ; si `footerRule`, filet au-dessus du pied ; si `pageNumberFrame === 'box'`, le numéro est dans un petit cadre (bordure 1px de la couleur d'accent). Ces règles CSS sont propres à l'aperçu (dans `buildPreviewHtml`) et utilisent les couleurs du style passées en variables CSS (`style="--band: …"`), aucune couleur littérale.
    3. Pages préliminaires : en-tête bandeau aussi sur les pages ≥ 2 de la référence (préliminaires comprises) ; si la décision de 24.5 diffère, appliquer la même règle ici (une seule fonction `showsHeaderBand(kind, style)` partagée).
    4. `DocumentEditorScreen.tsx` : ajouter « Logo du département » à côté des deux logos existants (même mécanisme d'envoi), passé à l'aperçu comme `logos.department`.
    5. Échantillon du panneau (`buildStyleSampleHtml`) : montrer une puce, une légende et un titre dans le schéma choisi.
  - **Tests à écrire :** pas de test unitaire de l'aperçu (fichier RN) ; les règles partagées sont testées en 24.1/24.2. Garde de source dans `twin-files.test.mjs` : `editorTemplate.ts` ne contient aucun `#[0-9A-Fa-f]{3,6}`.
  - **Vérification (DoD) :** `npx tsc --noEmit` (racine) → code 0 ; `npm run lint:colors` → pas de hausse ; navigateur (expo-web) à 375 px, document de test aux données fictives avec le style « type référence » (bandeau, auteur, numéro encadré, schéma CHAPITRE/SECTION/I., légendes document, puces ❖, dédicace encadrée, garde par blocs) : captures `.agent/screenshots/m24-preview-garde.png`, `m24-preview-chapitre.png`, `m24-preview-dedicace.png`, `m24-editeur.png` ; contrôle `document.documentElement.scrollWidth <= window.innerWidth` dans la console (outil JavaScript du navigateur) → vrai (aucun défilement horizontal).
  - **Pièges :**
    - Une règle ajoutée seulement dans `frameCss` ou `buildPreviewHtml` n'existe ni dans l'éditeur ni dans le PDF : choisir le bon endroit.
    - À 375 px, la garde à deux colonnes (en-tête bilingue, encadreurs) doit se réduire sans déborder (texte qui passe à la ligne, pas de largeur fixe en px).
  - **Dépendances :** 24.1, 24.2. Aucune décision utilisateur.

- [ ] **Tâche 24.5 : PDF**
  - **Pourquoi :** le PDF est le document que l'étudiant dépose : il doit porter le bandeau d'en-tête, le pied auteur avec numéro encadré, la garde par blocs, les légendes numérotées sur tout le document et un sommaire lisible (chapitres en gras, sections en retrait, vrais numéros).
  - **État actuel :**
    - `mobile-api/lib/pdf-pagination.ts` (145 l.) : `PageStamp` (l.31-37), `StampOptions` (l.39-44), `safeText` (l.52-68, remplace tout caractère hors WinAnsi par `?`), `fit` (l.70-75), **`stampPdf`** (l.88-145) : une seule police régulière Times ou Helvetica (l.90), texte gris 9 pt, en-tête à `height - m/2 - 2` (l.112), filet d'en-tête (l.127-129), pied en trois tiers (l.131-141). Ordre d'écriture : en-tête gauche, droite, pied gauche, centre, droite.
    - `mobile-api/lib/document-pdf.ts` (249 l.) : `tocHtml` (l.28-33), `PRINT_CSS` (l.43-63 : `toc-l1` en retrait, pas en gras ; dédicace `padding-top: 110mm` l.61), `buildPdfHtml` (l.65-122 ; garde l.84), `computeLayout` (l.132-156), `slotText` (l.167-185), **`buildStamps`** (l.187-219 : en préliminaires seul le numéro est imprimé, l.210), `renderDocumentPdf` (l.223-249, deux passes).
    - `mobile-api/tests/document-pdf.test.mjs` : attend aujourd'hui « Figure 1.1 » / « Figure 2.1 » (l.~70) et utilise `lastToken` (l.~62).
  - **Fichiers :** modifiés : `mobile-api/lib/pdf-pagination.ts`, `mobile-api/lib/document-pdf.ts`, `mobile-api/lib/document-numbering.ts` (sommaire), `mobile-api/tests/document-pdf.test.mjs`.
  - **Étapes :**
    1. `PageStamp` : ajouter `band?: { color: string; textColor: string; text: string }`, `footerRule?: boolean`, `numberFrame?: boolean`. `stampPdf` : embarquer aussi la police grasse (`StandardFonts.TimesRomanBold` ou `HelveticaBold`) ; si `band` : `drawRectangle` pleine largeur entre `height - m + 6` et `height - 6` (à ajuster pour ne pas toucher le texte du corps), dessiné **avant** tout texte, puis le texte en gras, majuscules, couleur `textColor`, centré, tronqué par `fit` ; si `footerRule` : `drawLine` au-dessus du pied (même style que le filet d'en-tête) ; si `numberFrame` : `drawRectangle` (bordure seule, couleur d'accent) autour du texte du numéro calculé avec `widthOfTextAtSize`. **Écrire le numéro de page en dernier.**
    2. `buildStamps` : bandeau sur toutes les pages sauf la garde (décision du plan : « chaque page après la garde ») quand `headerStyle === 'band'`, texte = titre du document en majuscules ; pied gauche = `authorLabel + ' ' + studentName` quand `authorLabel` est non vide (aussi en préliminaires, comme la référence) ; `footerRule` et `numberFrame` selon le style ; en préliminaires, le numéro reste en chiffres romains minuscules.
    3. Largeur du pied : quand le pied gauche porte le libellé auteur, lui donner deux tiers de la largeur (le centre est vide dans ce cas) pour éviter la troncature d'un nom normal ; garder `fit` pour les noms très longs.
    4. Sommaire : `numberDocument` marque les entrées de chapitre (`level: 1` dont le titre de section est un chapitre) avec `chapter: true` ; `tocHtml` leur donne la classe `toc-chapter` (gras, sans retrait) ; les sections (`level: 2`) gardent le retrait ; numéros de page réels inchangés (deux passes).
    5. Légendes « sur tout le document » : déjà produites en texte par `numberDocument` (24.1) ; rien de plus en PDF.
    6. Garde par blocs : déjà dans le HTML via `coverHtml` (24.2) ; vérifier que le bandeau « THÈME : » et le bandeau d'année gardent leur fond à l'impression (`print-color-adjust: exact` dans `coverBlocksCss`).
  - **Tests à écrire :** dans `mobile-api/tests/document-pdf.test.mjs`, nouveau cas « modèle type référence » (données fictives : titre « Gestion des stocks », auteur « Awa Test », deux chapitres contenant chacun une figure, une dédicace, un sommaire) avec le style : `headerStyle: 'band'`, `authorLabel: 'Rédigé et présenté par :'`, `footerRule: true`, `pageNumberFrame: 'box'`, `captions.scope: 'document'`, `numbering: 'chapter-section-roman'` :
    - page 2 et suivantes : le texte contient `GESTION DES STOCKS` ; page 1 (garde) ne le contient pas en en-tête (vérifier la position `y` haute via `item.transform[5]` si le titre figure aussi sur la garde).
    - pied : le texte de la page 2 contient `Rédigé et présenté par : Awa Test`.
    - légendes : « Figure 1 : » dans le chapitre 1 et « Figure 2 : » dans le chapitre 2 (pas « Figure 2.1 »).
    - numéros : `lastToken` des pages préliminaires = `i`, `ii`… puis `1` sur la première page du corps.
    - titres : `SECTION 1 :` et `I.` présents.
    - les cas existants (« Figure 1.1 » par défaut, etc.) passent toujours.
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec (navigateur Chromium requis localement pour `document-pdf.test.mjs`) ; `npx tsc --noEmit` → code 0 ; PDF de test enregistré dans le scratchpad et ouvert : bandeau, pied et cadre visibles (capture `.agent/screenshots/m24-pdf-page2.png`).
  - **Pièges :**
    - `safeText` remplace sans erreur tout caractère hors WinAnsi par `?` : ne mettre ni ❖ ni emoji dans un texte tamponné ; « É », « ’ », « – » passent.
    - Le bandeau ne doit pas chevaucher le corps : ses coordonnées dépendent de la marge ; tester les trois marges (`narrow`, `normal`, `wide`).
    - Si le numéro encadré est dessiné avant le pied auteur, les tests `lastToken` échouent.
  - **Dépendances :** 24.1, 24.2. Aucune décision utilisateur.

- [ ] **Tâche 24.6 : Word**
  - **Pourquoi :** beaucoup d'encadreurs demandent le fichier Word. Il doit reprendre le même modèle : en-tête ombré, pied auteur avec champ de page encadré, garde par blocs (colonnes, trois logos, bandeaux), légendes et puces du modèle.
  - **État actuel :** `mobile-api/lib/document-docx.ts` (369 l.) : `logoRun` (l.51-57), `centered` (l.59-64), `NO_BORDERS` / `twoColumns` (l.66-86), `coverBlocks` (l.91-148, deux logos seulement), `slotLine` (l.151-183, sans ombrage ; `ShadingType` n'est pas importé dans ce fichier), `pageChildren` (l.185-189), `buildDocumentDocx` (l.207-369 : sections garde / préliminaires en romain / corps ; styles `LegendeFigure`, `LegendeTableau` l.343-356 ; dédicace l.258-262). `mobile-api/lib/html-to-docx.ts` : `docxNumberingConfig` (l.35-49, une seule liste numérotée), puces `{ bullet: { level } }` (l.290), légendes (l.327-335, l.378, l.383). Route d'export : `app/api/mobile/documents/[id]/export/docx/route.ts` (logos `school`, `company` l.66-68).
  - **Fichiers :** modifiés : `mobile-api/lib/document-docx.ts`, `mobile-api/lib/html-to-docx.ts`, `app/api/mobile/documents/[id]/export/docx/route.ts` (logo de département), `mobile-api/tests/document-docx.test.mjs`.
  - **Étapes :**
    1. Importer `ShadingType` (et `BorderStyle` si absent) depuis `docx`. `slotLine` : option `band?: { fill: string; color: string }` → paragraphe avec `shading: { type: ShadingType.CLEAR, color: 'auto', fill }`, texte en gras, majuscules, couleur `color`, centré ; option `numberFrame` → le `TextRun` du numéro reçoit une bordure (`border: { style: BorderStyle.SINGLE, size: 6, color: <accent> }`) ; option `topRule` pour le filet au-dessus du pied.
    2. En-tête : bandeau (titre du document) sur les sections préliminaires et corps quand `headerStyle === 'band'` (même règle que 24.5). Pied : `authorLabel + nom` à gauche, numéro (champ PAGE) à droite, encadré si `pageNumberFrame === 'box'`.
    3. Garde : réécrire `coverBlocks` à partir de la liste de blocs (`style.cover.blocks ?? coverBlocksFor(...)`, 24.2) : `bilingual-header` et `supervisors` → `twoColumns` sans bordure ; `logos` → tableau sans bordure à trois cellules (gauche, centre, droite) avec `logoRun` ; `title-banner` `band` et `year-banner` `band` → paragraphe ombré (`fill` = `bandColor`) ; `frame` → paragraphe avec bordure ; `heading`/`text`/`author` → paragraphes avec l'alignement, la taille (demi-points = pt × 2), le gras, les majuscules et le soulignement du bloc ; `spacer` → paragraphe vide avec espacement (`mm × 56,7` twips) ; champ vide → aucun paragraphe. Les 4 gardes historiques passent par le même chemin (le Word suit désormais aussi `modern` et `minimal` ; le noter dans la case).
    4. Puces : ajouter à `docxNumberingConfig` une référence `campus360-bullets` (`LevelFormat.BULLET`, texte `❖` au niveau 0 avec la police `Segoe UI Symbol`, `•` aux niveaux suivants) utilisée quand `lists.bullet === 'diamond'` ; sinon garder `{ bullet: { level } }`.
    5. Légendes : styles `LegendeFigure` et `LegendeTableau` selon `captions.style` (italique centré ou gras à gauche) ; le texte « Figure n : » vient déjà de `numberDocument`.
    6. Dédicace encadrée : bordure sur les paragraphes de la dédicace quand `dedication.frame`, sans réduire l'espacement qui la pousse en bas de page.
    7. Route d'export : charger aussi `departmentLogoFileId` et le passer dans `logos.department`.
  - **Tests à écrire :** dans `mobile-api/tests/document-docx.test.mjs`, nouveau cas avec le même style « type référence » que 24.5 (données fictives) :
    - `word/header*.xml` contient `<w:shd` et le titre en majuscules.
    - le texte concaténé des `<w:t>` de `word/footer*.xml` contient `Rédigé et présenté par : Awa Test` ; un champ `PAGE` est présent avec une bordure (`<w:bdr`).
    - `word/document.xml` : « Figure 1 : » puis « Figure 2 : » ; la garde contient « THÈME : » et trois images (`<w:drawing` ×3 quand trois logos sont fournis).
    - `word/numbering.xml` contient `w:val="❖"`.
    - les cas existants passent.
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` → code 0 ; fichier `.docx` de test enregistré dans le scratchpad et **ouvert par l'utilisateur dans Word** (et LibreOffice si possible) : bandeau, pied, cadre du numéro, puces ❖ et garde corrects ; retour de l'utilisateur noté dans la case.
  - **Pièges :**
    - Le texte d'un `w:t` peut être découpé en plusieurs `w:r` : tester le texte concaténé.
    - `Segoe UI Symbol` n'existe pas sur tous les systèmes : vérifier le rendu dans LibreOffice ; à défaut, `Wingdings` (caractère `v`) en dernier recours, à noter.
    - Le champ PAGE n'affiche sa valeur qu'à l'ouverture dans Word (`updateFields: true` déjà présent).
  - **Dépendances :** 24.1, 24.2. Aucune décision utilisateur.

### 3. Recopier un design (import)
- [ ] **Tâche 24.7 : Import Word (.docx) → modèle**
  - **Pourquoi :** la plupart des établissements diffusent leur gabarit en Word. Lire ce fichier permet de recopier presque exactement sa mise en page (polices, titres, marges, en-tête, pied, garde) au lieu de la reconstruire à la main.
  - **État actuel :**
    - Dépendances de `mobile-api/package.json` : `docx`, `mammoth`, `pdf-lib`, `pdfjs-dist`, `puppeteer`, `zod`. **`jszip` n'est pas une dépendance directe** : elle n'est présente que comme dépendance de `docx` (lockfile) et `mobile-api/tests/document-docx.test.mjs` l'importe déjà.
    - `mobile-api/lib/source-extraction.ts` : `zipUncompressedTotal(data)` (l.85, lit le répertoire central du ZIP) et `MAX_DOCX_UNCOMPRESSED_BYTES = 100 Mo` (l.14) : défense contre les bombes de décompression, à réutiliser. `mammoth` n'extrait que le texte (inutile pour les styles).
    - `mobile-api/lib/file-validation.ts` : `detectFileType` (l.44, DOCX = en-tête `PK\x03\x04` + `word/document.xml`), `MAX_SOURCE_BYTES = 20 Mo` (l.13), `validateUpload` (l.88).
    - Le style cible est `DocumentStyle` (24.1) avec `cover.blocks` (24.2).
    - Fixtures : `mobile-api/tests/fixtures/build-fixtures.mjs` (génère `source.docx` avec `docx`).
  - **Fichiers :** modifiés : `mobile-api/package.json` (+ `package-lock.json`), `mobile-api/tests/fixtures/build-fixtures.mjs` ; créés : `mobile-api/lib/ooxml.ts`, `mobile-api/lib/template-import-docx.ts`, `mobile-api/tests/template-import-docx.test.mjs`, `mobile-api/tests/fixtures/template-reference-like.docx` (fictif, généré).
  - **Étapes :**
    1. Décision appliquée : ajouter `jszip` comme dépendance directe (`cd mobile-api && npm install jszip@^3.10.1`) ; aucune autre bibliothèque XML (pas de nouveau parseur) : la lecture XML se fait par fonctions ciblées dans `lib/ooxml.ts`.
    2. `lib/ooxml.ts` (aucun import) : `rejectDtd(xml)` (lève si `<!DOCTYPE` ou `<!ENTITY` apparaît : pas de XXE possible) ; `elements(xml, tag)` (renvoie les fragments `<w:tag …>…</w:tag>` et auto-fermants) ; `attr(fragment, name)` ; `textOf(fragment)` (concatène les `<w:t>` et décode `&amp; &lt; &gt; &quot; &apos;`). Fonctions courtes et testées une par une.
    3. `lib/template-import-docx.ts` : `export const importDocxTemplate = async (data: Buffer): Promise<{ style: DocumentStyle; outline: { title: string }[]; logos: { slot: 'school' | 'company' | 'department'; mime: string; data: Buffer }[]; report: { sure: string[]; guessed: string[]; missing: string[] } }>` :
       - Garde-fous : `data.length <= 20 Mo` sinon erreur « Fichier trop volumineux (20 Mo maximum). » ; `detectFileType(data)?.kind` doit être DOCX sinon « Ce fichier n'est pas un document Word (.docx). » ; `zipUncompressedTotal(data) <= 100 Mo` ; après `JSZip.loadAsync`, au plus 500 entrées et 5 Mo par fichier XML lu ; `rejectDtd` sur chaque XML lu.
       - `word/styles.xml` : style `Normal` (police `w:rFonts`, taille `w:sz` en demi-points → `typography.bodySize`, interligne `w:spacing w:line` / 240 → `lineSpacing`, alignement `w:jc`) ; `Heading1`-`Heading3` (police, taille, gras `w:b`, majuscules `w:caps`, couleur `w:color`, alignement) → `headings.*` ; style de légende (`Caption`/`Légende`) → `captions.style`. Polices hors `STYLE_FONTS` → police la plus proche (`Times New Roman` pour une police à empattements, `Arial` sinon) et mention dans `guessed`.
       - `word/document.xml` : `w:sectPr` (marges `w:pgMar` en twips → `narrow`/`normal`/`wide` au plus proche, bordures `w:pgBorders` → `page.border`, formats `w:pgNumType w:fmt` → numérotation romaine puis arabe) ; contenu avant le premier saut de section ou de page = garde → blocs (`w:tbl` à deux colonnes de texte → `bilingual-header` ou `supervisors` selon la position ; paragraphes ombrés `w:shd` → `title-banner`/`year-banner` `band` avec `bandColor` = `w:fill` ; images `w:drawing` → bloc `logos` et extraction des fichiers `word/media/*` correspondants (PNG/JPEG seulement, 2 Mo max chacun) ; paragraphe contenant « Rédigé et présenté par » → bloc `author` avec ce libellé ; « THÈME » → préfixe du `title-banner` ; autres textes → `heading` si en majuscules et gras, sinon `text`). **Les textes propres au rapport (noms, entreprise, titre réel, dates) ne sont pas recopiés** : remplacer par le champ correspondant (`{studentName}`, `{title}`, `{company}`, `{year}`, `{period}`) quand la position est reconnue, sinon retirer la ligne et l'indiquer dans `missing`. Seuls les libellés génériques connus sont conservés tels quels (liste fermée dans le code : « Rédigé et présenté par », « Présenté par », « Sous l'encadrement de », « Sous la direction de », « THÈME », « Année académique », « Encadreur académique », « Encadreur professionnel », « Matricule », « RAPPORT DE STAGE », « MÉMOIRE », « République du Cameroun », « Republic of Cameroon », « Paix – Travail – Patrie », « Peace – Work – Fatherland »).
       - `word/header*.xml` / `footer*.xml` : ombrage → `headerStyle: 'band'`, `bandColor`, `headerTextColor` ; texte contenant le titre → emplacement `title` ; libellé auteur → `authorLabel` + emplacement `author` à gauche ; champ `PAGE` → emplacement du numéro, bordure `w:bdr` → `pageNumberFrame: 'box'` ; `w:pBdr w:top` → `footerRule`.
       - `word/numbering.xml` : `w:lvlText w:val="❖"` (ou `v` en Wingdings) → `lists.bullet: 'diamond'`.
       - Plan : titres de niveau 1 du corps (`Heading1` ou style de titre détecté) → `outline` (titres génériques seulement : ceux qui correspondent aux sections usuelles — Dédicace, Remerciements, Sommaire, Résumé, Abstract, Liste des figures, Liste des tableaux, Liste des abréviations, Introduction générale, Chapitre n, Conclusion générale, Références bibliographiques, Table des matières, Annexes ; un titre de chapitre devient « Chapitre n » sans son intitulé).
       - Chaque réglage lu est ajouté à `report.sure` (« Police du texte : Times New Roman 12 ») ; chaque réglage déduit à `guessed` ; chaque élément attendu absent à `missing`. Le style final passe par `resolveStyle`.
    4. `build-fixtures.mjs` : générer `template-reference-like.docx` **fictif** avec `docx` : styles Times New Roman 12, interligne 1,5 ; garde avec tableau bilingue (« Université Exemple » / « Example University »), trois petites images PNG générées (carrés de couleur), paragraphe ombré « THÈME : SUJET FICTIF », « Rédigé et présenté par : » + « Awa Test », tableau d'encadreurs ; en-tête ombré avec « SUJET FICTIF » ; pied « Rédigé et présenté par : Awa Test » + champ PAGE encadré ; une liste à puces ❖ ; deux chapitres. Lancer `node tests/fixtures/build-fixtures.mjs` depuis `mobile-api/`.
  - **Tests à écrire :** `mobile-api/tests/template-import-docx.test.mjs` :
    - `loadTs('lib/ooxml.ts')` : `rejectDtd('<!DOCTYPE x [<!ENTITY a "b">]><w:t/>')` → lève ; `textOf('<w:r><w:t>A&amp;B</w:t></w:r>')` → `'A&B'`.
    - Aller-retour : `buildDocumentDocx` (24.6) avec `presetStyle('classique')` puis `importDocxTemplate` → `typography`, `headings.numbering`, `page.margins`, `headerFooter.numberFormat` égaux à l'original ; idem avec le style « type référence » de 24.5 (`headerStyle: 'band'`, `authorLabel`, `pageNumberFrame: 'box'`, `lists.bullet: 'diamond'`).
    - Fixture fictive : blocs obtenus dans l'ordre `bilingual-header`, `logos` (3 emplacements), `title-banner` (préfixe « THÈME : »), `author` (libellé « Rédigé et présenté par : »), `supervisors` ; `logos.length === 3` ; aucun bloc ne contient « Awa Test » ni « SUJET FICTIF » (remplacés par des champs) ; `outline` contient « Chapitre 1 » et « Chapitre 2 ».
    - Refus : un PDF renommé `.docx` → erreur « n'est pas un document Word » ; un tampon de 21 Mo → erreur « trop volumineux ».
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` → code 0 ; `grep -n '"jszip"' mobile-api/package.json` → 1 ligne.
  - **Pièges :**
    - Un `.docx` est un ZIP : ne jamais écrire sur disque à partir des noms d'entrées.
    - Les couleurs Word peuvent valoir `auto` ou un thème (`w:themeColor`) : traiter comme absentes (`guessed`).
    - Ne jamais recopier un texte libre du document dans le modèle sauf s'il figure dans la liste fermée de libellés génériques.
  - **Dépendances :** 24.1, 24.2, 24.6 (pour l'aller-retour). Aucune décision utilisateur (choix de `jszip` acté ici).

- [ ] **Tâche 24.8 : Import PDF → modèle (approché)**
  - **Pourquoi :** souvent l'établissement ou l'étudiant n'a que le PDF d'un ancien rapport (c'est le cas du premier modèle). Analyser ses pages donne un brouillon proche que l'admin corrige, au lieu de tout régler à la main.
  - **État actuel :**
    - `mobile-api/lib/source-extraction.ts` l.37-76 : `await import('pdfjs-dist/legacy/build/pdf.mjs')`, `getDocument({ data, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 })`, `MAX_PDF_PAGES = 200`, gestion de `PasswordException`. Aucun code ne lit aujourd'hui `fontName`, `transform`, `height` des éléments de texte, ni les opérateurs graphiques (`getOperatorList`) ni les images.
    - `mobile-api/lib/llm.ts` : `LlmMessage = { role; content: string }` (texte seul) ; aucun appel « vision ».
    - `mobile-api/lib/pdf-render.ts` : lancement de Puppeteer réutilisable (rendu de la page 1 en image si l'IA de vision est utilisée).
  - **Fichiers :** créés : `mobile-api/lib/template-import-pdf.ts`, `mobile-api/lib/pdf-layout.ts`, `mobile-api/tests/template-import-pdf.test.mjs` ; modifiés (seulement si l'IA de vision est acceptée) : `mobile-api/lib/llm.ts`, `mobile-api/.env.example`.
  - **Étapes :**
    1. `lib/pdf-layout.ts` (pur, testable) : à partir d'une liste d'éléments `{ page, str, x, y, size, font, bold, italic }` et de rectangles `{ page, x, y, w, h, fill }`, calculer : taille du corps = taille la plus fréquente pondérée par le nombre de caractères ; titres = tailles supérieures (gras si `font` contient `Bold`) ; alignement d'une ligne = position du début et de la fin par rapport aux marges (centré si les écarts gauche et droit diffèrent de moins de 5 %) ; marges = min/max de `x` et `y` sur les pages du corps ; en-tête et pied = texte identique (après remplacement des chiffres) en haut ou en bas sur au moins 3 pages ; format des numéros = chiffres romains puis arabes en bas de page ; bandeaux = rectangles pleins en haut de page (couleur, hauteur) ; légendes = lignes qui commencent par `Figure \d+` / `Tableau \d+` (italique si `italic`) ; numérotation des légendes = `document` si les numéros continuent d'un chapitre à l'autre, sinon `chapter`. Chaque valeur renvoyée a la forme `{ value, confidence: 0..1, source: 'measured' | 'guessed' }`.
    2. `lib/template-import-pdf.ts` : `importPdfTemplate(data: Buffer, options: { useVision: boolean }): Promise<{ style; outline; logos; report }>` (même forme de sortie que 24.7, plus la confiance par réglage dans `report`) ; garde-fous : 20 Mo, type PDF réel (`detectFileType`), 60 pages maximum (`MAX_TEMPLATE_PDF_PAGES`), PDF protégé → « Ce PDF est protégé par un mot de passe. ». Lecture : `getTextContent()` (taille = `Math.hypot(transform[2], transform[3])`, position = `transform[4]`, `transform[5]`, tri par `y` décroissant puis `x`), `getOperatorList()` pour les rectangles remplis et les images de la page 1 (`OPS.paintImageXObject`, puis `page.objs.get(nom)` → PNG via `pdf-lib`/`sharp` n'est pas disponible : encoder les données RGBA en PNG avec une petite fonction maison ou ignorer l'image et le signaler dans `missing`). Garde reconstituée en blocs selon les mêmes règles que 24.7 (libellés génériques seulement, champs à la place des textes propres).
    3. IA de vision (optionnelle, seulement si l'utilisateur l'accepte, voir Dépendances) : rendre la page 1 en PNG (Puppeteer + pdf.js dans une page HTML locale, réseau coupé), l'envoyer avec la consigne « décris la disposition en JSON selon ce schéma » à un modèle multimodal défini par `OPENROUTER_VISION_MODEL` ; étendre `LlmMessage.content` à `string | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[]` ; valider la réponse par un schéma Zod strict ; ne l'utiliser que pour les blocs à faible confiance. Sans accord, `useVision` reste `false` et le rapport le dit.
  - **Tests à écrire :** `mobile-api/tests/template-import-pdf.test.mjs` :
    - `loadTs('lib/pdf-layout.ts')` avec des éléments synthétiques : 200 caractères en 12 pt et 20 en 16 pt gras → corps 12, titre 16 gras ; « Page 3 » en bas de 4 pages → pied détecté ; légendes « Figure 1 » (chapitre 1) et « Figure 2 » (chapitre 2) → `scope: 'document'`.
    - PDF généré par notre export (`renderDocumentPdf`, style « type référence » de 24.5, données fictives) → `importPdfTemplate` retrouve : corps 12 pt (confiance ≥ 0,8), `headerStyle: 'band'` et sa couleur, `authorLabel` « Rédigé et présenté par : », numéros romains puis arabes, `captions.scope: 'document'`. Test lent (Puppeteer) : même délai que `document-pdf.test.mjs`.
    - PDF protégé ou de 61 pages (généré avec `pdf-lib`) → refus avec le bon message.
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` → code 0 ; import du rapport de référence fait **en 24.12** (pas ici), rapport d'extraction relu par l'utilisateur.
  - **Pièges :**
    - `getTextContent()` ne suit pas l'ordre de lecture : les deux colonnes FR/EN de la garde s'entremêlent ; regrouper par colonne (`x`) avant de former des lignes.
    - `disableFontFace: true` peut rendre `fontName` peu parlant sur un PDF issu de Word : utiliser aussi `styles[fontName].fontFamily` du `textContent`.
    - L'image de la page 1 du rapport de référence contient des données personnelles : aucun envoi à un service externe sans accord écrit, aucun enregistrement dans les journaux.
  - **Dépendances :** 24.1, 24.2, 24.5 (PDF de test). **À demander à l'utilisateur avant d'écrire l'étape 3 :** accepte-t-il qu'une image de la page de garde soit envoyée à un modèle d'IA via OpenRouter (et lequel, `OPENROUTER_VISION_MODEL`) ? Sinon, l'import se fait sans vision.

### 4. Admin : atelier des modèles
- [ ] **Tâche 24.9 : API admin des modèles**
  - **Pourquoi :** l'admin doit pouvoir créer, importer, retoucher, publier et archiver des modèles, sans qu'un étudiant ou un inconnu puisse le faire.
  - **État actuel :**
    - `recruiter-web/lib/access.ts` : `isAdmin` (l.83, rôle `admin`/`super_admin` ou e-mail dans `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_ALLOWED_EMAILS`), `requireAdminPage` (l.90), `requireAdminApi` (l.98, 401 sans session, 403 sans rôle). Exemple de route admin : `recruiter-web/app/api/admin/stages/route.ts` (`const { response, user } = await requireAdminApi(); if (response) return response;`).
    - `recruiter-web` n'a ni accès au disque des fichiers ni à `mobile-api/lib`, ni `jszip` ni `mammoth` ; `mobile-api` n'a pas de dossier `app/api/admin` et l'admin web n'a pas de jeton de session `mobile-api` utilisable côté navigateur (cookie `httpOnly` d'un autre domaine).
    - D'où la décision du guide (§1) : logique dans `mobile-api/app/api/admin/templates/*` protégée par un secret de service, relais authentifié dans `recruiter-web`.
  - **Fichiers :** créés dans `mobile-api` : `lib/admin-service.ts`, `app/api/admin/templates/route.ts` (GET liste, POST créer), `app/api/admin/templates/[id]/route.ts` (GET, PATCH), `app/api/admin/templates/[id]/status/route.ts` (POST `{ status }`), `app/api/admin/templates/[id]/assets/route.ts` (POST logo), `app/api/admin/templates/import/route.ts` (POST multipart .docx/.pdf), `app/api/admin/templates/preview/route.ts` (POST style → HTML d'aperçu), `tests/admin-templates.test.mjs` ; dans `recruiter-web` : `app/api/admin/templates/[...path]/route.ts` (relais), `lib/mobile-api-proxy.ts` ; modifiés : `.env.example` des deux services.
  - **Étapes :**
    1. `mobile-api/lib/admin-service.ts` : `export const checkAdminService = (headers: { get(n: string): string | null }, env): { ok: true; adminUserId: string } | { ok: false; status: 401 }` (secret `x-admin-service-key` comparé à `ADMIN_SERVICE_SECRET` à temps constant ; secret absent côté serveur → toujours 401 ; `x-admin-user-id` non vide) ; puis `requireAdminService(request)` qui, après ce contrôle, vérifie en base que `x-admin-user-id` correspond à un `public."user"` de rôle `admin` ou `super_admin` (sinon 403 `{ error: 'Accès réservé aux administrateurs.' }`) et renvoie l'`app_users.id` correspondant (pour `created_by`).
    2. Routes `mobile-api` (toutes `runtime = 'nodejs'`, `requireAdminService` en premier, `enforceRateLimit` bucket `admin-templates` 120/min ; import : bucket `admin-template-import` 10/10 min) :
       - `GET /api/admin/templates?status=&establishment=` → `{ templates: [...] }` (sans `bytea`, avec `previewDataUri` si un aperçu existe).
       - `POST /api/admin/templates` → crée un brouillon (`templateInputSchema`, 24.3).
       - `GET/PATCH /api/admin/templates/[id]` → lecture complète / modification (même schéma en `.partial()`), refus 409 si archivé.
       - `POST /api/admin/templates/[id]/status` `{ status: 'published' | 'draft' | 'archived' }` → `setTemplateStatus` ; à la publication, générer l'aperçu PNG de la garde (Puppeteer, largeur 360 px, JPEG qualité 70) et l'enregistrer comme asset `preview`.
       - `POST /api/admin/templates/[id]/assets` (multipart `file`, `slot`) → logo (PNG/JPEG/WEBP, 2 Mo), met à jour `logo_assets[slot]`.
       - `POST /api/admin/templates/import` (multipart `file`, `name`) : `content-length` ≤ 20 Mo + 512 Ko contrôlé avant `formData()` ; type réel `.docx` → `importDocxTemplate` (24.7), `.pdf` → `importPdfTemplate` (24.8) ; crée un brouillon avec `source_format` et `source_report`, enregistre les logos extraits ; renvoie `{ template, report }`. Le fichier importé n'est **pas** conservé.
       - `POST /api/admin/templates/preview` `{ documentStyle, outline, logos? }` → `{ html }` : garde (`coverHtml` avec des données fictives fixes « Prénom NOM », « Titre du rapport »…) + une page de chapitre exemple, avec `styleToCss` et `coverCss` ; HTML destiné à une `iframe sandbox`.
       - Erreurs : Zod → 400 `{ error: 'Données invalides.' }` ; introuvable → 404 ; autres → `mobileErrorResponse`.
    3. `recruiter-web/lib/mobile-api-proxy.ts` : `forwardToMobileApi(request, path, adminUserId)` : reconstruit l'URL `${MOBILE_API_INTERNAL_URL}/api/admin/templates/${path}` + query, recopie méthode, `content-type` et corps (flux pour le multipart), ajoute les deux en-têtes de service, ne transmet **pas** les cookies du navigateur ; renvoie statut, `content-type` et corps tels quels ; `MOBILE_API_INTERNAL_URL` ou `ADMIN_SERVICE_SECRET` absent → 503 `{ error: 'Service des modèles indisponible.' }`.
    4. `recruiter-web/app/api/admin/templates/[...path]/route.ts` (+ une route racine `app/api/admin/templates/route.ts` pour le chemin vide) : GET/POST/PATCH ; `const { response, user } = await requireAdminApi(); if (response) return response;` puis `forwardToMobileApi(request, path, user.id)`. Vérifier que `user.id` est bien l'identifiant Better Auth (même base que `mobile-api`).
    5. `.env.example` : `ADMIN_SERVICE_SECRET=` dans `mobile-api` et `recruiter-web` ; `MOBILE_API_INTERNAL_URL=http://127.0.0.1:3002` dans `recruiter-web`.
  - **Tests à écrire :** `mobile-api/tests/admin-templates.test.mjs` :
    - `loadTs('lib/admin-service.ts')` (si le module importe la base, extraire `checkAdminService` dans un fichier sans import) : sans en-tête → 401 ; mauvais secret → 401 ; secret serveur absent → 401 même avec un en-tête ; bon secret + id → `ok`.
    - Rôle : faux pool qui renvoie `role: 'student'` → 403 ; `role: 'admin'` → `ok` (fonction `adminRoleAllowed(role)` pure si `requireAdminService` n'est pas chargeable).
    - HTTP (`skip` sans serveur ou sans `ADMIN_SERVICE_SECRET` dans l'environnement du test) : `GET /api/admin/templates` sans en-têtes → 401 ; avec secret et l'id d'un compte étudiant (compte E2E) → 403 ; l'appel admin → 200 se vérifie dans le navigateur en 24.10 (aucun identifiant admin dans les tests).
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` (mobile-api, recruiter-web) → code 0 ; manuel : `curl -i http://localhost:3002/api/admin/templates` → 401 ; `curl -i http://localhost:3001/api/admin/templates` sans session → 401 (relais) ; connecté en admin dans le navigateur → 200 (24.10).
  - **Pièges :**
    - Oublier `requireAdminApi()` dans le relais rend la route ouverte : le relais ne fait rien d'autre que ce contrôle puis le transfert.
    - Ne jamais exposer `ADMIN_SERVICE_SECRET` au navigateur (variable sans préfixe `NEXT_PUBLIC_`).
    - Le relais doit transmettre le corps multipart sans le relire en entier en mémoire si possible (`request.body` en flux, `duplex: 'half'`).
    - `mobile-api/middleware.ts` ajoute des en-têtes CORS : les routes admin ne sont appelées que de serveur à serveur, sans `Origin`.
  - **Dépendances :** 24.3, 24.7 (24.8 pour l'import PDF). Variables à poser par l'utilisateur sur le VPS (Actions utilisateur du Module 23, point 2). Aucune décision utilisateur.

- [ ] **Tâche 24.10 : Écran « Modèles de rapport » dans l'admin**
  - **Pourquoi :** l'admin a besoin d'un atelier visuel pour importer un rapport, voir ce qui a été compris, corriger le style et la garde avec un aperçu en direct, puis publier.
  - **État actuel :**
    - Le shell réellement affiché est `recruiter-web/app/admin/layout.tsx` (`'use client'`) : `NAV_GROUPS` (l.11-41, icônes Material Symbols en texte, ex. `'menu_book'`) et `breadcrumbMap` (l.36 et suivantes, tableau ordonné `[RegExp, section, sous-titre]`). `recruiter-web/app/admin/AdminShell.tsx` n'est importé nulle part : **ne pas l'éditer**.
    - Modèle de page CRUD : `recruiter-web/app/admin/pdf/page.tsx` + `PdfDashboardClient.tsx` (`fetch('/api/pdf', { cache: 'no-store' })`, `FormData` pour l'envoi, `payload.error` affiché) ; pages serveur protégées par `await requireAdminPage()` (ex. `app/admin/documents/page.tsx`).
    - Style : Tailwind v4, classes de tokens `bg-stitch-*`/`text-stitch-*` ; CSS compilé par `npm run css:build` ; composants communs `app/admin/_components/ui.tsx` (à lire avant d'écrire).
  - **Fichiers :** créés : `recruiter-web/app/admin/templates/page.tsx`, `TemplatesClient.tsx`, `TemplateEditor.tsx`, `CoverBlocksEditor.tsx`, `ExtractionReport.tsx`, `app/admin/templates/[id]/page.tsx` ; modifié : `recruiter-web/app/admin/layout.tsx`.
  - **Étapes :**
    1. `layout.tsx` : ajouter `{ href: '/admin/templates', icon: 'style', label: 'Modèles de rapport' }` dans le groupe qui contient « Rédactions » / « Catalogue PDF » ; dans `breadcrumbMap`, ajouter **avant** les règles génériques `[/^\/admin\/templates\/[^/]+/, 'Modèles de rapport', 'Atelier']` puis `[/^\/admin\/templates/, 'Dashboard', 'Modèles de rapport']`.
    2. `page.tsx` (serveur) : `await requireAdminPage(); return <TemplatesClient />;` ; `[id]/page.tsx` : idem avec `<TemplateEditor id={params.id} />`.
    3. `TemplatesClient.tsx` : liste (`GET /api/admin/templates`) en cartes : aperçu (image `previewDataUri` ou cadre « Pas encore d'aperçu »), nom, établissement, diplôme, type, badge de statut (Brouillon / Publié / Archivé) ; filtres par statut ; bouton « Nouveau modèle » (nom obligatoire → `POST`) ; zone « Importer un rapport » (`<input type="file" accept=".docx,.pdf">` + nom ; envoi multipart vers `/api/admin/templates/import` ; pendant l'envoi « Analyse du document… » ; erreurs affichées telles que renvoyées) ; après import, ouverture de l'atelier avec le rapport d'extraction.
    4. `ExtractionReport.tsx` : trois listes « Repris tel quel », « Déduit (à vérifier) », « Introuvable (à régler) », avec la confiance en pourcentage quand elle existe.
    5. `TemplateEditor.tsx` : colonne de réglages (nom, établissement, diplôme, type ; style : polices, taille, interligne, marges, couleurs, numérotation des titres, en-tête simple ou bandeau, libellé auteur, cadre du numéro, légendes, puces, dédicace, tableaux ; logos : trois emplacements avec envoi vers `/assets` ; plan des sections : liste ordonnée avec monter / descendre / supprimer / ajouter) et colonne d'aperçu : `iframe` avec `sandbox=""` et `srcDoc` = HTML renvoyé par `POST /api/admin/templates/preview`, rafraîchi 400 ms après la dernière modification (debounce) ; bouton « Enregistrer » (`PATCH`), « Publier », « Repasser en brouillon », « Archiver » (confirmation).
    6. `CoverBlocksEditor.tsx` : liste des blocs (type affiché en clair : « En-tête bilingue », « Logos », « Bandeau du thème », « Titre », « Texte à trous », « Auteur », « Encadreurs », « Bandeau d'année », « Espace », « Lignes libres ») avec monter / descendre / supprimer / ajouter, et pour chaque bloc ses champs (lignes, libellés, modèle de phrase avec la liste des champs `{…}` disponibles) et son style (alignement, taille, gras, majuscules, soulignement, couleur parmi la palette). Avertir si un texte saisi ressemble à un nom propre de personne (heuristique simple : deux mots en majuscules hors libellés connus) : « Un modèle ne doit contenir aucun nom ni matricule. ».
    7. `npm run css:build` dans `recruiter-web` après ajout des classes.
  - **Tests à écrire :** pas de framework de test dans `recruiter-web` ; la logique est testée côté `mobile-api` (24.9). Parcours navigateur ci-dessous.
  - **Vérification (DoD) :** `cd recruiter-web && npx tsc --noEmit` → code 0 et `npm run build` → code 0 ; navigateur (`npm run dev` dans `recruiter-web` et `mobile-api`, session admin ouverte par l'utilisateur lui-même : l'exécutant ne saisit pas d'identifiants) : import de la fixture fictive `template-reference-like.docx` → rapport d'extraction affiché → retouche (couleur du bandeau, ordre d'un bloc) → aperçu mis à jour → publication ; captures `.agent/screenshots/m24-admin-liste.png`, `m24-admin-import.png`, `m24-admin-atelier.png`, `m24-admin-publie.png`.
  - **Pièges :**
    - L'`iframe` d'aperçu doit avoir `sandbox` (aucun script, aucune navigation).
    - Le contrôle de sécurité réel est `requireAdminPage()` côté serveur, pas la navigation client.
    - Une classe Tailwind non compilée ne s'affiche pas : relancer `css:build`.
  - **Dépendances :** 24.9. Aucune décision utilisateur ; l'utilisateur ouvre lui-même la session admin pour la vérification.

### 5. Étudiant : galerie
- [ ] **Tâche 24.11 : Galerie et application d'un modèle**
  - **Pourquoi :** l'étudiant doit pouvoir partir directement du modèle de son établissement à la création de son rapport ou mémoire, ou l'appliquer plus tard, sans perdre une ligne de ce qu'il a déjà écrit, puis tout modifier librement.
  - **État actuel :**
    - `mobile-api/app/api/mobile/documents/route.ts` : `createDocumentSchema` (l.25-31 : `title`, `description`, `templateType`/`type`, `field`, pas de `templateId`) ; `POST` (l.48-69) → `createDocument(userId, title, description, templateType, field)` (`lib/documents-db.ts` l.192-239, transaction, sections depuis `outlineFor` ou `TEMPLATE_SECTIONS`).
    - `app/api/mobile/documents/[id]/route.ts` : `PATCH` (l.88-137, `applyStylePatch` l.126-127). `applyStylePatch` conserve les logos de l'étudiant : ne pas l'utiliser pour appliquer un modèle.
    - App : `src/features/documents/DocumentsScreen.tsx` (création : appels l.299-300, l.397-398, l.469-470 ; choix de filière l.795-814 ; titre l.784) ; `DocumentStylePanel.tsx` (presets l.187-196) ; `mobileApiFetch` (`betterAuth.ts` l.577) ; URL signées des logos : `GET /api/mobile/files/[fileId]/url`.
    - Fichiers étudiant : `lib/file-storage.ts` `saveFile(userId, ext, data)` (l.49), `canStoreFiles()` (l.25) ; `lib/document-files-db.ts` `createDocumentFile` (l.48), `setFileReady` (l.83).
  - **Fichiers :** créés : `mobile-api/lib/template-apply.ts`, `mobile-api/app/api/mobile/templates/route.ts`, `mobile-api/app/api/mobile/templates/[id]/route.ts`, `mobile-api/app/api/mobile/documents/[id]/apply-template/route.ts`, `mobile-api/tests/template-apply.test.mjs`, `src/features/documents/TemplateGallery.tsx`, `src/features/documents/templatesApi.ts` ; modifiés : `mobile-api/app/api/mobile/documents/route.ts`, `mobile-api/lib/documents-db.ts`, `src/features/documents/DocumentsScreen.tsx`, `src/features/documents/DocumentStylePanel.tsx`.
  - **Étapes :**
    1. `lib/template-apply.ts` : (a) `mergeOutline(existing: { title: string; position: number }[], outline: { title: string; system?: boolean }[]): { title: string; system: boolean; position: number }[]` (renvoie seulement les sections **à ajouter** : comparaison des titres normalisés sans accents ni casse, nouvelles sections placées après la dernière section existante qui les précède dans le modèle) — fonction pure ; (b) `styleFromTemplate(templateStyle: DocumentStyle, copiedLogos: { school?: string; company?: string; department?: string }, current?: DocumentStyle): DocumentStyle` : style du modèle (blocs compris) avec les identifiants des logos copiés pour l'étudiant ; si le modèle n'a pas de logo pour un emplacement, garder celui du document actuel ; garder `headerFooter.authorLabel` du modèle ; (c) `copyTemplateLogos(templateId, documentId, appUserId)` : pour chaque `logo_assets`, `saveFile` + `createDocumentFile` (`kind: 'image'`, `origin: 'upload'`) + `setFileReady` ; si `!canStoreFiles()`, ne rien copier et renvoyer `logosSkipped: true`.
    2. `GET /api/mobile/templates?establishment=` (session étudiant, rate limit `templates-list` 60/min) : modèles `published` uniquement (`listPublishedTemplates`), champs `id`, `name`, `establishment`, `degree`, `kind`, `previewDataUri`, `updatedAt` ; filtre `establishment` comparé en paramètre SQL (aucune concaténation) ; au plus 50 résultats. `GET /api/mobile/templates/[id]` : modèle publié uniquement (sinon 404), avec `outline` et un style **sans** identifiants de fichiers d'admin.
    3. `documents/route.ts` POST : `templateId: z.string().uuid().optional()` ; si présent : modèle publié et compatible (`kind` = type du document ou `both`), sinon 404 `{ error: 'Modèle indisponible.' }` ; dans la même transaction que `createDocument` : sections = `outline` du modèle (au lieu de `outlineFor`), `template_id` renseigné ; après `commit`, copie des logos puis `PATCH` interne du style (`styleFromTemplate`). Types `cv`, `lettre_motivation`, `blank` : `templateId` refusé (400).
    4. `POST /api/mobile/documents/[id]/apply-template` `{ templateId }` (session, document de l'utilisateur via `getDocumentById(id, userId)`, rate limit `apply-template` 10/10 min) : transaction : insertion des seules sections renvoyées par `mergeOutline` (contenu vide), mise à jour de `document_style` (`styleFromTemplate`) et des colonnes héritées (`legacyColumnsFromStyle`), `template_id` ; aucune section existante modifiée ni supprimée ; puis copie des logos. Réponse : document à jour + `{ addedSections: n, logosSkipped }`.
    5. App : `templatesApi.ts` (`listTemplates(establishment?)`, `applyTemplate(documentId, templateId)`) via `mobileApiFetch`. `TemplateGallery.tsx` : grille d'aperçus (image, nom, établissement, diplôme), filtre « Mon établissement » prérempli avec `studentProfile.university`, carte « Sans modèle » (styles prêts actuels), états chargement / erreur (« Modèles indisponibles. Réessayer ») / vide (« Aucun modèle publié pour le moment. ») ; largeur adaptée à 375 px (une colonne). `DocumentsScreen.tsx` : pour `stage` et `memoire`, étape « Modèle » avant le titre, `templateId` envoyé à la création. `DocumentStylePanel.tsx` : bouton « Changer de modèle » au-dessus des styles prêts → galerie → confirmation « Le style, la page de garde et les sections manquantes du modèle seront ajoutés. Ton texte ne change pas. » → `applyTemplate` puis rechargement du document.
  - **Tests à écrire :** `mobile-api/tests/template-apply.test.mjs` :
    - `mergeOutline` : document `[Introduction, Chapitre 1, Conclusion]`, modèle `[Dédicace, Remerciements, Introduction générale, Chapitre 1, Chapitre 2, Conclusion générale]` → ajoute `Dédicace`, `Remerciements`, `Chapitre 2` (et considère « Introduction » ≈ « Introduction générale » seulement si la règle de normalisation le décide : écrire la règle et le cas attendu) ; ne renvoie jamais une section existante.
    - `styleFromTemplate` : logos copiés présents → identifiants copiés ; logo absent du modèle → logo du document conservé ; `cover.blocks` du modèle recopiés.
    - Sans perte de texte : faux pool enregistrant les requêtes de `apply-template` (fonction de service extraite) → aucune requête `update … content_html` ni `delete from app_document_sections`.
    - HTTP (`skip` sans serveur ou sans compte E2E ou sans modèle publié de test) : `GET /api/mobile/templates` → 200 et seulement des modèles publiés ; création avec un `templateId` de brouillon → 404.
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec ; `npx tsc --noEmit` (racine, mobile-api) → code 0 ; `npm run lint:colors` → pas de hausse ; navigateur (expo-web, 375 px) avec un modèle publié de test (données fictives) : création d'un rapport avec ce modèle → style, garde et sections identiques au modèle en base (comparer avec `GET /api/mobile/templates/[id]`) ; application sur un document existant contenant du texte → texte identique avant/après (comparer `content_html` des sections par une requête de lecture) ; captures `.agent/screenshots/m24-galerie.png`, `m24-galerie-applique.png`.
  - **Pièges :**
    - Les logos d'un modèle appartiennent à l'admin : toujours les copier pour l'étudiant ; `loadDocumentImages` filtre par `user_id`.
    - Sur Vercel (`canStoreFiles()` faux), les logos ne sont pas copiés : l'app doit afficher « Les logos du modèle n'ont pas pu être copiés. Ajoute-les depuis le panneau Style. ».
    - Ne pas réutiliser `applyStylePatch` (il garde les logos du document et fusionne un seul niveau).
  - **Dépendances :** 24.3, 24.9 (pour avoir des modèles publiés), 24.2. Aucune décision utilisateur.

### 6. Premier modèle et validation
- [ ] **Tâche 24.12 : Modèle « IUT de Douala — Rapport de stage » et comparaison**
  - **Pourquoi :** c'est le premier modèle demandé par l'utilisateur et la preuve que la chaîne complète (import, retouche, publication, rendu PDF et Word) recopie fidèlement une vraie mise en page.
  - **État actuel :** le rapport de référence est dans la table `documents` (catalogue), id `pdf_55f6da9bd04448a198`, `file_path` = URL Cloudinary (aucune trace dans le dépôt). `mobile-api/app/api/mobile/pdf/stream/route.ts` montre comment le récupérer : URL Cloudinary avec `Authorization: Basic base64(CLOUDINARY_API_KEY:CLOUDINARY_API_SECRET)`, `redirect: 'error'`, et nouvel essai en remplaçant `/image/upload/` par `/raw/upload/` si besoin (l.88-106) ; `mobile-api/lib/cloudinary.ts` (`getCloudinaryConfig` l.15, `isCloudinaryHost`). Aucun code de capture d'écran de PDF n'existe.
  - **Fichiers :** créés : `mobile-api/scripts/fetch-reference-pdf.mjs` (téléchargement vers le scratchpad), `mobile-api/scripts/pdf-page-captures.mjs` (captures PNG de pages d'un PDF), `.agent/screenshots/m24-compare-*.png` (rendus fictifs uniquement) ; le modèle lui-même vit en base (pas de fichier).
  - **Étapes :**
    1. Demander l'accord de l'utilisateur pour télécharger le rapport de référence dans le scratchpad de la session (et lui demander s'il dispose du `.docx` d'origine : si oui, l'import passe par 24.7, plus fidèle, et il dépose lui-même le fichier dans le scratchpad).
    2. `fetch-reference-pdf.mjs <id> <dossier de sortie>` : lit `DATABASE_URL` et les variables Cloudinary dans `mobile-api/.env.local` sans les afficher ; `select file_path from public.documents where id = $1` ; vérifie que l'hôte est Cloudinary ; télécharge avec l'en-tête `Basic` et `redirect: 'error'` (nouvel essai `raw/upload`) ; écrit le PDF dans le dossier donné (scratchpad uniquement : refuser un chemin situé dans le dépôt).
    3. Import : dans l'atelier admin (24.10, session ouverte par l'utilisateur) ou par l'API admin, importer le fichier ; sans accord pour l'IA de vision (24.8), l'import se fait sans vision. Relire le rapport d'extraction avec l'utilisateur.
    4. Retouche dans l'atelier jusqu'à correspondre à la description de la référence (en-tête du module) : garde en blocs (en-tête bilingue avec les libellés génériques institutionnels, trois logos — les logos de l'établissement et du département sont des éléments graphiques de l'institution : demander à l'utilisateur s'ils peuvent figurer dans un modèle public, sinon laisser les emplacements vides —, « RAPPORT DE STAGE ACADÉMIQUE », bandeau « THÈME : », phrase « Stage effectué du {period} en vue de l'obtention du {degree} », bloc auteur « Rédigé et présenté par : » + matricule, « Sous l'encadrement de : » sur deux colonnes, bandeau « Année académique {year} ») ; style (Times New Roman 12, interligne 1,5, justifié, bandeau d'en-tête, pied auteur + numéro encadré, `chapter-section-roman`, légendes sur tout le document en italique centré, puces ❖, en-tête de tableau gris) ; plan (Dédicace … Table des matières, dans l'ordre de la référence). Nom : « IUT de Douala — Rapport de stage », établissement « IUT de Douala », diplôme « DUT », type `stage`. Vérifier qu'aucun bloc ne contient de nom, matricule, entreprise ou titre réel ; publier.
    5. Rapport de test : créer dans l'app, avec le compte E2E, un rapport à partir de ce modèle, rempli de données **clairement fictives** (« Awa Test », « Entreprise Exemple SA », titre « Sujet fictif de test », figures et tableaux d'exemple) ; exporter en PDF et en Word.
    6. `pdf-page-captures.mjs <pdf> <pages> <dossier>` : Puppeteer + pdf.js (`pdfjs-dist/build/pdf.mjs` chargé dans une page locale, rendu sur `canvas`, réseau coupé) → PNG par page. Capturer, dans le PDF de test, la garde, les remerciements, le sommaire, la liste des abréviations, un début de chapitre et une page avec figure → `.agent/screenshots/m24-compare-<page>.png`. Capturer les mêmes pages du PDF de référence **dans le scratchpad seulement**, puis assembler les paires côte à côte dans le scratchpad et les montrer à l'utilisateur (outil de lecture d'image) ; elles ne vont jamais dans le dépôt.
    7. Rédiger avec l'utilisateur la liste des écarts (élément, attendu, obtenu, correction ou acceptation) ; corriger ce qui relève du modèle dans l'atelier ; ce qui relève du code devient une nouvelle tâche.
    8. Fin : supprimer du scratchpad le PDF de référence et ses captures ; vérifier `git status` : aucun fichier de la référence dans le dépôt.
  - **Tests à écrire :** aucun test automatique sur la référence (interdit d'en faire une fixture). Les tests de 24.5 et 24.6 couvrent le style « type référence » avec des données fictives.
  - **Vérification (DoD) :** modèle publié et visible dans la galerie de l'app (capture `m24-galerie-iut.png`) ; captures `m24-compare-*.png` produites (rendus fictifs seulement) ; liste des écarts validée par l'utilisateur et recopiée dans la note de la case ; `git status --short` ne montre aucun PDF ni capture de la référence ; l'utilisateur confirme, en lisant le modèle publié (`GET /api/admin/templates/<id>` affiché dans l'atelier), qu'aucun nom, matricule, entreprise ni titre de la référence n'y figure (les noms ne sont pas écrits dans ce plan, donc pas de grep possible).
  - **Pièges :**
    - Le PDF de référence et ses images contiennent des données personnelles : jamais dans le dépôt, jamais dans un test, jamais dans un message de commit, jamais dans les journaux.
    - Les identifiants Cloudinary ne doivent apparaître ni dans le script ni dans sa sortie.
    - Une URL Cloudinary `image/upload` peut refuser un PDF : le second essai `raw/upload` est nécessaire.
  - **Dépendances :** 24.1 à 24.11. **À demander à l'utilisateur avant de commencer :** accord pour télécharger la référence dans le scratchpad ; disponibilité du `.docx` d'origine ; usage de l'IA de vision (24.8) ; droit d'inclure les logos de l'IUT et du département dans un modèle public.

---

## MODULE 25 : Scraping des offres — qualité, plafond, Treg et date d'ajout

> Cadrage : `contexte.md` §15 (validé le 2026-10-20 : revue humaine admin d'abord, toutes les sources dont LinkedIn via Treg, une fenêtre par jour, plafond de 20 offres ajoutées par jour, jeu de référence de 50 offres étiquetées, expiration automatique, date d'ajout affichée en relatif sur la carte).

### Guide pour l'IA exécutante (Module 25)

**À lire avant toute tâche.** Les numéros de ligne datent du 2026-10-20 (dossiers de collecte vérifiés ce jour-là). Avant d'éditer, relocaliser par nom de fonction (`grep -n "def run_full_pipeline"`). « ~ » = non vérifié ligne à ligne.

**1. Où vit chaque chose**
- `scripts/agents/` : tout le scraping Python (collecteurs `*_agent.py`, `orchestrator.py`, `offer_pipeline.py` filtre → classifieur → extracteur → vérificateur, `job_store.py` écritures `stage_jobs`, `daily_scheduler.py` fenêtre, `run_scraper.py` CLI, `config.py` variables). Tests dans `scripts/agents/tests/` (`unittest`, lancés depuis `scripts/agents`).
- `mobile-api/sql/` : migrations SQL idempotentes, numérotées. Tests Node dans `mobile-api/tests/` (`node --test`, chargement des `.ts` de `src/` par `tests/helpers/load-ts.mjs` → `loadTs('../src/...')`).
- `src/features/stages/` : logique pure de l'app pour les offres (ex. `contactTargets.ts`) ; `src/ui/screens/StagesScreen.tsx` : liste et carte d'offre.
- Fichiers jumeaux : **aucun dans ce module** (pas de copie `mobile-api` ↔ `src` à maintenir). `reprocess_existing.py` contient toutefois une seconde implémentation du pipeline (voir pièges 25.12 et 25.15).

**2. Conventions**
- Messages affichés à l'utilisateur et journaux métier en français ; commentaires de code en anglais.
- Aucune couleur en dur dans `src/` : tokens `stitchColors` seulement. `npm run lint:colors` doit rester à **192**.
- Python : stdlib + `requests` + `psycopg2` uniquement (pas de `requirements.txt`, ne pas ajouter de dépendance sans accord). Fuseau du Cameroun : `timezone(timedelta(hours=1))` (UTC+1, sans heure d'été) ; éviter `zoneinfo` (exige `tzdata` sous Windows).
- Toute fonction qui touche l'horloge, le réseau ou la base reçoit une dépendance injectable (`now_fn`, `sleep_fn`, `post`, `conn`) pour être testée sans réseau.

**3. Numérotation des migrations**
| Numéro | Propriétaire | État |
|---|---|---|
| 0009 à 0012 | Module 23 | réservées, non écrites |
| 0013 | Module 24 (`0013_document_templates.sql`) | réservée, non écrite |
| **0014** | **Module 25** (`0014_scrape_runs_and_expiry.sql`, tâche 25.5) | à écrire |
| 0015 | réservée (prochain module) | ne pas utiliser sans mise à jour du plan |

**4. Sécurité de l'exécutant (non négociable)**
- Aucun identifiant, aucune clé réelle dans le dépôt, le chat, un journal ou un message d'erreur. Afficher seulement `True/False` pour la présence d'une clé.
- Aucun appel payant (Treg, OpenRouter, Apify) sans accord écrit de l'utilisateur pour cet appel précis. Les tests utilisent des faux clients.
- Aucune écriture sur la base partagée (Supabase) : ni migration, ni `update`, ni `insert`. Lecture seule seulement avec accord (25.2).
- Aucune commande `git commit`, `git push`, déploiement ou crontab sans accord explicite.

**5. Particularités Windows**
- Écrire les scripts de patch dans un fichier (scratchpad) puis l'exécuter ; pas de heredoc à guillemets imbriqués.
- Python avec accents : préfixer par `PYTHONUTF8=1` (Git Bash) ou `$env:PYTHONUTF8='1'` (PowerShell). Fichiers `.py` et `.sql` en UTF-8 sans BOM.
- Une variable d'environnement vide n'existe pas sous Windows : pour couper une clé, utiliser les options prévues (`--no-db`, absence de `--live`), pas `VAR=`.

**6. Cycle par tâche** : passer la case à `[/]` au début ; exécuter le DoD ; si tout sort en code 0 → `[X]` + une note d'une ligne sous la tâche ; ajouter une entrée au « Journal d'exécution » de `plan.md` et au journal de `contexte.md`. Une décision « À demander » non tranchée bloque la tâche : laisser `[/]` et poser la question.

**7. Commandes de vérification du module**
- Python : `cd scripts/agents && PYTHONUTF8=1 python -m unittest discover -s tests -p "test_*.py"` → « OK », code 0 (code 5 si aucun test trouvé).
- API : `cd mobile-api && npm test` → 0 échec.
- App : `npx tsc --noEmit` (racine) → code 0 ; `npm run lint:colors` → 192.

### Décisions arbitrées le 2026-10-20 (prioritaires sur les « À demander » des tâches)

| # | Décision | Source | Tâche |
|---|---|---|---|
| 1 | Revue humaine : onglet admin « À valider » d'abord ; Telegram plus tard (hors module). | Cadrage §15.1 | 25.16, 17.11 |
| 2 | Sources : toutes, réseaux sociaux et LinkedIn compris. LinkedIn passe par Treg. | Cadrage §15.2 | 25.11, 25.12 |
| 3 | Cadence : une fenêtre par jour, 10 h à 12 h, heure du Cameroun. Pas de quatre passages. | Cadrage §15.3 | 25.9 |
| 4 | Plafond : 20 offres **ajoutées** par jour (offres seulement, pas les rapports). Une fois atteint, la collecte s'arrête jusqu'au lendemain. | Cadrage §15.4 (interprétation de « à 20 scrapping il s'arrête ») | 25.7 |
| 5 | Qualité : 50 offres étiquetées à la main, tests du filtre, du classifieur et de l'extracteur. | Cadrage §15.5 | 25.1 à 25.3 |
| 6 | Expiration automatique : statut `expired` sur date limite dépassée. | Cadrage §15.6 | 25.5, 25.6 |
| 7 | Date sur la carte : relatif (« il y a 3 h ») depuis `stage_jobs.created_at` ; au-delà de 7 jours, date absolue en heure du Cameroun. | Cadrage §15.7 | 25.13, 25.14 |
| 8 | Numéro de migration : **0014** (0009 à 0013 déjà réservées par les modules 23 et 24). | Plan, numérotation | 25.5 |
| 9 | (O1, 25.2) Échantillon : `source = 'SCRAPED'` seulement ; exclure `contact_email`, `contact_whatsapp`, `evidence` (données personnelles) ; fixture gardée **hors dépôt** (dossier scratchpad ou ignoré par git). L'extraction elle-même attend l'accord 🔒 (décision 14). | Décision de l'assistant, réversible | 25.2 | | 10 | (O2, 25.3) `--offline` mesure seulement le câblage (faux LLM figé) et l'annonce comme telle. Une précision réelle n'est mesurée que sur des réponses **enregistrées** lors d'un passage `--live` autorisé. Une offre rejetée par le filtre compte comme « bruit » (prédiction correcte si étiquetée bruit). | Décision de l'assistant | 25.3, 25.15 | | 11 | (O3) Durée de vie par défaut : **30 jours**, comme le code actuel (`job_store.py`, `DEFAULT_LIFETIME_DAYS`), et non 60 : aucun changement de comportement, réversible. Fuseau : UTC+1 (Cameroun) sans heure d'été, défini explicitement dans le code. | Décision de l'assistant | 25.6, 25.9 | | 12 | (O4) Le plafond compte les lignes **réellement enregistrées** dans `stage_jobs` aujourd'hui (jour du Cameroun) : publiées et en revue. `deferred` n'est jamais écrit en base : il ne compte pas. Les rejets (journal `stage_job_rejections`) ne comptent pas. | Décision de l'assistant : une règle lisible en base | 25.7 | | 13 | (O5) **Aucune ligne de journal en dry-run** : le dry-run n'écrit rien. Le résumé est affiché en console seulement. | Décision de l'assistant | 25.8, 25.15 | | 14 | (O6) Déclencheur unique : `daily_scheduler.py` sur le VPS (fenêtre 10 h à 12 h, heure forcée à Africa/Douala). Le workflow GitHub `daily-scraper.yml` (9 h UTC) doit être **désactivé** : sa modification est un commit, donc soumise à l'accord 🔒 (décision 14). | Décision de l'assistant | 25.9 | | 15 | (O7) Nom de variable : `TREG_API_KEY`. Emplacement : fichier `.env.local` à la racine, déjà lu par `config.py` (aucun changement de code pour le chargement). Valeur : 🔒 fournie par l'utilisateur, jamais écrite dans le dépôt. | Décision de l'assistant (nom et emplacement) | 25.10 | | 16 | (O8) Outil LinkedIn : **`anyapi.linkedin.search.jobs`** (vérifié dans le catalogue Treg le 2026-10-20 : `POST /v1/run/linkedin.jobs_thin`, 0,0005 $ par appel, taux de succès observé 99 %). Garde : **`--live` obligatoire** pour tout appel, dry-run compris. | Vérifié auprès de Treg (lecture seule) | 25.11 | | 17 | (O9) Ordre des sources LinkedIn : Treg d'abord (si la clé est présente), puis Apify (si le jeton est présent), puis le repli RSS de `linkedin_agent.py`, qui est **conservé**. Pas de suppression. | Décision de l'assistant | 25.12 | | 18 | (O10) Plateformes de référence : la liste par défaut de `orchestrator.py` (CAMEROON_JOBS, LINKEDIN, FACEBOOK, TIKTOK, ACADEMIC_WEB). `run_scraper.py` et `daily_scheduler.py` s'alignent dessus. | Décision de l'assistant | 25.9, 25.12 | | 19 | (O11) Test M3 : ses assertions décrivent un code obsolète. On les **met à jour** au comportement actuel, sans modifier l'application. Une assertion qui échoue pour une autre raison est listée, pas masquée. | Décision de l'assistant | 25.4 | | 20 | **Requêtes LinkedIn validées par 4 appels réels le 2026-10-20** (`anyapi.linkedin.search.jobs`, 0,00066 $ facturés par appel, et non 0,0005 $). **Stages :** `employmentType: "internship"` + `location: "Cameroon"`, requêtes `stagiaire` et `intern` (20 offres sur 20 au Cameroun ; recouvrement entre les deux : dédoublonner par `id`). Le type `stage` vient du filtre, sans IA. **Emplois :** `location: "Cameroon"` sans filtre de type (10 offres sur 10 au Cameroun pour `emploi`). **Ne jamais** chercher le mot `stage` sans filtre : 25 résultats sur 25 hors Cameroun. Champs reçus : `id, title, company, companyUrl, location, createdUtc, url, logoUrl` (pas de description). `createdUtc` alimente `source_published_at`. Plafond de 20 offres ajoutées par jour : **toutes offres confondues** (décision utilisateur). | Essais réels autorisés par l'utilisateur | 25.7, 25.11, 25.12 |
| 🔒 | **Restant à fournir par l'utilisateur** (aucune tâche ne peut les trancher à sa place) : **(a)** accès Treg du serveur : clé d'API ou commande `treg` installée sur le VPS, et la procédure pour l'obtenir (25.10) ; **(b)** rotation de la clé déjà exposée dans `scripts/n8n/campus360_treg_full_workflow.json` (suivi par git) et retrait de sa valeur du fichier, **avant tout commit** ; **(c)** accord pour lire la base partagée en lecture seule (25.2) ; **(d)** étiquetage manuel des 50 offres (25.2) ; **(e)** accord pour désactiver le workflow GitHub (décision 14) ; **(f)** accord pour appliquer la migration 0014 sur la base partagée (25.5) ; **(g)** accord pour déployer (25.16) et pour le premier passage réel, qui fait des appels Treg payants (25.16). |

**🔒 Bloquant utilisateur (à obtenir avant la tâche concernée) :**
- **Accès Treg côté serveur** (25.10) : le connecteur Treg est un outil MCP de Claude Code ; le cron Python du VPS ne peut pas l'appeler. Il faut une clé d'API Treg pour le serveur : nom de la variable d'environnement, et lieu de placement.
- **Clé Treg exposée** (25.10) : une clé figure en clair dans `scripts/n8n/campus360_treg_full_workflow.json` (suivi par git). Retrait du fichier et rotation chez Treg par l'utilisateur, avant tout nouveau commit.
- **Modèles IA** (`SCRAPER_MODEL`, `SCRAPER_FALLBACK_MODEL`) : identifiants à confirmer.
- **Étiquetage** (25.2) : accord pour une lecture seule de la base partagée et pour l'étiquetage manuel de 50 offres.
- **Ancien scraping LinkedIn** (25.12) : garder `linkedin_agent.py` en secours ou le retirer.
- **Durée par défaut** (25.6) : proposition 60 jours après l'ajout pour les offres sans date limite (le code actuel pose 30 jours). À valider.
- **Migration et déploiement** (25.16) : accord explicite pour appliquer 0014 sur la base partagée, déployer sur le VPS, et lancer le premier passage réel (appels Treg payants).

**Hors périmètre :** Telegram (17.10) ; routes stages de `recruiter-web` (23.22) ; migrations 0009 à 0013 ; liste blanche des statuts dans `recruiter-web/lib/admin-platform-service.ts` (l.26 et l.416, sans `expired`).

### Lot A — Qualité et jeu de référence (avant tout changement de comportement)

- [X] **Tâche 25.1 : Tests Python réellement exécutés** — 2026-10-20 : trois fichiers convertis en `unittest` (`FilterPostTests`, `VerifierTests`, `QuoteInSourceTests`, `LlmAgentsOfflineTests` avec faux `classifier_agent.call_json`) ; appels réels seulement via `python tests/test_llm_agents.py --live`. DoD : `python -m unittest discover -s tests -p "test_*.py"` → 13 tests, OK, code 0 ; aucun appel réseau dans les tests.
  - **Pourquoi :** aucun test du scraping ne tourne aujourd'hui ; une régression du filtre peut publier du bruit (offres de bar, concours, offres d'Abidjan) dans l'app des étudiants sans que personne ne le voie.
  - **État actuel :**
    - `scripts/agents/tests/test_filter.py` : `CASES` l.13-35 (20 tuples `(title, text, company, expected_ok)`), `LONG` l.11 (texte assez long pour `MIN_TEXT_LENGTH`=80), `TODAY = date(2026, 10, 14)` l.10, `main()` l.38-46. Lancé en script : 20/20.
    - `test_verifier.py` : `CHECKS` l.25-30 (4 cas doublon), `DECISIONS` l.32-40 (7 cas), `main()` l.43-50. Lancé en script : 11/11.
    - `test_llm_agents.py` : `CLASSIFY_CASES` l.10-16, `EXTRACT_TEXT` l.18-22, `main()` l.25-54 qui appelle `classify_post` (l.28) et `extract_fields` (l.33) : **vrais appels réseau** (OpenRouter, payants). Sans clé : `LLMUnavailable`.
    - Aucun des trois n'a de fonction `test_` : `python -m unittest discover` → « Ran 0 tests » (code 5). pytest 9.1.1 est installé (Python 3.12) mais n'apporte rien ici ; **le module retient `unittest`** (stdlib, présent sur le VPS).
    - Fonctions pures testables : `filter_agent.filter_post` (l.49), `verifier_agent.decide` (l.66), `verifier_agent.is_duplicate` (l.51), `extractor_agent.quote_in_source` (l.51).
  - **Fichiers :** modifiés `scripts/agents/tests/test_filter.py`, `test_verifier.py`, `test_llm_agents.py`. Aucun fichier créé. Pas de copie jumelle.
  - **Étapes :**
    1. `test_filter.py` : ajouter `import unittest` et une classe `FilterPostTests(unittest.TestCase)` avec `test_cases_table` qui boucle sur `CASES` avec `self.subTest(title=title)` et vérifie `filter_post(title, text, company, today=TODAY)[0] == expected_ok`. Garder `CASES`, `LONG`, `TODAY` tels quels.
    2. Ajouter 4 tests nommés (lisibles en cas d'échec) : `test_noise_bar_rejected` (cas « Oasis Lounge »), `test_foreign_city_rejected` (« Stage à Abidjan »), `test_past_year_rejected` (« Offre de stage 2023 »), `test_short_text_rejected` (titre « Stage », texte court). Chaque test reprend la ligne correspondante de `CASES`.
    3. Remplacer le bloc `if __name__ == "__main__": main()` par `unittest.main()` (supprimer `main()` ou le garder appelé nulle part : préférer le supprimer pour éviter deux sources de vérité).
    4. `test_verifier.py` : même conversion. `VerifierTests` avec `test_duplicates_table` (sous-tests sur `CHECKS`, appelle `is_duplicate`) et `test_decisions_table` (sous-tests sur `DECISIONS`, appelle `decide(..., today=date(2026, 10, 14))` ; toujours passer `today` pour ne pas dépendre de la date machine, `verifier_agent.py:68`).
    5. `test_llm_agents.py` : créer `QuoteInSourceTests` (pur) : citation exacte → `True` ; casse et accents différents → `True` ; citation d'un caractère → `False` (exige `len >= 2`, l.53) ; citation absente → `False`.
    6. Dans le même fichier, `LlmAgentsOfflineTests` : `@unittest.mock.patch("classifier_agent.call_json")` (patcher le nom importé dans le module appelant, **pas** `llm_client.call_json`) renvoyant `{"category": "stage", "confidence": 0.9, "reason": "x"}` ; vérifier que `classify_post` renvoie la catégorie et que le faux a été appelé une fois.
    7. Déplacer l'ancien `main()` réseau dans une fonction `live_check()` appelée seulement par `if __name__ == "__main__" and "--live" in sys.argv:` ; sinon `unittest.main()`. Message affiché sans `--live` : aucun (unittest). Ne jamais exécuter `--live` sans accord (appels payants).
    8. Lancer la suite : au moins 3 classes, aucune connexion réseau.
  - **Tests à écrire :** ceux des étapes 1 à 6, dans les trois fichiers existants. Chargement : `unittest discover` depuis `scripts/agents` (les `sys.path.insert` existants restent).
  - **Vérification (DoD) :**
    - `cd scripts/agents && PYTHONUTF8=1 python -m unittest discover -s tests -p "test_*.py" -v` → « Ran N tests » avec N ≥ 9, « OK », code 0.
    - Preuve d'absence de réseau : relancer la même commande avec `OPENROUTER_API_KEY` absente du `.env.local` n'est pas possible proprement sous Windows ; à la place, `grep -n "call_json\|requests" scripts/agents/tests/*.py` ne montre que des `mock.patch`.
  - **Pièges :**
    - Patch au mauvais endroit : `classifier_agent.py` l.5 et `extractor_agent.py` l.12 font `from llm_client import call_json` ; seul `classifier_agent.call_json` / `extractor_agent.call_json` est lu à l'exécution.
    - L'import de `classifier_agent` importe `llm_client` qui importe `config` : `load_local_env()` lit les `.env*` à l'import (aucun réseau, mais les clés sont chargées). Ne jamais afficher `config.*`.
    - Ne pas retirer `LONG` : sans lui, tous les cas tombent sur « texte trop court ».
    - Console Windows : accents mal rendus sans `PYTHONUTF8=1`.
    - `discover` renvoie le code 5 (pas 0) si un fichier n'a aucun test : vérifier les trois fichiers.
  - **Dépendances :** aucune.

- [ ] **Tâche 25.2 : Jeu de référence de 50 offres étiquetées**
  - **Pourquoi :** sans offres réelles étiquetées à la main, on ne sait pas combien d'offres publiées sont fausses ou combien de vraies offres sont rejetées ; la promotion d'un nouveau réglage se ferait à l'aveugle.
  - **État actuel :**
    - `scripts/agents/export_labeling_sample.py` et `scripts/agents/tests/fixtures/` n'existent pas.
    - Modèle de lecture seule : `reprocess_existing.py` `load_offers(conn)` l.36-50 (`RealDictCursor`, jointure `stage_jobs j join stage_companies c`), connexion l.84 `psycopg2.connect(DATABASE_URL, sslmode="require")`.
    - Colonnes utiles de `stage_jobs` : `id`, `title`, `description`, `location`, `source` (enum `INTERNAL|SCRAPED`), `status`, `kind`, `source_url`, `created_at` (`docs/STAGES_SUPABASE.sql` l.61-77 + `mobile-api/sql/0005_stage_jobs_quality.sql`).
    - Catégories du classifieur : `classifier_agent.CATEGORIES` l.7 = `stage, emploi, concours, formation, bruit`.
    - ~72 offres en base selon le cadrage §15 (non recompté).
  - **Fichiers :** créés `scripts/agents/export_labeling_sample.py`, `scripts/agents/tests/fixtures/offers_labeled.json` (selon O1, versionné ou non). Aucun jumeau.
  - **Étapes :**
    1. Obtenir l'accord 🔒 (lecture seule de la base partagée) et la réponse à **O1** avant d'écrire la requête.
    2. Écrire `export_labeling_sample.py` : `main(argv=None)` avec `argparse` : `--limit` (défaut 50), `--out` (défaut `tests/fixtures/offers_labeled.json`), `--source` (défaut selon O1 : `SCRAPED`). Bloc `sys.stdout.reconfigure(encoding="utf-8")` comme `orchestrator.py` l.11-14.
    3. Connexion : `psycopg2.connect(DATABASE_URL, sslmode="require")`, puis `conn.set_session(readonly=True)` avant toute requête. Si `DATABASE_URL` est vide : afficher « DATABASE_URL absente : export impossible. » et sortir avec le code 2. Ne jamais afficher la valeur.
    4. Requête unique `SELECT` : `j.id, j.title, j.description, j.location, j.source_url, j.created_at, j.status, j.kind, c.name as company` avec `where j.source = %s order by j.created_at desc limit %s`. **Ne pas** lire `contact_email`, `contact_whatsapp`, `evidence` (sauf décision contraire en O1).
    5. Écrire une liste JSON (`ensure_ascii=False`, `indent=2`, `encoding="utf-8"`) ; pour chaque offre : les colonnes ci-dessus (`created_at` en ISO), plus `label: null`, `publishable: null`, `note: ""`. Créer le dossier `tests/fixtures/` si absent.
    6. Afficher seulement : « 50 offres exportées vers tests/fixtures/offers_labeled.json (à étiqueter). » Code de sortie 0. Moins de 50 lignes en base : afficher le nombre réel et sortir avec 0 (l'utilisateur décide).
    7. L'utilisateur étiquette à la main : `label` ∈ `stage|emploi|concours|formation|bruit`, `publishable` ∈ `true|false`. L'IA ne remplit **aucune** étiquette.
    8. Ajouter dans le même script `--check PATH` : vérifie 50 entrées, `label` dans la liste, `publishable` booléen ; affiche « Jeu de référence valide : 50 offres étiquetées. » (code 0) ou la liste des ids invalides (code 1).
  - **Tests à écrire :** `scripts/agents/tests/test_export_labeling.py` : `--check` sur un petit fichier temporaire (3 entrées valides → code 1 car ≠ 50 ; entrée `label: "autre"` → id listé ; 50 entrées valides fabriquées → code 0). La partie base n'est pas testée automatiquement.
  - **Vérification (DoD) :**
    - `cd scripts/agents && PYTHONUTF8=1 python export_labeling_sample.py --check tests/fixtures/offers_labeled.json` → code 0.
    - `python -c "import json;print(len(json.load(open('scripts/agents/tests/fixtures/offers_labeled.json', encoding='utf-8'))))"` (racine) → `50`.
    - `grep -c "contact_email\|contact_whatsapp\|evidence" scripts/agents/tests/fixtures/offers_labeled.json` → `0` (si O1 confirme l'exclusion).
    - Suite unittest : 0 échec.
  - **Pièges :**
    - Les offres viennent de posts publics mais contiennent des noms d'entreprise : ne pas coller leur contenu dans le chat ; pas de commit du fichier sans accord (O1).
    - Sans filtre `source='SCRAPED'`, l'échantillon mélange offres internes et imports en masse (`reprocess_existing.py` l.72-74, `BULK_INSERT_MIN = 5`).
    - `sslmode="require"` ne vérifie pas le certificat ; rester aligné sur `job_store.py` (pas de changement ici).
    - Ouvrir le JSON avec `encoding="utf-8"` sous Windows (cp1252 par défaut).
  - **Dépendances :** 25.1. **À demander à l'utilisateur :** accord de lecture seule (🔒), **O1**, et l'étiquetage manuel lui-même.

- [X] **Tâche 25.3 : Tests du classifieur, de l'extracteur et harnais de précision** — 2026-10-20 : `tests/test_extractor.py` (faux `extractor_agent.call_json` : citation absente → champ nul, rémunération inventée écartée) ; `evaluate_pipeline.py` (`--offline` = câblage seulement, annoncé comme tel ; `--live` payant ; un rejet du filtre est compté dans la catégorie que nomme son motif : concours, formation, sinon bruit) ; `tests/test_evaluate_pipeline.py` sur jeu synthétique. Le jeu réel (25.2) est exclu de git (`.gitignore`). **Mesure sur les 50 offres réelles : en attente de 25.2.**
  - **Pourquoi :** le classifieur et l'extracteur décident de ce qui s'affiche aux étudiants ; sans tests, un changement de modèle ou de prompt peut inventer une entreprise ou une date limite.
  - **État actuel :**
    - `classifier_agent.py:31` `classify_post(title, text, platform="WEB") -> dict` ; appelle `call_json(SYSTEM, prompt, "classification", SCHEMA)` (l.33) puis borne `confidence` dans [0,1] (l.34) ; prompt avec plateforme et titre, texte tronqué à 4000 caractères (l.32).
    - `extractor_agent.py:56` `extract_fields(title, text) -> {"fields", "evidence"}` ; valeur gardée seulement si la citation existe dans la source (l.63-67, `quote_in_source` l.51, `_normalize` l.45-48) ; `skills` ≤ 10 sans vides (l.68) ; `summary` nettoyé (l.69).
    - `offer_pipeline.py:18` `evaluate(item, existing) -> {stage, decision, extraction}` : **n'écrit rien**. `process` (l.45) écrit en base : le harnais ne doit jamais l'appeler. `extract_fields` n'est appelé que pour `stage`/`emploi` (l.27-29) ; `LLMUnavailable` attrapée l.30-34.
    - Champs lus par `evaluate` : `title`, `snippet`, `platform` (défaut « WEB »), `url`, `contact_email`, `contact_whatsapp`, `company`.
    - `llm_client.py:70` `call_json` ; modèles `SCRAPER_MODEL` / `SCRAPER_FALLBACK_MODEL` lus l.20-21 (identifiants 🔒 à confirmer).
  - **Fichiers :** créés `scripts/agents/tests/test_classifier.py`, `scripts/agents/tests/test_extractor.py`, `scripts/agents/evaluate_pipeline.py`. Ne pas importer `job_store` (connexion possible au constructeur, `job_store.py:25`).
  - **Étapes :**
    1. `test_classifier.py` (`unittest.mock.patch("classifier_agent.call_json")`) : confiance 1.7 → 1.0 ; −0.2 → 0.0 ; catégorie `concours` transmise telle quelle ; le prompt passé au faux contient le titre et la plateforme ; un texte de 5000 caractères arrive tronqué à 4000.
    2. `test_extractor.py` (`patch("extractor_agent.call_json")`) : citation absente de la source → champ `None` ; citation présente avec casse ou accents différents → gardée ; valeur sans citation → `None` ; 12 compétences dont 2 vides → 10 au plus, aucune vide ; `summary` avec espaces multiples → nettoyé.
    3. Test d'intégration de `evaluate` avec les deux faux : offre « stage » complète → `decision.status` ∈ `published|pending_review` ; faux classifieur `concours` → l'extracteur n'est **pas** appelé (`assert_not_called`) ; faux qui lève `LLMUnavailable` → `stage` = étape différée, aucune exception.
    4. `evaluate_pipeline.py` : `main(argv=None)` ; options `--fixture` (défaut `tests/fixtures/offers_labeled.json`), `--offline` (défaut) et `--live`. `--live` exige en plus la variable `CAMPUS360_ALLOW_PAID_LLM=1`, sinon message « Mode --live refusé : appels payants non autorisés. » et code 2.
    5. Construction de l'item : `title`, `snippet` = `description`, `company`, `platform` = « WEB », `url` = `source_url`. Appel : `evaluate(item, existing=[])`.
    6. Mode `--offline` selon **O2** : (a) faux LLM figé → le harnais affiche en tête « Mode hors ligne : mesure du câblage seulement, pas de la qualité du modèle. » ; (b) si la fixture contient un champ `recorded` (`classification`, `extraction` enregistrées lors d'un passage `--live` autorisé), le faux renvoie ces réponses pour chaque id. Ne rien coder de (b) avant la réponse.
    7. Catégorie prédite : catégorie du classifieur si étape `classifier` ; `decision.kind` si renseigné ; rejet au filtre → selon **O2** (« bruit » ou exclu du calcul).
    8. Sortie : tableau texte, une ligne par catégorie `stage, emploi, concours, formation, bruit` : `précision`, `rappel`, `n` (deux décimales ; « — » si dénominateur nul) ; puis la matrice publiable (vrai positif, faux positif, faux négatif) comparant `decision.status == "published"` à `publishable`. Aucun texte d'offre affiché. Code 0.
    9. Fixture absente : « Fixture introuvable : lancer d'abord la tâche 25.2. » et code 2.
  - **Tests à écrire :** étapes 1 à 3, plus `tests/test_evaluate_pipeline.py` : métriques calculées sur 4 étiquettes fabriquées (2 stage justes, 1 bruit prédit stage, 1 emploi manqué) → précision stage 0,67, rappel stage 1,00, rappel emploi 0,00 ; `--live` sans variable → code 2 ; fixture absente → code 2. Utiliser une fixture temporaire (`tempfile`), jamais la vraie.
  - **Vérification (DoD) :**
    - Suite unittest → « OK », code 0.
    - `cd scripts/agents && PYTHONUTF8=1 python evaluate_pipeline.py --offline` → tableau des 5 catégories et code 0 (après 25.2).
    - `grep -n "process(" scripts/agents/evaluate_pipeline.py` → aucune ligne.
  - **Pièges :**
    - Circularité : avec un faux LLM figé, précision et rappel reflètent les réponses fixées, pas le modèle. Ne pas présenter ces chiffres comme une mesure de qualité (décision **O2**).
    - Patcher `classifier_agent.call_json` et `extractor_agent.call_json` **avant** d'appeler `evaluate` (imports directs).
    - `decide` utilise `date.today()` si `today` est absent : figer la date dans les tests.
    - Ne pas afficher de contenu d'offre réelle dans la sortie.
  - **Dépendances :** 25.1 ; 25.2 pour le harnais (les tests unitaires peuvent avancer avant). **À demander :** **O2** ; identifiants des modèles (🔒) avant tout `--live`.

- [X] **Tâche 25.4 : Corriger le test M3 obsolète** — 2026-10-20 : lignes 143, 144, 149 (replis de contact) et 199, 200 (rémunération « non précisée ») réécrites selon le code actuel, avec assertions d'absence de repli ; les échecs des lignes 163, 177, 182, 183 venaient des fins de ligne CRLF : lecture normalisée en LF (`readLf`). DoD : `node scripts/test-challenger-m3-adversarial.mjs` → 83/83, code 0 ; `grep -c` du numéro et de l'e-mail de repli dans `StagesScreen.tsx` → 0. Hors périmètre, noté : `handleOpenDirections` ouvre la carte sur « Douala, Cameroun » quand l'offre n'a pas de lieu.
  - **Pourquoi :** le test adversarial M3 échoue depuis 23.3 et masque tout autre défaut ; il attend encore un numéro WhatsApp et un e-mail de repli que l'app a retirés pour ne plus contacter de faux destinataires.
  - **État actuel :**
    - `scripts/test-challenger-m3-adversarial.mjs` lit `StagesScreen.tsx`, `whatsappService.ts`, `types.ts` depuis `process.cwd()` (l.6-13 : lancer depuis la racine). `assert()` (l.18-27) lève au **premier** échec.
    - Échoue à la l.143 (repli `237690123456`). Une évaluation en mémoire montre aussi des échecs aux lignes **144, 149, 163, 177, 182, 183, 199, 200**.
    - l.144 attend `const clean = cleanPhoneNumber(rawPhone);` ; le code écrit `const clean = cleanPhoneNumber(phone);` (`StagesScreen.tsx` l.290).
    - l.149 attend le repli `recrutement@campus360.app`.
    - Code réel : `handleRecruiterWhatsapp` l.286-298 (`companyWhatsapp(selectedDetailJob.company)`), `handleRecruiterEmail` l.300-312 (`companyEmail(...)`), `contactTargets.ts` l.1-14 (« Never a fallback number or address »). `StagesScreen.tsx` ne contient **aucune** occurrence du numéro ni de l'e-mail de repli.
    - l.163 (repli Google Maps), l.177 (`detailScrollContent` / `paddingBottom: 110`, mise en forme), l.182-183 (`setTimeout` 350 / 200, indentation), l.199-200 (libellés `'75 000 FCFA'` et `'Gratification'` devenus `'Non précisée'` l.1106 et `'Rémunération non précisée'` l.623) : **hors 23.3**, libellés et mise en forme.
  - **Fichiers :** modifié `scripts/test-challenger-m3-adversarial.mjs` uniquement. Ne pas toucher `StagesScreen.tsx`.
  - **Étapes :**
    1. `grep -rn "test-challenger-m3" scripts .github package.json` : noter les appelants (aucun attendu).
    2. l.143 → deux assertions : `!stagesContent.includes('237690123456')` (« No hardcoded fallback WhatsApp number ») et `stagesContent.includes('companyWhatsapp(selectedDetailJob.company)')`.
    3. l.144 → `stagesContent.includes('const clean = cleanPhoneNumber(phone);')`.
    4. l.149 → `!stagesContent.includes('recrutement@campus360.app')` et `stagesContent.includes('companyEmail(selectedDetailJob.company)')`.
    5. Lancer le test. Il s'arrêtera ensuite à l.163 : **ne pas** affaiblir, commenter ni supprimer cette assertion ni les suivantes.
    6. Pour lister tous les échecs sans modifier la logique, écrire dans le scratchpad un script qui lit le fichier de test et évalue chaque `stagesContent.includes(...)` séparément ; reporter la liste (numéro de ligne, message, cause) dans une note sous la tâche.
    7. Appliquer la réponse à **O11** : soit mettre à jour les lignes 163 à 200 vers le code actuel (une assertion par ligne, même intention), soit les laisser échouer et garder la tâche en `[/]` avec la liste.
  - **Tests à écrire :** aucun nouveau fichier ; les assertions modifiées sont le test.
  - **Vérification (DoD) :**
    - `node scripts/test-challenger-m3-adversarial.mjs; echo $?` depuis la racine (ne pas passer par `| tail`, qui masque le code) → `0` si O11 retient la mise à jour ; sinon le premier échec doit être à la l.163 ou après, et la note liste toutes les lignes en échec.
    - `grep -c "237690123456\|recrutement@campus360.app" src/ui/screens/StagesScreen.tsx` → `0`.
  - **Pièges :**
    - Le plan initial ne citait que 143 et 149 : la 144 échoue aussi.
    - Le test s'arrête au premier échec : corriger 143 révèle la suivante.
    - `cleanPhoneFn` (l.121-128) évalue `cleanPhoneNumber` par `new Function` : ne pas renommer la fonction.
    - Ne jamais remplacer le repli par un autre numéro ou une autre adresse.
  - **Dépendances :** aucune. **À demander :** **O11** (lignes 163 à 200).

### Lot B — Données, plafond et cadence

- [/] **Tâche 25.5 : Migration 0014 (journal de run et statut `expired`)** — 2026-10-20 : `mobile-api/sql/0014_scrape_runs_and_expiry.sql` écrite (table `stage_scrape_runs`, contrainte de statut supprimée puis recréée avec `expired`, index `created_at`, transaction, sans RLS comme 0006, sans colonne `dry_run` : décision 13) ; test statique `mobile-api/tests/migration-0014.test.mjs` (3 cas). **Non appliquée** : aucune base de test ; 🔒 accord requis pour la base partagée (et double application pour prouver l'idempotence).
  - **Pourquoi :** sans journal des passages, personne ne sait si le scraping a tourné, combien d'offres il a ajoutées ni s'il a planté ; sans statut `expired`, les offres périmées restent mêlées aux offres publiées côté administration.
  - **État actuel :**
    - `mobile-api/sql/0005_stage_jobs_quality.sql:18-21` : contrainte `stage_jobs_status_check` créée sous `if not exists`, valeurs `published`, `pending_review`, `rejected`. Aucune autre migration ne la modifie.
    - `0005:24-25` : index sur `status` et `company_normalized`. **Aucun index sur `stage_jobs.created_at`** (seul `idx_stage_jobs_sponsored (is_sponsored, created_at desc)` dans `create-backend-files.js:203`).
    - Patron « supprimer puis recréer une contrainte » : `0008_section_interviews.sql` (~l.8-11, `drop constraint if exists` puis `add constraint`).
    - `gen_random_uuid()` déjà utilisé (`0004:41,54`, `0006:5,44`) : pas d'extension à ajouter.
    - `stage_scrape_runs` n'existe pas. `source_published_at` existe déjà (`0005:8`) : ne pas la recréer.
    - `mobile-api/lib/stages-db.ts:129,151` filtre déjà `status = 'published' and expires_at > now()` : une offre `expired` disparaît de l'app sans changement de code.
  - **Fichiers :** créés `mobile-api/sql/0014_scrape_runs_and_expiry.sql`, `mobile-api/tests/migration-0014.test.mjs`. Aucun jumeau.
  - **Étapes :**
    1. Avant d'écrire : obtenir la réponse à **O5** (colonne `dry_run` utile ou non).
    2. En-tête SQL : commentaire anglais (but, idempotence, date), puis `begin;` … `commit;`.
    3. `create table if not exists public.stage_scrape_runs (id uuid primary key default gen_random_uuid(), started_at timestamptz not null default now(), finished_at timestamptz, window_label text not null default 'manuel', sources text[] not null default '{}', collected integer not null default 0, published integer not null default 0, pending_review integer not null default 0, rejected integer not null default 0, deferred integer not null default 0, cap_reached boolean not null default false, error text);` Si O5 retient l'écriture en dry-run : ajouter `dry_run boolean not null default false`.
    4. `create index if not exists idx_stage_scrape_runs_started_at on public.stage_scrape_runs (started_at desc);`
    5. Contrainte : `alter table public.stage_jobs drop constraint if exists stage_jobs_status_check;` puis `alter table public.stage_jobs add constraint stage_jobs_status_check check (status in ('published', 'pending_review', 'rejected', 'expired'));`
    6. `create index if not exists idx_stage_jobs_created_at on public.stage_jobs (created_at);`
    7. RLS : reprendre le choix des tables créées par `0006` (~ vérifier si `0006` active RLS) ; si oui, `alter table public.stage_scrape_runs enable row level security;` sans politique (seul le rôle serveur écrit).
    8. `comment on table public.stage_scrape_runs is '...'` (anglais).
  - **Tests à écrire :** `mobile-api/tests/migration-0014.test.mjs` (lecture du fichier SQL, sans base) : contient `drop constraint if exists stage_jobs_status_check` **avant** `add constraint stage_jobs_status_check` ; la liste du check contient les 4 statuts ; `create table if not exists public.stage_scrape_runs` ; `create index if not exists idx_stage_jobs_created_at` ; ne contient ni `drop table` ni `delete from` ni `truncate`.
  - **Vérification (DoD) :**
    - `cd mobile-api && npm test` → 0 échec, le nouveau test passe.
    - Si un Postgres local jetable est disponible (Docker ou installation locale ; ~ non vérifié sur cette machine) : appliquer 0014 deux fois (`psql -v ON_ERROR_STOP=1 -f mobile-api/sql/0014_scrape_runs_and_expiry.sql`, codes 0) sur une base minimale (`stage_companies`, `stage_jobs`, enums), puis `\d public.stage_scrape_runs` ; `insert ... status='expired'` passe, `status='foo'` échoue. Sans base locale : le noter sous la tâche, la preuve SQL est faite en 25.16.
  - **Pièges :**
    - Un simple `if not exists` (patron 0005) ne modifie pas une contrainte existante : `expired` serait refusé. Il faut drop puis add.
    - Ne jamais appliquer sur la base partagée dans cette tâche (🔒, 25.16).
    - `recruiter-web/lib/admin-platform-service.ts` l.26 et l.416 ne connaissent pas `expired` : hors périmètre, à signaler si l'écran admin doit les montrer.
    - `status` est un `text` avec check, pas un enum : pas d'`alter type`.
  - **Dépendances :** 0005 présente ; réponse à **O5**. **🔒** application sur la base partagée seulement en 25.16, avec accord.

- [X] **Tâche 25.6 : Expiration automatique** — 2026-10-20 : `JobStore.expire_due_offers()` (publiées dont `expires_at` est passée → `expired`), appelée au début de chaque vrai passage ; durée par défaut inchangée à 30 jours (décision 11) ; échec (ex. migration 0014 absente) journalisé, jamais bloquant. Tests `tests/test_daily_cap.py`. **Effective après application de 0014.**
  - **Pourquoi :** un étudiant ne doit pas postuler à une offre fermée ; aujourd'hui une offre périmée reste `published` en base, et sa durée de vie par défaut n'est pas celle que le cadrage propose.
  - **État actuel :**
    - `job_store.py:18` `DEFAULT_LIFETIME_DAYS = 30` ; `save_offer` (l.67-116) pose `expires_at = now UTC + 30 j` (l.78), ou la fin de la date limite en **UTC** si `fields["deadline"]` est lisible (l.79-83, `datetime.max.time()`, `timezone.utc`).
    - `verifier_agent.py:90-95` rejette une date limite déjà passée (avec `date.today()` machine, l.68).
    - `mobile-api/lib/stages-db.ts:301` (~) défaut 30 jours côté recruteur : autre chemin, non concerné.
    - Aucun `expire_due_offers`, aucun `expire_offers.py`. `JobStore.__init__` (l.23-25) : pas de connexion seulement si `dry_run` **et** `DATABASE_URL` vide.
    - Écritures existantes : `with self.conn, self.conn.cursor() as cur:` (l.47, l.84).
  - **Fichiers :** modifiés `scripts/agents/job_store.py`, `scripts/agents/config.py` ; créés `scripts/agents/expire_offers.py`, `scripts/agents/tests/test_expiry.py`.
  - **Étapes :**
    1. Obtenir **O3** (durée, fuseau de fin de journée, `pending_review`).
    2. `config.py` : `OFFER_DEFAULT_LIFETIME_DAYS = _positive_int("OFFER_DEFAULT_LIFETIME_DAYS", <valeur O3>)` avec une aide `_positive_int(name, default)` qui lève `ValueError("OFFER_DEFAULT_LIFETIME_DAYS doit être un entier positif")` si la valeur est invalide.
    3. `job_store.py` : `DEFAULT_LIFETIME_DAYS` lit `config.OFFER_DEFAULT_LIFETIME_DAYS`. Si O3 retient la fin de journée au Cameroun : date limite → `23:59:59` heure du Cameroun (`timezone(timedelta(hours=1))`), convertie en UTC.
    4. Ajouter `JobStore.expire_due_offers(self, now=None) -> int` : en dry-run ou sans connexion → exécuter seulement `select count(*) ... where status = 'published' and expires_at < %s` si une connexion existe, sinon renvoyer 0 ; jamais d'`update`. Sinon `with self.conn, self.conn.cursor() as cur: cur.execute("update public.stage_jobs set status = 'expired' where status = 'published' and expires_at < %s", (now,))` et renvoyer `cur.rowcount`. `now` par défaut = `datetime.now(timezone.utc)`. Si O3 inclut `pending_review`, élargir la clause à `status in ('published','pending_review')`.
    5. `expire_offers.py` : CLI `--dry-run` ; affiche « N offre(s) passée(s) en expired. » ou « N offre(s) à expirer (dry-run, rien n'est écrit). » ; code 0 ; erreur de base → « Expiration impossible : base injoignable. » (sans détail de connexion) et code 1.
    6. Point d'appel unique au début de chaque fenêtre : `daily_scheduler.run_harvesting_window` (avant la boucle) et `run_scraper.main` (passage unique), **pas** `run_full_pipeline` (appelé à chaque cycle). Le nombre est journalisé : « Expiration : N offre(s) passée(s) en expired. »
  - **Tests à écrire :** `tests/test_expiry.py` avec un faux `conn` (context manager, `cursor()` renvoie un faux curseur qui enregistre SQL et paramètres, `rowcount` fixé) : 2 lignes expirées → renvoie 2 et le SQL contient `status = 'published'` et `expires_at <` ; dry-run → aucun `update` exécuté ; `now` injecté transmis tel quel ; `save_offer` sans date limite → `expires_at` = ajout + durée O3 ; date limite `2026-11-30` → fin de journée attendue (UTC ou Cameroun selon O3) ; variable `OFFER_DEFAULT_LIFETIME_DAYS=abc` → `ValueError` (tester `_positive_int` directement, pas en rechargeant `config`).
  - **Vérification (DoD) :** suite unittest « OK » ; `grep -n "DEFAULT_LIFETIME_DAYS = 30" scripts/agents/job_store.py` → rien ; `grep -n "expire_due_offers" scripts/agents/*.py` → définition + 2 appels (scheduler, run_scraper) + CLI.
  - **Pièges :**
    - L'`update` exige que 0014 soit appliquée (sinon violation du check) : sur la base partagée, uniquement après 25.16.
    - Utiliser `<` strict et documenter (offre qui expire « maintenant » reste visible une seconde de plus).
    - `config.py` lit l'environnement à l'import : une nouvelle variable n'est vue qu'au redémarrage du processus.
    - Ne pas modifier `created_at` des 72 offres existantes (cadrage §15).
  - **Dépendances :** 25.5 ; 25.1. **À demander :** **O3**.

- [X] **Tâche 25.7 : Plafond de 20 offres ajoutées par jour** — 2026-10-20 : `daily_cap.py` (début du jour camerounais en UTC) ; `JobStore.count_added_today()` (offres `SCRAPED` publiées ou en revue depuis minuit au Cameroun) ; `config.DAILY_OFFER_CAP` (20) ; l'orchestrateur saute **toute la collecte** si le plafond est déjà atteint (aucun appel payant) et s'arrête offre par offre. Tests : 20 → aucune collecte, 19 → une offre traitée, 0 → tout traité.
  - **Pourquoi :** le fondateur veut un flux maîtrisé de 20 nouvelles offres par jour, relues par un humain ; sans plafond, une source bavarde peut noyer la file « À valider » et consommer des appels payants.
  - **État actuel :**
    - `orchestrator.py:40` `run_full_pipeline(self, query="informatique", platforms=None, limit_per_platform=5, city=None, dry_run=False) -> dict`. Collecte **toutes** les sources dans une liste plate (`collected_items`, l.55-103) **avant** l'analyse (boucle l.113-140).
    - Rapports : `_is_report_candidate` (l.158-160) → `ai_agent` puis `continue` (l.119-130) : jamais comptés dans `statuses`, jamais dans `stage_jobs`.
    - `statuses = {"published", "pending_review", "rejected", "deferred"}` (l.109) incrémenté l.133. `jobs_saved` (l.149) = `published` seulement.
    - Seuls `published` et `pending_review` sont écrits dans `stage_jobs` (`source='SCRAPED'`, `job_store.py:93`). `rejected` et `deferred` vont dans `stage_job_rejections`.
    - `daily_scheduler.py:60-64` appelle `run_full_pipeline` à chaque cycle (mémoire remise à zéro à chaque appel) ; `run_scraper.py:41-48` une fois.
    - `config.py:35-40` : aucune variable de plafond.
  - **Fichiers :** créés `scripts/agents/daily_cap.py`, `scripts/agents/tests/test_daily_cap.py` ; modifiés `scripts/agents/orchestrator.py`, `scripts/agents/config.py`.
  - **Étapes :**
    1. Obtenir **O4** avant de coder le compteur.
    2. `config.py` : `DAILY_OFFER_CAP = _positive_int("DAILY_OFFER_CAP", 20)` (aide de 25.6).
    3. `daily_cap.py` : `CAMEROON_TZ = timezone(timedelta(hours=1))` ; `cameroon_day_bounds(now_utc) -> (start_utc, end_utc)` (minuit à minuit au Cameroun, renvoyés en UTC) ; `count_added_today(conn, now_utc=None) -> int` : `select count(*) from public.stage_jobs where source = 'SCRAPED' and created_at >= %s and created_at < %s` (bornes calculées en Python, utilise l'index de 0014) ; `is_cap_reached(added, cap) -> bool` = `added >= cap`.
    4. Sans connexion (dry-run sans base) : `count_added_today` renvoie 0. Erreur de base pendant le comptage : journaliser « Plafond : comptage impossible, collecte arrêtée par prudence. » et traiter comme plafond atteint (échec sûr, cohérent avec `llm_client`).
    5. `run_full_pipeline` : au début, `base_count = count_added_today(store.conn)` ; si plafond atteint → aucune collecte réseau, résumé avec `cap_reached: True`, journal « Plafond de N offres atteint aujourd'hui : collecte arrêtée jusqu'à demain. »
    6. Restructurer la boucle par source : pour chaque plateforme, vérifier le plafond, collecter, puis analyser ses éléments (au lieu de tout collecter d'abord). Les rapports restent traités comme aujourd'hui et ne comptent pas.
    7. Après chaque offre : `added = base_count + statuses["published"] + statuses["pending_review"]` (+ `statuses["deferred"]` si O4 le retient). Si plafond atteint : sortir des deux boucles, `cap_reached = True`.
    8. Résumé : ajouter `cap_reached` (bool) et `added_today` (int) sans retirer les clés existantes (`run_scraper.py` l.56 affiche `offers_by_status`).
  - **Tests à écrire :** `tests/test_daily_cap.py` : `is_cap_reached(19, 20)` → False ; `(20, 20)` → True ; `cameroon_day_bounds(2026-10-20 23:30 UTC)` → début `2026-10-20 23:00 UTC` (offre comptée le 21 au Cameroun) ; faux curseur renvoyant 7 → `count_added_today` = 7 et SQL contient `source = 'SCRAPED'` ; curseur qui lève → `run_full_pipeline` ne collecte rien. Orchestrateur sans réseau : instance créée par `ScraperOrchestrator.__new__(ScraperOrchestrator)` avec agents factices (attributs posés à la main), `mock.patch("orchestrator.JobStore")`, `mock.patch("orchestrator.process_offer")` renvoyant `{"status": "published"}`, `mock.patch("orchestrator.count_added_today", return_value=18)`, 5 offres collectées → `process_offer` appelé 2 fois, `cap_reached` True ; base à 20 → collecteurs jamais appelés.
  - **Vérification (DoD) :** suite unittest « OK » ; `grep -n "DAILY_OFFER_CAP" scripts/agents/config.py scripts/agents/orchestrator.py` → définition et usage.
  - **Pièges :**
    - Ne pas se baser sur `jobs_saved` (published seulement).
    - Compter `base_count` une seule fois au début de l'appel, puis ajouter le compteur mémoire : relire la base après écriture double-compterait.
    - `deferred` n'est jamais en base : selon O4, le compter seulement en mémoire (il ne survit pas d'un cycle à l'autre).
    - Le plafond doit vivre dans `run_full_pipeline` pour couvrir les deux déclencheurs (scheduler et CLI).
    - Un item LinkedIn contenant « rapport de stage » est traité comme rapport : il ne compte pas.
  - **Dépendances :** 25.1, 25.5 (index), 25.6 (`_positive_int`). **À demander :** **O4**.

- [X] **Tâche 25.8 : Résumé de run stocké** — 2026-10-20 : `JobStore.start_run` / `finish_run` (compteurs, plafond atteint, erreur tronquée à 500 caractères) ; aucune écriture en dry-run (décision 13) ; résumé enrichi de `added_today` et `cap_reached`. Tests avec connexion factice. **Effectif après application de 0014.**
  - **Pourquoi :** l'administrateur doit pouvoir voir, sans lire les journaux du VPS, si le passage du jour a eu lieu, ce qu'il a produit et pourquoi il a échoué.
  - **État actuel :**
    - `orchestrator.py:142-153` construit `summary` (`query`, `duration_seconds`, `total_collected`, `total_analyzed` = même valeur, `reports_saved`, `jobs_saved`, `offers_by_status`, `dry_run`, `platforms`) ; seulement `logger.info` (l.155), rien en base.
    - Exceptions avalées par source (l.62-63, 76-77, 87-88, 95-96, 102-103) et par élément (l.137-138) ; seules `JobStore(...)` (l.110) et `ensure_tables` (l.53) peuvent remonter.
    - Dry-run : `save_offer` sort avant écriture (`job_store.py:70-71`), `log_rejection` ne fait rien (l.45), `ensure_tables` sauté (l.52).
    - Aucun `start_run` / `finish_run`.
  - **Fichiers :** modifiés `scripts/agents/job_store.py`, `scripts/agents/orchestrator.py`, `scripts/agents/daily_scheduler.py` (passage de `window_label`) ; créé `scripts/agents/tests/test_scrape_runs.py`.
  - **Étapes :**
    1. Obtenir **O5**.
    2. `JobStore.start_run(self, sources: list, window_label: str) -> str | None` : un `insert ... returning id` dans son propre `with self.conn, self.conn.cursor()`. En dry-run : `None` (sauf si O5 retient l'écriture, avec `dry_run = true`).
    3. `JobStore.finish_run(self, run_id, counters: dict, cap_reached: bool, error: str | None) -> None` : `update public.stage_scrape_runs set finished_at = now(), collected = %s, published = %s, pending_review = %s, rejected = %s, deferred = %s, cap_reached = %s, error = %s where id = %s`, dans son propre bloc `with`. `run_id` None → rien.
    4. `run_full_pipeline(..., window_label=None)` : défaut « manuel » ; `run_id = store.start_run(platforms, window_label)` juste après la création du store ; corps entier dans `try/except/finally` ; `finally` appelle `finish_run` avec les compteurs connus à cet instant ; une exception est stockée puis relancée.
    5. Texte d'erreur : `f"{type(e).__name__}: {str(e)[:300]}"` ; ne jamais y concaténer une variable d'environnement, une URL de base ou un en-tête.
    6. `daily_scheduler.run_harvesting_window` passe `window_label=f"fenetre-{date du Cameroun}"` (une ligne par cycle, même étiquette pour la fenêtre).
    7. Si O5 refuse l'écriture en dry-run : `run_scraper.py` affiche le résumé complet (`collected, published, pending_review, rejected, deferred, cap_reached`) et la ligne « Dry-run : aucune ligne de run écrite. »
  - **Tests à écrire :** `tests/test_scrape_runs.py` (faux `conn`) : `start_run` → SQL `insert into public.stage_scrape_runs` et renvoie l'id factice ; boucle qui lève `RuntimeError("boom")` → `finish_run` appelé quand même avec `error` commençant par « RuntimeError: boom » et l'exception relancée ; dry-run → aucun `insert` (ou un `insert` avec `dry_run = true` selon O5) ; erreur contenant une chaîne de 1000 caractères → tronquée à 300.
  - **Vérification (DoD) :** suite unittest « OK » ; `grep -n "start_run\|finish_run" scripts/agents/orchestrator.py` → un appel de chaque, `finish_run` dans un `finally`.
  - **Pièges :**
    - Contradiction du plan initial : il demandait une ligne de run en dry-run alors que le dry-run n'écrit rien (`job_store.py:70-71`). Ne pas trancher : **O5**.
    - `with conn:` valide à la sortie ; si `finish_run` partage le bloc d'une écriture qui échoue, il est annulé : bloc séparé obligatoire.
    - `JobStore` se connecte en dry-run si `DATABASE_URL` est défini (lecture de la base partagée).
    - `total_analyzed` = `total_collected` (l.146-147) : ne pas l'interpréter comme « analysé ».
  - **Dépendances :** 25.5, 25.7 (compteurs et `cap_reached`). **À demander :** **O5**.

- [X] **Tâche 25.9 : Cadence unique, une fenêtre par jour** (sauf désactivation du workflow GitHub) — 2026-10-20 : `daily_scheduler.py` : heure du Cameroun forcée (`CAMEROON_TZ`), fenêtre close à 12 h, à la fin de la durée ou au plafond ; démon : lance la fenêtre une fois par jour dès qu'il est entre 10 h et 12 h (un redémarrage à 10 h 35 lance quand même la fenêtre du jour) ; horloge et pause injectables. Tests `tests/test_scheduler_window.py` (6 cas). **Reste 🔒** : désactiver le `schedule` de `.github/workflows/daily-scraper.yml` (décision 14) pour éviter un second passage.
  - **Pourquoi :** le cadrage veut une seule fenêtre de 10 h à 12 h heure du Cameroun ; aujourd'hui deux déclencheurs peuvent tourner le même jour, l'heure dépend de la machine, et un démon lancé à 10 h 01 ne fait rien de la journée.
  - **État actuel :**
    - `daily_scheduler.py` (108 l.) : `run_harvesting_window(duration_minutes=120)` l.38-79 ; `time.time()` (l.44, l.52) et `time.sleep` (l.75-77) appelés directement (non injectables) ; secteur tiré par `random.choice` (l.55) ; plateformes l.62 sans TIKTOK ; `limit_per_platform=3` (l.63).
    - `start_scheduler_daemon()` l.81-97 : `datetime.datetime.now()` naïf (heure machine, l.87), déclenchement seulement si `now.hour == 10 and now.minute == 0` (l.89), `sleep(3600)` après (l.94), sondage 30 s (l.97). CLI `--run-now`, `--duration` (l.99-108).
    - `.github/workflows/daily-scraper.yml:6` : `cron: '0 9 * * *'` (09 h UTC = 10 h au Cameroun), `run_scraper.py` en un passage ; `workflow_dispatch` l.7.
    - `docs/ARCHITECTURE_MAP.md:64` mentionne des « crons VPS » ~ non visibles dans le dépôt.
    - La fin de fenêtre n'est vérifiée qu'en début de cycle : un cycle lancé à 11 h 59 peut dépasser 12 h.
  - **Fichiers :** modifiés `scripts/agents/daily_scheduler.py`, éventuellement `.github/workflows/daily-scraper.yml` (selon O6) ; créé `scripts/agents/tests/test_scheduler_window.py`.
  - **Étapes :**
    1. Obtenir **O6** (déclencheur unique, fuseau).
    2. `CAMEROON_TZ` importé de `daily_cap.py`. Constantes `WINDOW_START_HOUR = 10`, `WINDOW_END_HOUR = 12` (pas de nouvelle variable d'environnement sans demande).
    3. Signature : `run_harvesting_window(duration_minutes=120, now_fn=None, sleep_fn=time.sleep, orchestrator=None, rng=random)` ; `now_fn` par défaut `lambda: datetime.now(CAMEROON_TZ)`.
    4. Fin effective = `min(début + durée, aujourd'hui 12:00 heure du Cameroun)`. Boucle : `while now_fn() < fin` ; après chaque cycle, sortir si `summary.get("cap_reached")` avec le journal « Fenêtre close : plafond atteint. » ; sinon à la fin, « Fenêtre close : 12 h atteint. ».
    5. Passer l'échéance à `run_full_pipeline(..., deadline=fin)` (nouveau paramètre optionnel) qui arrête l'analyse entre deux éléments si `now >= deadline`.
    6. Appeler `expire_due_offers` (25.6) avant le premier cycle.
    7. Démon (si O6 le retient) : `now = datetime.now(CAMEROON_TZ)` ; déclencher si `10 <= now.hour < 12` et `last_run_date != now.date()` (variable en mémoire) ; plus de test sur la minute exacte.
    8. Crontab (si O6 la retient) : documenter dans la docstring, **sans l'appliquer** : `0 9 * * * cd <chemin VPS>/scripts/agents && PYTHONUTF8=1 python3 daily_scheduler.py --run-now >> <journal> 2>&1` (VPS en UTC, ~ à vérifier ; `CRON_TZ` n'est pas pris en charge par le cron Debian/Ubuntu par défaut). Ne pas garder démon **et** crontab.
    9. GitHub Actions (selon O6) : soit retirer le bloc `schedule` et garder `workflow_dispatch`, soit en faire le déclencheur unique et retirer le démon du VPS.
    10. Corriger le message « 2 heures » (l.90) pour afficher la durée réelle. Vérifier qu'aucun texte ne parle de « 4 passages ».
  - **Tests à écrire :** `tests/test_scheduler_window.py` avec horloge simulée (liste de `datetime` avancée par `sleep_fn`) et faux orchestrateur : départ 10 h 00, cycles de 25 min → arrêt avant 12 h 00, aucun cycle lancé après ; départ 11 h 50 → un seul cycle ; faux résumé `cap_reached: True` au 2e cycle → 2 cycles exactement ; `sleep_fn` jamais réel (durée totale du test < 1 s) ; `rng` figé ; démon : 10 h 35 sans passage du jour → déclenche ; second appel le même jour → ne déclenche pas.
  - **Vérification (DoD) :** suite unittest « OK » ; `grep -n "4 passages\|quatre passages" scripts/agents/*.py` → rien ; `grep -n "datetime.datetime.now()" scripts/agents/daily_scheduler.py` → rien.
  - **Pièges :**
    - Deux déclencheurs (démon/crontab VPS et GitHub Actions) = deux passages par jour si O6 n'est pas appliquée des deux côtés.
    - Heure machine : Windows local, GitHub Actions en UTC, VPS inconnu.
    - `logging.basicConfig` à l'import (l.21, `orchestrator.py:26`) : sans `force=True`, une seconde configuration est ignorée.
    - `ScraperOrchestrator()` (l.43) hors `try` : une erreur d'initialisation tue la fenêtre ; l'injecter rend aussi le test possible.
  - **Dépendances :** 25.6, 25.7, 25.8. **À demander :** **O6**.

### Lot C — Sources et Treg

- [/] **Tâche 25.10 : Accès Treg côté serveur** — 2026-10-20 : `config.py` lit `TREG_API_KEY`, `TREG_BASE_URL` (https://treg.to), `TREG_CLI` (`/opt/treg-cli/bin/treg`), `TREG_MAX_CALLS_PER_RUN` (4), `TREG_MAX_COST_PER_CALL_USD` (0,01) ; entrée `admin-app/.env.local` retirée. L'API réelle est `https://treg.to/call/<endpoint>` avec `X-Treg-Token` (l'adresse `api.treg.ai` du workflow n8n ne résout pas). Sur le VPS, le CLI connecté (équipe bct) sert de transport sans nouveau secret. **Reste 🔒** : rotation de la clé exposée dans `scripts/n8n/campus360_treg_full_workflow.json` et retrait de sa valeur du fichier.
  - **Pourquoi :** LinkedIn passe par Treg, mais le serveur n'a pas accès au connecteur Treg de Claude Code ; sans clé côté serveur, aucune offre LinkedIn n'arrive aux étudiants. Une clé déjà exposée dans le dépôt doit être neutralisée avant toute nouvelle livraison.
  - **État actuel :**
    - `config.py` `ENV_FILES` (~l.10-15) : `<racine>/.env.local`, `<racine>/mobile-api/.env.local`, `<racine>/admin-app/.env.local` (dossier inexistant), `<racine>/.env`. **Pas** `scripts/agents/.env`. `load_local_env()` (l.17-30) n'écrase pas une variable déjà présente.
    - Variables tierces lues par `os.getenv` (~l.35-40) : `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `APIFY_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`. Aucune variable Treg.
    - `scripts/n8n/campus360_treg_full_workflow.json` (suivi par git) : trois nœuds HTTP vers `https://api.treg.ai/v1/tools/execute`, en-tête `Authorization: Bearer` (valeur `$env.TREG_API_KEY` **avec un repli codé en dur**, ~l.51, ~115, ~148). Schéma observé : Bearer (à confirmer).
    - `.skills/environments.md` : aucune section pour `scripts/agents`. `.gitignore` l.80 (`.env*`) protège les fichiers `.env`.
  - **Fichiers :** modifiés `scripts/agents/config.py`, `.skills/environments.md` ; par l'utilisateur : `scripts/n8n/campus360_treg_full_workflow.json`.
  - **Étapes :**
    1. 🔒 Demander à l'utilisateur de retirer la valeur de repli du JSON n8n (ne garder que `$env.TREG_API_KEY`) **et** de faire tourner la clé chez Treg, avant tout nouveau commit. L'historique git garde l'ancienne valeur : seule la rotation la neutralise. L'IA ne recopie jamais cette valeur, même partiellement.
    2. Obtenir **O7** (emplacement, nom, schéma d'authentification).
    3. `config.py` : `TREG_API_KEY = os.getenv("TREG_API_KEY", "")` ; `TREG_API_URL = os.getenv("TREG_API_URL", "https://api.treg.ai/v1/tools/execute")` ; `TREG_LINKEDIN_TOOL = os.getenv("TREG_LINKEDIN_TOOL", "")` (vide tant que O8 n'est pas tranchée).
    4. Si O7 retient `scripts/agents/.env` : ajouter `Path(__file__).resolve().parent / ".env"` **en tête** de `ENV_FILES`. Retirer l'entrée `admin-app/.env.local` (dossier inexistant).
    5. `.skills/environments.md` : nouvelle section « Agents de scraping (`scripts/agents`) » listant **les noms seulement** (`TREG_API_KEY`, `TREG_API_URL`, `TREG_LINKEDIN_TOOL`, `DAILY_OFFER_CAP`, `OFFER_DEFAULT_LIFETIME_DAYS`, `SCRAPER_MODEL`, `SCRAPER_FALLBACK_MODEL`, `DATABASE_URL`, `OPENROUTER_API_KEY`, `APIFY_API_TOKEN`) et le fichier où les placer (O7), local et VPS.
  - **Tests à écrire :** aucun test réseau. Ajouter à `tests/test_daily_cap.py` ou un nouveau `tests/test_config.py` : `config.ENV_FILES` contient le chemin retenu par O7 et ne contient plus `admin-app`.
  - **Vérification (DoD) :**
    - `cd scripts/agents && python -c "import config; print(bool(config.TREG_API_KEY))"` → `True` ou `False` (jamais la valeur).
    - `git grep -n "treg_live"` → aucune ligne, code 1 (après l'action de l'utilisateur à l'étape 1).
    - `grep -n "TREG_API_KEY" .skills/environments.md scripts/agents/config.py` → noms seulement.
    - Suite unittest « OK ».
  - **Pièges :**
    - Plan initial erroné : `scripts/agents/.env` n'est pas lu aujourd'hui.
    - Ne jamais `print(config.TREG_API_KEY)`, ni la journaliser, ni l'inclure dans une exception.
    - Emplacement réel du `.env` sur le VPS ~ non vérifié (`.skills/environments.md`, section hôte distant « à compléter »).
    - Le connecteur MCP Treg (Claude Code) et l'API HTTP Treg sont deux choses : seule l'API HTTP est utilisable par le cron.
  - **Dépendances :** aucune. **Bloque 25.11 (appel réel) et 25.16.** **À demander :** **O7** ; la clé ou la procédure pour en créer une ; 🔒 rotation et nettoyage du JSON n8n.

- [X] **Tâche 25.11 : Adaptateur Treg pour LinkedIn** — 2026-10-20 : `scripts/agents/treg_linkedin_agent.py` (`TregLinkedInAgent.search_jobs(query, kind)`) : stages = `employmentType: internship` + Cameroun, emplois = Cameroun ; transport HTTP (`X-Treg-Token`, plafond `X-Treg-Route-Max-Cost`) ou CLI `treg --json call` ; rien sans `live` ; plafond d'appels par passage ; arrêt sur 429 ; offres hors Cameroun, sans titre ou sans lien écartées ; dédoublonnage par id ; texte construit uniquement à partir des champs réels. Test `tests/test_treg_linkedin_agent.py` (13 cas). `run_scraper.py --dry-run --live` → code 2.
  - **Pourquoi :** les offres LinkedIn sont les plus recherchées par les étudiants ; il faut une source fiable, bornée en coût, qui n'invente rien quand l'appel échoue.
  - **État actuel :**
    - `treg_linkedin_agent.py` n'existe pas. Le nom d'outil `linkedin.search.jobs` n'apparaît **nulle part** dans le dépôt : endpoint, paramètres, format de réponse et signal de quota ~ non vérifiés.
    - Forme HTTP observée dans le workflow n8n : `POST https://api.treg.ai/v1/tools/execute`, corps `{"tool": "treg/<outil>", "payload": {...}}`, réponse lue en `data.*`.
    - Modèle d'erreur à reproduire : `linkedin_agent.py` `_query_syndication` (l.50-90) avale les erreurs et renvoie `[]`. Modèle de clé : `apify_agent.py` ~l.17-20 (`is_configured()`).
    - Clés d'item attendues par le pipeline : `platform`, `title`, `url`, `snippet`, `company`, `location`, `flyer_url`, `contact_email`, `contact_whatsapp`, `pub_date` (facultatif).
    - **Le dry-run ne coupe pas la collecte** (`run_full_pipeline` ne coupe que les écritures) : sans garde, un `--dry-run` déclencherait un appel Treg payant.
  - **Fichiers :** créés `scripts/agents/treg_linkedin_agent.py`, `scripts/agents/tests/test_treg_linkedin_agent.py` ; modifiés `scripts/agents/config.py` (`TREG_MAX_CALLS_PER_RUN`), `scripts/agents/run_scraper.py` (`--live`).
  - **Étapes :**
    1. Obtenir **O8** (nom d'outil, paramètres, format, quota, garde `--live`).
    2. `config.py` : `TREG_MAX_CALLS_PER_RUN = _positive_int("TREG_MAX_CALLS_PER_RUN", 30)`.
    3. Classe `TregLinkedInAgent(api_key=None, tool=None, url=None, live=False, post=None, max_calls=None, timeout=20)` ; `post` par défaut = `requests.Session().post` ; aucun effet de bord à l'import.
    4. `is_configured()` = clé non vide **et** `tool` non vide. `reset_run()` remet le compteur d'appels à zéro (appelé au début de chaque `run_full_pipeline`).
    5. `search_jobs(query: str, location: str = "Cameroun", max_results: int = 10) -> list[dict]`, dans cet ordre : pas `live` → journal info « Treg LinkedIn ignoré : mode sans --live. », `[]`, **aucun appel** ; pas configuré → warning « Treg non configuré (TREG_API_KEY ou TREG_LINKEDIN_TOOL absente). », `[]` ; compteur ≥ plafond → warning « Treg : plafond de N appels atteint pour ce passage. », `[]`.
    6. Appel : en-têtes `Authorization: Bearer <clé>` (selon O7) et `Content-Type: application/json` ; corps `{"tool": tool, "payload": {...}}` avec les paramètres de O8. Jamais la clé dans l'URL (ne pas reproduire le `?token=` d'Apify).
    7. Erreurs : exception réseau ou timeout, HTTP ≠ 200, JSON illisible, réponse sans liste → journal « Treg LinkedIn : échec (<type ou code HTTP>). » (sans corps ni en-têtes), `[]`. Quota (code de O8, 429 par défaut) → marquer l'agent épuisé pour le passage.
    8. `_normalize(raw) -> dict | None` écrit **après** lecture d'une réponse réelle ou de la doc (O8) : `platform="LINKEDIN"`, `title`, `company`, `location`, `url`, `snippet` (≤ 1200 caractères), `flyer_url` ou `None`, `pub_date` si présent ; item sans `url` ni `title` → `None` (écarté). Jamais de valeur inventée.
    9. `run_scraper.py` : option `--live` (défaut faux) transmise à `run_full_pipeline(live=...)`. `--dry-run --live` → message « --live est incompatible avec --dry-run. » et code 2 (recommandation : le dry-run n'appelle jamais Treg ; à confirmer en O8).
  - **Tests à écrire :** `tests/test_treg_linkedin_agent.py` avec faux `post` (compteur d'appels) : `live=False` → `[]` et 0 appel ; clé vide → `[]`, 0 appel ; HTTP 500 → `[]` ; exception `requests.Timeout` → `[]` ; réponse `{}` → `[]` ; 429 → `[]` puis appel suivant non émis ; plafond 2 → 3e appel non émis ; le message journalisé ne contient jamais la clé factice (`assertNotIn`) ; en-tête `Authorization` présent et URL sans `token=` ; normalisation sur l'exemple validé en O8 (test écrit après O8).
  - **Vérification (DoD) :** suite unittest « OK » ; `PYTHONUTF8=1 python run_scraper.py --dry-run --live` → code 2 ; `grep -n "token=" scripts/agents/treg_linkedin_agent.py` → rien.
  - **Pièges :**
    - Ne pas inventer les clés de réponse : sans O8, `_normalize` reste inutilisé et `TREG_LINKEDIN_TOOL` vide.
    - Ne jamais journaliser l'en-tête `Authorization` ni le corps complet d'une réponse d'erreur.
    - Le planificateur n'utilise pas `dry_run` : un passage planifié appellera Treg dès que la clé et l'outil sont présents ; le plafond de 30 doit être actif.
    - `requests` n'est listé dans aucun `requirements.txt` ; présent en local, ~ non vérifié sur le VPS.
    - Console Windows : garder les `print` de test en ASCII ou utiliser `PYTHONUTF8=1`.
  - **Dépendances :** 25.1 ; appel réel : 25.10. **À demander :** **O8**.

- [X] **Tâche 25.12 : Brancher LinkedIn sur Treg dans l'orchestrateur** — 2026-10-20 : `orchestrator.py` : Treg (stages puis emplois) → Apify → repli RSS ; `live` forcé à faux en dry-run ; `config.DEFAULT_PLATFORMS` partagé par `run_scraper.py` et `daily_scheduler.py` (qui passe `live=True`). `offer_pipeline.structured_evaluation` : pour un item avec `kind_hint`, type donné par la source (titre « stagiaire/intern/trainee » → stage), champs recopiés avec leurs preuves, confiance 0,85, **aucun appel d'IA** ; le filtre et le vérificateur s'appliquent. 6 offres réelles testées : toutes publiées. Test `tests/test_orchestrator_linkedin.py` (5 cas). Suite Python : 30 tests OK.
  - **Pourquoi :** tant que l'orchestrateur appelle l'ancien chemin (Apify ou flux Google News), les offres LinkedIn restent rares et sans entreprise ni lieu ; la nouvelle source doit être branchée sans faire tomber les autres.
  - **État actuel :**
    - Bloc LINKEDIN : `orchestrator.py` l.68-77 : Apify si `is_configured()` (l.71-72), sinon `linkedin_agent.search_linkedin_reports(query=f"rapport de stage {query}{city_suffix}", ...)` (l.74) ; exceptions journalisées.
    - `linkedin_agent.py` n'utilise **pas** Apify : syndication Google News RSS (`_query_syndication`, l.53), `[]` sur erreur, items sans `company` ni `location`. Import l.15, instance l.31, seul appelant l.74.
    - Plateformes par défaut divergentes : `orchestrator.py` l.45 (`CAMEROON_JOBS, LINKEDIN, FACEBOOK, TIKTOK, ACADEMIC_WEB`), `run_scraper.py` l.24 (`LINKEDIN,FACEBOOK,ACADEMIC_WEB`), `daily_scheduler.py` l.62 (`CAMEROON_JOBS, LINKEDIN, FACEBOOK, ACADEMIC_WEB`).
    - Autres sources inchangées : CAMEROON_JOBS (l.60-63), FACEBOOK (l.79-88), TIKTOK (l.90-96, Apify seul), ACADEMIC_WEB (l.98-103).
  - **Fichiers :** modifiés `scripts/agents/orchestrator.py`, `scripts/agents/config.py` (`DEFAULT_PLATFORMS`), `scripts/agents/run_scraper.py`, `scripts/agents/daily_scheduler.py`, `scripts/agents/linkedin_agent.py` (selon O9) ; créé `scripts/agents/tests/test_orchestrator_linkedin.py`.
  - **Étapes :**
    1. Obtenir **O9** et **O10**.
    2. `config.py` : `DEFAULT_PLATFORMS` = liste retenue en O10 ; les trois appelants l'utilisent (plus de liste en dur).
    3. `__init__` : `self.treg_linkedin_agent = TregLinkedInAgent()` ; `run_full_pipeline(..., live=False)` pose `self.treg_linkedin_agent.live = live and not dry_run` et appelle `reset_run()`.
    4. Bloc LINKEDIN, dans l'ordre retenu en O9 : par exemple Treg → (Apify si O9 le garde) → (`linkedin_agent` si O9 le garde en secours, seulement si Treg a renvoyé 0 item **sans** quota). Clé absente : journal « LinkedIn : Treg non configuré, source ignorée. » et la boucle continue sur les autres plateformes.
    5. Si O9 retire `linkedin_agent.py` : supprimer l'import (l.15), l'instance (l.31) et l'appel ; supprimer le fichier seulement si aucun autre import (`grep -rn "linkedin_agent" scripts`).
    6. `daily_scheduler` passe `live=True` (passage réel planifié) ; `run_scraper` passe `args.live`.
    7. Vérifier que la normalisation 25.11 ne produit pas d'item classé « rapport » par erreur (`_is_report_candidate` l.158-160 : « rapport de stage » ou « mémoire » dans le texte).
  - **Tests à écrire :** `tests/test_orchestrator_linkedin.py` (instance par `__new__`, agents factices, `JobStore`, `process_offer` et `count_added_today` patchés) : Treg factice non configuré → aucun item LINKEDIN, pas d'exception, CAMEROON_JOBS factice quand même appelé ; Treg factice renvoie 2 offres → `process_offer` appelé 2 fois ; `dry_run=True, live=True` → `treg_linkedin_agent.live` faux ; secours (si O9 le garde) appelé seulement quand Treg renvoie `[]` sans quota.
  - **Vérification (DoD) :**
    - Suite unittest « OK ».
    - `grep -n "TregLinkedInAgent\|LinkedInScraperAgent\|search_linkedin_reports" scripts/agents/orchestrator.py` → l'appel retenu (le motif `linkedin_agent` seul trouverait aussi `treg_linkedin_agent`).
    - Contrôle manuel facultatif : `PYTHONUTF8=1 python run_scraper.py --platforms linkedin --query test --limit 1 --dry-run` → pas de plantage, LinkedIn signalé « non configuré » ou ignoré (sans `--live`). Si `linkedin_agent` est gardé en secours, cette commande fait un appel réseau gratuit (Google News) : prévenir l'utilisateur avant.
  - **Pièges :**
    - Import cassé dans `treg_linkedin_agent.py` = tout le scraper cassé (imports au chargement).
    - Apify LinkedIn (l.71-72) est un autre chemin payant : sa place dépend de O9.
    - `reprocess_existing.py` (l.53-75) a sa propre copie du pipeline : il ne passe pas par l'orchestrateur ; ne pas croire qu'il bénéficie de ce branchement.
    - `summary["platforms"]` garde la liste d'entrée : ne pas la modifier.
  - **Dépendances :** 25.11. **À demander :** **O9**, **O10**.

### Lot D — Date d'ajout sur la carte (application)

- [X] **Tâche 25.13 : Fonction de date d'ajout** — 2026-10-20 : `src/features/stages/addedAt.ts` (`formatAddedAgo`, sans import, UTC+1 calculé à la main) ; test `mobile-api/tests/stage-added-at.test.mjs` (5 groupes, 15 cas). DoD : `npm test` mobile-api 121 réussis, 0 échec ; `npx tsc --noEmit` 0 ; `lint:colors` 192.
  - **Pourquoi :** un étudiant veut savoir si une offre est fraîche avant de postuler ; une offre ajoutée il y a 3 h n'a pas la même valeur qu'une offre de trois semaines.
  - **État actuel :**
    - `src/types.ts:45` `StageJob`, champ `createdAt: string` (l.55, obligatoire).
    - `mobile-api/lib/stages-db.ts:102` : `createdAt: new Date(row.created_at).toISOString()` (ISO UTC, depuis `stage_jobs.created_at`).
    - Aucune fonction de date relative pour les offres (`ApplicationsTimelineScreen.tsx:318` calcule « il y a Nj » en ligne, autre écran).
    - Tests Node : `mobile-api/tests/*.test.mjs` chargent `src/` par `loadTs('../src/...')` (`tests/helpers/load-ts.mjs`), module autonome sans import autre que `node:`.
  - **Fichiers :** créés `src/features/stages/addedAt.ts`, `mobile-api/tests/stage-added-at.test.mjs`. Aucun jumeau.
  - **Étapes :**
    1. Exporter `formatAddedAgo = (createdAtIso: string, now: Date = new Date()): string` (fonction fléchée nommée, aucun import).
    2. Libellés complets (cohérence corrigée : la fonction renvoie toujours la phrase entière affichée sur la carte) : écart < 60 s → « Ajouté à l'instant » ; < 60 min → « Ajouté il y a N min » ; < 24 h → « Ajouté il y a N h » ; < 7 j → « Ajouté il y a N j » (N = partie entière) ; ≥ 7 j → « Ajouté le J mois à H h MM » en heure du Cameroun.
    3. Date absolue sans `Intl` : `const d = new Date(t + 3600000)` puis `getUTCDate()`, `getUTCMonth()`, `getUTCHours()`, `getUTCMinutes()` ; mois `['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']` ; minutes sur 2 chiffres, heure sans zéro (« 9 h 05 »). Année ajoutée seulement si elle diffère de l'année courante au Cameroun (« Ajouté le 1 oct. 2025 à 9 h 00 »).
    4. Date dans le futur : écart ≥ −5 min → « Ajouté à l'instant » ; au-delà → date absolue.
    5. Chaîne vide, `undefined` ou date invalide (`Number.isNaN(Date.parse(...))`) → `''`.
    6. Commentaire anglais en tête : source (`stage_jobs.created_at`), fuseau UTC+1 sans heure d'été, pourquoi pas `Intl`.
  - **Tests à écrire :** `mobile-api/tests/stage-added-at.test.mjs` (`node:test`, `assert/strict`, `const { formatAddedAgo } = await loadTs('../src/features/stages/addedAt.ts')`), `now = new Date('2026-10-20T13:05:00Z')` (14 h 05 au Cameroun) :
    - −30 s → « Ajouté à l'instant » ; −59 s → « Ajouté à l'instant » ; −60 s → « Ajouté il y a 1 min ».
    - −59 min → « Ajouté il y a 59 min » ; −60 min → « Ajouté il y a 1 h » ; −23 h 59 → « Ajouté il y a 23 h ».
    - −24 h → « Ajouté il y a 1 j » ; −6 j 23 h → « Ajouté il y a 6 j ».
    - `2026-10-13T13:05:00Z` (7 j pile) → « Ajouté le 13 oct. à 14 h 05 ».
    - `2026-10-10T23:30:00Z` → « Ajouté le 11 oct. à 0 h 30 » (changement de jour au Cameroun).
    - `2025-12-31T23:30:00Z` → « Ajouté le 1 janv. à 0 h 30 » (année 2026 au Cameroun).
    - `2025-10-01T08:00:00Z` → « Ajouté le 1 oct. 2025 à 9 h 00 ».
    - +2 min → « Ajouté à l'instant » ; `'pas une date'` → `''` ; `''` → `''`.
  - **Vérification (DoD) :** `cd mobile-api && npm test` → 0 échec, 12 cas nouveaux passent ; `npx tsc --noEmit` (racine) → code 0 ; `npm run lint:colors` → 192.
  - **Pièges :**
    - `Intl`/`toLocaleString` avec `timeZone` n'est pas fiable sous Hermes (Android) : calcul manuel obligatoire.
    - `loadTs` ne résout aucun import local : le fichier doit rester autonome.
    - Le test vit dans `mobile-api/tests` mais teste `src/` : c'est le patron existant (`payment-status.test.mjs`), pas une anomalie.
    - Ne jamais utiliser `source_published_at` (décision 7).
  - **Dépendances :** aucune.

- [X] **Tâche 25.14 : Afficher la date sur la carte d'offre** (sauf vérification visuelle) — 2026-10-20 : `StagesScreen.tsx` : import de `formatAddedAgo`, `listNow` lu une fois par rendu, seconde ligne `metaRow` avec icône `Clock` et le libellé, absente si la date est invalide. DoD : tsc 0, `lint:colors` 192, `npm test` 0 échec, M3 83/83. **Non vérifié à l'écran** : l'écran Stages exige une session et aucun identifiant de test n'est fourni. Dettes vues, hors périmètre : repli `job.matchScore || 75` (score inventé), replis « Douala » et « 3 à 6 mois », lien de partage `campus360.app`.
  - **Pourquoi :** la carte d'offre n'affiche aujourd'hui aucune date ; l'étudiant ne peut pas distinguer une offre du jour d'une offre ancienne.
  - **État actuel :**
    - `src/ui/screens/StagesScreen.tsx` (2103 l.) : ligne d'infos de la carte l.593-599 : `<View style={styles.metaRow}>` + icône `MapPin` (`size={12}`, `color={stitchColors.inkMuted}`) + `<Text style={styles.metaText}>{job.location || 'Douala'} · {job.duration || '3 à 6 mois'}</Text>` (l.597).
    - Styles `metaRow` l.1462, `metaText` l.1467. Icône `Clock` déjà importée (l.20, `lucide-react-native`).
    - Aucune date affichée sur la carte.
    - Lien de partage `https://campus360.app/stages/${job.id}` en dur dans `handleShareJob` (~l.266).
  - **Fichiers :** modifié `src/ui/screens/StagesScreen.tsx` ; utilise `src/features/stages/addedAt.ts` (25.13).
  - **Étapes :**
    1. Importer `formatAddedAgo` depuis `'../../features/stages/addedAt'`.
    2. Calculer `const now = new Date()` une seule fois par rendu de la liste (pas dans chaque carte).
    3. Sous le `metaRow` existant (après l.599), ajouter une seconde ligne affichée seulement si le libellé n'est pas vide : `<View style={styles.metaRow}>` + `<Clock size={12} color={stitchColors.inkMuted} style={{ marginRight: 4 }} />` + `<Text style={styles.metaText} accessibilityLabel={label}>{label}</Text>`.
    4. États : `createdAt` valide → « Ajouté il y a 3 h » (ou date absolue au-delà de 7 jours) ; `createdAt` invalide → aucune ligne (pas d'espace vide).
    5. Réutiliser `metaRow` / `metaText` ; si un écart est nécessaire, nouveau style avec tokens `stitchColors` uniquement.
    6. Ne pas toucher la ligne l.597 (replis « Douala » et « 3 à 6 mois ») ni le lien de partage : dettes signalées ci-dessous.
  - **Tests à écrire :** pas de test de rendu (pas de bibliothèque de test React Native) ; la logique est couverte par 25.13.
  - **Vérification (DoD) :**
    - `npx tsc --noEmit` (racine) → code 0 ; `npm run lint:colors` → 192 ; `cd mobile-api && npm test` → 0 échec.
    - Visuel : `npm run web`, écran Stages, capture d'une carte avec « Ajouté il y a … » via le navigateur intégré (desktop et 375 px).
  - **Pièges :**
    - 🔒 La vérification visuelle exige une session connectée ; sans identifiants de test fournis par l'utilisateur, la reporter à l'utilisateur (ne pas créer de compte).
    - Le libellé n'est recalculé qu'au rendu : une liste ouverte longtemps affiche un âge figé ; acceptable (rafraîchie au rechargement).
    - Dette existante hors périmètre : le lien `https://campus360.app/stages/${job.id}` (~l.266) pointe vers un domaine non vérifié (le domaine connu est `campus360b.site`) ; à signaler, ne pas corriger ici.
    - Dette existante hors périmètre : les replis « Douala » et « 3 à 6 mois » (l.597) affichent des valeurs inventées quand le champ manque.
  - **Dépendances :** 25.13. **🔒 À demander :** identifiants de test pour la vérification visuelle.

- [X] **Tâche 25.17 : Postuler à une offre qui n'a qu'un lien (LinkedIn)** (sauf migration et visuel) — 2026-10-20 : `mobile-api/sql/0015_apply_method_link.sql` (valeur `LINK`, instruction seule) ; `src/features/stages/applyTarget.ts` (nouveau : `isLinkApply`, `safeApplyUrl` qui n'accepte que `https://`, libellés) ; `src/types.ts` (`LINK` + `sourceUrl`) ; `stages-db.ts` (`source_url` lu et renvoyé en `sourceUrl`) ; `dispatch/route.ts` et `apply/route.ts` → 422 « Cette offre se postule sur le site de l'offre. » ; `job_store.py` : WhatsApp > e-mail > lien > sur place ; `StagesScreen.tsx` : carte et fiche ouvrent le site (`openApplyLink`), bloc recruteur remplacé par la mention que la candidature n'est pas suivie ; `AiApplyModal.tsx` : garde-fou qui ferme le modal ; `recruiter-web/lib/admin-platform-service.ts` : union élargie. DoD : `npm test` mobile-api 177 réussis / 0 échec (7 nouveaux cas), unittest Python 60 OK (4 nouveaux cas), `tsc` racine + mobile-api + recruiter-web = 0, `lint:colors` 191 = base. **Non fait :** migration 0015 non appliquée (🔒 base partagée, à appliquer deux fois) ; vérification visuelle impossible (session requise). **Écart avec le guide :** module `applyTarget.ts` ajouté (non prévu) pour rendre testable la validation de l'URL externe.
  - **Pourquoi :** une offre LinkedIn n'a ni e-mail ni WhatsApp. Aujourd'hui `job_store.save_offer` l'enregistre en `PHYSICAL` (« sur place ») : l'étudiant voit une méthode fausse, et « Postuler en 1 Clic » n'a aucun destinataire. L'étudiant doit pouvoir ouvrir l'offre et postuler sur le site de l'annonce.
  - **État actuel :**
    - Type SQL : `mobile-api/sql/0000_baseline.sql` l.14 `create type apply_method as enum ('WHATSAPP', 'EMAIL', 'PHYSICAL')` ; colonne l.405 `apply_method apply_method not null default 'WHATSAPP'`. Aucune migration 0001 à 0014 ne l'a modifié (`grep -n apply_method mobile-api/sql/*.sql`).
    - Type app : `src/types.ts` l.18 `export type ApplyMethod = 'WHATSAPP' | 'EMAIL' | 'PHYSICAL'` ; `StageJob` l.45-60 n'a pas de champ `sourceUrl`.
    - API : `mobile-api/lib/stages-db.ts` l.66 (`StageJobRow.apply_method`) ; `mapJob` l.84-100 renvoie `applyMethod: row.apply_method` et **aucun** `sourceUrl`, alors que `JOB_SELECT` (l.119-127) lit déjà `j.*` (donc `source_url` est dans la ligne) ; `StageJobRow` n'a pas `source_url`. Le détail (`getStageJob`) passe par le même `mapJob`.
    - Écriture scraper : `scripts/agents/job_store.py` l.146-153 : `WHATSAPP` si `contact_whatsapp`, `EMAIL` si `contact_email`, sinon `PHYSICAL`. `source_url` = `item["url"]` ; `apply_url` de l'extraction = `item["url"]` (`offer_pipeline.structured_evaluation`).
    - Routes : `stages/dispatch/route.ts` l.124 `getStageJob`, l.131 `missingDispatchTarget` renvoie 422 si le canal n'a pas de destinataire, sans jamais regarder `applyMethod` ; `stages/apply/route.ts` l.23 vérifie seulement que l'offre existe.
    - App : `src/ui/screens/StagesScreen.tsx` : bouton de carte « Postuler » l.647 (`setApplyingJob(job)`), bouton de fiche « Postuler en 1 Clic » l.1131 (`handleApplyFromDetail` l.315-330), bloc « Contacter le recruteur » l.1075-1102 (WhatsApp / e-mail, `CONTACT_UNAVAILABLE`). `src/features/stages/AiApplyModal.tsx` l.242 ne traite que `EMAIL`.
    - Copie divergente : `recruiter-web/lib/admin-platform-service.ts` l.14 redéfinit `ApplyMethod` (même union, à élargir).
    - `scripts/agents/database_ingestor.py` l.274 écrit `WHATSAPP` ou `EMAIL` pour les rapports ingérés : hors périmètre, ne pas toucher.
  - **Décisions prises ici (réversibles, sans 🔒) :**
    - Valeur ajoutée : `LINK`. Règle d'écriture : `WHATSAPP` > `EMAIL` > `LINK` (si `apply_url`) > `PHYSICAL`. Conséquence assumée : une offre scrapée qui a un lien mais aucun contact passe de `PHYSICAL` à `LINK` (plus juste : elle se postule en ligne).
    - Libellé unique et générique : « Postuler sur le site de l'offre » (pas « sur LinkedIn », pour ne pas nommer une source à tort).
    - Une candidature `LINK` n'est pas suivie dans l'app (l'étudiant postule ailleurs) : pas de statut, pas d'envoi. Le libellé doit le dire.
  - **Fichiers :**
    - créés `mobile-api/sql/0015_apply_method_link.sql`, `mobile-api/tests/apply-method-link.test.mjs`, `scripts/agents/tests/test_job_store_apply_method.py` ;
    - modifiés `src/types.ts`, `src/ui/screens/StagesScreen.tsx`, `mobile-api/lib/stages-db.ts`, `mobile-api/app/api/mobile/stages/dispatch/route.ts`, `mobile-api/app/api/mobile/stages/apply/route.ts`, `scripts/agents/job_store.py`, `recruiter-web/lib/admin-platform-service.ts` (type seulement).
    - Copie jumelle : aucune à synchroniser ; le type `recruiter-web` est à élargir.
  - **Étapes :**
    1. **Migration** `mobile-api/sql/0015_apply_method_link.sql` : `alter type apply_method add value if not exists 'LINK';`. **Pas de `begin` ni `commit`** : une valeur ajoutée dans une transaction n'est utilisable qu'après commit, le fichier reste une instruction seule. Commentaire en anglais, idempotent. Rien d'autre.
    2. **Type app** : `src/types.ts` l.18 → `'WHATSAPP' | 'EMAIL' | 'LINK' | 'PHYSICAL'` ; ajouter `sourceUrl?: string;` à `StageJob`, après `source`.
    3. **API** : `stages-db.ts` : `StageJobRow` gagne `apply_method: 'WHATSAPP' | 'EMAIL' | 'LINK' | 'PHYSICAL'` et `source_url: string | null` ; `mapJob` ajoute `sourceUrl: row.source_url ?? undefined`. Vérifier que les autres mappers de `stage_jobs` (grep `applyMethod: row.apply_method`) restent cohérents.
    4. **Refus côté serveur** : `dispatch/route.ts`, après l.124 : si `job.applyMethod === 'LINK'`, renvoyer 422 `{ error: "Cette offre se postule sur le site de l'offre." }`, sans envoi ni ligne `stage_applications`. `apply/route.ts`, après l.23-24 : même refus en 422.
    5. **Écriture scraper** : `job_store.py`, `save_offer` : `apply_method = "WHATSAPP" if whatsapp else "EMAIL" if email else "LINK" if fields.get("apply_url") else "PHYSICAL"`.
    6. **App, carte** : `StagesScreen.tsx` l.647 : si `job.applyMethod === 'LINK'`, le bouton ouvre `job.sourceUrl` (`Linking.openURL`, avec `Alert` si l'URL manque ou n'est pas `https://`) et son libellé est « Postuler sur le site ». Pas d'appel à `setApplyingJob`.
    7. **App, fiche** : l.1131 : même traitement, libellé « Postuler sur le site », pas d'appel à `handleApplyFromDetail`. Dans le bloc « Contacter le recruteur » (l.1075-1102), afficher « Candidature sur le site de l'offre » quand la méthode est `LINK`, à la place des boutons.
    8. **Garde-fou** : `AiApplyModal.tsx` l.242 inchangé ; si le modal s'ouvre quand même pour une offre `LINK`, afficher « Cette offre se postule sur le site ».
    9. **Copie admin** : `recruiter-web/lib/admin-platform-service.ts` l.14 : élargir l'union (type seulement).
  - **Tests à écrire :**
    - `mobile-api/tests/apply-method-link.test.mjs` (statique) : la migration contient `add value if not exists 'LINK'` et ne contient ni `begin` ni `commit` ; `dispatch/route.ts` et `apply/route.ts` contiennent `'LINK'` et `422` ; `StagesScreen.tsx` contient `openURL` et `sourceUrl`.
    - `scripts/agents/tests/test_job_store_apply_method.py` : `save_offer` avec faux curseur : contact WhatsApp → `WHATSAPP` ; e-mail seul → `EMAIL` ; `apply_url` seul → `LINK` ; aucun → `PHYSICAL`.
  - **Vérification (DoD) :**
    - `cd mobile-api && npm test` → 0 échec, les nouveaux cas passent.
    - `cd scripts/agents && PYTHONUTF8=1 python -m unittest discover -s tests -p "test_*.py"` → OK.
    - `npx tsc --noEmit` à la racine, dans `mobile-api` et dans `recruiter-web` → code 0.
    - `npm run lint:colors` → 192.
    - Migration appliquée deux fois sur une base de test : non faisable ici, 🔒 à faire avec accord.
    - Visuel : non vérifiable (session requise) ; le dire.
  - **Pièges :**
    - `ALTER TYPE ... ADD VALUE` ne doit pas être dans la même transaction que son usage : migration seule.
    - Un enum PostgreSQL ne se réduit pas : ne jamais proposer de retirer `LINK` sans recréer le type.
    - Les candidatures `LINK` ne sont pas suivies : l'étudiant ne retrouvera pas l'offre dans « Mes candidatures ».
    - `database_ingestor.py` l.274 écrit encore `WHATSAPP`/`EMAIL` pour les rapports : hors périmètre.
    - Les offres déjà en base avec un lien mais sans contact restent `PHYSICAL` : seul un nouveau passage du scraper ou un reprocess (17.13) les corrigera ; ne pas modifier les lignes existantes ici.
    - `sourceUrl` est une URL externe : ouvrir uniquement en `https://`, sinon message d'erreur.
  - **Dépendances :** 25.12 (offres LinkedIn avec `apply_url`). **🔒 Avant d'appliquer la migration 0015 sur la base partagée :** accord explicite. Le code se code et se teste sans elle. **Bloque la publication des offres LinkedIn sans candidature possible.**

### Lot E — Validation et mise en production

- [/] **Tâche 25.15 : Passage complet en local (dry-run)** — 2026-10-20 : `run_scraper.py` gagne `--no-db` (aucune connexion, même en lecture ; exige `--dry-run`, sinon code 2), `--from-fixture` (aucune collecte réseau) et `--offline-llm` (faux modèle) ; résumé en 7 compteurs. Test `tests/test_run_scraper_offline.py` : ni `psycopg2.connect`, ni requête réseau, plafond injecté respecté. Passage réel en ligne de commande sur un jeu **synthétique** de 8 offres avec `DAILY_OFFER_CAP=5` : 5 publiées, `cap_reached: True`, code 0. **Reste** : le même passage sur le vrai jeu étiqueté (25.2).
  - **Pourquoi :** avant de toucher la production, il faut prouver sur un poste local, sans coût ni écriture partagée, que plafond, expiration et résumé fonctionnent ensemble.
  - **État actuel :**
    - `run_scraper.py` : options `--query`, `--platforms`, `--limit`, `--dry-run`, `--city` (l.21-26) ; affiche durée, collectés, rapports, `offers_by_status` (l.50-57).
    - `JobStore(dry_run=True)` se connecte quand même à la base si `DATABASE_URL` est défini (`job_store.py:25`), et `config.py` charge `DATABASE_URL` depuis `.env.local` : un dry-run lit donc la base partagée.
    - La collecte réseau tourne même en dry-run, ainsi que les appels LLM (OpenRouter, payants) dans `evaluate` et Apify si `APIFY_API_TOKEN` est présent.
    - ~ Le traitement des rapports (`database_ingestor.save_stage_report`, `orchestrator.py` l.119-130) en dry-run n'est pas vérifié : à contrôler.
  - **Fichiers :** modifié `scripts/agents/run_scraper.py` ; créé `scripts/agents/tests/test_run_scraper_offline.py`.
  - **Étapes :**
    1. Ajouter `--no-db` : force `JobStore` sans connexion (paramètre `JobStore(dry_run=True, connect=False)`), comptage du plafond à 0. Impossible sans `--dry-run` (message « --no-db exige --dry-run. », code 2).
    2. Ajouter `--from-fixture PATH` : remplace la collecte réseau par les items de la fixture (format 25.2, convertis comme en 25.3).
    3. Ajouter `--offline-llm` : branche le faux LLM du harnais 25.3 sur `classifier_agent.call_json` et `extractor_agent.call_json`.
    4. Afficher en fin de passage, une ligne chacun : `collected`, `published`, `pending_review`, `rejected`, `deferred`, `cap_reached`, `added_today`, puis « Dry-run : aucune écriture en base. ».
    5. Passage de niveau 1 (obligatoire, sans réseau ni coût) : `cd scripts/agents && DAILY_OFFER_CAP=5 PYTHONUTF8=1 python run_scraper.py --dry-run --no-db --from-fixture tests/fixtures/offers_labeled.json --offline-llm`.
    6. Passage de niveau 2 (facultatif, avec accord) : collecte réelle des sources gratuites seulement (`--platforms cameroon_jobs,academic_web`), `--no-db`, `--offline-llm`, sans `--live`.
    7. Vérifier que `reprocess_existing.py` n'est pas lancé (seconde implémentation du pipeline, l.53-75) : le passage ne doit passer que par `offer_pipeline`.
  - **Tests à écrire :** `tests/test_run_scraper_offline.py` : `main(["--dry-run", "--no-db", "--from-fixture", <tmp>, "--offline-llm"])` avec `DAILY_OFFER_CAP` injecté à 2 et une fixture de 6 offres « stage » → sortie contient `cap_reached: True`, aucun `psycopg2.connect` appelé (`mock.patch("job_store.psycopg2.connect")` → `assert_not_called`), aucun `requests.post` (patch → `assert_not_called`) ; `--no-db` sans `--dry-run` → code 2.
  - **Vérification (DoD) :**
    - Suite unittest « OK ».
    - Commande de l'étape 5 → code 0, résumé avec les 7 compteurs, `cap_reached: True` (5 offres atteintes si la fixture en publie au moins 5 avec le faux LLM).
    - Aucune ligne nouvelle en base (garanti par `--no-db`).
  - **Pièges :**
    - Sans `--no-db`, un dry-run lit la base partagée ; sans `--offline-llm`, il paie des appels OpenRouter ; avec `APIFY_API_TOKEN` présent, il paie Apify.
    - Une variable vide n'existe pas sous Windows : ne pas compter sur `OPENROUTER_API_KEY=` pour couper les appels.
    - `reprocess_existing.py` contient sa propre logique `evaluate` (l.53-75) : un résultat différent de celui de l'orchestrateur n'est pas un bug de ce module.
  - **Dépendances :** 25.3 (faux LLM), 25.6 à 25.9, 25.12.

- [ ] **Tâche 25.16 : Mise en production et première exécution réelle**
  - **Pourquoi :** tant que la migration, le code et le déclencheur ne sont pas en production, les étudiants ne voient ni les offres LinkedIn, ni la date d'ajout, et l'administrateur n'a pas de journal.
  - **État actuel :**
    - VPS encore sur un commit antérieur (`5f6fda8`, journal du 2026-10-20) ; déploiement par `/vps-deploy` ou `.github/workflows/deploy-vps.yml` (~).
    - Migration 0014 écrite (25.5) mais non appliquée. Déclencheur choisi en O6 (25.9).
    - 17.11 (onglet « À valider ») et 17.14 (planification) en cours.
  - **Fichiers :** aucun fichier du dépôt modifié en dehors du journal ; sur le VPS : fichier `.env` retenu en O7 (noms seulement dans le dépôt), crontab ou service selon O6.
  - **Étapes (toutes 🔒, une par une avec accord explicite) :**
    1. Vérifier que l'utilisateur a fait tourner la clé Treg et nettoyé le JSON n8n (25.10, étape 1).
    2. Vérifications locales : suite unittest « OK », `npm test` (mobile-api) 0 échec, `npx tsc --noEmit` code 0, `npm run lint:colors` 192.
    3. Commit conventionnel (`feat(scraper): ...`) et push, seulement sur accord.
    4. Migration : l'utilisateur applique, ou autorise l'application de, `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f mobile-api/sql/0014_scrape_runs_and_expiry.sql` (sans afficher l'URL). Contrôle : `select pg_get_constraintdef(oid) from pg_constraint where conname = 'stage_jobs_status_check';` contient `expired`.
    5. Déployer avec `/vps-deploy` ; installer `requests` et `psycopg2` si absents (~ non vérifié sur le VPS).
    6. Placer les variables sur le VPS (l'utilisateur saisit les valeurs) : `TREG_API_KEY`, `TREG_LINKEDIN_TOOL`, `DAILY_OFFER_CAP`, `OFFER_DEFAULT_LIFETIME_DAYS`, `SCRAPER_MODEL`, `SCRAPER_FALLBACK_MODEL`. Contrôle : `python -c "import config; print(bool(config.TREG_API_KEY))"` → `True`.
    7. Poser le déclencheur unique retenu en O6 ; désactiver l'autre (GitHub Actions ou démon).
    8. Premier passage réel réduit : `PYTHONUTF8=1 python run_scraper.py --live --platforms linkedin --limit 1` (au plus quelques appels Treg payants).
    9. Contrôles : `curl -s -o /dev/null -w "%{http_code}" https://api.campus360b.site/api/health` → `200` (domaine ~ à confirmer) ; `select started_at, collected, published, pending_review, rejected, deferred, cap_reached, error from public.stage_scrape_runs order by started_at desc limit 1;` → ligne cohérente, `error` vide ; les offres `pending_review` apparaissent dans l'onglet « À valider » (17.11).
    10. Retour arrière si échec : désactiver le déclencheur ; la migration est additive (aucune donnée supprimée) ; revenir au commit précédent par `/vps-deploy`.
  - **Tests à écrire :** aucun (tâche d'exploitation).
  - **Vérification (DoD) :** santé de l'API en HTTP 200 ; une ligne `stage_scrape_runs` du passage réel sans erreur ; `git grep -n "treg_live"` → rien ; aucun identifiant affiché dans le chat ni les journaux.
  - **Pièges :**
    - Deux déclencheurs actifs = deux passages par jour (O6).
    - Le premier passage planifié du lendemain appellera Treg sans `--dry-run` : vérifier `TREG_MAX_CALLS_PER_RUN` et `DAILY_OFFER_CAP` avant.
    - Identifiants des modèles IA (🔒) à confirmer avant tout passage réel.
  - **Dépendances :** 25.5, 25.10, 25.15 ; 17.14 (planification, en cours) ; 17.11 (onglet « À valider », en cours). **🔒 À demander :** accord explicite pour le commit, la migration partagée, le déploiement et la première exécution réelle (appels Treg payants).

---

## Journal d'exécution
**[2026-10-20] Livraison release V1 v1.0.0 (commit 1c82286)** (deploy-and-push / vps-deploy) — commits : cbce205..1c82286 (10 commits atomiques, release figée et taguée v1.0.0) — services : campus360-mobile-api (port 3002), campus360-recruiter-web (3001), campus360-landing-site (3000) — base : 12 migrations versionnées appliquées (0000 à 0015) — health : https://api.campus360b.site/api/health (200 OK, db: connected), https://admin.campus360b.site (200 OK), https://campus360b.site (200 OK) — tâches livrées : Tâches 23.1 à 23.24, 25.1 à 25.17.

**[2026-10-20] Tâche 23.13 validée** (execute) — fichiers : `mobile-api/lib/sanitize-html.ts`, `recruiter-web/lib/sanitize-html.ts`, `mobile-api/app/api/mobile/documents/{generate,ai,generate-full}/route.ts`, `recruiter-web/app/api/mobile/documents/{generate,ai,generate-full}/route.ts`, `mobile-api/tests/sanitize-images.test.mjs` — validation : grep `sanitizeHtmlFragment|buildCvPrompt|buildLettrePrompt` vide (0 ligne), sanitize-images 7/7 pass, npm test 159 pass / 0 fail / 14 skipped, tsc ×3 code 0, lint:colors 191/191 — sécurité : un seul assainisseur strict anti-XSS et anti-style dangereux (`url(`, `position`) pour toutes les générations IA, code markdown ````html` proprement extrait via `stripCodeFence`.


**[2026-10-20] Tâche 23.12 validée** (execute) — fichiers : `mobile-api/lib/application-rules.ts`, `recruiter-web/lib/application-rules.ts`, `mobile-api/sql/0011_scraped_reports_status.sql`, `mobile-api/lib/stages-db.ts`, `recruiter-web/lib/stages-db.ts`, `mobile-api/app/api/mobile/stages/applications/route.ts`, `recruiter-web/app/api/mobile/stages/applications/route.ts`, `mobile-api/app/api/mobile/stages/direct-reach/route.ts`, `mobile-api/app/api/mobile/documents/scraped-reports/route.ts`, `src/types.ts`, `src/features/stages/stagesApi.ts`, `src/features/stages/ApplicationDetailModal.tsx`, `src/ui/screens/ApplicationsTimelineScreen.tsx`, `mobile-api/tests/application-rules.test.mjs` — validation : migration 0011 appliquée ×2, application-rules 4/4 pass, npm test 154 pass / 0 fail / 14 skipped, tsc ×3 code 0, lint:colors 191/191 — sécurité : seuls les retraits sont permis à l'étudiant, interdiction formelle de s'auto-attribuer ACCEPTED/INTERVIEW, direct-reach fail-safe sur offres expirées, scraped-reports protégé avec session et rate limit et sans fuite de source_url.


**[2026-10-20] Audit global exhaustif de plan.md (test-and-verify all tasks)** — Verdict : 🟢 **VERIFIED** sur l'ensemble des tâches cochées [X] (Modules 1 à 16, 19 à 21, 23 Lot A, tâches 23.7, 23.9, 23.11, et tâches terminées du Module 25) ; 🟠 **PARTIEL** sur les chantiers en cours (Module 17.10/17.11/17.14 Telegram/cron, 18.7 DNS e-mail, 22.14, 25.5/25.10/25.15/25.16 migration 0014 et déploiement cron VPS) ; ⚪ **NON ENTAMÉ** pour le reste du Lot B (23.8, 23.10, 23.12-23.26) et le Module 24 — Commandes : `npx tsc --noEmit` ×4 (app, mobile-api, recruiter-web, landing-site) code 0 ; `npm test` (mobile-api) 140 tests (130 pass, 0 fail, 10 skipped sans serveur/clé) ; Python scraping 56/56 tests OK ; `test-challenger-m3-adversarial` 83/83 pass ; `test-stage-dispatch` 36/36 pass ; `test-m1-tokens` 7 suites (36/36 pass) ; `lint:colors` 192/192 (0 régression) — Production VPS : PM2 3/3 online (uptime 33h+), API health 200 `connected`, vitrine et admin HTTP 200 — Sécurité : zéro secret fuité, anti-bruteforce & rate limit fail-closed actifs, sessions et origines durcies sans joker.

**[2026-10-20] Tâche 23.7 validée** (execute) — fichiers : mobile-api/lib/whatsapp-target.ts (nouveau), mobile-api/app/api/mobile/whatsapp/instance/route.ts, mobile-api/lib/stages-db.ts, src/features/whatsapp/{whatsappService.ts, WhatsAppPairingModal.tsx}, mobile-api/tests/whatsapp-instance.test.mjs (nouveau) — validation : whatsapp-instance 6/6 pass, test-stage-dispatch 36/36 pass, npm test 130/0 pass, tsc ×4 code 0, lint:colors 192 — sécurité : session obligatoire sans isStrictProd, ciblage strict par numéro de profil, protection 403 instances tierces, rate limit fail-closed.

**[2026-10-20] Tâches 25.3, 25.6, 25.7, 25.8, 25.9 validées ; 25.5 et 25.15 en cours** (execute) — fichiers : scripts/agents/{daily_cap.py, evaluate_pipeline.py (nouveaux), job_store.py, orchestrator.py, daily_scheduler.py, run_scraper.py, config.py}, scripts/agents/tests/{test_extractor, test_evaluate_pipeline, test_daily_cap, test_scheduler_window, test_run_scraper_offline}.py, mobile-api/sql/0014_scrape_runs_and_expiry.sql, mobile-api/tests/migration-0014.test.mjs, .gitignore — validation : unittest 56 OK, npm test mobile-api 124/0, tsc 0, passage hors ligne réel (synthétique) code 0 — sécurité : plafond avant collecte payante, aucune connexion avec --no-db — nouvelle tâche 25.17 (postuler par lien) — contexte-code.md : §3.7, §5, §9, §10.

**[2026-10-20] Tâches 25.11 et 25.12 validées, 25.10 en cours** (execute) — fichiers : scripts/agents/{treg_linkedin_agent.py (nouveau), config.py, orchestrator.py, offer_pipeline.py, run_scraper.py, daily_scheduler.py}, tests/{test_treg_linkedin_agent.py, test_orchestrator_linkedin.py} (nouveaux) — validation : unittest 30 OK, `--dry-run --live` → 2 — sécurité : jeton jamais journalisé (test), aucun appel payant sans live — contexte-code.md : §3.7, §9, §10.

**[2026-10-20] Tâches 25.13 et 25.14 validées** (execute) — fichiers : src/features/stages/addedAt.ts (nouveau), mobile-api/tests/stage-added-at.test.mjs (nouveau), src/ui/screens/StagesScreen.tsx — validation : npm test 121/0, tsc 0, lint:colors 192 — visuel non fait (connexion requise) — contexte-code.md : §2, §3.2, §10.

**[2026-10-20] Tâche 25.4 validée** (execute) — fichier : scripts/test-challenger-m3-adversarial.mjs — validation : 83/83, code 0 — application inchangée — contexte-code.md : §2, §10.1.

**[2026-10-20] Tâche 25.1 validée** (execute) — fichiers : scripts/agents/tests/test_filter.py, test_verifier.py, test_llm_agents.py — validation : unittest 13 tests OK — sécurité : plus aucun appel payant dans la suite par défaut — contexte-code.md : §2, §10.2.

**[2026-10-20] Treg testé sur le VPS** — CLI `/opt/treg-cli` connecté (équipe bct) ; 4 recherches LinkedIn réelles (0,0026 $ au total) : emplois au Cameroun OK, stages OK avec `employmentType=internship`, KO avec le mot « stage » seul. Décision 20 ajoutée au module 25.

**[2026-10-20] Module 25 planifié** (plan-task) — 16 tâches en 5 lots (qualité, données et plafond, sources Treg, date sur la carte, validation). Source : contexte.md §15. Bloquants 🔒 : clé Treg côté serveur (25.10), accord migration 0014 et déploiement (25.16), durée par défaut des offres (25.6), jeu de référence étiqueté (25.2).

**[2026-10-20] Cadrage validé : scraping des offres** (brainstorming, voie Bounded) — contexte.md §15 — à planifier avec /plan-task (identifiants de modèles à confirmer)

**[2026-10-20] Carte de code mise à jour** (code-analyzer-context, Mode 1) — commit `fcd08ed` — contexte-code.md réécrit et vérifié contre le code. Écarts avec le plan : (1) 23.3 a rendu obsolète le test `scripts/test-challenger-m3-adversarial.mjs` (attend l'ancien repli WhatsApp) ; (2) `scripts/agents/tests/*.py` n'a aucune fonction `test_` : rien n'est exécuté ; (3) migrations 0009, 0010, 0011 toujours non écrites ni appliquées ; (4) VPS encore sur `5f6fda8`, pas `fcd08ed`.

**[2026-10-15] Tâche 23.11 validée** (execute) — fichiers : mobile-api/lib/{origins,client-ip,db-ssl,auth,mobile-access,rate-limit,route-rate-limit,login-throttle,database}.ts, middleware.ts, recruiter-web/lib/{origins,client-ip,db-ssl,auth,mobile-access,rate-limit,login-throttle,database,supabase-pdf}.ts, landing-site/lib/auth.ts, .env.example — validation : npm test 0 échec, tsc mobile-api/recruiter-web/landing/app OK, lint:colors 192 — sécurité : jokers d'origine supprimés, jeton hors URL, IP de confiance derrière proxy seulement.

**[2026-10-15] Tâche 23.9 validée** (execute) — fichiers : mobile-api/lib/free-launch.ts, recruiter-web/lib/free-launch.ts, routes generate/generate-full/account, mobile-access.ts, recruiter-web/lib/access.ts, src/config/launch.ts, DocumentsScreen, WritingWorkshopModal, .env.example — validation : npm test 0 échec, tsc ×3, lint:colors 192 — sécurité : env validée, throw en prod si mode absent.
La plus récente en haut.
- **[2026-10-15] Lot A (tâches 23.1 à 23.6) validé sauf vérification visuelle** (execute) — fichiers : `mobile-api/lib/{stages-errors,db-errors,dispatch-target}.ts` (nouveaux), `stages-db.ts`, routes `stages*`, `health`, `whatsapp/instance`, `ai/pdf-chat`, `mobile-access.ts`, `evolution-api.ts` ; app : `applicationsCache.ts`, `contactTargets.ts`, `cvHtml.ts`, `paymentStatus.ts` (nouveaux), `stagesApi.ts`, `AiApplyModal.tsx`, `StagesScreen.tsx`, `ApplicationsTimelineScreen.tsx`, `ApplicationDetailModal.tsx`, `DocumentsScreen.tsx`, `OfficialCvView.tsx`, `pdfExportService.ts`, `walletApi.ts`, `PaymentModal.tsx`, `pdfApi.ts`, `pdfAssistant.ts`, `SimplePdfReaderModal.tsx`, `whatsappService.ts`, `AppShell.tsx`, `env.ts`, `types.ts` — validation : `npm test` 111 tests, 0 échec, 5 ignorés ; `tsc` 0 (app et mobile-api) ; `lint:colors` 192 (référence abaissée de 193) ; `curl /api/health` base injoignable → 503 — sécurité : HTML des PDF échappé, URL de photo filtrée, plus d'envoi vers des numéros codés en dur, plus de crédit sans paiement — non vérifié : parcours visuels dans l'app connectée (identifiants requis, règle §6 du guide) — `contexte-code.md` : absent (à créer avec `/code-analyzer-context`).
