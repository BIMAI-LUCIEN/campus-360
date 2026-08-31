# Formulaire de connexion étudiant

## Objectif

Simplifier l’accès au compte étudiant avec un formulaire de connexion classique, immédiatement compréhensible, sans navigation par onglets.

## En-tête

- Quand l’étudiant est déconnecté, le bouton de l’en-tête affiche uniquement `Connexion`.
- Le libellé secondaire `Compte` disparaît dans cet état.
- Quand l’étudiant est connecté, l’affichage actuel du wallet et du solde est conservé.

## Formulaire principal

La modale s’ouvre par défaut en mode connexion et présente les éléments dans cet ordre :

1. titre `Connexion` et texte d’aide ;
2. champ `Email` ;
3. champ `Mot de passe` ;
4. lien `Mot de passe oublié ?` ;
5. bouton principal `Se connecter` ;
6. séparateur `ou` ;
7. bouton `Continuer avec Google` ;
8. lien secondaire `Pas encore de compte ? Créer un compte` ;
9. action discrète pour fermer la modale.

Les onglets `Compte`, `Créer`, `OTP` et `Oublié` sont supprimés. Le mode OTP n’est plus exposé dans cette interface.

## Création de compte

Le lien `Créer un compte` remplace le formulaire par un écran d’inscription contenant :

- nom affiché ;
- email ;
- mot de passe avec indication de huit caractères minimum ;
- bouton principal `Créer mon compte` ;
- lien `Déjà un compte ? Se connecter`.

Le bouton Google reste disponible sur l’écran d’inscription.

## Mot de passe oublié

Le lien dédié ouvre un écran simple avec le champ email, une courte explication et le bouton `Envoyer le lien`. Un lien `Retour à la connexion` permet de revenir sans perdre inutilement l’adresse saisie.

## États et retours

- Pendant une requête, les actions d’authentification sont désactivées et le bouton principal affiche un état d’attente lisible.
- Les messages de succès et d’erreur existants sont conservés.
- Les fonctions d’authentification Supabase existantes restent inchangées.
- Tous les éléments interactifs gardent une zone tactile d’au moins 44 points.

## Validation

- Vérifier les trois parcours : connexion, création de compte et réinitialisation du mot de passe.
- Vérifier le retour entre les écrans et l’ouverture de Google.
- Vérifier l’affichage mobile et web, notamment à environ 375 px de largeur.
- Exécuter la vérification TypeScript du projet.
