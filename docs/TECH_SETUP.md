# Environnement technique Campus-Bordes

## A installer sur Windows

1. Node.js LTS.
2. Git.
3. Visual Studio Code.
4. Expo Go sur telephone Android pour tester rapidement.
5. Android Studio seulement si tu veux un emulateur Android local.
6. Un compte Expo pour EAS Build plus tard.
7. Supabase CLI plus tard, quand le backend sera branche.

## Commandes du projet

```powershell
npm.cmd install
npm.cmd run start
```

Si PowerShell bloque `npm` ou `npx`, utiliser les executables `.cmd` :

```powershell
npm.cmd --version
npx.cmd create-expo-app@latest
```

Correction durable :

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Architecture actuelle

```text
App.tsx                  Coque mobile PDF-only
src/types.ts             Types PDF, wallet et transactions
src/features/auth        Auth et wallet etudiant via Supabase
src/features/pdf         Catalogue PDF, achats, assistant et API Supabase
admin/pdf-dashboard.html Admin local PDF
admin-app                Dashboard admin Next.js PDF
docs/                    Setup, schema SQL et roadmap PDF
```

Architecture cible apres MVP :

```text
src/app                  Navigation minimale et session
src/components           Composants UI reutilisables
src/features/auth        Connexion, profil, wallet PDF
src/features/pdf         Documents, previews, achats, lecture, assistant IA
src/lib/supabase         Client Supabase centralise
supabase/migrations      Tables PDF, RLS, storage policies, functions SQL
```

## Stack budget reduit

- Mobile : Expo + React Native.
- Backend : Supabase Free au debut, puis Pro seulement quand l'usage justifie.
- Admin : dashboard Next.js `admin-app/`.
- Analytics : logs Supabase au MVP, PostHog plus tard si besoin.
- Builds : Expo Go pour developpement, EAS Free pour quelques builds.
- Paiement : commencer avec un agregateur Mobile Money si l'acces direct operateur est lent.

## Regles techniques non negociables

- Le client ne met jamais a jour son solde directement.
- Chaque achat PDF passe par une transaction serveur atomique.
- Les PDF payants utilisent des URLs signees ou temporaires.
- RLS Supabase obligatoire sur toutes les tables.
- Les actions admin ne passent pas par l'app etudiant.
- La cle service Supabase ne doit jamais etre exposee dans l'app mobile.

## Roadmap technique

1. Stabiliser le MVP Expo PDF-only.
2. Creer Supabase : tables, RLS, storage.
3. Brancher auth etudiant.
4. Brancher wallet serveur et historique.
5. Brancher PDF storage + achat.
6. Ajouter lecture PDF complete via URL signee.
7. Finaliser admin web PDF.
8. Ajouter notifications apres achat/recharge.
9. Faire tests terrain dans 1 campus.
10. Ouvrir a 2 ou 3 campus supplementaires.
