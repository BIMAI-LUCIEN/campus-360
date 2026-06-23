# Campus-Bordes - Module PDF

Ce module est maintenant le coeur unique de l'application Campus-Bordes.

## Objectif

- Admin web : ajouter, modifier, publier, archiver et supprimer les PDF.
- Mobile etudiant : rechercher, filtrer, preview gratuite, acheter et lire les PDF achetes.
- Backend cible : Supabase Auth, PostgreSQL, Storage, RLS et fonctions serveur.

## Ce qui est deja ajoute

- Dashboard admin web local : `admin/pdf-dashboard.html`.
- Dashboard admin Next.js : `admin-app/app/admin/pdf/page.tsx`.
- Ecran mobile PDF avance : `src/features/pdf/PdfStudentSection.tsx`.
- API mobile Supabase PDF : `src/features/pdf/pdfApi.ts`.
- Types PDF enrichis dans `src/types.ts`.

## Comment ajouter les PDF maintenant

1. Ouvre `admin/pdf-dashboard.html` dans ton navigateur.
2. Clique sur le formulaire "Ajouter un PDF".
3. Choisis ton fichier PDF.
4. Le dashboard analyse automatiquement les premieres pages et pre-remplit ce qu'il trouve.
5. Complete les champs manquants : titre, description, universite, filiere, matiere, professeur, niveau et annee.
6. Renseigne le prix en Coins, le statut et la commission.
7. Clique sur "Enregistrer PDF".
8. Mets le statut sur `Publie` quand le document doit apparaitre aux etudiants.

Important : le dashboard local stocke les donnees dans le navigateur avec `localStorage`. En
production, les fichiers PDF iront dans Supabase Storage et les donnees dans PostgreSQL.

## Workflow production PDF

1. L'admin se connecte au dashboard web.
2. L'admin ajoute un PDF.
3. Le dashboard upload le PDF dans le bucket Supabase `documents`.
4. Le dashboard genere ou ajoute une preview dans `document-previews`.
5. Le dashboard enregistre les metadonnees dans `documents`.
6. Si le statut est `published`, le PDF apparait dans l'app mobile.
7. L'etudiant ouvre Campus-Bordes.
8. Il filtre par universite, filiere, niveau ou matiere.
9. Il voit la premiere page filigranee.
10. Il achete avec Campus Coins.
11. Une fonction serveur verifie le solde et debite le wallet.
12. Une ligne est creee dans `document_purchases`.
13. L'etudiant obtient une URL signee ou un acces hors-ligne au PDF complet.
14. Les actions cles sont journalisees dans `document_events`.

## Regles metier

- Un PDF `draft` n'apparait pas aux etudiants.
- Un PDF `published` apparait dans le catalogue.
- Un PDF `archived` reste dans l'admin mais n'est plus vendu.
- L'etudiant peut voir seulement la preview avant achat.
- L'etudiant peut lire le PDF complet seulement apres achat.
- Le client mobile ne debite jamais le wallet directement en production.
- La commission Campus-Bordes est calculee au moment de la transaction.

## Priorite des prochaines taches PDF

1. Creer Supabase.
2. Executer le SQL de `docs/PDF_SUPABASE.sql`.
3. Creer les buckets `documents` et `document-previews`.
4. Brancher le dashboard admin web a Supabase.
5. Brancher l'app mobile a Supabase.
6. Ajouter lecture PDF native hors-ligne.
7. Ajouter generation automatique de preview/watermark.
8. Ajouter dashboard analytics admin : preview vers achat, achats par matiere, revenus par PDF.

## Limite actuelle

La partie analytics mobile envoie deja recherche, preview, achat, lecture et questions assistant vers
Supabase quand le backend est configure. L'admin peut lire ces chiffres dans `/admin/analytics`.
