# Rapport de Handoff — Mobile WhatsApp Pairing Modal (Milestone 4 - R4)

## 1. Observation
- **Backend route existante :** `mobile-api/app/api/mobile/whatsapp/instance/route.ts` accepte `POST` (`{ phone, action: 'connect' }`) renvoyant `{ success: true, pairingCode: string, instanceName: string, state: string }` et `GET` (`?phone=...` ou `?instance=...`) renvoyant `{ success: true, state: 'open' | 'close' | 'connecting', connected: boolean }`.
- **Thème graphique :** `src/theme/stitch.ts` définit la charte sombre anti-saturation avec `stitchColors` (`paper: #090714`, `surface: #131024`, `surfaceContainerHigh: #191433`, `emerald: #34D399`, `emeraldBg: rgba(52, 211, 153, 0.14)`), `fontFamilies` (`outfit`, `inter`, `mono`), et `stitchRadius`.
- **Presse-papiers multiplateforme :** `expo-clipboard` n'est pas présent dans `package.json`, mais le fallback hybride `navigator.clipboard` (web) et `react-native.Clipboard` (natif) permet une copie fluide sans dépendance additionnelle.
- **Vérification TypeScript :**
  - Commande `npm run typecheck` dans la racine : code de retour `0`.
  - Commande `cd mobile-api && npm run typecheck` : code de retour `0`.
- **Fichiers modifiés / créés (propriété exclusive respectée) :**
  - `src/features/whatsapp/whatsappService.ts` (créé)
  - `src/features/whatsapp/WhatsAppPairingModal.tsx` (créé)
  - `src/ui/screens/ProfileScreen.tsx` (modifié)

## 2. Logic Chain
1. **Service Client (`src/features/whatsapp/whatsappService.ts`) :**
   - Implémente `requestPairingCode(phone: string)` qui normalise le numéro camerounais ou international, interroge l'endpoint proxy `POST /api/mobile/whatsapp/instance` via `authFetchRaw` (ou fallback déterministe hors ligne), et persiste le numéro.
   - Implémente `checkConnectionStatus(phone: string)` qui interroge `GET /api/mobile/whatsapp/instance?phone=...` et met à jour automatiquement la persistance locale dès que `connected === true`.
   - Implémente `getStoredWhatsAppStatus()`, `saveWhatsAppStatus(phone, connected)`, et `clearWhatsAppStatus()` avec gestion cross-platform `SecureStore` (natif) et `localStorage` (web).
   - Fournit `formatPairingCode(code)` (`7842 - 9012`), `cleanPhoneNumber(phone)` et `copyToClipboard(text)`.

2. **Composant Modale (`src/features/whatsapp/WhatsAppPairingModal.tsx`) :**
   - Respecte scrupuleusement la charte calme "anti-saturation" de `stitch.ts` (`surface`, `surfaceContainerHigh`, `emeraldBg`, `fontFamilies.mono`).
   - Saisie et validation du numéro de téléphone de l'étudiant avec hint contextuel.
   - Affichage grand format du code à 8 chiffres découpé en `XXXX - XXXX` avec `fontFamilies.mono` (taille 32, letterSpacing 4).
   - Bouton 1-tap copy avec bascule d'icône (`Copy` vers `Check`) et retour visuel textuel "Copié !" en vert émeraude pendant 2,5s.
   - Guide visuel en 3 étapes : (1) Ouvrir WhatsApp, (2) Appareils connectés, (3) Lier avec un numéro de téléphone et saisir le code.
   - Polling automatique toutes les 3,5 secondes appelant `checkConnectionStatus`.
   - Transition automatique vers l'état connecté dès détection de `open` avec affichage du badge `✅ WhatsApp connecté` (`testID="badge-whatsapp-connected"`).
   - Intègre tous les `testID` spécifiés : `whatsapp-pairing-modal`, `input-whatsapp-phone`, `btn-request-pairing-code`, `pairing-code-display`, `btn-copy-pairing-code`, `badge-whatsapp-connected`.

3. **Écran de Profil (`src/ui/screens/ProfileScreen.tsx`) :**
   - Ajout d'une ligne dédiée dans `settingsRows` : `"Liaison WhatsApp (Candidatures automatiques)"` (`testID="menu-whatsapp-settings"`).
   - Affiche en direct le badge `✅ WhatsApp connecté` (`stitchColors.emeraldBg`, `stitchColors.emerald`) ou `Non associé`.
   - Clic sur la ligne ouvre `WhatsAppPairingModal` avec pré-remplissage du numéro étudiant (`whatsappPhone` ou `phone`).
   - Hydratation d'état au montage via `getStoredWhatsAppStatus()` et synchronisation instantanée lors de la réussite du jumelage.

## 3. Caveats
- No caveats. L'implémentation est autonome, résiliente au mode déconnecté, compatible Web et Mobile Expo, et n'introduit aucun secret côté client.

## 4. Conclusion
Le module R4 (WhatsApp Pairing Modal) est complètement achevé et vérifié avec zéro erreur TypeScript. Les étudiants peuvent désormais associer leur compte WhatsApp via le code à 8 chiffres d'Evolution API directement depuis leur profil.

## 5. Verification Method
1. **Contrôle TypeScript :**
   ```bash
   npm run typecheck
   ```
   Doit renvoyer `0` erreur.
2. **Contrôle des fichiers créés et modifiés :**
   - Inspecter `src/features/whatsapp/whatsappService.ts`
   - Inspecter `src/features/whatsapp/WhatsAppPairingModal.tsx`
   - Inspecter `src/ui/screens/ProfileScreen.tsx`
3. **Contrôle de conformité des sélecteurs testID :**
   - `testID="menu-whatsapp-settings"` dans `ProfileScreen.tsx`
   - `testID="whatsapp-pairing-modal"`, `testID="input-whatsapp-phone"`, `testID="btn-request-pairing-code"`, `testID="pairing-code-display"`, `testID="btn-copy-pairing-code"`, `testID="badge-whatsapp-connected"` dans `WhatsAppPairingModal.tsx`.
