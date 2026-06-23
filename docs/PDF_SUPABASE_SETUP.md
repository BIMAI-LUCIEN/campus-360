# Setup Supabase - Module PDF

## 1. Creer le projet

1. Va sur Supabase.
2. Cree un nouveau projet.
3. Note :
   - Project URL
   - anon public key
   - service role key, seulement pour serveur/admin prive

## 2. Configurer l'app mobile

Copie `.env.example` vers `.env` :

```text
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Redemarre Expo apres modification :

```bash
npx.cmd expo start --lan --clear
```

## 3. Executer le SQL

Dans Supabase SQL Editor :

1. Ouvre `docs/PDF_SUPABASE.sql`.
2. Copie tout.
3. Execute.

## 3 bis. Activer Google OAuth dans Supabase

L'erreur `Unsupported provider: provider is not enabled` veut dire que Google n'est pas active dans le projet Supabase.

1. Ouvre Supabase Dashboard.
2. Va dans `Authentication` > `Providers` > `Google`.
3. Active le provider.
4. Colle le `Client ID` et le `Client Secret` de Google Cloud Console.
5. Dans Google Cloud Console, ajoute l'URL de redirection :

```text
https://zlzwoqqnkvxndmtnzdsm.supabase.co/auth/v1/callback
```

6. Dans Supabase `Authentication` > `URL Configuration`, ajoute aussi les redirect URLs autorisees :

```text
campus-bordes://auth/callback
http://localhost:8081
```

7. Redemarre Expo apres changement.

## 4. Creer les buckets Storage

Dans Supabase Storage :

- bucket `documents`
- bucket `document-previews`

Les PDF complets doivent rester prives.
Les previews peuvent etre privees aussi, puis servies par URL signee.

## 5. Creer un admin

1. Cree un utilisateur dans Supabase Auth.
2. Dans SQL Editor, mets son role admin :

```sql
update public.profiles
set role = 'admin'
where id = 'USER_ID_ICI';
```

## 6. Brancher l'admin web

Le fichier `admin/pdf-supabase-adapter.js` contient deja les fonctions :

- `saveConfig`
- `listDocuments`
- `createDocument`
- `updateDocument`
- `uploadPdf`
- `publishDocument`
- `draftDocument`
- `archiveDocument`

Quand tu me donnes les infos Supabase, je branche ces fonctions dans
`admin/pdf-dashboard.html` pour remplacer le `localStorage`.

## 7. Brancher le mobile

Le fichier `src/features/pdf/pdfApi.ts` contient deja :

- `listPublishedPdfDocuments`
- `listPurchasedPdfIds`
- `purchasePdfDocument`
- `createSignedPdfUrl`

Quand l'auth sera faite, on remplacera l'achat local simule par `purchasePdfDocument`.
