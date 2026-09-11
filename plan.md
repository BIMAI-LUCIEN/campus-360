# Plan d'Action : Refonte Visuelle Intégrale & Alignement Global de Campus 360

> **Progression globale :** 6/6 tâches validées (100%)  
> **Couverture :** 100% de la maquette de référence reproduite et déclinée sur tous les écrans  
> **Dernière mise à jour :** 2026-09-12 01:32  

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

## MODULE 4 : Contrôle Qualité, Tests & Déploiement

- [X] **Tâche 4.1 : Validation Mécanique, Typecheck & Déploiement**
  - **Action :**
    - Compilation TypeScript stricte sans avertissement (`node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit`).
    - Validation du rendu sur Expo Web (`http://localhost:8081`).
    - Commit git et push de mise en production sur `origin main`.
  - **DoD :** Validé. 0 erreur TypeScript, interface responsive validée, prêt pour push de production.

