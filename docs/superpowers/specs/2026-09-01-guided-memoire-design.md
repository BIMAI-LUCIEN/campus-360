# Conception du parcours guide de memoire

Date : 2026-09-01
Statut : valide par le produit

## 1. Objectif

Campus 360 doit proposer un parcours guide pour produire un memoire academique fiable, modifiable et exportable. Le parcours couvre deux familles de documents :

- le memoire academique de recherche ;
- le memoire professionnel ou centre sur un projet.

Le moteur doit adapter les questions, le plan et les consignes de redaction au type choisi. Il ne doit jamais inventer des donnees de recherche ni presenter une reference non verifiee comme authentique.

Le perimetre exclut explicitement les comptes encadrants, les invitations, les commentaires externes et toute collaboration integree. L'etudiant exporte son document pour le presenter a ses encadrants en dehors de l'application.

## 2. Principes produit

- Une question est posee a la fois pendant le cadrage.
- Le travail est sauvegarde et peut etre repris apres interruption.
- Le plan est propose par le systeme, mais doit rester modifiable et etre valide avant la redaction.
- La generation est progressive et peut cibler une seule section.
- Le contenu existant n'est jamais remplace silencieusement.
- Les informations manquantes sont signalees au lieu d'etre inventees.
- Les sources ont un statut explicite : fournie, verifiee ou a verifier.
- Les droits d'export sont controles exclusivement par le serveur.

## 3. Parcours utilisateur

### 3.1 Demarrage

L'etudiant choisit `Memoire`, saisit un titre provisoire, puis choisit l'un des parcours suivants :

1. `Recherche academique` pour un travail fonde sur une problematique, une revue de litterature, une methodologie et des resultats de recherche.
2. `Professionnel / projet` pour un travail fonde sur un besoin concret, une conception, une realisation et une evaluation.

Le profil Campus 360 pre-remplit uniquement les informations deja connues : nom, email, etablissement, filiere et niveau. L'etudiant doit pouvoir les confirmer ou les corriger pour le document.

### 3.2 Cadrage conversationnel

Le questionnaire collecte progressivement :

- le type de memoire ;
- la discipline, le niveau et les exigences de l'etablissement ;
- le sujet provisoire et son contexte ;
- la problematique ;
- les objectifs general et specifiques ;
- les questions de recherche et, si pertinent, les hypotheses ;
- la methodologie envisagee ;
- le terrain, la population, l'echantillon et les outils de collecte ;
- les donnees deja disponibles ;
- les contraintes de longueur, de langue, de style et de calendrier ;
- les sources deja possedees ;
- le style bibliographique demande.

L'assistant doit detecter les reponses vagues ou contradictoires et demander une precision avant de passer a l'etape suivante. L'utilisateur peut neanmoins ignorer une information non bloquante ; elle est alors inscrite dans la liste des elements manquants.

### 3.3 Validation du plan

Le serveur construit un plan adapte a partir des informations confirmees. L'interface affiche les sections et sous-sections dans un ecran dedie permettant de :

- renommer une section ;
- ajouter ou supprimer une section non systeme ;
- reordonner le plan ;
- revenir au questionnaire ;
- valider le plan.

Aucune generation complete ne demarre avant cette validation. Une modification ulterieure du plan reste possible depuis l'editeur.

### 3.4 Redaction

Apres validation, l'etudiant peut :

- generer toutes les sections eligibles ;
- generer une seule section ;
- continuer ou reformuler un passage ;
- conserver la version actuelle ou confirmer son remplacement ;
- modifier manuellement chaque contenu ;
- consulter les informations et sources utilisees pour une section.

Une generation interrompue conserve les sections deja terminees. Les sections en echec restent identifiables et peuvent etre relancees individuellement.

## 4. Structures adaptatives

### 4.1 Memoire de recherche

Structure recommandee, modifiable selon l'etablissement :

1. Page de garde
2. Fiche de synthese ou resume et mots-cles
3. Dedicace et remerciements
4. Sommaire ou table des matieres
5. Listes des figures, tableaux et abreviations
6. Introduction generale
7. Problematique, questions, objectifs et hypotheses
8. Revue de litterature et cadre theorique
9. Methodologie de recherche
10. Presentation et analyse des resultats
11. Discussion des resultats
12. Conclusion generale et recommandations
13. Bibliographie
14. Annexes

### 4.2 Memoire professionnel ou projet

Structure recommandee, modifiable selon l'etablissement :

1. Page de garde
2. Resume et mots-cles
3. Dedicace et remerciements
4. Sommaire ou table des matieres
5. Listes des figures, tableaux et abreviations
6. Introduction generale
7. Contexte et analyse du besoin
8. Cahier des charges et objectifs du projet
9. Etat de l'art et solutions existantes
10. Methodologie de conduite du projet
11. Conception de la solution
12. Realisation ou mise en oeuvre
13. Tests, evaluation et resultats
14. Discussion critique, limites et recommandations
15. Conclusion generale
16. Bibliographie
17. Annexes

Les anciennes sections generiques de `memoire` ne doivent plus imposer un chapitre d'implementation a un memoire de recherche non technique.

## 5. Donnees de recherche et contenu manquant

Le comportement par defaut interdit toute fabrication de resultats, de statistiques, de participants, d'entretiens ou d'observations.

Si les donnees ne sont pas encore disponibles, le systeme peut produire :

- le protocole de recherche ;
- la structure du chapitre ;
- les instruments de collecte proposes ;
- les methodes d'analyse prevues ;
- des emplacements explicites comme `[Donnees a fournir]` ou `[Resultat a inserer]`.

Des donnees fictives ne peuvent etre creees que sur demande explicite de l'utilisateur. Elles doivent alors porter une mention visible indiquant qu'il s'agit d'un exemple pedagogique qui ne peut pas etre presente comme un resultat reel.

## 6. Sources, recherche et bibliographie

### 6.1 Registre des sources

Chaque source est stockee comme une entree structuree comprenant, lorsque disponibles :

- titre ;
- auteurs ;
- annee ;
- type de publication ;
- editeur ou revue ;
- URL ;
- DOI ou identifiant ;
- date de consultation ;
- statut de verification ;
- origine : utilisateur, recherche ou suggestion IA.

Les statuts minimum sont `fournie`, `verifiee` et `a_verifier`.

### 6.2 Priorite et recherche

La priorite est donnee aux sources fournies par l'etudiant. Le systeme peut ensuite rechercher des references reelles en ligne, puis proposer des pistes supplementaires par IA.

Une reference issue d'une suggestion IA reste `a_verifier` tant qu'une source externe identifiable ne confirme pas son existence. Elle ne doit pas etre inseree silencieusement dans la bibliographie definitive.

La recherche automatique doit privilegier les pages officielles, les catalogues academiques, les DOI, les archives ouvertes et les publications scientifiques. Une erreur reseau ne doit pas bloquer l'edition du memoire.

### 6.3 Citations

Le systeme prend en charge au minimum les styles APA et IEEE, ainsi qu'un mode personnalise. Il doit detecter :

- une citation sans entree bibliographique ;
- une source bibliographique jamais citee ;
- une reference encore a verifier ;
- un champ bibliographique obligatoire manquant ;
- une affirmation importante sans source associee.

Le systeme ne doit inventer ni auteur, ni titre, ni publication, ni DOI.

## 7. Page de garde et exports

Le memoire possede une couverture distincte du rapport de stage. Elle peut contenir :

- pays, ministere, universite, ecole ou faculte ;
- departement et filiere ;
- nature du document : memoire de recherche ou memoire professionnel ;
- diplome vise ;
- theme ou titre ;
- nom et matricule de l'etudiant ;
- nom de l'encadreur academique si l'etudiant souhaite l'afficher ;
- jury ou president uniquement si ces informations sont fournies ;
- annee academique.

La couverture ne doit pas afficher par defaut une entreprise, une periode de stage ou un encadreur professionnel. Ces champs ne sont ajoutes que lorsqu'ils sont pertinents pour un memoire professionnel et explicitement renseignes.

Les regles d'abonnement existantes s'appliquent sans exception :

- `Free` : edition et apercu avec watermark, aucun export ;
- `Basic` : export PDF avec watermark, aucun export Word ;
- `Premium` : exports PDF et Word sans watermark.

Le serveur verifie l'identite, la propriete du document et l'abonnement avant chaque export. Le client ne constitue jamais la source de verite pour ces droits.

## 8. Credits et fiabilite de generation

Avant une generation, le serveur verifie :

- l'authentification ;
- la propriete du document ;
- le type `memoire` ;
- la validation du plan ;
- le solde de credits ;
- la presence de la configuration IA.

Le portefeuille ne doit jamais etre recharge automatiquement par une route de generation. Les credits ne sont debites qu'apres une generation reussie et sauvegardee. Une cle d'idempotence empeche les doubles debits lors d'une nouvelle tentative reseau.

Pour une generation multi-section, le debit et le statut de chaque operation doivent etre coherents avec la politique tarifaire retenue. Une section echouee ne doit pas etre facturee comme reussie.

## 9. Modele de donnees recommande

Les informations specifiques au parcours sont conservees dans une structure de cadrage reliee au document, avec au minimum :

- `memoir_kind` : `research` ou `professional` ;
- `discipline`, `degree`, `institution_requirements` ;
- `topic`, `problem_statement`, `general_objective` ;
- `specific_objectives`, `research_questions`, `hypotheses` ;
- `methodology`, `field`, `population`, `sample`, `collection_tools` ;
- `data_status` ;
- `citation_style` ;
- `plan_status` et date de validation ;
- liste des informations manquantes.

Les sources sont stockees dans une table dediee reliee au document. Les operations de generation possedent une cle d'idempotence, un statut, un cout, la section ciblee et un message d'erreur eventuel.

Une migration doit rester compatible avec les memoires deja crees. Un document historique sans cadrage est ouvert normalement et invite l'utilisateur a completer les nouvelles informations.

## 10. API et responsabilites

### Conversation de cadrage

La route de conversation doit avoir un scenario propre au memoire, utiliser le profil en contexte et renvoyer une seule question ciblee. Elle ne doit pas se contenter de deux reponses avant d'autoriser la redaction.

### Construction du plan

Une operation dediee construit une proposition de plan a partir du cadrage. Le plan est persiste avant validation afin de pouvoir etre modifie sans lancer de generation.

### Generation

Le moteur actuellement partage avec le rapport de stage doit separer ses consignes selon `documentType` et `memoir_kind`. Les contenus fixes lies a Campus 360, au genie logiciel, au stage ou a une personne fictive doivent etre supprimes.

Les listes d'abreviations, figures et tableaux doivent etre derivees du contenu reel ou rester vides avec un indicateur de completion. La bibliographie doit etre construite depuis le registre des sources, et non depuis une liste codee en dur.

### Synchronisation des backends

Les routes mobiles dupliquees dans `mobile-api` et `recruiter-web` doivent conserver un comportement identique. Toute correction de securite, de generation ou d'export est appliquee aux deux implementations.

## 11. Interface

Le parcours affiche une progression en sept etapes :

1. Cadrage
2. Problematique
3. Methodologie
4. Sources
5. Plan
6. Redaction
7. Verification

Les statuts visuels distinguent :

- information confirmee ;
- information manquante ;
- source verifiee ;
- source a verifier ;
- section non generee, en cours, terminee ou en erreur.

Avant export, une fiche de controle affiche les sections incompletes, les donnees manquantes, les citations incoherentes et les references non verifiees. Ces alertes doivent informer clairement l'etudiant sans lui faire perdre son travail.

## 12. Gestion des erreurs

- Une indisponibilite IA conserve la conversation, le plan et les sections deja produites.
- Une generation partielle peut etre reprise section par section.
- Un solde insuffisant est signale avant l'appel IA.
- Une reference non verifiable reste marquee `a_verifier`.
- Une tentative de remplacement d'un contenu existant demande une confirmation.
- Un acces a un document appartenant a un autre utilisateur renvoie une erreur sans divulguer son contenu.
- Un abonnement insuffisant bloque l'export cote serveur meme si le client est modifie.

## 13. Validation et tests

### Tests fonctionnels

- Parcours complet d'un memoire de recherche.
- Parcours complet d'un memoire professionnel.
- Adaptation du plan a une discipline non technique.
- Modification et validation du plan.
- Reprise d'une conversation interrompue.
- Generation d'une seule section et regeneration avec confirmation.
- Conservation des zones de donnees manquantes sans fabrication.
- Ajout d'une source utilisateur, recherche reelle et suggestion a verifier.
- Detection des citations et references incoherentes.

### Tests de securite et facturation

- Authentification obligatoire.
- Controle de propriete sur lecture, generation et export.
- Refus avant appel IA lorsque les credits sont insuffisants.
- Aucun rechargement automatique des credits.
- Aucun debit apres un echec de generation.
- Idempotence des nouvelles tentatives.
- Application des droits Free, Basic et Premium cote serveur.

### Tests de rendu

- Couverture de recherche sans element de stage.
- Couverture professionnelle avec uniquement les champs explicitement fournis.
- PDF Basic avec watermark.
- PDF et Word Premium sans watermark.
- Table des matieres, pagination, listes et bibliographie sur un document long.

## 14. Hors perimetre

- Comptes ou portails pour les encadrants.
- Invitations, commentaires, annotations ou validation en ligne par un encadrant.
- Detection de plagiat certifiee par une base externe.
- Garantie automatique d'acceptation academique du contenu.
- Fabrication automatique de donnees de recherche.
- Soutenance, diaporama ou entrainement oral dans cette iteration.

## 15. Criteres d'acceptation

La fonctionnalite est consideree terminee lorsque :

- les deux types de memoires suivent des parcours et des plans distincts ;
- le plan est editable et valide avant la generation complete ;
- aucune donnee ou reference non verifiee n'est presentee comme reelle ;
- les sources et citations disposent d'un controle de coherence ;
- la couverture et les exports ne reutilisent plus les champs obligatoires du rapport de stage ;
- les credits ne sont ni recharges automatiquement ni debites en cas d'echec ;
- les restrictions Free, Basic et Premium sont appliquees cote serveur ;
- les routes `mobile-api` et `recruiter-web` restent alignees ;
- les tests fonctionnels, de securite, de facturation et de rendu passent.
