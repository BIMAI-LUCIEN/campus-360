# Campus 360

Plateforme éducative et professionnelle tout-en-un pour étudiants d'Afrique centrale : stages vérifiés avec candidatures directes WhatsApp, bibliothèque académique (cours, TD, examens), wallet Mobile Money et assistance à la rédaction académique par IA.

---

## Architecture des Services

Le monorepo comprend 4 services principaux :

| Service | Emplacement | Port Dev | URL Production | Description |
| :--- | :--- | :--- | :--- | :--- |
| **App Mobile** | Racine (`/`) | 8081 | Application mobile Android / iOS | Application Expo / React Native (SDK 54) |
| **API Mobile** | `mobile-api/` | 3002 | `https://api.campus360b.site` | Backend business, Better Auth, stages, WhatsApp, IA |
| **Portail Admin** | `recruiter-web/` | 3001 | `https://admin.campus360b.site` | Dashboard admin, validation des offres et gestion PDF |
| **Site Public** | `landing-site/` | 3000 | `https://campus360b.site` | Vitrine publique et téléchargement de l'application |

---

## Commandes Principales

### 1. Application Mobile
```bash
npm run start       # Lancement Metro Bundler
npm run web         # Lancement version Web
npm run typecheck   # Vérification des types TypeScript
npm run lint:colors # Contrôle du respect du thème Stitch
```

### 2. Backend API Mobile (`mobile-api/`)
```bash
cd mobile-api
npm run dev         # Serveur dev (port 3002)
npm run typecheck   # Typecheck TypeScript
npm run migrate     # Exécution des migrations PostgreSQL
npm test            # Suite de tests automatisés (188 tests)
```

### 3. Portail Recruteur & Admin (`recruiter-web/`)
```bash
cd recruiter-web
npm run dev         # Serveur dev (port 3001)
npm run typecheck   # Typecheck TypeScript
npm run build       # Build de production Next.js
```

### 4. Site Vitrine (`landing-site/`)
```bash
cd landing-site
npm run dev         # Serveur dev (port 3000)
npm run build       # Build de production Next.js
```

---

## Documentation de Référence

- Pour les directives d'architecture et de développement, consulter `CLAUDE.md`.
- Pour la cartographie technique et l'arbre des fichiers, consulter `contexte-code.md`.
- Pour le suivi des tâches et jalons de livraison, consulter `plan.md`.
