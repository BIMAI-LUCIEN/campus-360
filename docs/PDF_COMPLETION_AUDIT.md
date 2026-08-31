# Audit complet - Module PDF Campus-Bordes

Date : 17 juin 2026

## Statut actuel

Le module PDF est maintenant structure en trois niveaux :

- mobile etudiant : catalogue, recherche, filtres, preview, achat simule, bibliotheque.
- admin web local : ajout, modification, publication, suppression, statistiques, export JSON.
- backend cible : schema Supabase, RLS, RPC d'achat, client API mobile, adaptateur admin.

## Ce qui est fait

- [x] Type `CampusDocument` enrichi.
- [x] Donnees PDF mockees plus proches du modele final.
- [x] Ecran mobile dedie `PdfStudentSection`.
- [x] Recherche mobile par titre, matiere, prof, filiere, universite.
- [x] Filtres mobile par matiere et niveau.
- [x] Onglets mobile `Catalogue` et `Mes PDF`.
- [x] Preview gratuite filigranee.
- [x] Achat simule avec debit wallet local.
- [x] Bibliotheque achetee simulee.
- [x] Dashboard admin web local.
- [x] Formulaire admin complet pour ajouter un PDF.
- [x] Statuts admin : draft, published, archived.
- [x] Filtres admin.
- [x] Export JSON admin.
- [x] Schema Supabase PDF.
- [x] Policies RLS de base.
- [x] Fonction serveur `purchase_document`.
- [x] Fonction serveur `record_document_event`.
- [x] Client API mobile REST sans dependance lourde.
- [x] Adaptateur admin Supabase REST.
- [x] `.env.example`.

## Ce qui manque encore avant production

- [ ] Creer ton projet Supabase.
- [ ] Ajouter les variables `.env`.
- [ ] Executer `docs/PDF_SUPABASE.sql`.
- [ ] Creer les buckets Supabase Storage :
  - `documents`
  - `document-previews`
- [ ] Configurer les policies Storage.
- [ ] Creer ton utilisateur admin.
- [ ] Mettre son role `admin` dans `profiles`.
- [ ] Brancher le dashboard web local a Supabase avec `admin/pdf-supabase-adapter.js`.
- [ ] Remplacer le localStorage admin par Supabase.
- [ ] Brancher l'app mobile a `listPublishedPdfDocuments`.
- [ ] Brancher l'achat mobile a `purchasePdfDocument`.
- [ ] Ajouter auth mobile.
- [ ] Ajouter lecture PDF reelle.
- [ ] Ajouter telechargement hors-ligne.
- [ ] Ajouter generation automatique de preview.
- [ ] Ajouter watermark serveur.
- [ ] Ajouter dashboard analytics admin.

## Blocages qui demandent tes informations

Je peux continuer sans question jusqu'au branchement visuel, mais pour connecter reellement Supabase
il faudra :

- URL publique Supabase.
- Anon key Supabase.
- Un compte admin ou un access token admin pour tester le dashboard.
- Decision sur l'auth du MVP : telephone OTP ou email/mot de passe.
- Decision sur la lecture PDF : ouvrir le PDF dans le lecteur systeme ou lecteur integre dans l'app.

## Recommendation

Pour budget reduit, fais cette sequence :

1. Supabase Free.
2. Auth email/mot de passe pour l'admin.
3. Auth telephone pour etudiants plus tard si OTP coute trop cher au debut.
4. Upload manuel des PDF par toi via dashboard admin.
5. Preview manuelle au debut.
6. Generation automatique de preview/watermark en phase 2.
