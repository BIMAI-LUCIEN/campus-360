# Campus 3602 Admin PDF

Dashboard web Next.js pour gerer les PDF de Campus 3602.

## Lancer en local

```powershell
cd "C:\Users\MELAGO NATHAN\Documents\campus 360\admin-app"
npm.cmd install
npm.cmd run dev
```

URL locale :

```text
http://localhost:3001/admin/login
```

Compte de developpement :

```text
Email: admin@campus360.local
Mot de passe: Admin123456!
```

Au premier lancement, cree le compte avec ce formulaire. Le bouton de creation appelle ensuite
`/api/bootstrap-admin` pour donner le role `admin` uniquement si l'email et le mot de passe
correspondent aux variables `.env.local`.

## Ce qui est fonctionnel

- Authentification email/mot de passe avec Better Auth.
- Role admin stocke en base, avec page `/admin/forbidden` pour les comptes non admin.
- Middleware Next.js qui renvoie les pages `/admin/*` vers `/admin/login` sans cookie de session.
- Protection serveur des pages admin et des API PDF.
- Better Auth et sessions stockes dans PostgreSQL Supabase.
- Base locale SQLite `campus360-admin.sqlite` conservee pour le catalogue de travail admin.
- Tables metier : profils, wallets, cours, PDF, achats PDF, transactions wallet, logs admin.
- Tables Better Auth PostgreSQL : `user`, `session`, `account`, `verification`, `rateLimit`.
- Dashboard admin web : stats, recherche, filtres, table responsive.
- Analyse automatique du PDF cote navigateur pour pre-remplir titre, description, universite,
  faculte, matiere, niveau, enseignant, annee et nombre de pages.
- Upload PDF admin vers `public/uploads/pdfs`.
- Creation automatique de cours si le couple matiere/niveau/universite/faculte n'existe pas.
- Publication, brouillon, archivage et suppression de PDF.
- API catalogue admin : `GET /api/pdf`.
- API creation PDF : `POST /api/pdf`.
- API changement de statut : `PATCH /api/pdf/:id/status`.
- API suppression : `DELETE /api/pdf/:id`.
- API mobile protegee : compte, wallet, achats PDF/packs, evenements et URLs signees.
- Comptes etudiant Better Auth partages entre web, mobile et admin.
- Migration automatique des anciens comptes admin SQLite vers PostgreSQL.
- Lecture des PDF depuis le bucket Supabase prive avec controle d'achat serveur.
- Assistant PDF OpenRouter protege par la session Better Auth.

## Ce qui reste avant production

- Remplacer l'analyse heuristique cote navigateur par une analyse serveur plus robuste si le
  volume de PDF devient eleve.
- Ajouter la moderation/validation avant publication publique.
- Ajouter les paiements Mobile Money pour alimenter le wallet.
- Ajouter des tests automatises API et droits admin.
- Deployer le serveur sous une URL HTTPS stable pour Google OAuth sur telephone.

## Variables a remplacer plus tard

```text
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
ADMIN_BOOTSTRAP_EMAIL=
ADMIN_BOOTSTRAP_PASSWORD=
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SMTP_USER=
SMTP_PASSWORD=
```

Pour le budget reduit, Supabase stocke PostgreSQL et les PDF. Better Auth reste l'unique source
d'identite et utilise cette meme base.

## Google OAuth pour l'admin

Better Auth gere le login Google cote dashboard admin. Pour que ce flux marche :

1. Active Google OAuth dans Google Cloud Console.
2. Ajoute comme URI de redirection locale :

```text
http://localhost:3001/api/auth/callback/google
```

3. Ajoute aussi l'URL de production de l'admin sous la meme forme :

```text
https://ton-domaine.com/api/auth/callback/google
```

4. Garde `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `admin-app/.env.local`.

Sur un telephone, `localhost` pointe vers le telephone. Il faut donc deployer `admin-app` sous une
URL HTTPS stable, mettre cette URL dans `BETTER_AUTH_URL` et `EXPO_PUBLIC_AUTH_URL`, puis autoriser :

```text
https://ton-domaine.com/api/auth/callback/google
```

## Recuperation de mot de passe

Le flux mobile revient dans l'application avec `campus-3602://reset-password`. Pour envoyer les
emails avec Gmail a cout nul, active la validation en deux etapes Google puis cree un mot de passe
d'application. Configure ensuite `SMTP_USER`, `SMTP_PASSWORD` et `SMTP_FROM` dans `.env.local`.
