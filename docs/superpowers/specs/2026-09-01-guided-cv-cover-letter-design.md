# Conception : conversations guidees pour CV et lettre de motivation

## Objectif

Remplacer les formulaires de generation directe du CV et de la lettre de motivation par deux conversations guidees specialisees. Les deux parcours reutilisent un moteur commun, enregistrent les donnees sur le serveur et ouvrent le document genere dans l'editeur existant.

Le perimetre de cette specification couvre uniquement le CV et la lettre de motivation. Le memoire fera l'objet d'une specification distincte apres validation de ces deux parcours.

## Principes produit

- Une conversation distincte est utilisee pour chaque type de document.
- Le moteur de conversation est commun afin d'eviter la duplication et de preparer son reutilisation pour le memoire.
- Les informations disponibles dans le profil etudiant sont pre-remplies puis confirmees ou corrigees par l'utilisateur.
- Une seule question est affichee a la fois.
- Un resume modifiable est presente avant la generation.
- Le document final est genere et sauvegarde cote serveur avant l'ouverture de l'editeur.
- Aucun encadrant ou recruteur n'intervient dans l'application.

## Architecture

### Application mobile

Le choix `cv` ou `lettre_motivation` ouvre un composant de conversation guidee commun. Ce composant recoit un scenario qui definit :

- le titre et les textes du parcours ;
- les champs a collecter ;
- l'ordre des questions ;
- les validations propres au document ;
- les informations de profil reutilisables ;
- le resume final ;
- le type de document envoye au serveur.

Les reponses non encore confirmees sont conservees localement afin de survivre a une coupure reseau ou a une fermeture accidentelle de l'ecran. Les donnees confirmees sont synchronisees avec le brouillon serveur.

### API serveur

Le serveur reste la source d'autorite. Il authentifie l'etudiant, verifie la propriete du brouillon, valide les reponses et choisit le prompt correspondant au type de document.

Le moteur de generation commun accepte uniquement les types explicitement autorises. Les prompts CV et lettre sont independants du prompt de rapport de stage. Le serveur enregistre le contenu genere dans les sections du document avant de retourner le document final.

La logique est implementee dans `mobile-api` et repliquee dans `recruiter-web` tant que les deux backends exposent les memes routes mobiles.

## Parcours CV

La conversation collecte ou confirme :

1. nom complet et coordonnees ;
2. titre professionnel ou poste recherche ;
3. resume professionnel ;
4. formations et diplomes ;
5. experiences professionnelles, stages et projets ;
6. competences techniques et transversales ;
7. langues et niveaux ;
8. certifications, realisations et centres d'interet pertinents.

Le CV genere vise une ou deux pages et utilise une structure professionnelle : coordonnees, profil, experiences, formation, competences, langues et certifications. Il ne contient ni page de garde academique, ni sommaire, ni informations d'encadrement de stage.

## Parcours lettre de motivation

La conversation collecte ou confirme :

1. identite et coordonnees du candidat ;
2. poste, formation ou opportunite visee ;
3. entreprise ou organisation cible ;
4. contexte de la candidature ;
5. motivations pour l'organisation et le poste ;
6. competences et experiences les plus pertinentes ;
7. disponibilite et formule de signature.

La lettre generee vise une page et utilise une structure de courrier : expediteur, destinataire, date, objet, salutation, arguments, conclusion et signature. Elle ne reprend pas le modele academique des rapports.

## Flux de donnees

1. L'etudiant choisit un type de document.
2. L'application cree un brouillon serveur associe a son compte.
3. Le profil etudiant est charge et ses donnees sont proposees pour confirmation.
4. Le moteur affiche une question a la fois et synchronise les reponses confirmees.
5. Un resume complet permet de revenir sur chaque reponse.
6. La demande de generation est envoyee avec l'identifiant du brouillon et le type de document.
7. Le serveur verrouille les credits necessaires, genere et valide le contenu.
8. En cas de succes, le serveur enregistre les sections, debite les credits une seule fois et marque le brouillon comme genere.
9. L'application ouvre le document dans l'editeur existant.

## Credits et idempotence

- Une generation reussie debite les credits IA une seule fois.
- Une generation echouee ne debite aucun credit.
- Une nouvelle tentative avec le meme identifiant de generation ne peut pas provoquer un double debit.
- Si les credits sont insuffisants, la generation est refusee avant l'appel au fournisseur IA.
- Le serveur ne recharge jamais automatiquement les credits d'un utilisateur insuffisant.

## Edition, sauvegarde et export

Le CV et la lettre utilisent l'editeur existant avec sauvegarde automatique par API. Les erreurs serveur ne sont jamais presentees comme des sauvegardes reussies.

Les exports dependent du `template_type` :

- `cv` utilise un rendu CV dedie ;
- `lettre_motivation` utilise un rendu courrier dedie ;
- `stage` et `memoire` conservent les rendus academiques.

Les regles d'abonnement restent identiques :

- Free : edition et apercu filigrane, aucun export ;
- Basic : PDF filigrane, aucun export Word ;
- Premium : PDF et Word sans filigrane ;
- abonnement expire ou paiement echoue : comportement Free.

Le serveur applique ces regles, meme si le client est modifie ou si l'API est appelee directement.

## Gestion des erreurs

- Une coupure reseau conserve les reponses locales et affiche une action `Reessayer`.
- Une erreur de synchronisation conserve le brouillon local sans annoncer de sauvegarde reussie.
- Une erreur IA laisse le document en brouillon et ne debite pas les credits.
- Une reponse invalide est rattachee a la question concernee et peut etre corrigee.
- Un document absent ou appartenant a un autre utilisateur retourne une reponse 404.
- Une session absente ou invalide retourne une reponse 401, sans fallback invite.

## Tests et criteres d'acceptation

### Conversation

- Le profil pre-remplit les champs connus et chaque valeur reste modifiable.
- Le CV et la lettre utilisent des sequences de questions distinctes.
- Une seule question est affichee a la fois.
- Le resume final reflete exactement les reponses confirmees.
- Le parcours peut reprendre apres une coupure reseau.

### Generation

- Le serveur refuse un type de document inconnu.
- Le CV et la lettre utilisent leurs prompts respectifs.
- Le document genere appartient a l'utilisateur authentifie.
- Une generation echouee ne debite pas les credits.
- Une relance idempotente ne provoque pas de double debit.

### Rendu et export

- Le CV n'affiche aucun element de page de garde academique.
- La lettre est rendue comme un courrier et tient normalement sur une page.
- Free, Basic et Premium obtiennent exactement les droits d'export definis ci-dessus.
- Le filigrane Basic apparait sur chaque page PDF.
- L'export Word est refuse cote serveur hors Premium.

### Verification technique

- Le typecheck passe dans l'application mobile, `mobile-api` et `recruiter-web`.
- Les tests couvrent les scenarios CV, lettre, coupure reseau, credits insuffisants, idempotence, propriete et abonnements.

## Hors perimetre

- Collaboration avec des encadrants ou recruteurs.
- Partage de brouillons dans l'application.
- Generation combinee d'un CV et d'une lettre dans une seule conversation.
- Refonte du parcours memoire dans cette iteration.
