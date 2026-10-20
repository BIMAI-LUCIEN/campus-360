# Environnements : Campus 360

> Noms et emplacements seulement. **Aucune valeur n'est écrite ici.** Modèle et règles : `~/.claude/skills/_shared/environments-template.md`.
> Dernière vérification : 2026-10-15 (noms relevés dans les fichiers, valeurs non lues).

## Environnements
| Nom | Usage | Où vivent les variables | Qui peut les modifier |
|---|---|---|---|
| local | développement sur le poste | `mobile-api/.env.local`, `.env.local` (racine, variables `EXPO_PUBLIC_*`), `recruiter-web/.env.local`, `landing-site/.env.local` | développeur |
| test | tests E2E | `.env.e2e.local` (racine) | développeur |
| production API | `api.campus360b.site` | fichier d'environnement du service sur le VPS (**chemin exact à confirmer**) et tableau de bord Vercel pour le projet mobile-api | utilisateur uniquement |
| production admin et site | `admin.campus360b.site`, site vitrine | tableau de bord Vercel (projets admin et landing) | utilisateur uniquement |
| production app mobile | build EAS | secrets EAS du projet `49ce85c3-c644-4a6c-a492-2596e5047c74` (owner `miguelvinijr237`) | utilisateur uniquement |

## Services et leurs variables
### mobile-api (backend, Next 15, port 3002)
- **Dossier :** `mobile-api/`
- **Modèle sans valeur :** `mobile-api/.env.example` (14 variables)
- **Fichier local :** `mobile-api/.env.local` (21 variables)
- **Variables requises :** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `OPENROUTER_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Variable d'e-mail :** `RESEND_API_KEY` (sans elle, la vérification d'e-mail est désactivée, voir tâche 23.11)
- **Variables de paiement :** `NOTCHPAY_PRIVATE_KEY`, `NOTCHPAY_WEBHOOK_SECRET` (absentes du modèle `.env.example` : voir `contexte-code.md` §9)
- **Variables de fichiers :** `FILES_SIGNING_SECRET`, `FILES_PUBLIC_URL`, `UPLOAD_ROOT` (absentes du modèle : voir `contexte-code.md` §9)
- **Variable de mode gratuit :** `FREE_LAUNCH_MODE` (absente = gratuit : à rendre explicite, tâche 23.9)
- **Contrôle de présence :** voir `environments-template.md` section 3, sur `mobile-api/.env.local`

### App mobile Expo (racine)
- **Dossier :** racine du projet
- **Fichiers :** `.env.example` (8 variables), `.env.local` (9 variables), variables publiques `EXPO_PUBLIC_*` (lues par `src/config/env.ts`)
- **Fichier de test :** `.env.e2e.local` (2 variables : identifiants du compte de test, valeurs non lues)

### landing-site (Next 15)
- **Dossier :** `landing-site/`
- **Fichiers :** `.env.example` (2 variables), `.env.local` (8 variables)

### recruiter-web (admin, port 3001)
- **Dossier :** `recruiter-web/`
- **Fichier :** `recruiter-web/.env.local` (5 variables), pas de modèle `.env.example`

## Hôtes distants
| Hôte | Rôle | Accès | Emplacement des variables sur l'hôte | Gestionnaire de processus |
|---|---|---|---|---|
| VPS Ubuntu (`VPS_HOST` dans les secrets GitHub) | API mobile (port 3002), admin (3001), landing (3000), n8n, Evolution API, Postgres local | utilisateur `VPS_USER` avec la clé `VPS_SSH_KEY` (secrets GitHub) | **À confirmer** : chemin du fichier d'environnement de `mobile-api` sur le VPS, dans le dossier du projet (dossier de déploiement documenté : `/opt/campus-360`) | PM2 (nom d'application à confirmer, ex. `campus360-mobile-api`) |

### Treg (passerelle d'APIs, scraping LinkedIn)
- **Variable locale :** `TREG_API_KEY` dans `.env.local` (racine, ignoré par git). Jeton d'équipe `bct`.
- **VPS :** CLI `treg` 0.26.0 dans `/opt/treg-cli` (`/opt/treg-cli/bin/treg`), connecté à l'équipe `bct` le 2026-10-20. Le jeton est stocké par le CLI dans le profil de `root` ; aucun fichier de jeton laissé ailleurs.
- **Réseau :** treg.to est injoignable depuis le poste de développement et le réseau de l'utilisateur (connexion réinitialisée) ; joignable depuis le VPS.
- **Variables lues par `scripts/agents/config.py` (noms seulement) :** `TREG_API_KEY` (transport HTTP), `TREG_BASE_URL`, `TREG_CLI` (transport CLI, défaut `/opt/treg-cli/bin/treg`), `TREG_MAX_CALLS_PER_RUN`, `TREG_MAX_COST_PER_CALL_USD`. Sur le VPS, sans `TREG_API_KEY`, le CLI déjà connecté est utilisé.
- **À faire :** renouveler le jeton (il a transité dans une conversation), puis refaire `treg login` sur le VPS ; renouveler aussi la clé exposée dans `scripts/n8n/campus360_treg_full_workflow.json`.

## Secrets de plateforme (CI et déploiement)
| Plateforme | Nom du secret | Utilisé par |
|---|---|---|
| GitHub Actions | `DATABASE_URL` | workflows de test et de déploiement |
| GitHub Actions | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | pipeline de scraping |
| GitHub Actions | `OPENROUTER_API_KEY`, `GEMINI_API_KEY` | pipeline de scraping et routes IA |
| GitHub Actions | `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | déploiement sur le VPS |
| GitHub Actions | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_MOBILE_API_PROJECT_ID`, `VERCEL_LANDING_PROJECT_ID` | déploiements Vercel |
| GitHub Actions | `EXPO_TOKEN` | builds EAS |

## Points à confirmer
- Chemin exact du fichier d'environnement de `mobile-api` sur le VPS, et nom de l'application PM2 (utilisé par `/vps-deploy` et `/deploy-and-push`).
- Les variables `NOTCHPAY_*`, `FILES_*`, `UPLOAD_ROOT`, `FREE_LAUNCH_MODE` sont-elles définies en production ? (contrôle à faire par l'utilisateur, sans afficher les valeurs).
- `RESEND_API_KEY` : présente en production (sinon la vérification d'e-mail est désactivée, voir tâche 23.11).
