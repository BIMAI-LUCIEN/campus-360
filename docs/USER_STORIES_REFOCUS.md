# User Stories recentrees - Campus-Bordes

Date : 20 juin 2026

## Principe directeur

Campus-Bordes n'est pas une super-app. Le coeur du produit est :

> trouver, acheter, lire et reviser des PDF academiques.

La page d'accueil doit seulement vendre cette promesse et envoyer vite vers le catalogue ou la bibliotheque.

## User stories coeur - etudiant

1. En tant qu'etudiant, je veux comprendre en quelques secondes que l'app sert a trouver et lire des PDF academiques.
2. En tant qu'etudiant, je veux explorer les PDF par universite, filiere, niveau et matiere.
3. En tant qu'etudiant, je veux voir un apercu avant achat.
4. En tant qu'etudiant, je veux acheter un PDF ou un pack avec mon wallet.
5. En tant qu'etudiant, je veux retrouver mes achats dans une bibliotheque simple.
6. En tant qu'etudiant, je veux lire un PDF dans l'app sans lien public ouvert.
7. En tant qu'etudiant, je veux utiliser un assistant IA pour resumer, quizzer et guider ma revision.
8. En tant qu'etudiant, je veux consulter mon solde et mes transactions sans que cela prenne le dessus sur la home.

## User stories coeur - admin

1. En tant qu'admin, je veux ajouter un ou plusieurs PDF rapidement.
2. En tant qu'admin, je veux laisser l'IA pre-remplir titre, resume, tags, niveau, matiere et prix suggere.
3. En tant qu'admin, je veux corriger ce qui manque puis publier.
4. En tant qu'admin, je veux regrouper les PDF en packs logiques.
5. En tant qu'admin, je veux publier, repasser en review, archiver ou supprimer PDF et packs.
6. En tant qu'admin, je veux suivre ventes, previews, achats et usage IA.

## Ce qui ne doit pas polluer l'accueil

- historique detaille
- conseils IA multiples
- trop de KPIs
- trop de cartes wallet
- trop de cartes packs secondaires
- surfaces qui ressemblent a un dashboard interne

## Structure produit recommandee

### Accueil
- promesse produit
- CTA catalogue
- CTA bibliotheque / connexion
- un seul pack recommande maximum

### Explorer
- recherche
- filtres
- packs
- catalogue PDF

### Bibliotheque
- achats
- lecture
- assistant IA

### Compte
- wallet
- sync
- auth
- historique

## Regle UX

Si un bloc ne sert pas a faire comprendre, explorer, acheter ou lire un PDF, il ne doit pas etre prioritaire sur l'accueil.
