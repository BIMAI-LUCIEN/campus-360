# Plan d'Action : Refonte Visuelle Intégrale & Alignement Global de Campus 360

> **Progression globale :** 10/10 tâches validées (100%)  
> **Couverture :** 100% des maquettes de référence (Home Feed, Dashboard 2x2 Hub, Profil Glassmorphic)  
> **Dernière mise à jour :** 2026-09-12 02:05  

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

