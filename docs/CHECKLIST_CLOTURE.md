# Campus 360 — Checklist de Clôture

## 1. 🔴 Tâches Bloquantes

### 1.1 Redémarrer Expo avec le nouveau .env.local
- [ ] Ouvre un terminal dans `C:\Users\migue\Desktop\mes projets\campus 360`
- [ ] Tape : `npx expo start --port 8081`
- [ ] Récupère le nouveau QR code et rescane-le sur le téléphone
- [ ] Le téléphone doit maintenant joindre l'admin via ngrok (plus de "Connexion impossible")

### 1.2 Rotate de tous les secrets compromis
> Ces secrets étaient visibles en chat history. Ils sont compromis. Rotation obligatoire avant toute mise en prod.

Génère les nouveaux secrets :
```bash
node -e "console.log('BETTER_AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('RANDOM_SECRET=' + require('crypto').randomBytes(64).toString('base64'))"
```

- [ ] Ouvre `admin-app\.env.local`
- [ ] Remplace `BETTER_AUTH_SECRET` par la nouvelle valeur générée
- [ ] Remplace `DATABASE_URL` si le mot de passe était visible en clair
- [ ] Remplace `SUPABASE_SERVICE_ROLE_KEY` (depuis le dashboard Supabase)
- [ ] Remplace `GOOGLE_CLIENT_SECRET` (depuis Google Cloud Console)
- [ ] Remplace `OPENROUTER_API_KEY` (depuis openrouter.ai)
- [ ] Remplace `SMTP_PASSWORD` (depuis ton provider mail)
- [ ] Remplace `NOTCHPAY_WEBHOOK_SECRET` si défini
- [ ] Ouvre `.env.local` (mobile) et remplace `EXPO_PUBLIC_SUPABASE_ANON_KEY` si le secret était exposé
- [ ] Supprime tout historique de chat où ces secrets apparaissent

### 1.3 Vérifier que la connexion fonctionne depuis le téléphone
- [ ] Scan le QR Expo mis à jour
- [ ] Essaie de te connecter avec un compte test
- [ ] Si "Connexion impossible" persiste : vérifier que ngrok tourne encore (`Get-Process -Name "ngrok"`)
- [ ] Si ngrok est mort : `ngrok http 3001` dans un terminal séparé

---

## 2. 🟠 App Mobile — UI / UX

### 2.1 Bouton WhatsApp Support (non fonctionnel)
- [ ] Ouvre `App.tsx` ligne 2481
- [ ] Ajoute un `onPress` qui ouvre le lien WhatsApp :
```tsx
onPress={() => Linking.openURL('https://wa.me/237XXXXXXXXX')}
```
- [ ] Remplace `XXXXXXXXX` par le vrai numéro WhatsApp support

### 2.2 Formulaire changement de mot de passe (non fonctionnel)
- [ ] Ouvre `App.tsx` lignes 2414-2451
- [ ] Ajoute 3 états :
```tsx
const [currentPassword, setCurrentPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
```
- [ ] Ajoute `onChangeText` sur chaque TextInput :
```tsx
secureTextEntry
onChangeText={setCurrentPassword}
// etc.
```
- [ ] Remplace le handler "Mettre à jour" par un appel API `changePassword(currentPassword, newPassword)` (API à créer dans `betterAuth.ts` si elle n'existe pas)

### 2.3 Remplacer SafeAreaView déprécié
- [ ] Installe : `npx expo install react-native-safe-area-context`
- [ ] Remplace dans tout `App.tsx` :
```tsx
// AVANT
import { SafeAreaView } from 'react-native';
// APRÈS
import { SafeAreaView } from 'react-native-safe-area-context';
```
- [ ] Utilise `<SafeAreaProvider>` au root de l'app

### 2.4 États vides (Empty States)
- [ ] Ajoute un état vide dans la section **Catalogue** (pas de résultats de recherche)
- [ ] Ajoute un état vide dans la section **Bibliothèque** (aucun PDF acheté)
- [ ] Ajoute un état vide dans **Rapports** (aucun rapport créé)
- [ ] Exemple de design :
```tsx
<View style={{ alignItems: 'center', padding: 40 }}>
  <Text style={{ fontSize: 48 }}>📂</Text>
  <Text style={{ fontSize: 16, color: '#64748B', textAlign: 'center', marginTop: 12 }}>
    Aucun document pour le moment.{'\n'}Explore le catalogue pour commencer.
  </Text>
  <PrimaryButton label="Explorer" onPress={() => openSection('explore')} />
</View>
```

### 2.5 Indicateur de version dans les Paramètres
- [ ] Ouvre la section "Mon compte" / Paramètres
- [ ] Ajoute en bas : `Version 1.0.0` (ou le numéro actuel)
- [ ] Utilise `Constants.manifest2?.android?.versionCode || '1.0.0'` pour-auto

### 2.6 Données fictives dans "Sessions actives"
- [ ] Ouvre `App.tsx` ligne 2441
- [ ] Remplace "Yaoundé" et "Web" par les vraies infos de session (si disponibles via better-auth)
- [ ] Ou supprime cette section si l'API ne fournit pas l'info

### 2.7 Animation des modals
- [ ] Ajoute `presentationStyle="pageSheet"` aux Modals principaux
- [ ] Teste sur iOS Simulator pour vérifier le rendu

---

## 3. 🟠 App Mobile — Fonctionnalités

### 3.1 Notifications Push ( cassées sur Expo Go SDK 53+)
- [ ] Lis la doc : https://docs.expo.dev/develop/development-builds/introduction/
- [ ] Option A (recommandée) : Configure EAS Build pour générer un build dev
```bash
npm install -g eas-cli
eas build --platform android --profile development
```
- [ ] Option B : Désactive le warning dans le code en attendant le build dev
- [ ] Configure `app.json` avec le bon `package` Android et `bundleIdentifier` iOS
- [ ] Ajoute les credentials Google (FCM) pour les push notifications Android

### 3.2 Test complet du Wallet Mobile Money
- [ ] Installe l'app MTN ou Orange sur un vrai téléphone
- [ ] Configure un compte test MTN Mobile Money
- [ ] Teste le flow complet :
  - [ ] Inscription / connexion
  - [ ] Navigation vers "Recharger Wallet"
  - [ ] Saisie du montant (500 FCFA minimum)
  - [ ] Saisie du numéro Mobile Money
  - [ ] Clic sur "Envoyer" → notification USSD sur le téléphone
  - [ ] Validation USSD
  - [ ] Vérification que le solde augmente
  - [ ] Vérification que la transaction apparaît dans l'historique

### 3.3 Polling de recharge — cleanup on unmount
- [ ] Ouvre `App.tsx` vers la fonction `rechargeWallet` (~ligne 826)
- [ ] Ajoute un `useEffect` qui nettoy le polling si le composant se démonte :
```tsx
useEffect(() => {
  return () => {
    // Nettoyer le polling si l'utilisateur quitte l'écran
  };
}, []);
```
- [ ] Ajoute un bouton "Annuler" pendant le polling
- [ ] Limite le polling à 60 secondes max (actuellement 20 x 3s = 60s OK mais pas de timeout final)

### 3.4 Compteur Credits IA après chaque question
- [ ] Ouvre `PdfStudentSection.tsx` ou `pdfAssistant.ts`
- [ ] Après chaque message envoyé à l'assistant IA, appelle `syncStudentAccount()` pour rafraîchir `iaCredits`
- [ ] Affiche un indicateur visuel quand les credits baissent ("-1 credit" toast)

### 3.5 Vérifier que buyIaPack correspond à l'API
- [ ] Ouvre `App.tsx` ligne 913 (`buyIaPack`)
- [ ] Vérifie que `purchaseIaPack` dans `betterAuth.ts` appelle bien `/api/mobile/ia-packs/purchase`
- [ ] Vérifie que l'API route `/api/mobile/ia-packs/purchase` existe dans `admin-app`

### 3.6 Analytics PDF (recordPdfAnalyticsEvent jamais appelé)
- [ ] Ajoute des appels dans les bons endroits :
  - Quand l'utilisateur ouvre un PDF (après achat) : `recordPdfAnalyticsEvent(documentId, 'view')`
  - Quand l'utilisateur termine la lecture : `recordPdfAnalyticsEvent(documentId, 'complete')`
  - Quand l'utilisateur ouvre l'assistant IA sur un PDF : `recordPdfAnalyticsEvent(documentId, 'ai_assist')`

### 3.7 Timeout du catalogue — gestion d'erreur
- [ ] Ouvre `App.tsx` vers `refreshDocuments`
- [ ] Ajoute un timeout de 10 secondes
- [ ] Si `refreshDocuments` échoue : affiche un bouton "Réessayer" au lieu de garder le spinner

### 3.8 Bouton "Se déconnecter"
- [ ] Ouvre la section "Mon compte" / Paramètres
- [ ] Ajoute un bouton rouge "Se déconnecter"
- [ ] Handler : appelle `clearStudentSession()` + reset tous les états

### 3.9 Restauration de session après kill de l'app
- [ ] Teste le scénario : ouvre l'app → connects-toi → kill l'app (swipe away) → rouvre
- [ ] Si la session n'est pas restaurée : vérifier que `SecureStore` est utilisé correctement
- [ ] Vérifier que `loadStudentSession()` dans le `useEffect` est appelé au démarrage

---

## 4. 🟡 Admin — UI / UX

### 4.1 Tester le Dashboard PDF avec de vraies données
- [ ] Ouvre `http://localhost:3001/admin/pdf`
- [ ] Ajoute un PDF test via la base de données ou l'interface admin
- [ ] Vérifie que le tableau affiche les colonnes : titre, statut, prix, niveau
- [ ] Vérifie que les actions (publier, supprimer) fonctionnent

### 4.2 Tester le Dashboard Analytics
- [ ] Ouvre `http://localhost:3001/admin/analytics`
- [ ] Vérifie que les graphiques render correctement
- [ ] Vérifie que les données viennent de Supabase (pas de données mockées)

### 4.3 Responsive mobile de l'admin
- [ ] Teste `http://localhost:3001/admin` sur un téléphone
- [ ] Répare les débordements CSS si nécessaire
- [ ] Ajoute un viewport meta tag si manquant

### 4.4 Protection brute-force sur /admin/login
- [ ] Ouvre `admin-app/app/api/auth/[...all]/route.ts` ou le handler de login
- [ ] Ajoute un rate limit : 5 tentatives max par IP sur 15 minutes
- [ ] Retourne 429 Too Many Requests après 5 échecs

### 4.5 Favicon et logo
- [ ] Vérifie que `favicon.ico` existe dans `admin-app/public/`
- [ ] Vérifie que le logo dans le sidebar/header charge correctement
- [ ] Ajoute un fallback si l'image ne charge pas

### 4.6 Page /admin/forbidden
- [ ] Rend la page plus esthétique
- [ ] Ajoute un lien retour vers l'accueil ou la page de connexion

---

## 5. 🟡 Admin — Fonctionnalités

### 5.1 Supabase Row Level Security (RLS)
> Priorité haute — sans RLS, le service-role pool de Supabase bypass toute la sécurité sur les tables critiques.

- [ ] Ouvre le dashboard Supabase → SQL Editor
- [ ] Exécute les policies suivantes :

```sql
-- Activer RLS sur les tables critiques
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_document_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_pack_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_ia_usage_logs ENABLE ROW LEVEL SECURITY;

-- app_users : un utilisateur ne voit que son propre profil
CREATE POLICY "users_select_own" ON app_users FOR SELECT
  USING (auth.uid() = user_id);

-- app_wallets : un utilisateur ne voit que son propre wallet
CREATE POLICY "wallets_select_own" ON app_wallets FOR SELECT
  USING (auth.uid() = user_id);

-- app_document_purchases : un utilisateur ne voit que ses achats
CREATE POLICY "doc_purchases_own" ON app_document_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- app_pack_purchases : un utilisateur ne voit que ses achats
CREATE POLICY "pack_purchases_own" ON app_pack_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- app_user_push_tokens : un utilisateur ne gère que ses propres tokens
CREATE POLICY "push_tokens_own" ON app_user_push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- document_events : tout le monde peut insérer, seul l'admin lit
CREATE POLICY "events_insert_authenticated" ON document_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- app_wallet_transactions : un utilisateur ne voit que ses transactions
CREATE POLICY "transactions_own" ON app_wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);
```

### 5.2 Supprimer la route /api/bootstrap-admin
- [ ] Vérifie que `app/api/bootstrap-admin/route.ts` ne sert plus à rien
- [ ] Supprime le fichier : `Remove-Item admin-app\app\api\bootstrap-admin\route.ts`
- [ ] Supprime aussi `ADMIN_BOOTSTRAP_PASSWORD` du `.env.local`

### 5.3 Configurer un reverse proxy en prod
- [ ] Choice 1 (Vercel) : déployer sur Vercel avec `vercel --prod`
- [ ] Choice 2 (VPS) : installer Nginx, configurer HTTPS avec Let's Encrypt :
```nginx
server {
    listen 443 ssl;
    server_name campus-360.fr;

    ssl_certificate /etc/letsencrypt/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### 5.4 Health check endpoint
- [ ] Crée `admin-app/app/api/health/route.ts` :
```ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET() {
  try {
    await pool.query('SELECT 1');
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
```

### 5.5 Monitoring et logging
- [ ] Configure Sentry pour l'admin : `npm install @sentry/nextjs`
- [ ] Configure un uptime monitoring gratuit : UptimeRobot ou Better Stack
- [ ] Ajoute un ping toutes les 5 minutes sur `/api/health`

### 5.6 Backup base de données Supabase
- [ ] Active les backups automatiques dans le dashboard Supabase (disponible sur les plans Pro+)
- [ ] Configure un backup manuel quotidien via pg_dump si plan gratuit :
```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" > backup_$(date +%Y%m%d).sql
```

---

## 6. 🟢 Documentation de Clôture

### 6.1 Document d'architecture technique
- [ ] Créer `docs/ARCHITECTURE.md` avec :
  - Schéma de l'architecture (ASCII diagram)
  - Liste des services (mobile, admin, Supabase, S3, OpenRouter)
  - Flux de données (authentification, achat, IA)
  - Tableau des API routes avec description

### 6.2 Guide de déploiement
- [ ] Créer `docs/DEPLOYMENT.md` avec :
  - Prérequis (Node 18+, compte Supabase, compte ngrok)
  - Étapes de déploiement (dev / staging / prod)
  - Variables d'environnement à configurer
  - Commandes de build (iOS: `eas build`, Android: `eas build -p android`)

### 6.3 Guide utilisateur (étudiants)
- [ ] Créer `docs/USER_GUIDE.md` avec :
  - Inscription et connexion
  - Achat et lecture de PDF
  - Recharge du wallet
  - Utilisation de l'assistant IA
  - Rédaction de rapports de stage

### 6.4 Guide administrateur
- [ ] Créer `docs/ADMIN_GUIDE.md` avec :
  - Comment ajouter un PDF
  - Comment créer et publier un pack
  - Comment consulter les analytics
  - Comment gérer les utilisateurs
  - Comment traiter un remboursement

### 6.5 Rapport d'audit sécurité
- [ ] Créer `docs/SECURITY_AUDIT.md` avec :
  - Liste des vulnérabilités trouvées (XSS, path traversal, absence de rate limit, etc.)
  - Corrections appliquées
  - Recommandations restantes (RLS, secrets rotation, monitoring)

### 6.6 Checklist de mise en prod
- [ ] Créer `docs/PRODUCTION_CHECKLIST.md` avec :
  - [ ] Tous les secrets rotatés
  - [ ] `.env.local` non commité (`.gitignore` vérifié)
  - [ ] HTTPS activé sur le domaine
  - [ ] DNS pointant vers le bon serveur
  - [ ] RLS Supabase activé sur toutes les tables
  - [ ] Rate limiting en place sur toutes les routes
  - [ ] Health check endpoint fonctionnel
  - [ ] Monitoring configuré
  - [ ] Backup base de données testé
  - [ ] Build de dev (EAS) testé sur un vrai téléphone
  - [ ] Test de paiement Mobile Money avec un vrai numéro

---

## Résumé des priorités

| Priorité | Tâche | Temps estimé |
|----------|-------|-------------|
| 🔴 1 | Redémarrer Expo + vérifier connexion | 5 min |
| 🔴 2 | Rotate tous les secrets | 30 min |
| 🔴 3 | Supabase RLS | 1h |
| 🟠 4 | WhatsApp + Changement mdp | 2h |
| 🟠 5 | Build de dev (notifications push) | 2h |
| 🟠 6 | Test wallet Mobile Money | 1h |
| 🟡 7 | États vides UI | 1h |
| 🟡 8 | Documentation de clôture | 3h |
| 🟢 9 | Monitoring + CI/CD | 2h |
