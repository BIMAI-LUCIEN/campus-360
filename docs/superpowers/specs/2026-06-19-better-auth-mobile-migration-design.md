# Migration mobile vers Better Auth

Date: 2026-06-19
Statut: approuve sur le principe par l'utilisateur

## Objectif

Faire de Better Auth l'unique systeme d'authentification de Campus-Bordes pour le dashboard admin, l'application mobile Expo et la version web mobile. Supabase reste le stockage des donnees metier et des PDF, mais l'application cliente ne doit plus utiliser un jeton Supabase utilisateur pour les operations protegees.

Le resultat attendu couvre:

- inscription et connexion par email/mot de passe;
- connexion Google sur web et mobile;
- session persistante et deconnexion;
- recuperation de mot de passe;
- roles `student` et `admin`;
- protection des achats, du portefeuille, des PDF prives et des routes admin;
- conservation des donnees Supabase existantes.

## Options et decision

### Option 1: conserver Supabase Auth

Modification faible, mais elle maintient deux systemes d'authentification, ne repond pas a la demande produit et conserve les appels Supabase directs depuis le mobile.

### Option 2: Better Auth seulement pour Google

Migration plus courte, mais email/mot de passe et Google creeraient des sessions de natures differentes. La gestion des utilisateurs, des roles et des erreurs resterait fragmentee.

### Option 3: Better Auth unique avec API metier protegee

Option retenue. Better Auth devient la source de verite pour l'identite et les sessions. Le serveur Next.js verifie chaque session puis accede a Supabase avec des secrets exclusivement serveur. Cette option demande plus de migration, mais produit une architecture coherente et exploitable en production.

## Architecture cible

### Serveur d'authentification

L'application `admin-app` expose Better Auth sous `/api/auth`. La base Better Auth doit utiliser PostgreSQL Supabase via une connexion serveur, afin que les sessions et utilisateurs ne dependent plus du fichier SQLite local. La meme instance sert les administrateurs et les etudiants.

Better Auth active:

- email et mot de passe;
- Google OAuth;
- plugin Expo pour les cookies et retours par deep link;
- role utilisateur avec valeur initiale `student`;
- plugin admin pour les controles de role;
- origines de confiance pour le web local, le domaine de production et `campus-bordes://`.

Les secrets Better Auth, Google et Supabase service-role restent uniquement dans `admin-app/.env.local` ou dans les variables du fournisseur d'hebergement.

### Client Expo

Le client utilise le SDK Better Auth avec l'integration Expo. Les cookies de session sont conserves dans `expo-secure-store` sur mobile et dans le mecanisme web compatible fourni par le client Better Auth.

Le flux Google ouvre le navigateur systeme, revient vers `campus-bordes://auth/callback`, puis recharge la session Better Auth. Le redirect URI Google pointe vers le callback Better Auth du serveur, et non vers Supabase Auth.

Le client n'enregistre plus de `refresh_token` Supabase et ne construit plus d'URL `/auth/v1/authorize` Supabase.

### API metier

Les operations protegees passent par des routes Next.js sous `/api/mobile`:

- `GET /api/mobile/me`: profil et portefeuille;
- `GET /api/mobile/library`: achats PDF et packs;
- `POST /api/mobile/purchases/pdf/:id`;
- `POST /api/mobile/purchases/pack/:id`;
- `POST /api/mobile/wallet/topup` pour le simulateur MVP;
- `GET /api/mobile/wallet/transactions`;
- `POST /api/mobile/pdf/signed-url` pour la lecture autorisee;
- routes d'assistant PDF protegees par la meme session.

Chaque route appelle un helper unique qui:

1. recupere et valide la session Better Auth;
2. refuse l'acces avec `401` sans session;
3. controle le role lorsqu'il s'agit d'une action admin;
4. resout l'identifiant metier de l'utilisateur;
5. appelle Supabase avec la cle service-role uniquement cote serveur.

## Identite et donnees Supabase

Better Auth genere son propre identifiant utilisateur. Les tables metier ne doivent pas dependre de `auth.users` de Supabase.

Une table `app_users` devient le lien stable:

- `id`: UUID metier interne;
- `better_auth_user_id`: identifiant Better Auth unique;
- `email`: email normalise et unique;
- `name`, `role`, `university`, `faculty`, `level`;
- `legacy_supabase_user_id`: nullable, utilise pendant la migration;
- dates de creation et modification.

Les portefeuilles, achats, transactions et droits de lecture referencent `app_users.id`. Lors de la premiere connexion, le serveur cherche d'abord un utilisateur par `better_auth_user_id`, puis par email pour rattacher les donnees existantes. Il ne cree un nouveau profil que si aucun rattachement fiable n'existe.

La migration SQL est additive avant toute suppression: creation de `app_users`, ajout des nouvelles references, copie et verification des donnees, puis bascule des routes. Les anciennes colonnes restent temporairement disponibles pour retour arriere.

## Flux fonctionnels

### Email et mot de passe

L'inscription Better Auth cree l'identite. Un hook serveur cree ou rattache ensuite `app_users` et initialise le portefeuille. La connexion recharge `/api/mobile/me`. Les erreurs sont converties en messages utilisateur courts, sans exposer la reponse brute du serveur.

### Google OAuth

Le mobile demande a Better Auth de demarrer Google avec un callback vers le deep link Expo. Google revient d'abord sur `/api/auth/callback/google`, Better Auth cree la session, puis redirige vers `campus-bordes://auth/callback`. L'application recharge ensuite la session et les donnees metier.

### Lecture d'un PDF

Le mobile demande une URL signee a l'API. Le serveur verifie la session et confirme que le PDF est gratuit, achete directement ou inclus dans un pack achete. Il renvoie une URL courte duree. Le bucket reste prive et aucun bouton de telechargement permanent n'est expose.

## Securite et restrictions

- aucun secret dans le bundle Expo;
- aucune cle service-role dans `EXPO_PUBLIC_*`;
- controles d'autorisation cote serveur pour chaque operation privee;
- validation des payloads avec Zod;
- URLs signees courtes;
- limitation de debit Better Auth et des routes sensibles;
- CORS et `trustedOrigins` limites aux origines connues;
- cookies securises en production;
- journalisation des achats, recharges et actions admin;
- role admin impossible a choisir a l'inscription.

Les secrets deja partages pendant le developpement devront etre renouveles avant une mise en production.

## Erreurs et disponibilite

Le client distingue `401` (reconnexion), `403` (action interdite), `409` (achat deja effectue ou conflit), `422` (donnees invalides) et `5xx` (service indisponible). Une session invalide est effacee localement. Les donnees publiques du catalogue peuvent rester visibles hors connexion, mais achats, portefeuille, lecture privee et IA exigent une session valide.

## Strategie de migration

1. Brancher Better Auth sur PostgreSQL et generer son schema.
2. Ajouter l'integration Expo, les origines de confiance et le deep link.
3. Creer `app_users` et migrer les references metier de facon additive.
4. Ajouter le helper de session et les routes `/api/mobile`.
5. Remplacer `supabaseAuth.ts` par le client Better Auth.
6. Remplacer les appels Supabase directs de `pdfApi.ts` par l'API metier.
7. Tester email, Google, session, role, achat, portefeuille et lecture PDF.
8. Desactiver les anciens flux Supabase Auth apres verification des donnees.

## Verification

Les tests minimaux sont:

- typecheck Expo et admin;
- tests unitaires du rattachement utilisateur et des autorisations PDF;
- tests d'integration des routes avec session absente, etudiant et admin;
- test manuel web email/mot de passe;
- test manuel Expo Go Android du deep link Google;
- redemarrage de l'app avec session persistante;
- tentative d'acces a un PDF non achete;
- verification qu'aucun secret serveur n'apparait dans le bundle mobile.

## Hors perimetre de cette migration

- remplacement de Supabase Database ou Storage;
- paiement Mobile Money reel;
- authentification hors ligne;
- refonte visuelle generale;
- suppression immediate des donnees d'authentification historiques.

