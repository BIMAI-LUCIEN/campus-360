# Campus 360

Campus 360 est un MVP Expo SDK 54 / React Native centre sur un seul produit : une
bibliotheque de PDF academiques pour les etudiants.

## Objectif produit

- Permettre aux admins d'ajouter, analyser, publier et archiver des PDF.
- Permettre aux etudiants de rechercher, filtrer, preview, acheter et lire les PDF.
- Garder le wallet uniquement comme moyen de paiement des PDF.
- Brancher le tout sur Supabase Auth, PostgreSQL, Storage, RLS et fonctions serveur.

## Ce qui est deja code

- App mobile PDF-only : catalogue, filtres, preview, achat, bibliotheque "Mes PDF" et assistant IA.
- Compte etudiant : connexion, creation de compte, synchronisation des achats et du solde.
- Wallet PDF : solde, recharge, historique et debit via fonction serveur.
- Dashboard admin local : ajout et publication de PDF dans `admin/pdf-dashboard.html`.
- Dashboard admin Next.js dans `admin-app/` avec auth, roles admin, upload PDF et API protegees.
- Schema Supabase PDF dans `docs/PDF_SUPABASE.sql`.
- Guide de branchement Supabase PDF dans `docs/PDF_SUPABASE_SETUP.md`.
- Audit PDF dans `docs/PDF_COMPLETION_AUDIT.md`.

## Dashboard admin PDF

Ouvre ce fichier dans ton navigateur pour gerer les PDF localement :

```text
admin/pdf-dashboard.html
```

Ce dashboard permet d'ajouter un PDF, renseigner ses metadonnees, le publier, le remettre en
brouillon, le supprimer, filtrer le catalogue et exporter les donnees JSON.

Un adaptateur Supabase est pret dans `admin/pdf-supabase-adapter.js`, mais il attend tes
informations Supabase pour remplacer le stockage local.

## Dashboard admin web Next.js

Une version MVP plus complete existe dans `admin-app/` :

```powershell
cd "C:\Users\MELAGO NATHAN\Documents\campus 360\admin-app"
npm.cmd install
npm.cmd run dev
```

Puis ouvre :

```text
http://localhost:3001/admin/login
```

Compte de test local :

```text
admin@campus360.local
Admin123456!
```

Cette version inclut Better Auth, roles admin, restrictions serveur, SQLite, upload PDF,
catalogue admin, publication/brouillon/archivage/suppression et API PDF protegees.

## Lancer le projet

```bash
npm.cmd install
npm.cmd run start
```

Sur Windows PowerShell, si `npm` ou `npx` est bloque par la policy de scripts, utilise
`npm.cmd` et `npx.cmd`, ou lance :

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Scripts utiles

```bash
npm.cmd run typecheck
npm.cmd run android
npm.cmd run web
```

## Prochaine vraie etape

Brancher Supabase de bout en bout : auth etudiant, Postgres avec RLS, Storage PDF/previews,
fonctions serveur pour achat/recharge, puis lecture PDF complete via URL signee.
# campus-360
