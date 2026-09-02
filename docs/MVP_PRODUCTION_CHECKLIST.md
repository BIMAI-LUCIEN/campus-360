# Checklist MVP de production

## Avant le déploiement

- Exécuter `npm run mvp:migrate` depuis `recruiter-web` sur une sauvegarde récente de PostgreSQL.
- Définir `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `MAIL_FROM`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sur les deux serveurs.
- Renouveler les anciens secrets Better Auth, Cloudinary et Supabase qui ont déjà été présents dans l’historique Git.
- Vérifier qu’un Chromium est disponible via Puppeteer, `PUPPETEER_EXECUTABLE_PATH` ou `CHROME_BIN`.
- Configurer une adresse `MAIL_FROM` sur un domaine vérifié dans Resend.
- Activer les sauvegardes quotidiennes PostgreSQL et tester une restauration avant l’ouverture au public.

## Matrice de recette

- Tester création, sauvegarde, réouverture et suppression pour CV, lettre, rapport de stage et mémoire.
- Vérifier Gratuit : aperçu filigrané, PDF et Word refusés.
- Vérifier Basique : PDF filigrané, Word refusé.
- Vérifier Pro : PDF sans filigrane, Word refusé.
- Vérifier Elite : PDF et Word sans filigrane.
- Vérifier la liste des stages, la recherche, une candidature, sa réouverture et la modification de statut après redémarrage.
- Vérifier réinitialisation du mot de passe et réception effective de l’email.
- Vérifier `/api/health` après chaque déploiement et déclencher une alerte externe en cas de réponse non-200.

## Après le déploiement

- Contrôler les erreurs serveur et les latences au moins quotidiennement pendant la phase pilote.
- Vérifier chaque jour les sauvegardes et chaque semaine une restauration sur une base isolée.
- Conserver un compte de recette par offre sans utiliser de compte réel étudiant.
