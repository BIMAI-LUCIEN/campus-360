# Rapport d'Investigation Technique - Mobile UI & Application Flow (R4 & R5)

**Date :** 2026-10-05  
**Projet :** Campus 360 (Expo SDK 54 / React Native 0.81.5 / React 19)  
**Auteur :** Explorer Subagent (teamwork_preview_explorer)  
**Périmètre :** R4 (WhatsApp Pairing Modal) & R5 (1-Click Apply Flow & Native Fallback)

---

## 1. Résumé Exécutif

L'application mobile Campus 360 dispose déjà d'une architecture modulaire solide pour les stages (`src/features/stages/`), d'un système d'authentification et de stockage local robuste (`src/features/auth/betterAuth.ts`), et d'une charte graphique sombre et éditoriale "calm anti-saturation" (`src/theme/stitch.ts`).

L'objectif de cette investigation est de cartographier avec exactitude :
1. **R4 - WhatsApp Pairing Modal (`src/features/whatsapp/WhatsAppPairingModal.tsx`)** : Création du module de jumelage WhatsApp via Evolution API, gestion de l'affichage du code à 8 chiffres (ex. `7842 - 9012`), copie en 1-tap, polling d'état `open`, badge de confirmation vert `✅ WhatsApp connecté`, et accessibilité depuis `ProfileScreen.tsx` et `AiApplyModal.tsx`.
2. **R5 - 1-Click Apply Flow & Native Fallback (`src/features/stages/AiApplyModal.tsx`)** : Refactorisation de l'étape d'envoi pour basculer automatiquement entre le bouton d'action primaire `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]` (si WhatsApp lié), l'envoi email `[ ✉️ Expédier ma Candidature par Email ]`, ou les options sans jumelage (jumelage express en 30s ou fallback natif deep-link `[ 💬 Ouvrir WhatsApp Manuellement ]`), avec synchronisation temps réel de la timeline des candidatures.

---

## 2. Système de Design "Calm Anti-Saturation" & Tokens Graphiques

L'application utilise un thème sombre raffiné fondé sur des surfaces obsidiennes profondes, des contrastes doux (pas de néon criard), et des polices typographiques dédiées.

### 2.1 Tokens de Couleurs (`src/theme/stitch.ts`)
| Token | Valeur Hex/RGBA | Usage |
|---|---|---|
| `stitchColors.paper` | `#090714` | Fond principal de l'écran |
| `stitchColors.paperDeep` | `#0D0A1C` | Fond des overlays et conteneurs profonds |
| `stitchColors.surface` | `#131024` | Fond des cartes et modales |
| `stitchColors.surfaceVariant` | `#1A1435` | Fond des conteneurs interactifs et champs |
| `stitchColors.surfaceContainerHigh` | `#191433` | Fond des blocs de code / aperçu |
| `stitchColors.ink` | `#F8FAFC` | Texte principal blanc doux |
| `stitchColors.inkSoft` | `#E2E8F0` | Texte secondaire lisible |
| `stitchColors.inkMuted` | `#94A3B8` | Sous-titres et labels neutres |
| `stitchColors.inkSubtle` | `#64748B` | Textes tertiaires et placeholders |
| `stitchColors.sienna` | `#8B5CF6` | Accentuation violet électrique sobre |
| `stitchColors.siennaDeep` | `#7C3AED` | Boutons d'action principale |
| `stitchColors.emerald` | `#34D399` | Succès, badges de confirmation |
| `stitchColors.emeraldDeep` | `#10B981` | Accent vert WhatsApp connecté |
| `stitchColors.emeraldBg` | `rgba(52, 211, 153, 0.14)` | Fond translucide du badge WhatsApp connecté |
| `stitchColors.glassBorder` | `rgba(139, 92, 246, 0.14)` | Bordures fines non intrusives |
| `brandGradient` | `['#8B5CF6', '#6D28D9', '#4C1D95']` | Dégradé pour le bouton 1-clic |

### 2.2 Typographie (`fontFamilies`)
- **Titres & Headlines :** `fontFamilies.outfit` (`Platform.select({ ios: 'System', android: 'sans-serif-medium', web: 'Outfit, sans-serif' })`)
- **Textes & Corps :** `fontFamilies.inter` (`Platform.select({ ios: 'System', android: 'sans-serif', web: 'Inter, sans-serif' })`)
- **Code à 8 chiffres :** `fontFamilies.mono` (`Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' })`)

### 2.3 Rayons & Espacements (`stitchRadius`, `stitchSpacing`)
- Modales : `borderTopLeftRadius: 18`, `borderTopRightRadius: 18` (ou `stitchRadius.card: 18`)
- Boutons : `borderRadius: 12` ou `stitchRadius.button: 14`
- Badges / Chips : `borderRadius: 8` ou `stitchRadius.sm: 10`

---

## 3. Gestion du Presse-Papiers (Cross-Platform 1-Tap Copy)

### 3.1 Diagnostic Technique
- Le package `expo-clipboard` n'est pas présent dans `package.json`.
- En revanche, React Native 0.81.5 embarque nativement `Clipboard` (`import { Clipboard } from 'react-native'`), typé dans `node_modules/react-native/types/index.d.ts` et implémenté dans `node_modules/react-native/Libraries/Components/Clipboard/Clipboard.js`.
- Sur le web (navigateur / Expo Web), l'API standard `navigator.clipboard.writeText()` est privilégiée.

### 3.2 Fonction Helper Recommandée
```typescript
import { Platform, Clipboard } from 'react-native';

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    Clipboard.setString(text);
    return true;
  } catch (err) {
    console.warn('[clipboard] Error copying text:', err);
    return false;
  }
}
```

---

## 4. R4 - WhatsApp Pairing Modal (`WhatsAppPairingModal.tsx`)

### 4.1 Structure de Fichiers Recommandée
```
src/features/whatsapp/
├── WhatsAppPairingModal.tsx    # Modal UI jumelage & polling
├── whatsappApi.ts             # Service client communiquant avec /api/mobile/whatsapp/instance
└── types.ts                   # Types WhatsAppSessionStatus, PairingCodeResponse, etc.
```

### 4.2 Spécification du Service Client (`whatsappApi.ts`)
Le composant mobile ne doit jamais détenir de tokens secrets Evolution API. Toutes les requêtes transitent par le backend proxy `mobile-api/app/api/mobile/whatsapp/instance/route.ts` via `authFetchRaw` ou `authFetch` :
1. **Demande de code de jumelage :**
   - Appel : `POST /api/mobile/whatsapp/instance`
   - Body : `{ action: 'create_and_pair', phone: cleanPhone }`
   - Réponse : `{ instanceName: 'student-237690123456', pairingCode: '78429012', status: 'connecting' }`
2. **Polling de l'état de connexion :**
   - Appel : `GET /api/mobile/whatsapp/instance?instanceName=student-237690123456`
   - Réponse : `{ instanceName: string, state: 'open' | 'close' | 'connecting', connected: boolean }`
3. **Persistance locale de la session :**
   - Sauvegarde dans `authStorage` (ou `AsyncStorage`/`SecureStore`) sous la clé `campus360_whatsapp_session` : `{ phone: string, instanceName: string, connected: boolean, linkedAt: string }`.

### 4.3 Machine à États du Composant `WhatsAppPairingModal.tsx`
- **États :**
  - `'idle'` : L'étudiant saisit / confirme son numéro de téléphone camerounais ou international (pré-rempli avec `studentProfile.phoneWhatsapp` ou `studentProfile.phone`).
  - `'generating'` : Spinner sobre ("Génération de votre code sécurisé...").
  - `'pairing'` : Le code à 8 chiffres est affiché (`7842 - 9012`), un bouton "Copier le code" est disponible, et un intervalle de polling (toutes les 3,5s) vérifie l'état `open`.
  - `'connected'` : L'instance est connectée ! Affichage du badge vert `✅ WhatsApp connecté`, arrêt du polling, bouton "Terminer".
  - `'error'` : Message d'erreur calme avec possibilité de réessayer.

### 4.4 Design du Bloc d'Affichage du Code (Anti-Saturation)
- **Conteneur :** Fond `stitchColors.surfaceContainerHigh` (`#191433`), bordure `rgba(139, 92, 246, 0.25)`, padding 20, arrondi 14.
- **Code :**
  - Formatage : `code.slice(0, 4) + ' - ' + code.slice(4)` (ex. `7842 - 9012`)
  - Police : `fontFamilies.mono`, taille 32px, `fontWeight: '700'`, `letterSpacing: 4`, couleur `#F8FAFC`.
- **Bouton 1-tap copy :**
  - Bouton secondaire avec icône `Copy` (ou `Check` si copié).
  - Feedback visuel : label qui bascule en "Copié !" avec couleur `#34D399` pendant 2,5 secondes.
- **Instructions en 3 étapes :**
  1. Ouvrez **WhatsApp** sur votre smartphone.
  2. Allez dans **Réglages** (ou **⋮**) > **Appareils connectés** > **Connecter un appareil**.
  3. Appuyez sur **« Lier avec un numéro de téléphone »** et saisissez le code ci-dessus.
- **Indicateur de Polling :**
  - Pulsation discrète avec `ActivityIndicator` taille petite et texte `stitchColors.inkMuted` : *"En attente de validation sur votre téléphone..."*
- **Badge Connecté :**
  - Fond `rgba(52, 211, 153, 0.14)`, bordure `rgba(52, 211, 153, 0.3)`, texte `#34D399`, icône `CheckCircle2`.

### 4.5 Points d'Entrée & Accessibilité
1. **Depuis `src/ui/screens/ProfileScreen.tsx` :**
   - Ajouter un item dans `settingsRows` ou `accountRows` :
     - `key: 'whatsapp_link'`
     - `label: 'Liaison WhatsApp (Candidatures)'`
     - `Icon: MessageSquare`
     - `iconBg: 'rgba(52, 211, 153, 0.14)'`
     - `iconColor: '#34D399'`
     - Badge visuel adjacent : si connecté `✅ Connecté`, si non connecté `Non connecté`.
     - Clic : ouverture de `WhatsAppPairingModal`.
2. **Depuis `src/features/stages/AiApplyModal.tsx` :**
   - Si le compte n'est pas jumelé, une bannière dédiée propose : `[ 🔗 Lier mon WhatsApp en 30s ]`, qui ouvre directement `WhatsAppPairingModal`.

---

## 5. R5 - 1-Click Apply Flow & Native Fallback (`AiApplyModal.tsx`)

### 5.1 Analyse du Fichier Actuel
Dans `src/features/stages/AiApplyModal.tsx` (lignes 650 à 692), le bloc `actionsBox` propose actuellement trois boutons horizontaux simples :
```tsx
<View style={styles.actionsBox}>
  <Text style={styles.actionsTitle}>Canal d'envoi :</Text>
  <View style={styles.channelRow}>
    <Pressable testID="btn-apply-inapp" onPress={handleInAppApply}>...</Pressable>
    <Pressable onPress={handleOpenWhatsapp}>...</Pressable>
    <Pressable onPress={handleOpenEmail}>...</Pressable>
  </View>
</View>
```
Ce fonctionnement ne gère pas l'envoi automatisé en arrière-plan (background dispatch), oblige l'utilisateur à basculer dans WhatsApp via un lien externe `Linking.openURL`, et ne gère pas la détection d'état WhatsApp connecté.

### 5.2 Nouvel Enchaînement & Architecture de l'Étape d'Envoi

#### Cas A : WhatsApp Connecté (`isWhatsAppLinked === true`)
- **Action Primaire (Signature) :**
  ```tsx
  [ ⚡ Postuler en 1 Clic (Envoi Automatique) ]
  ```
  - Stylisé avec `LinearGradient` (`brandGradient.colors`), icône `Zap` (taille 16, couleur `#FFFFFF`), texte gras `fontFamilies.outfit`.
  - Comportement :
    1. Affiche un état de chargement élégant ("Envoi de votre candidature et du CV officiel en arrière-plan...").
    2. Appelle `dispatchStageApplication({ jobId, channel: 'whatsapp', ... })` qui contacte le backend `POST /api/mobile/stages/dispatch`.
    3. **N'OUVRE AUCUNE APPLICATION EXTERNE**.
    4. Enregistre la candidature localement et dans Supabase (`status: 'SENT_PENDING'` ou `'PENDING'`).
    5. Bascule immédiatement vers l'écran de confirmation (`step === 'sent'`).
- **Action Alternative :**
  ```tsx
  [ ✉️ Expédier ma Candidature par Email ]
  ```
  - Bouton secondaire sombre avec icône `Mail`. Dispatche via le canal email N8N/SMTP sans quitter l'app.

#### Cas B : WhatsApp Non Connecté (`isWhatsAppLinked === false`)
- **Option 1 (Jumelage Recommandé) :**
  - Carte incitative sobre avec badge :
    ```
    ⚡ Envoi 1-Clic disponible
    Liez votre compte WhatsApp une seule fois en 30 secondes pour expédier vos CV automatiquement sans quitter l'application.
    [ 🔗 Lier mon WhatsApp en 30s ]
    ```
  - Clic : ouverture du `WhatsAppPairingModal`. Dès que le polling détecte `open`, la modale se ferme et l'écran `AiApplyModal` déverrouille instantanément le bouton `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]` !
- **Option 2 (Fallback Natif Sans Jumelage) :**
  - Bouton de fallback immédiat :
    ```tsx
    [ 💬 Ouvrir WhatsApp Manuellement ]
    ```
  - Comportement : utilise le deep-link natif (`Linking.openURL(result.whatsappUrl)`), pré-rempli avec le pitch, et enregistre la candidature dans la timeline locale.
- **Option 3 :**
  - Bouton `[ ✉️ Expédier ma Candidature par Email ]`.

### 5.3 Nouvelle Étape de Confirmation & Récépissé (`step === 'sent'`)
L'étape de succès (`step === 'sent'`) doit être enrichie pour afficher un récépissé complet :
1. **Badge du canal utilisé :**
   - Si 1-Clic : `⚡ Envoyé automatiquement via WhatsApp RH` (Vert émeraude)
   - Si Email : `✉️ Envoyé via Email RH`
   - Si Manuel : `💬 Message ouvert dans WhatsApp`
2. **Détails de transmission :**
   - Entreprise & Poste
   - Récépissé du CV officiel PDF joint
   - Date & Heure
   - Relance programmée à J+7
3. **Synchronisation avec la Timeline :**
   - Mise à jour immédiate de `localApplications` dans `stagesApi.ts`.
   - Appel du callback `onApplicationComplete?.()` pour que `ApplicationsTimelineScreen.tsx` ou `StagesScreen.tsx` se rafraîchisse sans rechargement.

---

## 6. Inventaire des Icônes Vérifiées (`lucide-react-native`)

Toutes les icônes requises ont été vérifiées et sont présentes dans `node_modules/lucide-react-native` :
- `Zap` : Éclair pour le bouton d'envoi 1-clic
- `MessageSquare` / `MessageCircle` : Icône de bulle WhatsApp
- `Copy` & `Check` : Bouton copier et feedback de copie
- `CheckCircle2` : Badge de succès et statut connecté
- `Mail` : Bouton d'envoi Email
- `Send` : Dispatch
- `Smartphone` : Téléphone / jumelage
- `Clock` : Statut en attente / polling
- `ShieldCheck` : Sécurité et statut vérifié
- `QrCode` : Jumelage
- `RefreshCw` : Synchronisation

---

## 7. Contrat d'Intégration Backend & Sécurité

### 7.1 Proxy WhatsApp (`/api/mobile/whatsapp/instance`)
- Le client appelle :
  ```typescript
  // POST pour initier / générer le code
  POST /api/mobile/whatsapp/instance
  Body: { phone: string, action: 'create_and_pair' }
  Response: { instanceName: string, pairingCode: string, status: 'connecting' }

  // GET pour interroger le statut
  GET /api/mobile/whatsapp/instance?instanceName=student-237690123456
  Response: { instanceName: string, state: 'open' | 'close' | 'connecting', connected: boolean }
  ```
- Sécurité : Le token Better Auth est transmis via `Authorization: Bearer <token>` via `authFetch`. La clé secrète Evolution API reste strictement confinée côté backend (`mobile-api`).

### 7.2 Dispatch Candidature (`/api/mobile/stages/dispatch`)
- Le client appelle :
  ```typescript
  POST /api/mobile/stages/dispatch
  Body: {
    jobId: string,
    channel: 'whatsapp' | 'email',
    whatsappPitch: string,
    letterText: string,
    cvText: string,
    officialCv?: OfficialCvData,
    cvPdfBase64?: string,
    studentPhone?: string,
    instanceName?: string,
  }
  Response: {
    success: boolean,
    applicationId: string,
    status: 'SENT_PENDING' | 'DELIVERED',
    dispatchedAt: string
  }
  ```

---

## 8. Conformité des Tests & Non-Régression

1. **TypeScript :**
   - Le code respecte scrupuleusement le typage strict (`tsc --noEmit` zéro erreur).
   - Utilisation de `types.ts` et `stitch.ts`.
2. **Sélecteurs Playwright :**
   - Les `testID` et `data-testid` suivants doivent être systématiquement posés pour les tests automatisés :
     - `testID="whatsapp-pairing-modal"`
     - `testID="input-whatsapp-phone"`
     - `testID="btn-request-pairing-code"`
     - `testID="pairing-code-display"`
     - `testID="btn-copy-pairing-code"`
     - `testID="badge-whatsapp-connected"`
     - `testID="btn-apply-one-click"`
     - `testID="btn-apply-email"`
     - `testID="btn-apply-manual-whatsapp"`
     - `testID="btn-link-whatsapp-express"`
     - `testID="menu-whatsapp-settings"` (dans `ProfileScreen`)

---

## 9. Conclusion

L'infrastructure mobile existante est parfaitement préparée pour accueillir R4 et R5. Le design system dark anti-saturation (`stitchColors`, `fontFamilies`) offre un cadre esthétique complet sans aucune dépendance manquante. L'implémenteur disposera d'une feuille de route chirurgicale pour coder les composants et assurer une expérience étudiante fluide, performante et sans friction.
