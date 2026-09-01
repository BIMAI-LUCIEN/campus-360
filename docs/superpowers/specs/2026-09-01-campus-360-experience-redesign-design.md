# Refonte de l'expérience Campus 360

Date : 1er septembre 2026
Statut : conception validée
Périmètre : application mobile, site public, administration et portail recruteur

## 1. Objectif

Campus 360 doit présenter une expérience cohérente autour de trois promesses hiérarchisées : trouver et décrocher un stage en priorité, créer les documents nécessaires, puis apprendre plus efficacement. La refonte doit simplifier une application devenue riche en fonctionnalités sans retirer les capacités déjà disponibles.

Le résultat attendu est une interface épurée, motivante et immédiatement compréhensible, avec de belles cartes hiérarchisées plutôt qu'une succession de blocs identiques. L'application mobile est la source de vérité de l'expérience ; le site public explique cette expérience et le portail web l'administre.

## 2. Principes validés

- Direction visuelle : dynamique et motivante, correspondant à la proposition C présentée pendant la conception.
- Priorité produit : les stages sont la fonctionnalité numéro 1 ; l'atelier et les ressources soutiennent ce parcours.
- Accueil mobile : priorité dynamique calculée selon la situation réelle de l'étudiant.
- Navigation mobile : Accueil, Stages, Créer, Ressources et Profil.
- Identité : design Stitch violet sombre, surfaces anthracite, texte clair et accents violet, rose et bleu utilisés avec parcimonie.
- Typographie : Outfit pour les titres et Inter pour le contenu, en continuité avec l'existant.
- Aucun compte ni espace encadrant. L'étudiant exporte son document et le présente en dehors de l'application.
- La tarification comprend une offre gratuite et trois offres payantes : Basique, Pro et Elite.
- Les règles d'abonnement et d'export sont contrôlées côté serveur.

## 3. Expérience mobile

### 3.1 Navigation principale

La barre inférieure contient cinq destinations stables :

1. **Accueil** : prochaine action, progression et recommandations.
2. **Stages** : offres, correspondances et candidatures.
3. **Créer** : CV, lettre de motivation, rapport de stage et mémoire.
4. **Ressources** : catalogue PDF, bibliothèque, packs et assistant de révision.
5. **Profil** : abonnement, wallet, crédits IA, identité académique, sécurité et assistance.

Les anciens chemins internes `home`, `explore`, `library`, `documents` et `premium` restent accessibles depuis ces cinq destinations, mais ne doivent plus apparaître comme des univers concurrents dans la navigation principale.

### 3.2 Onboarding obligatoire

L'accès au flux personnalisé de stages nécessite quatre informations : établissement, filière et niveau, trois compétences principales, puis portfolio ou expériences lorsque l'étudiant en possède. La dernière étape reste facultative afin de ne pas bloquer un étudiant sans expérience.

L'onboarding explique pourquoi chaque donnée améliore le matching. Il peut être repris depuis le profil et ne réapparaît pas après validation, sauf si les informations indispensables deviennent incomplètes.

### 3.3 Accueil dynamique

L'accueil est organisé dans l'ordre suivant :

- salutation et contexte personnel ;
- grande carte de prochaine action ;
- trois actions rapides ;
- activité récente ;
- recommandation personnalisée ;
- navigation inférieure.

La carte principale utilise la première règle applicable dans cet ordre :

1. action urgente avec échéance ou candidature nécessitant une réponse ;
2. nouvelle correspondance de stage pertinente ;
3. document commencé et non terminé ;
4. profil incomplet empêchant une meilleure personnalisation ;
5. ressource ou action recommandée ;
6. création du premier CV pour un nouveau compte.

Chaque priorité fournit un titre, une explication courte, une progression lorsqu'elle existe, un libellé d'action et une destination. Le calcul doit être isolé dans une fonction pure et testable, sans être enfoui dans le composant visuel.

### 3.4 Atelier Créer

L'onglet Créer devient le point d'entrée unique des documents :

- CV ;
- lettre de motivation ;
- rapport de stage ;
- mémoire.

Chaque document affiche son état, son pourcentage d'avancement, sa dernière modification et l'action suivante. Les nouveaux utilisateurs voient une introduction courte et un bouton de création ; les utilisateurs actifs voient d'abord leurs brouillons et documents récents.

La rédaction reste disponible pour tous. Les règles d'export sont affichées au moment utile et appliquées côté serveur :

| Offre | Prix mensuel | Aperçu | PDF | Word | Watermark |
|---|---:|---|---|---|---|
| Gratuit | 0 FCFA | Oui | Non | Non | Oui dans l'aperçu |
| Basique | 2 000 FCFA | Oui | Oui | Non | Oui dans le PDF |
| Pro | 3 500 FCFA | Oui | Oui | Non | Non |
| Elite | 5 000 FCFA | Oui | Oui | Oui | Non |

Les quotas mensuels suivent le modèle économique validé :

| Offre | Candidatures IA | Rédactions ou corrections Atelier | Chat IA | PDF hors ligne |
|---|---:|---:|---:|---|
| Basique | 5 | 3 | 500 messages | Non |
| Pro | 10 | 5 | 1 000 messages | Oui |
| Elite | 20 | 10 | 2 000 messages | Oui |

L'utilisation à la carte reste disponible sans abonnement : PDF académique entre 25 et 100 FCFA, option IA PDF entre 50 et 100 FCFA, candidature IA complète à 1 000 FCFA ou 500 FCFA avec CV fourni, CV générique à 500 FCFA, lettre générique à 500 FCFA, rapport de stage à 1 000 FCFA, mémoire entre 2 000 et 3 000 FCFA, et 50 messages de chat IA pour 100 FCFA.

Le bouton interdit ne simule jamais un export. Il explique clairement la limite et mène vers la comparaison des offres. Aucun flux de collaboration avec un encadrant n'est ajouté.

### 3.5 Stages, ressources et profil

**Stages** présente les trois meilleures correspondances avant le catalogue complet. Chaque offre affiche un score explicable : 80 à 100 % recommandé, 60 à 79 % pertinent, moins de 60 % déconseillé ou masqué sauf si l'étudiant active l'exploration élargie. Les filtres restent accessibles et les candidatures disposent d'un statut lisible.

Une candidature utilise le canal adapté : envoi interne pour une entreprise inscrite, envoi serveur par e-mail pour une entreprise externe, ou préparation WhatsApp lorsque ce canal est disponible. Le CV et la lettre adaptés sont conservés dans l'historique personnel et peuvent être réutilisés. Une relance J+7 n'est annoncée que si elle est réellement planifiée côté serveur.

Le partage d'une offre transporte un identifiant de parrainage. La récompense d'un jeton IA au parrain et au nouvel inscrit est attribuée par le serveur une seule fois, après une inscription valide.

Les notifications rappellent une candidature, un document abandonné ou une relance disponible avec un ton motivant et légèrement humoristique. Elles restent désactivables et ne doivent jamais annoncer une action serveur qui n'existe pas.

**Ressources** rassemble les PDF, les packs, la bibliothèque personnelle et l'assistant IA. Le premier écran distingue clairement découvrir, reprendre une lecture et réviser avec l'IA.

**Profil** regroupe les données de compte sans mélanger les actions financières et les réglages. L'abonnement, le wallet et les crédits IA sont visibles dans une zone synthétique ; les données académiques, la sécurité, les notifications et l'assistance sont organisées en sections séparées.

### 3.6 Système visuel mobile

- Fond général presque noir et surfaces principales anthracite.
- Violet principal réservé aux actions, sélections et progressions, avec un dégradé violet, rose et bleu sur les moments prioritaires.
- Vert réservé aux réussites et états positifs ; rouge réservé aux erreurs.
- Cartes avec un rayon de 14 à 16 px.
- Une carte utilise soit une bordure légère, soit une ombre courte, sans combiner une bordure décorative et une ombre large.
- Les cartes varient de format selon la hiérarchie : grande carte d'objectif, raccourcis compacts, listes horizontales pour l'activité.
- Quatre tailles typographiques principales au maximum par écran.
- Cibles tactiles d'au moins 44 x 44 points.
- Animations de 180 à 220 ms pour les changements d'état, avec réduction ou suppression lorsque le système demande moins d'animations.

## 4. Site public

### 4.1 Nouveau récit de la page d'accueil

La page d'accueil ne doit plus réduire Campus 360 à une bibliothèque de PDF. Elle suit cette narration :

1. hero présentant Campus 360 comme l'outil qui aide à trouver et décrocher un stage ;
2. trois chemins hiérarchisés : Stages, Documents, Révision ;
3. démonstration visuelle de l'application ;
4. parcours du profil étudiant jusqu'au résultat ;
5. section dédiée à l'atelier de création de documents ;
6. preuves ou exemples de résultats ;
7. comparaison Gratuit, Basique, Pro et Elite ;
8. confiance : Mobile Money, sécurité, mode hors ligne et contexte camerounais ;
9. questions fréquentes et téléchargement.

Les statistiques non reliées à une source réelle, notamment les nombres d'étudiants, de PDF ou d'universités, sont supprimées ou alimentées par une donnée vérifiable. Le site ne doit pas fabriquer de preuve sociale.

### 4.2 Pages secondaires

La page Fonctionnalités est organisée selon les objectifs de l'étudiant plutôt que comme une grille de douze cartes similaires. La page Tarifs reflète exactement les règles d'aperçu, PDF, Word et watermark. Les pages de téléchargement, aide et FAQ reprennent la même terminologie que l'application.

Le site conserve une composition de marque plus expressive que l'application, mais réutilise les mêmes couleurs, typographies, captures et libellés de produit.

## 5. Portail web

### 5.1 Administration

Le tableau de bord administrateur fournit une synthèse de :

- comptes et activité ;
- abonnements actifs par offre ;
- revenus et mouvements de wallet ;
- consommation de crédits IA ;
- documents créés par type ;
- exports réussis, refusés et échoués ;
- offres, candidatures et activité recruteur.

La section Documents étudiants expose uniquement les métadonnées nécessaires aux opérations : type, statut, dates, offre d'abonnement et incidents. Le contenu privé d'un document n'est pas affiché par défaut.

Une section Abonnements et exports rend les règles Gratuit, Basique, Pro et Elite vérifiables et permet de diagnostiquer un refus ou un échec sans modifier arbitrairement le document de l'étudiant.

### 5.2 Espace recruteur

L'espace recruteur reste limité aux entreprises et recruteurs. Il se concentre sur les offres publiées, les candidatures reçues et leur suivi. Aucun rôle encadrant académique n'est introduit.

L'inscription applique un KYB classique pour les entreprises disposant d'un domaine professionnel, ou un circuit alternatif reposant sur RCCM ou identifiant fiscal, présence sociale vérifiable et validation WhatsApp. Tant que le KYB n'est pas validé, le recruteur ne peut pas contacter un étudiant sur WhatsApp.

La CVthèque permet de trier les candidats par matching, compétences et établissement. Le parrainage B2B attribue un boost d'offre une seule fois après activation réelle de l'entreprise invitée. Les mises à jour de statut restent rapides et cohérentes sans imposer TanStack si les composants existants offrent déjà le même comportement.

Les données denses utilisent des listes ou tableaux responsive plutôt qu'une grille de cartes. Les cartes sont réservées aux indicateurs synthétiques et aux actions prioritaires.

## 6. Architecture frontend

`src/AppShell.tsx` ne doit pas absorber la nouvelle logique. La refonte introduit des unités séparées :

- calcul de la priorité d'accueil ;
- modèle de navigation principal ;
- carte de prochaine action ;
- actions rapides ;
- activité récente ;
- hub de création ;
- résumé d'abonnement et d'export.

Chaque unité reçoit des données explicites et émet des actions sans connaître la navigation globale ni les appels réseau internes. Les composants existants sont réutilisés lorsqu'ils respectent le système validé ; les variantes visuelles concurrentes sont consolidées.

Le site public et le portail utilisent leurs propres composants web, mais les noms d'offres, règles d'export, catégories de documents et libellés principaux doivent provenir de constantes partagées ou rester couverts par des tests de cohérence.

## 7. États et erreurs

Chaque zone de données doit avoir quatre états : chargement, contenu, absence de données et erreur. Les listes utilisent des skeletons ; les erreurs expliquent ce qui n'a pas fonctionné et proposent une relance lorsqu'elle est pertinente.

En mode hors ligne, les contenus déjà disponibles restent consultables et les actions nécessitant le réseau indiquent clairement qu'elles seront indisponibles. Une recommandation dynamique ne doit jamais provoquer un écran vide : la création du premier CV sert de repli stable.

Les erreurs d'abonnement distinguent : offre insuffisante, abonnement expiré, session non authentifiée, quota IA épuisé et erreur technique d'export.

## 8. Accessibilité et responsive

- Contraste minimal de 4,5:1 pour le texte courant et 3:1 pour les grands textes.
- Navigation complète au clavier sur le web.
- Libellés accessibles sur les boutons composés uniquement d'icônes.
- Ordre de lecture logique et focus visible.
- Validation mobile à partir de 375 px et sur les largeurs web courantes.
- Tableaux du portail transformés ou défilables sans masquer les actions essentielles.
- Contenu utilisable avec une taille de texte agrandie.

## 9. Vérification

### Tests fonctionnels

- La priorité d'accueil respecte l'ordre défini pour chaque combinaison de données.
- Le flux personnalisé de stages reste inaccessible tant que les données obligatoires de l'onboarding ne sont pas validées.
- Chaque action mène au bon écran.
- Les quatre types de documents sont accessibles depuis Créer.
- Les règles Gratuit, Basique, Pro et Elite sont identiques sur mobile, API, site et portail.
- Aucun utilisateur gratuit ne peut exporter un PDF ou un Word.
- Un utilisateur Basique obtient uniquement un PDF avec watermark.
- Un utilisateur Pro obtient uniquement un PDF sans watermark.
- Un utilisateur Elite obtient un PDF ou Word sans watermark.
- Les quotas de candidatures, Atelier et chat sont appliqués de manière atomique côté serveur.
- Le parrainage étudiant et recruteur ne peut être crédité qu'une fois par relation valide.
- Les canaux interne, e-mail et WhatsApp ne sont proposés que lorsque les données nécessaires sont disponibles.
- Une notification de relance correspond toujours à une candidature ou un document réel.
- Aucun parcours encadrant n'est présent.

### Tests d'interface

- Capture et contrôle des écrans à 375, 390 et 430 px.
- Contrôle du site public sur mobile, tablette et bureau.
- Contrôle du portail avec tableaux vides, longs et en erreur.
- Vérification des zones tactiles, contrastes, focus et réduction des animations.
- Vérification des textes longs en français et de l'absence de débordement.

## 10. Hors périmètre

- Collaboration en temps réel ou commentaires d'encadrants.
- Comptes encadrants académiques.
- Fabrication de témoignages, statistiques ou références académiques.
- Modification des prix Basique 2 000, Pro 3 500 et Elite 5 000 FCFA sans nouvelle validation produit.
- Nouveau moteur de recommandation serveur complexe : la première version utilise les données déjà disponibles.

## 11. Critères d'acceptation globaux

La refonte est terminée lorsque les trois surfaces présentent les stages comme la fonctionnalité principale, que l'étudiant comprend en quelques secondes sa prochaine action, que les quatre outils de création sont visibles depuis un seul endroit, que les offres Gratuit, Basique, Pro et Elite ainsi que leurs quotas et droits d'export sont cohérents, et que les interfaces restent utilisables sur petits écrans, hors ligne et dans tous les états de données définis.
