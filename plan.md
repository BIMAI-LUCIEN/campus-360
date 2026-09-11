# Plan d'Action APEX : Simplification UI Première Page & Câblage IA Direct (Campus 360)

> **Méthodologie** : APEX (Analyze - Plan - Execute - eXamine)  
> **Statut** : Terminé avec succès (3/3 tâches validées)

---

## Tâches d'Exécution

- [X] **1. Refonte & Épuration de `src/ui/screens/HomeScreen.tsx`**
  - **Scope** : `src/ui/screens/HomeScreen.tsx`
  - **Détails** :
    - Nettoyage complet du header : salutation personnalisée, filière de l'étudiant et pilule de jetons IA disponible.
    - Mettre en vedette **UNE SEULE OFFRE** calculée selon les compétences de l'étudiant (le meilleur match en tête).
    - Carte d'offre héroïque au design Stitch sobre : Entreprise certifiée, titre du poste, lieu, durée, indemnité, badge de match (`% Match ✨`) et compétences clés alignées.
    - **Bouton d'action signature IA** : `[ ⚡ Postuler avec l'IA (1-Clic) ]` qui déclenche directement la modale de candidature.
    - Bannière minimale de statut si l'étudiant a une candidature en cours.
    - Lien discret vers le reste du catalogue : *"Explorer les autres stages →"*.
    - Raccourcis secondaires discrets vers l'Atelier et le Hub Académique en pied de page.
    - Suppression intégrale de la fausse carte bancaire violette, de la grille 2x2 redondante et de la liste de relevés de transactions.
  - **DoD** : Validé (Code propre, épuré, centré sur 1 seule offre avec CTA IA).

- [X] **2. Intégration de l'IA de Postulation Directe dans `HomeScreen` & `AppShell.tsx`**
  - **Scope** : `src/ui/screens/HomeScreen.tsx`, `src/AppShell.tsx`
  - **Détails** :
    - Transmission de `studentProfile` depuis `AppShell.tsx` vers `HomeScreen`.
    - Intégration et câblage de `AiApplyModal` directement sur l'offre unique en vedette.
    - Génération automatique de CV et lettre ciblés, prévisualisation, édition et envoi (WhatsApp / Email / In-App).
  - **DoD** : Validé (Modal IA opérationnel et déclenchable en 1-clic dès la page d'accueil).

- [X] **3. Validation Mécanique, Typecheck & Contrôle CyberSec**
  - **Scope** : TypeScript compiler (`tsc --noEmit`), contrôle sécurité `cybersec` et relance des serveurs.
  - **DoD** : Validé. `node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit` passe avec code 0 (0 erreur). Serveurs Expo Web (port 8081) et Mobile API (port 3002) actifs.
