# Rapport de stage - Abonnements, watermark et exports

## Objectif

Permettre a l'etudiant de rediger son rapport de stage dans Campus 360, puis de
l'exporter pour le presenter a son encadreur. Les encadreurs ne disposent pas
d'un compte et ne collaborent pas dans l'application.

Le droit d'export depend de l'abonnement actif de l'etudiant. Cette regle doit
etre appliquee cote serveur afin qu'elle ne puisse pas etre contournee par un
appel direct aux API.

## Perimetre

Cette iteration couvre :

- la securisation des routes de rapports concernees ;
- la politique d'export Free, Basic et Premium ;
- le watermark de l'apercu et des PDF Basic ;
- l'export PDF ;
- l'ajout de l'export Word pour Premium ;
- l'affichage mobile des droits et des erreurs d'abonnement ;
- les tests de la politique d'acces et d'export.

Cette iteration ne couvre pas :

- les comptes encadrants ;
- les commentaires ou annotations d'encadrants ;
- le partage collaboratif ;
- la validation ou la signature du rapport par un tiers ;
- les liens publics de consultation.

## Regles produit

| Niveau | Redaction | Apercu | Export PDF | Export Word |
| --- | --- | --- | --- | --- |
| Free | Autorisee | Watermark permanent | Bloque | Bloque |
| Basic actif | Autorisee | Watermark permanent | Autorise avec watermark | Bloque |
| Premium actif | Autorisee | Sans watermark | Autorise sans watermark | Autorise sans watermark |

Un abonnement expire est traite comme Free. La decision repose sur le niveau
stocke en base et sur `subscription_expires_at`, jamais sur une valeur envoyee
par l'application mobile.

## Watermark

Le watermark Basic est applique par le serveur sur chaque page du PDF exporte.
Il contient :

- `Campus 360 - Version Basic` ;
- une identification legere de l'etudiant, par exemple son nom ou un email
  partiellement masque ;
- une opacite suffisante pour rester visible sans rendre le rapport illisible.

Le mode Free n'obtient aucun fichier exportable. Son apercu dans l'editeur
affiche un watermark visuel permanent afin de montrer le rendu et la limite du
plan. Ce watermark d'interface ne constitue pas la protection principale : le
blocage des endpoints d'export reste obligatoire.

## Architecture

### Politique centralisee

Un module serveur partage determine les capacites d'export a partir de
l'utilisateur authentifie :

- `canExportPdf` ;
- `pdfRequiresWatermark` ;
- `canExportDocx` ;
- `effectiveTier` ;
- `reason` lorsque l'action est refusee.

Les routes PDF et Word utilisent ce module. Elles ne dupliquent pas les regles
d'abonnement. La meme politique est presente dans `mobile-api` et dans
`recruiter-web`, car le depot contient actuellement deux copies des routes
mobiles pouvant etre deployees separement.

### Authentification et propriete

Toutes les routes de rapports concernees exigent une session valide. Le repli
vers `guest-student` est supprime pour les operations de lecture, modification,
generation IA et export.

Avant toute action, le serveur charge le document avec les deux conditions :

- l'identifiant du document correspond ;
- `user_id` correspond a l'utilisateur authentifie.

Un rapport absent ou appartenant a un autre utilisateur retourne `404` afin de
ne pas confirmer son existence.

## Flux d'export PDF

1. Le mobile demande l'export du rapport.
2. Le serveur authentifie l'utilisateur.
3. Le serveur verifie la propriete du rapport.
4. Le serveur calcule les droits d'export depuis l'abonnement en base.
5. Free recoit une reponse `403` avec le code `SUBSCRIPTION_REQUIRED`.
6. Basic recoit un PDF avec watermark sur chaque page.
7. Premium recoit un PDF sans watermark.
8. Le mobile partage ou enregistre le fichier recu.

La generation PDF conserve la mise en page academique existante. Le watermark
est ajoute pendant le rendu serveur et ne depend d'aucune instruction du client.

## Flux d'export Word

Une route d'export `.docx` transforme la couverture et les sections du rapport
en document Word structure. Elle est reservee a Premium.

Le document Word inclut au minimum :

- la page de garde ;
- les titres de sections dans leur ordre ;
- le contenu textuel et les paragraphes ;
- les styles de titres ;
- les sauts de page essentiels ;
- les informations principales du rapport.

Free et Basic recoivent `403` avec le code `PREMIUM_REQUIRED`. Aucun fichier
Word temporaire n'est genere avant la verification de l'abonnement.

## Interface mobile

L'editeur connait le niveau d'abonnement courant via les donnees de compte, mais
le serveur reste la source de verite.

Comportements attendus :

- Free voit les boutons PDF et Word verrouilles et un appel a l'abonnement ;
- Basic peut lancer le PDF et voit la mention `PDF avec watermark` ;
- Basic voit Word verrouille avec la mention `Premium requis` ;
- Premium voit les deux exports disponibles sans watermark ;
- une reponse serveur `403` affiche le bon message et ouvre la page Premium ;
- une erreur de sauvegarde ou d'export n'est jamais affichee comme un succes.

## Reponses d'erreur

Les routes utilisent des codes stables :

- `AUTH_REQUIRED` : aucune session valide ;
- `DOCUMENT_NOT_FOUND` : document absent ou non possede ;
- `SUBSCRIPTION_REQUIRED` : export interdit au niveau Free ;
- `PREMIUM_REQUIRED` : export Word interdit hors Premium ;
- `EXPORT_FAILED` : echec technique apres validation des droits.

Les messages utilisateur restent en francais et ne revelent ni requete SQL, ni
chemin serveur, ni information sur un autre utilisateur.

## Tests

### Politique d'abonnement

- Free ne peut exporter ni PDF ni Word.
- Basic peut exporter un PDF watermarque.
- Basic ne peut pas exporter Word.
- Premium peut exporter PDF et Word sans watermark.
- Un abonnement Basic ou Premium expire est traite comme Free.

### Securite

- Un appel sans session est refuse.
- Un utilisateur ne peut ni lire, ni modifier, ni generer, ni exporter le
  rapport d'un autre utilisateur.
- Le niveau envoye par le client ne modifie jamais la decision serveur.
- Le PDF Basic contient effectivement le watermark sur chaque page.
- Les routes IA concernees ne consomment pas de credits sans session valide.

### Interface

- Les boutons correspondent au niveau courant.
- Les erreurs `403` conduisent vers l'offre d'abonnement appropriee.
- Un echec d'export ne produit aucun message de succes.

## Criteres d'acceptation

- Aucun workflow encadrant n'est ajoute.
- La redaction reste accessible aux trois niveaux.
- Free ne peut obtenir aucun fichier PDF ou Word.
- Basic obtient uniquement un PDF watermarque.
- Premium obtient PDF et Word sans watermark.
- Toutes les decisions d'export sont imposees cote serveur.
- Les routes de rapports ne retombent plus sur `guest-student`.
- Les controles TypeScript de l'application mobile et des services modifies
  passent sans erreur.

