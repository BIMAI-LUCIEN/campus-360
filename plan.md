# Plan d'Action : Refonte Visuelle Intégrale & Alignement Global de Campus 360

> **Progression globale :** 10/19 tâches validées (52%)  
> **Couverture :** 100% des arbitrages du brainstorming (Matcher + Rédacteur Licence)  
> **Dernière mise à jour :** 2026-09-12 03:30  

---

## MODULE 1 : Composants Communs & Design System (Fondations Visuelles)

### 1. Frontend & Design Tokens
- [X] **Tâche 1.1 : Nouveaux Composants du Design System de Référence**
  - **Fichiers :** `src/theme/stitch.ts`, `src/ui/GlassComponents.tsx`
  - **Action :**
    - Enrichir `stitch.ts` avec les dimensions, espacements, ombres douces et styles de tuiles de la maquette.
    - Créer `LocationHeader` (sélection université/ville + boutons circulaires cloche et jetons avec badges).
    - Créer `SearchFilterBar` (barre de recherche arrondie `pill` + bouton filtre réglages).
    - Créer `CategoryTile` & `CategoryGrid` (tuiles 4x2 carrées avec icône stylisée et fond teinté).
    - Créer `TrustBadgeStrip` (bandeau horizontal de réassurance à 4 colonnes).
    - Mettre à jour `BottomNav` pour correspondre à la géométrie épurée et aux icônes du modèle.
  - **DoD :** Validé (0 erreur TypeScript). Types stricts validés, composants exportés et testables isolément.

---

## MODULE 2 : Page d'Accueil (`HomeScreen.tsx`) — Réplique Exacte de la Maquette

### 1. Frontend & Câblage IA
- [X] **Tâche 2.1 : Restructuration Complète de `HomeScreen.tsx`**
  - **Fichiers :** `src/ui/screens/HomeScreen.tsx`
  - **Action :**
    - Assembler le bloc 1 : `LocationHeader` avec le nom de l'université de l'étudiant (ex: *Université de Yaoundé I*) et ses crédits IA.
    - Assembler le bloc 2 : `SearchFilterBar` connectée à la recherche globale.
    - Assembler le bloc 3 : `HeroBannerCarousel` avec titre accrocheur, promesses à puces, double bouton CTA (`⚡ Postuler en 1-Clic` + `🔍 Explorer`), visuel 3D et points de pagination.
    - Assembler le bloc 4 : `CategoryGrid` avec 8 filières majeures (*Informatique, Finance, BTP, Électricité, Marketing, Droit, Santé, Voir tout*).
    - Assembler le bloc 5 : `RecommendedCarousel` avec défilement horizontal de cartes d'offres réelles (note, durée, entreprise certifiée, indemnité mensuelle, bouton `Postuler`).
    - Assembler le bloc 6 : `TrustBadgeStrip` de 4 réassurances (*Entreprises Vérifiées, Indemnités Transparentes, Postulation 1-Clic, Suivi en Direct*).
    - Câbler l'ouverture directe de `AiApplyModal` sur le CTA principal du Hero Banner et sur chaque carte recommandée.
  - **DoD :** Validé (0 erreur TypeScript). Interface calquée sur le screenshot de référence avec la charte graphique Campus 360, 0 régression fonctionnelle.

---

## MODULE 3 : Harmonisation des Écrans Principaux

### 1. Écran des Stages (`StagesScreen.tsx`)
- [X] **Tâche 3.1 : Alignement du Feed et des Filtres**
  - **Fichiers :** `src/ui/screens/StagesScreen.tsx`
  - **Action :**
    - Remplacer le champ de recherche par le `SearchFilterBar` unifié avec bascule de filtres rapide.
    - Intégrer le bandeau de réassurance `TrustBadgeStrip` en pied de page.
    - Harmoniser le style des cartes avec les badges de match et d'entreprises certifiées.
  - **DoD :** Validé (0 erreur TypeScript). Expérience visuelle continue et sans rupture lors du passage de l'Accueil aux Stages.

### 2. Écran de Suivi des Candidatures (`ApplicationsTimelineScreen.tsx`)
- [X] **Tâche 3.2 : Cartes de Suivi & Badges de Statut Homogènes**
  - **Fichiers :** `src/ui/screens/ApplicationsTimelineScreen.tsx`
  - **Action :**
    - Moderniser les cartes de candidatures avec les mêmes arrondis, bordures subtiles et typographies.
    - Badges de statut nets (*En attente*, *En revue*, *Entretien*, *Accepté*) et actions rapides WhatsApp/Relance J+7.
    - Intégrer le bandeau de réassurance `TrustBadgeStrip` en pied de page.
  - **DoD :** Validé (0 erreur TypeScript). Affichage fluide et cohérent avec la charte unifiée.

### 3. Écran des Ressources & Bibliothèque PDF (`ResourcesScreen.tsx`)
- [X] **Tâche 3.3 : Catalogue et Recherche Académique Alignés**
  - **Fichiers :** `src/ui/screens/ResourcesScreen.tsx`, `src/ui/screens/ExploreScreen.tsx`
  - **Action :**
    - Intégrer la barre de recherche `SearchFilterBar` unifiée dans le catalogue académique.
    - Conserver l'accès rapide aux filières et aux 3 sous-onglets (Épreuves, Bibliothèque, Rapports).
  - **DoD :** Validé (0 erreur TypeScript). Navigation fluide dans les cours, annales et rapports de stage.

### 4. Écran Profil & Portefeuille (`ProfileScreen.tsx`)
- [X] **Tâche 3.4 : En-tête de Compte et Groupes d'Actions Unifiés**
  - **Fichiers :** `src/ui/screens/ProfileScreen.tsx`
  - **Action :**
    - Refonte du header de profil avec avatar, filière et solde de jetons IA sous forme de badge élégant.
    - Carte neobank wallet épurée et menu de réglages harmonisé.
    - Intégration du bandeau de réassurance `TrustBadgeStrip` en pied d'écran.
  - **DoD :** Validé (0 erreur TypeScript). Cohérence complète avec le reste de l'application.

---

---

## MODULE 5 : Dashboard Hub & Profil Calqués sur la Maquette de Référence

### 1. Composants Spécifiques du Dashboard & Navigation Flottante
- [X] **Tâche 5.1 : DashboardCard, 2x2 Grid & BottomNav Pilule Dynamique**
  - **Fichiers :** `src/ui/GlassComponents.tsx`
  - **Action :**
    - Créer le composant `DashboardHubCard` (grande carte blanche arrondie avec icône 3D/dégradé, titre serif, description et bouton flèche `→`).
    - Créer `DashboardGrid` organisant les 4 cartes clés (Postuler IA, Mes Candidatures, Atelier Rédaction, Stages & Favoris).
    - Moderniser `BottomNav` avec la pilule active foncée (`#111827`) contenant l'icône et le libellé, et les icônes inactives discrètes.
  - **DoD :** Validé (0 erreur TypeScript). Composants créés, typés avec testID et intégrés.

### 2. Écran Profil Réinventé (`ProfileScreen.tsx`)
- [X] **Tâche 5.2 : Réplique Exacte du Profil Glassmorphic (Écran Droit)**
  - **Fichiers :** `src/ui/screens/ProfileScreen.tsx`
  - **Action :**
    - Header avec titre Serif "Profil" et bouton circulaire blanc pour la cloche de notification.
    - Avatar centré avec anneau concentrique lumineux (halo halo effect).
    - Nom de l'étudiant en typographie serif, handle `@` et badge sombre `👑 Premium`.
    - Ligne de 3 pilules statistiques : Candidatures, Jetons IA, PDF Débloqués.
    - Bannière de recharge sombre avec icône étoile, texte d'incitation et bouton blanc `[ Recharger ]`.
    - Liste de menu regroupée dans un conteneur blanc arrondi avec chevrons `>`.
  - **DoD :** Validé (0 erreur TypeScript). 100% fidèle à l'écran de droite de la maquette.

### 3. Écran Dashboard Hub (`DashboardScreen.tsx` & Intégration Home)
- [X] **Tâche 5.3 : Dashboard Hub 2x2 et Bascule Intuitive**
  - **Fichiers :** `src/ui/screens/DashboardScreen.tsx`, `src/ui/screens/HomeScreen.tsx`, `src/AppShell.tsx`
  - **Action :**
    - Créer `DashboardScreen.tsx` répliquant l'écran de gauche (titre Serif "Dashboard / Hub", grille 2x2 avec les 4 tuiles interactives).
    - Intégrer la grille 2x2 sur `HomeScreen.tsx` pour accès immédiat dès l'accueil.
    - Câbler les 4 actions vers `AiApplyModal`, `applications`, `documents`, et `stages`.
  - **DoD :** Validé (0 erreur TypeScript). Navigation fluide et câblage opérationnel.

### 4. Vérification Stricte (/test-and-verify)
- [X] **Tâche 5.4 : Typecheck & Screenshots Playwright**
  - **Fichiers :** `scripts/verify_dashboard_profile.js`, `contexte.md`
  - **Action :**
    - Exécuter la compilation TypeScript stricte (0 erreur).
    - Capturer les screenshots dans `.agent/screenshots/dashboard_verified.png` et `.agent/screenshots/profile_verified.png`.
    - Enregistrer les preuves dans `contexte.md` Section 8.
  - **DoD :** Validé. Compilation 0 erreur, screenshots Playwright capturés et archivés, verdict VERIFIED certifié.

---

## MODULE 6 : Trouver un Stage avec les Agents IA (Matcher + Rédacteur 100% Opérationnel)

### 1. Profilage Express & Diagnostic de Compétences Étudiant (30s Chrono)
- [X] **Tâche 6.1 : Modal Express de Profilage & Compétences Manquantes**
  - **Fichiers :** `src/features/stages/StudentProfileExpressModal.tsx`, `src/features/auth/betterAuth.ts`
  - **Action :**
    - Créer une micro-modal non bloquante qui s'ouvre si l'étudiant n'a pas encore renseigné sa filière, son niveau (Licence 2/3, BTS, DUT), et ses 3 compétences majeures.
    - Saisie en 3 champs ultra-rapides sans upload de fichier pour éliminer toute friction sur smartphone.
    - Persistance locale et synchronisation avec le profil étudiant.
  - **DoD :** Modal fluide s'affichant en moins de 100ms, validation des champs, 0 erreur TypeScript.

### 2. Agent Matcher (Le Chasseur & Scorer Intelligent)
- [X] **Tâche 6.2 : Moteur de Scoring & Explication du Match IA**
  - **Fichiers :** `src/features/stages/aiMatchEngine.ts`, `src/features/stages/stagesApi.ts`
  - **Action :**
    - Développer le moteur de calcul d'adéquation entre le profil de l'étudiant (filière, compétences) et les exigences de l'offre de stage.
    - Générer les 3 métriques clés : Score en % (`95% Match`), 2 raisons d'adéquation concrètes (*"Pourquoi toi"*), 1 conseil stratégique.
  - **DoD :** Fonction pure testable unitairement renvoyant un score précis et les justifications textuelles.

- [X] **Tâche 6.3 : Carte de Stage Enrichie & Cartouche de Match IA**
  - **Fichiers :** `src/ui/screens/StagesScreen.tsx`, `src/features/stages/AiApplyModal.tsx`
  - **Action :**
    - Afficher le badge de compatibilité dynamique (`🔥 95% Match`) sur chaque carte d'offre.
    - Intégrer l'encart d'explication IA dans `AiApplyModal` avant la génération pour rassurer immédiatement l'étudiant sur sa légitimité.
  - **DoD :** Rendu visuel net dans la charte graphique violette sombre, badges contrastés, 0 erreur TypeScript.

### 3. Agent Rédacteur (CV & Lettre Chirurgicale 1-Clic)
- [X] **Tâche 6.4 : Générateur de Lettre & CV Hyper-Ciblés**
  - **Fichiers :** `src/features/stages/stagesApi.ts`
  - **Action :**
    - Éliminer les templates génériques : injecter dynamiquement le nom exact de l'entreprise, le poste, les technologies requises et le projet académique de l'étudiant.
    - Enrichir les 3 leviers de reformulation en direct (*Plus Formel*, *Plus Concis*, *Compétences Clés*).
  - **DoD :** Sortie textuelle professionnelle sans placeholders vides, temps de réponse < 2s.

- [X] **Tâche 6.5 : Double Action de Sortie & Export PDF / WhatsApp**
  - **Fichiers :** `src/features/stages/AiApplyModal.tsx`, `src/features/stages/pdfExportService.ts`
  - **Action :**
    - Permettre à l'étudiant d'éditer directement le texte généré in-app en cas de retouche personnelle.
    - Bouton `[ 📋 Copier pour WhatsApp ]` : prépare un message d'accroche professionnel prêt à coller dans WhatsApp au contact RH.
    - Bouton `[ 📥 Télécharger / Partager le PDF ]` : génère un document PDF propre et téléchargeable/partageable.
    - Bouton `[ In-App Direct ]` : soumet directement la candidature à l'API interne.
  - **DoD :** Boutons testés avec déclenchement de la copie presse-papier et ouverture WhatsApp/PDF sans plantage.

### 4. Monétisation & Gestion des Jetons IA (Mobile Money)
- [X] **Tâche 6.6 : Détection 1ère Candidature Offerte & Consommation de Jetons**
  - **Fichiers :** `src/features/stages/AiApplyModal.tsx`, `src/AppShell.tsx`, `src/features/wallet/walletApi.ts`
  - **Action :**
    - Vérifier si l'étudiant effectue sa première candidature : lui accorder gratuitement (effet "Aha! Moment").
    - Pour les candidatures suivantes : vérifier le solde de Jetons IA (ex: 50 jetons) et déduire les jetons à la validation.
    - Si solde insuffisant, afficher la passerelle de recharge Mobile Money dès 500 FCFA.
  - **DoD :** Déduction atomique du solde, blocage propre si solde insuffisant.

### 5. Suivi des Candidatures, Relance J+7 & Backend
- [X] **Tâche 6.7 : Endpoints de Candidatures & Suivi de Statut**
  - **Fichiers :** `mobile-api/app/api/mobile/stages/apply/route.ts`, `mobile-api/app/api/mobile/stages/applications/route.ts`, `mobile-api/lib/stages-db.ts`
  - **Action :**
    - Assurer l'enregistrement complet de la candidature (`job_id`, `cv_text`, `letter_text`, `status = 'PENDING'`).
    - Exposer la route de mise à jour de statut (`PATCH /api/mobile/stages/applications`).
  - **DoD :** Validation de la persistance en base PostgreSQL avec code HTTP 200.

- [X] **Tâche 6.8 : Cartes de Suivi & Action Relance WhatsApp J+7**
  - **Fichiers :** `src/ui/screens/ApplicationsTimelineScreen.tsx`
  - **Action :**
    - Afficher la timeline avec les statuts réels de chaque candidature.
    - Bouton `[ 💬 Relancer sur WhatsApp (J+7) ]` pré-remplissant un message poli de relance à l'attention du recruteur.
  - **DoD :** Ouverture de WhatsApp avec le message de relance personnalisé.

### 6. Validation Complète & Certification Qualité (/test-and-verify)
- [X] **Tâche 6.9 : Compilation TypeScript Stricte & Tests Playwright E2E**
  - **Fichiers :** `scripts/verify_stage_ai_agent.js`, `contexte.md`
  - **Action :**
    - Valider 0 erreur TypeScript (`node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit`).
    - Exécuter un test Playwright simulant le parcours complet : Sélection d'un stage ➔ Calcul du match ➔ Génération IA ➔ Aperçu et actions.
    - Capturer les preuves visuelles dans `.agent/screenshots/stage_ai_flow_verified.png`.
    - Mettre à jour `contexte.md` avec le verdict VERIFIED.
  - **DoD :** 100% des tests passés, capture réelle enregistrée, code poussé sur GitHub.

