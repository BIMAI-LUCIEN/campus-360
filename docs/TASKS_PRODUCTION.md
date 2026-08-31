# Campus-Bordes - Taches de production

Objectif : livrer une application mobile etudiante et un dashboard web admin dedies aux PDF
academiques. Les autres modules restent hors scope.

## 1. Architecture generale

- [ ] Garder l'application etudiant en mobile Expo/React Native.
- [ ] Garder le dashboard admin web separe dans `admin-app/`.
- [ ] Utiliser Supabase comme backend initial : Auth, PostgreSQL, Storage, Edge Functions.
- [ ] Separer les roles : `student`, `tutor`, `admin`.
- [ ] Creer un environnement `dev`, puis plus tard `production`.
- [ ] Ajouter les fichiers `.env` pour les cles Supabase.
- [ ] Ne jamais exposer la cle service Supabase dans le mobile.
- [ ] Documenter toutes les regles PDF dans `docs/`.

## 2. Base de donnees

- [ ] Creer la table `profiles`.
- [ ] Creer la table `wallets`.
- [ ] Creer la table `wallet_transactions`.
- [ ] Creer la table `documents`.
- [ ] Creer la table `document_purchases`.
- [x] Creer la table `document_events`.
- [ ] Creer la table `document_reviews`.
- [ ] Creer la table `admin_audit_logs`.
- [ ] Ajouter les index pour recherche PDF : titre, universite, faculte, niveau, matiere.
- [ ] Activer RLS sur toutes les tables.
- [ ] Ecrire les policies RLS par role.
- [ ] Creer des triggers pour `created_at` et `updated_at`.
- [ ] Creer des fonctions SQL atomiques pour achat PDF et recharge wallet.
- [x] Creer la fonction SQL `record_document_event`.

## 3. Authentification

- [ ] Choisir auth telephone OTP ou email/mot de passe pour le MVP.
- [ ] Configurer Supabase Auth.
- [ ] Creer l'ecran inscription mobile.
- [ ] Creer l'ecran connexion mobile.
- [ ] Creer l'ecran profil : nom, universite, filiere, niveau.
- [ ] Ajouter la recuperation de session au lancement de l'app.
- [ ] Creer la connexion admin web.
- [ ] Bloquer le dashboard web aux roles `admin`.
- [ ] Ajouter une page "acces refuse" si l'utilisateur n'est pas admin.

## 4. Gestion des PDF par l'admin

- [ ] Creer un bucket Supabase Storage `documents`.
- [ ] Creer un bucket `document-previews`.
- [ ] Creer une page admin "Documents".
- [ ] Ajouter un bouton "Ajouter un PDF".
- [ ] Creer un formulaire admin : titre, description, universite, filiere, niveau, matiere, professeur, annee, prix, fichier et statut.
- [ ] Uploader le PDF dans Supabase Storage.
- [ ] Enregistrer le path dans la table `documents`.
- [ ] Generer une preview de premiere page.
- [ ] Ajouter un watermark sur la preview.
- [ ] Permettre de modifier un PDF existant.
- [ ] Permettre de depublier un PDF.
- [ ] Permettre d'archiver ou supprimer un PDF.
- [ ] Afficher le nombre de ventes par PDF.
- [ ] Afficher le revenu genere par PDF.
- [ ] Ajouter un filtre admin par universite, filiere, niveau, matiere.
- [ ] Ajouter une recherche admin par titre, professeur ou matiere.

## 5. PDF cote etudiant mobile

- [ ] Finaliser l'ecran catalogue PDF.
- [ ] Ajouter les filtres : universite, filiere, niveau, matiere.
- [ ] Ajouter la recherche.
- [ ] Afficher la preview gratuite.
- [ ] Afficher le prix.
- [ ] Ajouter le bouton "Acheter".
- [ ] Verifier le solde avant achat.
- [ ] Debiter le wallet via une fonction serveur.
- [ ] Creer une ligne dans `document_purchases`.
- [ ] Donner acces au PDF seulement apres achat.
- [ ] Telecharger le PDF pour lecture hors-ligne.
- [ ] Ajouter "Mes PDF achetes".
- [ ] Ajouter une note apres achat.
- [ ] Empecher l'acces direct public aux PDF payants.

## 6. Wallet PDF

- [ ] Afficher le solde dans la coque mobile.
- [ ] Afficher l'historique des transactions PDF.
- [ ] Creer une demande de recharge.
- [ ] Integrer MTN MoMo via agregateur ou validation manuelle au debut.
- [ ] Integrer Orange Money via agregateur ou validation manuelle au debut.
- [ ] Creer une page admin "Recharges".
- [ ] Permettre a l'admin de valider une recharge manuelle.
- [ ] Creer une fonction serveur `topup_wallet`.
- [ ] Creer une fonction serveur `purchase_document`.
- [ ] Empecher toute modification de solde depuis le mobile.
- [ ] Ajouter les retraits pour tuteurs plus tard.

## 7. Assistant IA PDF

- [ ] Limiter l'assistant aux PDF achetes.
- [ ] Envoyer le contexte document necessaire uniquement.
- [ ] Ajouter resume, quiz, plan de revision et explication de notion.
- [ ] Ajouter un message clair quand l'IA n'est pas configuree.
- [ ] Logger les erreurs serveur sans exposer de secrets.
- [ ] Ajouter une limite de requetes par utilisateur.

## 8. Dashboard admin web

- [ ] Finaliser login admin.
- [ ] Finaliser page documents PDF.
- [ ] Creer page ventes PDF.
- [x] Creer page analytics PDF.
- [ ] Creer page transactions wallet.
- [ ] Creer page recharges.
- [ ] Creer page retraits tuteurs.
- [ ] Creer page parametres : universites, filieres, niveaux, matieres.
- [ ] Ajouter audit log admin.
- [ ] Ajouter filtres, recherche, pagination.
- [ ] Ajouter confirmation avant suppression.
- [ ] Ajouter exports CSV.

## 9. Notifications

- [ ] Configurer Expo Push Notifications.
- [ ] Enregistrer le push token utilisateur.
- [ ] Envoyer notification apres achat PDF.
- [ ] Envoyer notification au tuteur quand son PDF est vendu.
- [ ] Envoyer notification recharge validee.
- [ ] Envoyer notification retrait paye.

## 10. Securite

- [ ] RLS obligatoire sur toutes les tables.
- [ ] Fonctions serveur pour toute operation d'argent.
- [ ] URLs signees pour les PDF.
- [ ] Validation cote serveur des prix.
- [ ] Audit logs pour actions admin.
- [ ] Rate limit pour auth, achats et assistant IA.
- [ ] Ne jamais stocker secrets dans le repo.
- [ ] Creer `.env.example`.
- [ ] Prevoir backup Supabase.

## 11. Tests

- [ ] Tester inscription/connexion.
- [ ] Tester profil complet/incomplet.
- [ ] Tester upload PDF admin.
- [ ] Tester achat PDF avec solde suffisant.
- [ ] Tester achat PDF avec solde insuffisant.
- [ ] Tester telechargement PDF achete.
- [ ] Tester acces refuse PDF non achete.
- [ ] Tester recharge wallet.
- [ ] Tester validation admin recharge.
- [ ] Tester droits admin.
- [ ] Tester app sur vrai telephone Android.

## 12. Deploiement

- [ ] Creer projet Supabase production.
- [ ] Creer buckets storage production.
- [ ] Deployer Edge Functions.
- [ ] Deployer dashboard admin sur Vercel ou Netlify.
- [ ] Creer build Android avec EAS.
- [ ] Tester APK interne.
- [ ] Publier sur Google Play quand stable.
- [ ] Differer iOS si budget reduit.

## 13. Ordre de developpement recommande

1. Backend Supabase : tables, RLS, storage.
2. Auth mobile + profil.
3. Dashboard admin web PDF.
4. Upload PDF admin.
5. Liste PDF mobile + achat PDF.
6. Wallet securise.
7. Recharges et validation admin.
8. Lecture PDF complete.
9. Assistant IA PDF.
10. Notifications.
11. Optimisation, tests terrain, publication.

## 14. Version MVP a livrer en premier

- [ ] Auth etudiant.
- [ ] Profil etudiant.
- [ ] Dashboard admin web.
- [ ] Ajout PDF par admin.
- [ ] Consultation PDF mobile.
- [ ] Achat PDF avec Coins.
- [ ] Wallet securise.
- [ ] Historique transactions.
- [ ] Recharges validees par admin.

Cette version suffit pour tester le marche PDF dans un campus sans disperser le produit.
