# Design Separation Explorer / Bibliotheque PDF

Date: 2026-06-20

## Objectif

Clarifier l'experience mobile PDF en separant proprement :

- `Explorer` : espace de decouverte et d'achat
- `Bibliotheque` : espace personnel de reprise et de lecture

Le probleme actuel est que le composant reutilise pour les deux ecrans melange encore
des logiques de catalogue et d'achats deja effectues. Dans `Explorer`, l'utilisateur
voit aujourd'hui une option `Achat` qui n'a pas sa place. Cette partie doit rester
centree sur `Packs` et `PDF`. Tout ce qui concerne les contenus deja achetes doit
vivre dans `Bibliotheque`.

## Decision Produit

La correction retenue garde le composant `src/features/pdf/PdfStudentSection.tsx`,
mais lui donne deux modes explicites, pilotes par l'ecran parent :

- `explore` : catalogue public avec `Packs` et `PDF`
- `library` : espace personnel avec `Mes packs` et `Mes PDF`

Cette approche corrige l'erreur UX sans lancer un gros refactor. Elle laisse aussi une
evolution simple plus tard vers deux composants distincts si le module grandit.

## Experience Cible

### Explorer

`Explorer` doit afficher seulement :

- un onglet `Packs`
- un onglet `PDF`

Il ne doit jamais afficher :

- un onglet `Achat`
- un bouton ou label qui laisse croire que l'on est deja dans la bibliotheque

Le role de cet ecran est :

- chercher un document
- filtrer par universite, faculte, matiere et niveau
- ouvrir un apercu
- acheter un PDF ou un pack
- ouvrir directement un contenu si l'utilisateur le possede deja

Le ton et les textes doivent rester orientes decouverte :

- `Explorer les PDF`
- `Trouve rapidement le bon support`
- `Apercu avant achat`

### Bibliotheque

`Bibliotheque` doit afficher seulement les contenus deja debloques par l'utilisateur.

Les deux sous-onglets deviennent :

- `Mes packs`
- `Mes PDF`

Le role de cet ecran est :

- retrouver ses contenus
- reprendre la lecture
- voir la progression sur les packs
- relancer une session de revision sans retourner dans le catalogue

Le ton et les textes doivent etre personnels et orientes continuite :

- `Ma bibliotheque`
- `Tes contenus debloques`
- `Continuer`
- `Reprendre la lecture`

Les etats vides ne doivent pas renvoyer vers une logique d'exploration floue. Ils
doivent expliquer simplement que les achats apparaitront ici.

## Regles D'Affichage

### Regles Explorer

- Les onglets visibles sont uniquement `packs` et `catalog`.
- Les packs affiches sont tous les packs publies.
- Les PDF affiches sont tous les documents publies.
- Les filtres et la recherche restent disponibles.
- Les cartes PDF gardent deux actions principales :
  - `Voir` pour l'apercu
  - `Acheter` si non possede, ou `Lire dans l'app` si deja debloque
- Les cartes pack gardent une action d'achat dans ce mode.

### Regles Bibliotheque

- Les onglets visibles sont uniquement `packs` et `catalog`, mais leurs labels
  deviennent `Mes packs` et `Mes PDF`.
- Les packs affiches sont seulement les packs achetes.
- Les PDF affiches sont seulement les documents possedes, soit par achat direct,
  soit via un pack achete.
- Les boutons d'achat ne doivent pas etre mis en avant dans ce mode.
- Les actions principales deviennent des actions de reprise :
  - `Voir le contenu`
  - `Continuer`
  - `Reprendre la lecture`

## Traduction Technique

### Composant Concerne

Le travail se concentre sur :

- [src/features/pdf/PdfStudentSection.tsx](/C:/Users/MELAGO%20NATHAN/Documents/campus%20360/src/features/pdf/PdfStudentSection.tsx)
- [App.tsx](/C:/Users/MELAGO%20NATHAN/Documents/campus%20360/App.tsx)

### Structure Retenue

Ajouter une notion de `viewMode` derivee de `externalTab`.

Comportement attendu :

- si `externalTab === 'library'`, alors `viewMode = 'library'`
- sinon, `viewMode = 'explore'`

Le `viewMode` pilotera :

- la liste des onglets rendus
- le libelle de ces onglets
- les titres et sous-titres
- les jeux de donnees affiches
- les empty states
- le libelle des boutons d'action

### Onglets

Au lieu d'une definition fixe :

- `Packs`
- `PDF`
- `Achats`

le composant construira la liste selon le mode :

- `explore` :
  - `Packs`
  - `PDF`
- `library` :
  - `Mes packs`
  - `Mes PDF`

L'onglet `library` interne disparait comme choix utilisateur. La bibliotheque devient un
mode de rendu, pas un troisieme onglet melange au catalogue.

### Jeux De Donnees

Les listes actuelles devront etre recalculees selon le mode.

Pour `explore` :

- `visiblePacks` filtre sur tous les packs publies
- `visibleDocuments` filtre sur tous les PDF publies

Pour `library` :

- `visiblePacks` filtre uniquement sur les packs possedes
- `visibleDocuments` filtre uniquement sur les documents possedes

Cela permet d'eviter toute presence d'un achat non pertinent dans `Explorer`.

### Titres Et Textes

Les bandes d'introduction et resumes doivent etre contextuels :

- `explore + packs` : catalogue, economie, recommandations
- `explore + PDF` : recherche, filtres, apercu
- `library + packs` : progression, nombre de contenus debloques
- `library + PDF` : reprise de lecture, acces rapide

Les empty states doivent aussi changer :

- `Explorer / Packs` : aucun pack trouve
- `Explorer / PDF` : aucun PDF trouve
- `Bibliotheque / Mes packs` : aucun pack achete
- `Bibliotheque / Mes PDF` : aucun PDF debloque

### Actions Et Boutons

Les actions existantes restent fonctionnelles, mais leur presentation depend du mode.

Dans `Explorer` :

- on peut garder `Acheter` pour les contenus non possedes
- on peut garder `Voir` pour l'apercu
- si deja possede, on remplace naturellement par une action de lecture

Dans `Bibliotheque` :

- l'action principale doit etre la lecture ou la reprise
- l'achat ne doit pas etre le message principal de l'ecran
- les packs doivent orienter vers `Voir le contenu` ou `Continuer`

## Ameliorations UX Incluses Dans Le Scope

- Retirer toute mention `Achat` comme onglet dans `Explorer`
- Renommer les labels de bibliotheque pour les rendre personnels
- Mieux aligner les en-tetes avec l'intention de chaque ecran
- Mieux separer les etats vides du catalogue et de la bibliotheque
- Conserver les modales de detail actuelles pour limiter le risque de regression

## Hors Scope

Cette iteration ne couvre pas :

- la creation de deux composants totalement distincts
- un refactor global du systeme de filtres
- une refonte visuelle complete des cartes
- une modification du flux d'achat backend
- de nouveaux parcours wallet

## Risques Et Points D'Attention

- Le composant actuel derive beaucoup de comportements de `activeTab`. Il faudra faire
  attention a ne pas casser la logique de tri quand `library` n'est plus un onglet
  interne visible.
- Les textes de boutons dans les modales document et pack devront rester coherents
  avec l'etat de possession reel.
- Les donnees de bibliotheque doivent continuer a inclure les PDF obtenus via pack,
  pas seulement les achats directs.

## Tests A Faire

### Verification Fonctionnelle

- Depuis `Explorer`, l'utilisateur ne voit que `Packs` et `PDF`.
- Depuis `Explorer`, aucun onglet `Achat` n'apparait.
- Depuis `Bibliotheque`, l'utilisateur voit `Mes packs` et `Mes PDF`.
- `Bibliotheque` n'affiche pas de contenus non possedes.
- Un PDF obtenu via un pack apparait bien dans `Mes PDF`.
- Un contenu deja possede reste ouvrable depuis `Explorer`.

### Verification UX

- Les titres et sous-titres changent bien entre `Explorer` et `Bibliotheque`.
- Les empty states correspondent bien au contexte courant.
- Les libelles de boutons donnent une action claire et non ambigue.

## Plan D'Implementation

1. Ajouter `viewMode` dans `PdfStudentSection` a partir de `externalTab`.
2. Remplacer la segmentation fixe par une segmentation dependante du mode.
3. Recalculer `visiblePacks` et `visibleDocuments` selon `viewMode`.
4. Adapter titres, resumes et empty states.
5. Ajuster les CTA des cartes et des modales pour privilegier la reprise en
   bibliotheque.
6. Verifier le branchement existant dans `App.tsx` pour conserver :
   - `Explorer` -> mode catalogue
   - `Bibliotheque` -> mode personnel

## Critere De Reussite

La correction est reussie si :

- `Explorer` ne montre plus aucun onglet `Achat`
- `Explorer` reste un espace `Packs + PDF`
- `Bibliotheque` devient l'unique endroit ou retrouver les contenus achetes
- les textes et actions de chaque ecran sont coherents avec leur intention
- le changement est livre sans refonte structurelle risquee
