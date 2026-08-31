# Configuration de Campus-Bordes — guide post-audit

> Comment configurer l'app après le passage en revue (sécurité + bugs corrigés).
> Ce qu'il faut changer, pourquoi, et comment.

---

## TL;DR

1. **Régénère `BETTER_AUTH_SECRET`** (ancien secret = session JWT forgable).
2. **Supprime `ADMIN_BOOTSTRAP_PASSWORD`** de ton env (la route est désactivée).
3. **Copie `.env.example` → `.env.local`** pour le mobile ET pour `admin-app/`.
4. **Remplis chaque variable** marquée `REQUIRED` ou utilisée en prod.

---

## 1. Rotation de `BETTER_AUTH_SECRET`

### Pourquoi

Better Auth signe ses JWT de session et ses cookies avec ce secret. S'il fuite
(par exemple dans un repo public, un screenshot, un log ancien), n'importe qui
peut forger un cookie admin. La seule façon propre de s'en remettre : **le
changer et invalider toutes les sessions en cours**.

### Comment

#### a. Génère un nouveau secret

```powershell
# PowerShell (32 caractères base64 = 256 bits)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 })) -Replace '\+=', '' | Select-Object -First 1
```

ou

```bash
# bash / Git Bash
openssl rand -base64 32
```

Note la valeur sortie — tu la mets dans `.env.local` à l'étape suivante.

#### b. Mets-le dans `admin-app/.env.local`

Ouvre `C:\Users\migue\Desktop\mes projets\campus 360\admin-app\.env.local`
(ou crée-le à partir de `admin-app/.env.example`) et remplace la ligne :

```
BETTER_AUTH_SECRET=la-valeur-de-openssl-rand-base64-32
```

#### c. Redémarre l'admin-app

Le nouveau code (`lib/auth.ts`) **refuse de démarrer** si `BETTER_AUTH_SECRET`
est absent. Pas de fallback silencieux — tu vois tout de suite si tu as oublié.

```powershell
cd "C:\Users\migue\Desktop\mes projets\campus 360\admin-app"
# Ctrl-C pour stopper le dev server en cours
npm.cmd run dev
```

#### d. Invalide toutes les sessions

La rotation du secret invalide automatiquement les anciens JWT (la signature ne
matche plus). Mais pour être bien sûr que les anciens cookies ne trainent
nulle part :

- **Côté serveur** : redémarrer l'admin-app vide le pool de connexions PG, ce
  qui flush les sessions actives stockées en base Better Auth.
- **Côté client mobile** : appeler `clearStudentSession()` au boot (déjà
  câblé via `App.tsx`). Les utilisateurs devront se reconnecter — c'est
  **voulu**.

#### e. (Si tu as plusieurs environnements)

Répète pour chaque environnement (`dev`, `staging`, `prod`). **Ne partage
jamais le même secret entre deux envs** — sinon une fuite staging = une
fuite prod.

---

## 2. Suppression de `ADMIN_BOOTSTRAP_PASSWORD`

### Pourquoi

Avant la revue, le fichier `admin-app/app/api/bootstrap-admin/route.ts`
acceptait une requête **non authentifiée** contenant email + mot de passe en
clair, et promouvait l'utilisateur ciblé en `admin` si ça matchait les env
vars. En gros, connaître deux valeurs d'env = devenir admin à distance.

### Ce qui a changé

La route renvoie désormais **HTTP 405 Method Not Allowed** en permanence.
Elle existe encore dans le code (au cas où tu voudrais écrire un script
CLI plus tard) mais **n'a plus de surface HTTP**.

### Action

1. **Ouvre `admin-app/.env.local`** (s'il existe).
2. **Supprime la ligne** :
   ```
   ADMIN_BOOTSTRAP_PASSWORD=...
   ```
3. **Vérifie** qu'aucun script dans `admin-app/scripts/*.mjs` ne la lit encore
   (j'ai cherché, il n'y en a plus).
4. **(Bonus)** Si tu veux promouvoir un admin maintenant, fais-le
   directement en SQL :
   ```sql
   update public.app_users set role = 'admin', updated_at = now()
     where email = 'ton-email@example.com';
   ```
   Ou via le mécanisme existant : `ADMIN_BOOTSTRAP_EMAIL` + un login
   initial (le rôle est appliqué automatiquement dans
   `lib/mobile-access.ts → ensureMobileUser`).

---

## 3. Setup complet depuis zéro (nouveau dev)

Si tu clones le repo sur une nouvelle machine, voici l'ordre exact.

### a. Prérequis

- Node.js ≥ 20 (testé sur 24)
- npm (livré avec Node)
- Une base Supabase (URL + clé anon + clé service-role)
- Un projet OpenRouter si tu veux l'IA (sinon l'app marche, juste sans IA)
- (Optionnel) Un compte Notch Pay pour les vrais paiements MoMo

### b. Backend (admin-app)

```powershell
cd "C:\Users\migue\Desktop\mes projets\campus 360\admin-app"
Copy-Item .env.example .env.local -Force
notepad .env.local
```

Remplis au minimum :

| Variable | Valeur | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | **REQUIRED** — l'app crash sans |
| `BETTER_AUTH_URL` | `http://localhost:3001` | URL publique du serveur admin |
| `ADMIN_BOOTSTRAP_EMAIL` | `ton-email@example.com` | Promu admin au premier login |
| `DATABASE_URL` | URL Postgres (Supabase pooler port 6543) | |
| `SUPABASE_URL` | `https://xxx.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service-role | **NE JAMAIS exposer côté mobile** |
| `OPENROUTER_API_KEY` | clé OpenRouter | optionnel — sans ça l'IA renvoie un fallback local |
| `SMTP_*` | Gmail + app-password | pour password reset |

```powershell
npm.cmd install
npm.cmd run dev
```

Ouvre http://localhost:3001/admin/login — connecte-toi avec
`ADMIN_BOOTSTRAP_EMAIL` et le mot de passe que tu as créé à la première
connexion.

### c. Mobile

```powershell
cd "C:\Users\migue\Desktop\mes projets\campus 360"
Copy-Item .env.example .env.local -Force
notepad .env.local
```

Remplis au minimum :

| Variable | Valeur | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | même URL que dans admin-app | |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | clé anon publique | safe dans le bundle |
| `EXPO_PUBLIC_AUTH_URL` | `http://TON_IP_LAN:3001` pour Android/iOS | important quand tu testes sur un vrai téléphone |
| `EXPO_PUBLIC_AUTH_WEB_URL` | `http://localhost:3001` | pour le dev web |
| `EXPO_PUBLIC_AI_PROXY_URL` | `http://TON_IP_LAN:3001/api/ai/pdf-chat` | |

```powershell
npm.cmd install
npm.cmd run web        # pour tester en local
# ou
npm.cmd run android    # via Expo Go sur un téléphone connecté
```

### d. Vérification rapide

Sur le serveur admin, après `npm run dev`, tu dois voir :

```
▲ Next.js 15.x
- Local: http://localhost:3001
✓ Ready in 2.3s
```

Si tu vois `Error: BETTER_AUTH_SECRET is required` → tu as oublié
l'étape (b). Refais-la.

Sur l'app mobile, dans le navigateur en mode dev, ouvre la console. Tu
dois pouvoir :
1. Créer un compte
2. Voir le catalogue (vide si pas encore de PDF)
3. Aller sur **Compte → Sécurité** — c'est une modal mock pour l'instant,
   le vrai changement de mot de passe passe par Better Auth.

---

## 4. Variables optionnelles (mais importantes)

### `NOTCHPAY_PRIVATE_KEY`

Sans cette variable, les recharges wallet tournent en **mode mock sandbox** :
le `topup` crée une transaction `mock_pay_*`, et le client (mobile)
l'auto-approuve après 3 secondes. Pratique pour tester sans dépenser.

Pour passer en prod : inscris-toi sur https://notchpay.co, copie ta
private key, mets-la dans `admin-app/.env.local`. **Redémarre l'admin-app.**
C'est tout — la détection se fait à chaud (`if (!process.env.NOTCHPAY_PRIVATE_KEY)`).

### `NOTCHPAY_WEBHOOK_SECRET`

**Obligatoire en production.** Configure-le dans ton dashboard Notch Pay,
puis mets la même valeur ici. Le webhook refuse les requêtes non signées
quand `NODE_ENV=production`. Sans ce secret, en prod, **tous les paiements
seraient rejetés** (c'est le comportement voulu — fail-closed).

### `DATABASE_SSL_REJECT_UNAUTHORIZED`

`true` par défaut — c'est la valeur sûre. Mets `false` uniquement si :
- Tu fais tourner Postgres en local via Docker avec un certificat
  auto-signé ET tu ne peux pas faire autrement.
- Tu es en train de débugger un problème TLS.

**Ne le fais jamais en prod.**

### `TRUSTED_EXTRA_ORIGINS`

Liste séparée par virgules. Par défaut, les origines de confiance sont déjà :
- `campus-bordes://` (deep link mobile)
- `http://localhost:{3001,8081,8082}` + `http://127.0.0.1:{3001,8081,8082}`
- `https://campus-360-hi97.vercel.app`

Ajoute ton domaine custom ici si tu mets l'admin derrière un reverse proxy
(`https://admin.campus360.app,https://staging.campus360.app`).

---

## 5. Ce que j'ai déjà fait pour toi

- ✅ `BETTER_AUTH_SECRET` est **obligatoire au démarrage** (fail-fast dans `lib/auth.ts`)
- ✅ `ADMIN_BOOTSTRAP_PASSWORD` est **ignoré** (route renvoie 405)
- ✅ Les deux `.env.example` sont à jour et commentés
- ✅ Plus aucune valeur secrète ne fuite côté mobile (`EXPO_PUBLIC_*` uniquement)
- ✅ SSL Postgres strict par défaut
- ✅ Webhook Notch Pay avec HMAC obligatoire en prod
- ✅ Origins trust list explicite (plus de découverte auto d'IPs LAN)
- ✅ CORS / security headers sur le middleware

## 6. Checklist avant de commit / push

```powershell
# Vérifie qu'aucun secret n'est sur le point de partir dans git
git diff admin-app/.env.example
git diff .env.example

# Si tu modifies admin-app/.env.local ou .env.local, NE LES COMMITTE PAS
git status admin-app/.env.local .env.local
# doivent afficher "Untracked" — sinon, retire-les du suivi :
git rm --cached admin-app/.env.local .env.local
```

Le `.gitignore` à la racine devrait déjà exclure les `.env.local`. Si jamais
non, ajoute :

```
.env.local
admin-app/.env.local
```

---

## 7. En cas de pépin

| Symptôme | Cause probable | Fix |
|---|---|---|
| `Error: BETTER_AUTH_SECRET is required` au boot | `.env.local` absent ou mal lu | Vérifie que le fichier est bien dans `admin-app/.env.local` (pas `.env.example` que tu as juste renommé) |
| Login qui renvoie 401 en boucle après rotation | Cache navigateur ou Expo SecureStore | Vide localStorage / désinstalle l'app mobile |
| Recharge wallet qui ne crédite jamais | Pas de `NOTCHPAY_PRIVATE_KEY` ET pas de webhook configuré | Vérifie l'env var + redémarre ; en mode mock, l'auto-approve prend 3 s côté client |
| CORS error côté mobile (`campus-bordes://…`) | `EXPO_PUBLIC_AUTH_URL` pointe sur `localhost` mais tu testes sur un téléphone | Remplace par l'IP LAN de ta machine (`ipconfig` pour la trouver) |
| `UNABLE_TO_VERIFY_LEAF_SIGNATURE` sur Postgres | Ton pooler Supabase utilise un cert que Node ne reconnaît pas | Ajoute `DATABASE_SSL_REJECT_UNAUTHORIZED=false` (dev uniquement) |

---

Bonne chance — ping-moi si tu bloques sur une étape.
