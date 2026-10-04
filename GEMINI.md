# Instructions & Contexte IA - Campus 360

> **RÈGLE D'OR D'ÉCONOMIE DE TOKENS (GRAPHIFY-FIRST) :**
> Ne jamais ouvrir ni relire 20 fichiers de code à l'aveugle.
> **Avant de lire des fichiers, consulte toujours la carte (`graphify-out/graph.json` ou `graphify-out/GRAPH_REPORT.md`)** pour comprendre l'architecture exacte et ne lire que le strict minimum nécessaire.

## Stack & Commandes du Projet

### 1. Application Mobile (Expo / React Native)
- **Framework :** Expo SDK 54, React Native 0.81.5, React 19, Lucide React Native, Expo Print.
- **Typecheck :** `npm run typecheck` (`node --stack_size=8192 node_modules/typescript/bin/tsc --noEmit`)
- **Lancement Dev :** `npm run start` / `npm run web`

### 2. Backend API Mobile (`mobile-api/`)
- **Framework :** Next.js 15, Node.js, PostgreSQL Pool (`pg`), Better Auth, Zod.
- **Typecheck :** `cd mobile-api && npm run typecheck` (`tsc --noEmit`)
- **Lancement Dev :** `cd mobile-api && npm run dev` (Port 3002)

### 3. Portail Recruteur & Admin (`recruiter-web/`)
- **Framework :** Next.js 15 App Router, Tailwind CSS v4, Better Auth, Recharts.
- **Typecheck :** `cd recruiter-web && npm run typecheck` (`tsc --noEmit`)
- **Build :** `cd recruiter-web && npm run build`
- **Lancement Dev :** `cd recruiter-web && npm run dev` (Port 3001)

## Référence Documentaire
- **Cadrage Global :** [contexte.md](file:///c:/Users/DELL/Desktop/mes%20projet/campus-360/contexte.md)
- **Graphe Sémantique :** [graphify-out/GRAPH_REPORT.md](file:///c:/Users/DELL/Desktop/mes%20projet/campus-360/graphify-out/GRAPH_REPORT.md)
