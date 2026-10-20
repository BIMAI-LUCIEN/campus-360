# Campus 360 — Monorepo

Ce document décrit l'architecture exacte et actuelle du monorepo Campus 360 pour guider le travail des développeurs et des agents d'intelligence artificielle.

> **Carte de code :** avant de lire du code, consulter `contexte-code.md` (sommaire puis sections ciblées), puis le périmètre de `plan.md`.
> **Graphe sémantique :** consulter `graphify-out/GRAPH_REPORT.md` pour explorer les liens entre modules sans lire de fichiers inutiles.

---

## 1. Vue d'ensemble des 4 services

Le monorepo comprend **4 services applicatifs** hébergés sur un VPS Linux de production (`Ubuntu 24.04`, PM2, Nginx, PostgreSQL) :

1. **App Mobile Expo / React Native** (racine) :
   - Package : `campus-360` (version 1.2.0)
   - Plateformes : Android (APK/AAB), iOS, Web (Expo Web)
   - Lancement dev : `npm run start` / `npm run web`
   - Typecheck : `npm run typecheck` (`node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit`)
   - Verrouillage design : `npm run lint:colors` (191 couleurs brutes autorisées, aucune addition sans thème)

2. **Backend API Mobile (`mobile-api/`)** :
   - Package : `campus-360-mobile-api` (Next.js 15, Node runtime, port local **3002**)
   - Production : `https://api.campus360b.site`
   - Rôle : Business logic mobile (authentification Better Auth, stages & candidatures, WhatsApp via Evolution API, gestion de compte & suppression RGPD, documents & IA, wallet en coins, paiements Notch Pay)
   - Typecheck : `cd mobile-api && npm run typecheck`
   - Migrations : `cd mobile-api && npm run migrate` (`scripts/migrate.mjs` vérifiant `public.schema_migrations`)
   - Tests : `cd mobile-api && npm test` (`node --test tests/*.test.mjs`, 188 tests automatisés)

3. **Portail Recruteur & Admin (`recruiter-web/`)** :
   - Package : `campus-360-admin` (Next.js 15 App Router, Tailwind CSS v4, port local **3001**)
   - Production : `https://admin.campus360b.site`
   - Rôle : Dashboard administrateur (gestion du catalogue PDF, validation des stages scrapés, suivi des utilisateurs et transactions)
   - Typecheck : `cd recruiter-web && npm run typecheck`
   - Build : `cd recruiter-web && npm run build` (20/20 pages statiques générées)
   - Architecture : Zéro doublon API mobile (toutes les routes `/api/mobile/*` et `/api/ai/*` ont été retirées en 23.22)

4. **Site Public & Landing (`landing-site/`)** :
   - Package : `landing-site` (Next.js 15, port local **3000**)
   - Production : `https://campus360b.site`
   - Rôle : Vitrine publique, présentation des fonctionnalités, téléchargement de l'APK, formulaire de contact et mentions légales

---

## 2. Articulation et Routage Réseau

### Routage Client App Mobile (`src/features/auth/betterAuth.ts`)
- `baseUrlFor(path)` route automatiquement :
  - Chemins `/api/mobile/*` et `/api/ai/*` → `mobileApiBaseUrl` (port **3002** en dev, `https://api.campus360b.site` en prod)
  - Chemins `/api/auth/*` → `authBaseUrl` (port **3001** en dev via Better Auth admin, `https://api.campus360b.site` en prod)
- En développement avec tunnel Expo (ngrok) : `metro.config.js` relaie automatiquement `/api/mobile/` et `/api/ai/` vers le port 3002 et `/api/auth/` vers le port 3001.

### Authentification & Sessions
- Moteur : **Better Auth** (PostgreSQL direct via `pg`).
- Cookie de session : `better-auth.session_token` (préfixé `__Secure-` en production HTTPS).
- Vérification d'e-mail : **obligatoire en production** (`requireEmailVerification: true` si `NODE_ENV === 'production'`).
- Rôles : `student` par défaut, `admin` pour l'accès au tableau de bord.
- Sécurité : Zéro repli fictif (`guest-student` et `student-offline` supprimés), tokens en URL refusés (authentification par Cookie ou Bearer uniquement).

---

## 3. Modèle Économique & Lancement

- **Pas d'abonnement récurrent** : Campus 360 fonctionne sur un modèle de portefeuille prépayé en coins (1 coin = 1 FCFA).
- **Lancement gratuit** : Piloté par les variables d'environnement `FREE_LAUNCH_MODE=true` et `FREE_LAUNCH_UNTIL` (accès gratuit aux PDF et aux fonctionnalités d'assistance pendant la période d'amorçage).
- **Paiements réels** : Intégration **Notch Pay** pour les recharges Mobile Money (MTN MoMo, Orange Money) avec validation par webhook signé.
- **Plafond IA** : Quota journalier anti-abus (60 requêtes IA par utilisateur et par 24h) imposé sur toutes les routes de génération et chat.

---

## 4. Design System & Charte Graphique

- Fichier source : `src/theme/stitch.ts`
- Style : **Clean White & Royal Violet** (typographie soignée, contraste élevé, badges aux angles adoucis)
- Tokens principaux :
  - `sienna` / Primaire : `#7C3AED` (Violet Royal)
  - `paper` / Fond clair : `#FFFFFF` / `stitchColors.paperSoft` `#F8FAFC`
  - `ink` / Texte principal : `#0F172A`
  - `inkMuted` / Texte secondaire : `#64748B`
  - `emerald` / Succès & badges : `#047857`
- Verrouillage automatique : `npm run lint:colors` interdit l'ajout direct de couleurs hexadécimales brutes dans les composants React Native.

---

## 5. Base de Données & Migrations

- Moteur : PostgreSQL direct via `pg.Pool` (avec support SSL vérifié en production).
- Schéma de suivi : `public.schema_migrations` (numérotation séquentielle `0000_baseline.sql`, `0009_...`, etc.).
- Exécution : `cd mobile-api && npm run migrate`. Aucune instruction DDL dynamique (`create table`) n'est exécutée au runtime applicatif.

---

## 6. Fichiers Partagés (Jumeaux)

Certains utilitaires sont partagés entre `mobile-api/lib/` et `recruiter-web/lib/` :
- `lib/origins.ts` : Liste des origines autorisées et validation CORS stricte
- `lib/client-ip.ts` : Extraction sécurisée de l'adresse IP derrière proxy inverse
- `lib/db-ssl.ts` : Configuration SSL pour les connexions PostgreSQL

*Note : Les tests automatisés (`mobile-api/tests/sessions-origins.test.mjs`) vérifient en continu l'alignement strict de ces fichiers.*
