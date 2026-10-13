# Handoff Report - Survey Mobile UI & Application Flow (R4 & R5)

## 1. Observation

1. **Architecture Globale & Graphe :**
   - Consultation de `graphify-out/GRAPH_REPORT.md` confirmant la communauté 0 (`types.ts`, `AiApplyModal`, `OfficialCvCardPreview`), la communauté 3 (`GlassComponents.tsx`, `stitchColors`), la communauté 58 (`ProfileScreen.tsx`) et la communauté 9 (`lucide-react-native`).
2. **Tokens Graphiques & Thème :**
   - `src/theme/stitch.ts` définit le système de design sombre ("AI Analyzer" dark system) :
     - Fond : `stitchColors.paper` (`#090714`), `stitchColors.surface` (`#131024`), `stitchColors.surfaceContainerHigh` (`#191433`).
     - Texte : `stitchColors.ink` (`#F8FAFC`), `stitchColors.inkMuted` (`#94A3B8`).
     - Accents : `stitchColors.sienna` (`#8B5CF6`), `stitchColors.siennaDeep` (`#7C3AED`), `stitchColors.emerald` (`#34D399`), `stitchColors.emeraldBg` (`rgba(52, 211, 153, 0.14)`).
     - Polices : `fontFamilies.outfit` (titres), `fontFamilies.inter` (textes), `fontFamilies.mono` (code monospace).
3. **Composant ProfileScreen :**
   - `src/ui/screens/ProfileScreen.tsx` :
     - Reçoit `studentProfile: StudentProfile | null` (ligne 42, 122).
     - Lignes 178-195 : groupe `settingsRows` (Sécurité, Notifications).
     - Lignes 197-235 : groupe `accountRows` (Support WhatsApp, Synchronisation, Déconnexion).
     - Le profil étudiant possède déjà `whatsappPhone` dans son type `StudentProfile` (`src/features/auth/betterAuth.ts:32`).
4. **Composant AiApplyModal :**
   - `src/features/stages/AiApplyModal.tsx` :
     - Machine à états : `step: 'generating' | 'preview' | 'sent'` (ligne 179).
     - Lignes 321-395 : Handlers `handleCopyPitchForWhatsapp`, `handleDownloadPdf`, `handleInAppApply`, `handleOpenWhatsapp`, `handleOpenEmail`.
     - Lignes 650-692 : Bloc `actionsBox` proposant 3 boutons simples : In-App, WhatsApp RH (ouvre le lien externe `whatsappUrl`), et Email RH.
     - Lignes 696-716 : Étape `step === 'sent'` affichant la confirmation et le rappel J+7.
5. **Gestion du Presse-Papiers :**
   - `package.json` ne contient pas `expo-clipboard`.
   - `node_modules/react-native/types/index.d.ts` et `node_modules/react-native/Libraries/Components/Clipboard/Clipboard.js` fournissent `Clipboard` (`Clipboard.setString(text)`).
   - `AiApplyModal.tsx:331` et `ApplicationDetailModal.tsx:188` utilisent `if (typeof navigator !== 'undefined' && navigator.clipboard) { await navigator.clipboard.writeText(pitch); }`.
6. **Icônes Lucide :**
   - `node_modules/lucide-react-native/dist/lucide-react-native.d.ts` exporte bien : `Zap`, `MessageSquare`, `MessageCircle`, `Copy`, `Check`, `CheckCircle2`, `Mail`, `Send`, `Smartphone`, `Clock`, `ShieldCheck`.
7. **Typecheck Initial :**
   - Commande `npm run typecheck` dans le root : 0 erreurs.
   - Commande `cd mobile-api && npm run typecheck` : 0 erreurs.

---

## 2. Logic Chain

1. **De l'observation 1 et 2 vers l'implémentation de R4 :**
   - Les tokens de `src/theme/stitch.ts` fournissent exactement ce qu'exige la spécification "calm anti-saturation" : surfaces sombres, bordures subtiles (`stitchColors.glassBorder`), et contraste élevé sans saturation excessive. Le code à 8 chiffres peut être mis en valeur dans un conteneur `surfaceContainerHigh` avec la police `fontFamilies.mono` en taille 32px espacée de 4px.
2. **De l'observation 5 vers la fonction de copie 1-tap :**
   - En combinant `navigator.clipboard.writeText` sur le web et `Clipboard.setString` de `react-native` sur mobile, on assure un fonctionnement 1-tap sans installer de dépendance superflue et avec un typage TypeScript strict à 100%.
3. **De l'observation 3 vers l'accessibilité dans ProfileScreen :**
   - En intégrant une ligne "Liaison WhatsApp (Candidatures automatiques)" dans `settingsRows` ou `accountRows` de `ProfileScreen.tsx`, avec un badge dynamique (`✅ WhatsApp connecté` ou `Non connecté`), l'étudiant peut configurer ou vérifier son jumelage à tout moment en dehors du tunnel de candidature.
4. **De l'observation 4 vers le refactoring de R5 dans AiApplyModal :**
   - En remplaçant le bloc `actionsBox` (lignes 650-692) par une logique conditionnelle selon l'état de jumelage :
     - Si WhatsApp lié : Le CTA signature devient `[ ⚡ Postuler en 1 Clic (Envoi Automatique) ]`, déclenchant `dispatchStageApplication` sans ouvrir d'app externe.
     - Si WhatsApp non lié : Deux options sont offertes : le jumelage rapide en 30s (`[ 🔗 Lier mon WhatsApp en 30s ]` ouvrant `WhatsAppPairingModal`), ou le bouton de secours natif deep-link (`[ 💬 Ouvrir WhatsApp Manuellement ]`).
     - Dans tous les cas, l'option `[ ✉️ Expédier ma Candidature par Email ]` reste accessible.
5. **De l'observation 4 vers la synchronisation de la timeline :**
   - L'appel `persistApplicationsLocally` et `submitStageApplication` dans `stagesApi.ts` enregistre la candidature avec le canal utilisé (`whatsapp` ou `email`) et l'état `PENDING` / `SENT_PENDING`, assurant que `ApplicationsTimelineScreen.tsx` affiche immédiatement la nouvelle entrée.

---

## 3. Caveats

1. **Dépendance au backend proxy R1 & R2 :**
   - Le composant `WhatsAppPairingModal` dépend des endpoints backend `POST /api/mobile/whatsapp/instance` et `POST /api/mobile/stages/dispatch`. En l'absence de ces routes opérationnelles, un fallback de simulation locale doit être prévu pour ne pas bloquer les tests UI.
2. **Gestion de session hors-ligne :**
   - Sur appareil mobile, la persistance du numéro et du statut de session doit privilégier `SecureStore` (ou `authStorage`), avec repli sur `localStorage` en environnement web Expo.

---

## 4. Conclusion

L'enquête démontre que l'application mobile dispose de tous les blocs constitutifs nécessaires pour R4 et R5 :
- Les tokens design system `stitchColors` et `fontFamilies` sont immédiatement utilisables.
- Le presse-papiers est résolu via l'hybride `navigator.clipboard` / React Native `Clipboard`.
- Les icônes requises sont toutes disponibles dans `lucide-react-native`.
- Le plan de découpage technique détaillé dans `survey_report.md` est prêt à être exécuté par le sous-agent d'implémentation sans ambiguïté.

---

## 5. Verification Method

Pour vérifier indépendamment ces constats :
1. **Vérification du Typecheck :**
   ```powershell
   npm run typecheck
   cd mobile-api && npm run typecheck
   ```
   *Critère d'invalidation :* Toute erreur de type TypeScript sur `Clipboard`, `stitchColors`, ou `StageApplication`.
2. **Inspection des Fichiers Clés :**
   - `src/theme/stitch.ts` : Vérifier la présence de `stitchColors.emeraldBg`, `fontFamilies.mono`.
   - `src/features/stages/AiApplyModal.tsx` : Inspecter les lignes 650-692 (`actionsBox`).
   - `src/ui/screens/ProfileScreen.tsx` : Inspecter `settingsRows` et `accountRows`.
   - `src/types.ts` : Inspecter les types `StageApplication` et `OfficialCvData`.
