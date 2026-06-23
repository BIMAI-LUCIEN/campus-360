# Review produit - Campus-Bordes

## Diagnostic PM

Le PRD initial etait trop large pour un premier lancement. La meilleure trajectoire est de
concentrer l'application sur Campus-Bordes : un produit clair, mesurable et centre sur les PDF
academiques. Cela reduit les risques de moderation, d'operations terrain et de securite.

## Positionnement

Promesse simple :

> Trouver, acheter et reviser des bordes PDF fiables depuis son telephone.

Le wallet reste un moyen de paiement interne valide par le backend. Il ne devient pas un produit
financier independant.

## MVP prioritaire

1. Auth etudiant + profil campus.
2. Dashboard admin PDF.
3. Upload, analyse, preview, publication et archivage des PDF.
4. Catalogue mobile avec recherche et filtres.
5. Achat PDF via wallet serveur atomique.
6. Bibliotheque "Mes PDF" et lecture securisee.
7. Assistant IA limite au contenu/metadonnees du PDF.

## Hors scope maintenant

- Toute fonctionnalite qui ne sert pas directement l'achat, la lecture ou la gestion de PDF.
- Les experiences sociales, commerciales ou evenementielles.
- Les workflows partenaires qui demanderaient une nouvelle operation terrain.
- Les recommandations complexes par filiere avant d'avoir assez de donnees PDF.

## Fonctionnalites a garder

- Catalogue PDF.
- Recherche et filtres.
- Preview gratuite.
- Achat avec wallet PDF.
- Mes PDF achetes.
- Historique des transactions PDF.
- Admin web PDF.
- Analyse IA/admin et assistant d'etude.

## Risques importants

- Wallet : ne jamais faire confiance au client mobile pour modifier `balance_coins`.
- PDF : proteger les liens, limiter le partage public, watermark des previews.
- Paiement : l'integration directe MTN/Orange peut prendre du temps. Un agregateur local peut
  couter plus cher par transaction mais reduire fortement le delai de lancement.
- Qualite catalogue : sans bons PDF, l'app n'a pas de valeur. Le sourcing et la verification sont
  aussi importants que le code.

## Monetisation realiste

- Commission PDF : 15% a 20%.
- Packs par matiere ou semestre.
- Abonnement etudiant seulement apres validation du paiement a l'acte.
- Offre tuteur/enseignant : statistiques de ventes et revenus.

## Indicateurs a suivre

- Activation : compte cree + premiere preview.
- Conversion : taux preview vers achat.
- Catalogue : PDF publies par matiere, taux de recherche sans resultat.
- Revenus : ventes, panier moyen, commission.
- Retention : etudiants qui reviennent dans "Mes PDF".
