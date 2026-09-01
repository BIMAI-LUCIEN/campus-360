# Campus-Bordes Goals

> **Document historique pour le module PDF.** Ces objectifs restent valides pour la sécurité et la qualité du catalogue, mais ne définissent plus seuls le périmètre de Campus 360. La hiérarchie produit actuelle est définie dans `docs/context.md` : stages en priorité, atelier de documents, puis ressources académiques.

## Mission

Campus-Bordes doit devenir une app simple et fiable pour trouver, preview, acheter et lire des PDF academiques. Le produit reste volontairement concentre sur les PDF.

## North Stars

- Un etudiant peut passer de l'installation a la premiere preview PDF en moins de 3 minutes.
- Un etudiant connecte peut acheter un PDF et le retrouver dans "Mes PDF" sans assistance.
- Un admin peut publier un PDF complet avec metadonnees, fichier, preview et statut en moins de 5 minutes.
- Aucun PDF payant complet n'est lisible sans achat valide.

## Anti-Stars

- Revenir a une app generaliste avec trop de modules hors PDF.
- Montrer des textes techniques ou internes a l'utilisateur final.
- Simuler un achat sans trace serveur quand l'app est branchee a Supabase.
- Exposer des liens publics vers les PDF complets.
- Ajouter de nouvelles fonctionnalites avant que le parcours PDF principal soit stable.

## Directives

1. Stabiliser le parcours achat PDF
   - Steer: increase
   - Target: achat Supabase fonctionnel, solde mis a jour, achat visible dans "Mes PDF".
   - Done when: `purchasePdfDocument` est utilise de bout en bout par l'app mobile avec gestion des erreurs.

2. Finaliser l'auth et la session etudiant
   - Steer: increase
   - Target: email/password, OTP email, reset password et Google OAuth utilisables avec persistence de session.
   - Done when: un utilisateur ferme puis rouvre l'app et reste connecte si le token est valide.

3. Rendre le lecteur PDF utilisable
   - Steer: increase
   - Target: preview claire, lecture achetee claire, chargement propre, erreurs lisibles.
   - Done when: l'utilisateur distingue toujours preview gratuite et PDF complet achete.

4. Renforcer l'admin PDF
   - Steer: increase
   - Target: upload fichier complet, preview, metadonnees, publication, archivage et validation formulaire.
   - Done when: un PDF publie depuis l'admin apparait dans le catalogue mobile sans retouche manuelle.

5. Supprimer la friction UI
   - Steer: decrease
   - Target: moins de textes inutiles, controles visibles, actions courtes, etats vides propres.
   - Done when: le premier ecran affiche directement recherche, filtres et PDF sans bloc marketing.

6. Mesurer l'activation produit
   - Steer: increase
   - Target: mesurer recherche, preview, achat, lecture et abandon.
   - Done when: les evenements principaux sont journalises avec document_id et user_id quand disponible.

## Gates

| Gate | Type | Weight | Check | Purpose |
| --- | --- | ---: | --- | --- |
| mobile-typecheck | quality | 8 | `npm.cmd run typecheck` | Le code Expo compile sans erreur TypeScript. |
| admin-typecheck | quality | 8 | `cd admin-app; npm.cmd run typecheck` | Le dashboard admin compile sans erreur TypeScript. |
| pdf-only-scope | architecture | 7 | Review App.tsx and src/features for non-PDF modules | L'app reste centree sur catalogue, achat, lecture PDF et compte. |
| supabase-security | security | 10 | Review docs/PDF_SUPABASE.sql and storage policies | Les PDF complets sont proteges par achat et session. |
| onboarding-short | product | 5 | Manual app review | L'onboarding tient en 3 etapes maximum et n'empeche pas l'acces au catalogue. |
| user-copy-clean | product | 5 | Manual app review | Aucun texte technique inutile n'apparait dans l'interface etudiant. |
| purchase-flow-real | product | 10 | Manual Supabase purchase test | Achat, transaction wallet et bibliotheque fonctionnent sur donnees reelles. |
| admin-publish-flow | product | 9 | Manual admin upload test | Un admin publie un PDF et le voit dans l'app mobile. |

## Feature Backlog

### P0 - Produit utilisable

- Paiement ou wallet reel branche au serveur.
- "Mes PDF" connecte aux achats Supabase.
- Session etudiant persistante et refresh token.
- Lecture PDF par URL signee seulement.
- Admin upload complet vers Supabase Storage.
- RLS verifiee sur documents, previews, achats, wallet.

### P1 - Produit confortable

- Generation automatique de preview avec watermark.
- Favoris ou "A lire plus tard".
- Tri par recents, prix, populaire.
- Reprise de lecture ou dernier PDF ouvert.
- Etats vides et erreurs plus specifiques.
- Notifications email simples apres achat.

### P2 - Croissance et pilotage

- Analytics: recherches, previews, achats, lectures.
- Dashboard admin revenus et conversions.
- Recommandations par filiere/matiere.
- Coupons ou credits de lancement.
- Moderation/controle qualite des PDF.

## Current Fitness Snapshot

The `ao goals` CLI is not available in this environment, so automated goal measurement could not run yet.

Manual status:

- Passing: mobile typecheck was previously verified.
- Passing: admin typecheck was previously verified.
- Partial: PDF-only scope is implemented but should be guarded during future changes.
- Partial: Supabase schema and policies exist, but a live end-to-end purchase test is still needed.
- Partial: auth UI exists, but Google OAuth provider and callback configuration must be verified in Supabase.
- Partial: analytics events are captured and the admin analytics page exists; live Supabase data still needs an end-to-end test.
- Gap: real payment provider is not integrated.
