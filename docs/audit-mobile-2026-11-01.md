# Audit de l'app mobile du 2026-11-01

7 agents d'audit, en lecture seule : coquille/auth, stages, suivi, paiements, documents, PDF, design.
✅ = vérifié dans le code par l'agent principal. Les autres constats viennent des rapports et seront relus au moment de les corriger.
Aucune exécution sur appareil : les débordements de mise en page sont des estimations à confirmer sur un écran de 360×640.

---

## Lot 1 : P0, à corriger avant toute chose

> **État au 2026-11-01** : les points 1 à 7, 9 et 10 sont corrigés dans le code (non commités). Le point 8 est reporté au lot 3.
> Il faut aussi : poser `N8N_STAGE_WEBHOOK_SECRET` sur le VPS et dans n8n, réimporter le workflow `send_stage_application_workflow.json` dans n8n, et lancer la migration 0026.

| # | Problème | Preuve | Correctif |
|---|---|---|---|
| 1 ✅ | **Crash à l'ouverture d'une candidature** : un `useState` est appelé après un `return null`, ce qui casse la règle des hooks | `src/features/stages/ApplicationDetailModal.tsx:189` puis `:357` | Remonter le `useState(withdrawing)` au-dessus du `return` |
| 2 ✅ | **Envoi WhatsApp et e-mail avec une identité choisie par le client** : `studentEmail` et `studentPhone` viennent du corps de la requête, et l'instance WhatsApp en est déduite. Un étudiant peut donc envoyer depuis l'instance d'un autre | `mobile-api/app/api/mobile/stages/dispatch/route.ts:104-125` | Dériver l'e-mail, le téléphone et l'instance de la session uniquement |
| 3 ✅ | **Webhook n8n d'envoi public** : aucune authentification, et son URL est en dur dans le code. N'importe qui peut envoyer des WhatsApp et des e-mails avec nos comptes | `scripts/n8n/send_stage_application_workflow.json`, `dispatch/route.ts:211-213` | Exiger un secret d'en-tête dans n8n, envoyé par l'API. Même chose pour les webhooks du workflow de session WhatsApp |
| 4 ✅ | **Un CV d'exemple part au recruteur** quand le PDF de l'élève manque (web, ou erreur d'export) | Workflow n8n `…\|\| 'cv-sample.pdf'`, `AiApplyModal.tsx:440`, `pdfExportService.ts:186` | Renvoyer 422 si aucun CV n'est fourni, et retirer les valeurs par défaut (dont les données personnelles réelles) du workflow |
| 5 ✅ | **Envoi 1-clic en échec non remboursé** : le CV IA a déjà débité, donc le dispatch voit « déjà payé », `refundIfFailed` n'est jamais posé et l'élève perd ses crédits | `dispatch/route.ts:148-149`, `stage-charge-core.ts:38` | Rembourser `stage-apply:<jobId>` sur tout échec d'envoi, aussi sur le PATCH FAILED de n8n |
| 6 ✅ | **Génération CV, lettre et rapport complet impossible** : l'INSERT `type='ai_generation'` est refusé par la contrainte CHECK, la transaction est annulée et l'appel IA payé pour rien | `documents/generate/route.ts:194`, `generate-full/route.ts:495`, `sql/0024_pricing_v2.sql:67` | Nouvelle migration qui ajoute `ai_generation`, plus un test. À confirmer d'abord sur la base de production |
| 7 ✅ | **Onboarding « Choisis tes PDF gratuits » et achats PDF toujours en échec** : les routes répondent 410 | `purchase/document/route.ts`, `purchase/pack`, `ia-packs/purchase` ; appelants `FreePdfSelector.tsx:135`, `AppShell.tsx:904,932,988`, `PdfStudentSection.tsx:972` | Retirer ces flux (les PDF sont gratuits en v2), ou remplacer l'étape par « ajouter à ma bibliothèque » |
| 8 | **Statuts de candidature figés** : aucune route ne pose INTERVIEW, ACCEPTED ou REJECTED, et le PATCH de dispatch n'est appelé par aucun workflow | `stages/dispatch/route.ts:307`, admin en lecture seule | Lot 3 |
| 9 ✅ | **Réponses IA illisibles** : `FormattedMarkdown` est appelé avec `isDark={true}` sur un fond clair, les titres H4 sont blancs sur blanc | `SimplePdfReaderModal.tsx:649`, `ZoneQuestionSheet.tsx:95`, `PdfStudentSection.tsx:1353` | Passer `isDark={false}` |
| 10 | **Modale de recharge non défilante** : le contenu fait environ 750 px, la modale n'a ni ScrollView ni gestion du clavier, et le bouton Valider est masqué sur 640 px de haut | `AppShell.tsx:1568-1640`, `ModalCard` `:200` | Ajouter un ScrollView, `maxHeight` et `KeyboardAvoidingView` dans `ModalCard` |

## Lot 2 : argent et paiements (P1)

- ✅ Message d'échec de recharge inversé, à cause d'un ternaire sans parenthèses : `AppShell.tsx:1053`. Un client MTN reçoit la procédure Orange, et le motif renvoyé par le serveur n'est jamais affiché.
- « Solde insuffisant » n'est jamais détecté (le client cherche `'insufficient'`, le serveur écrit en français) : `AppShell.tsx:915,998`. À l'inverse, tout échec s'affiche comme « solde insuffisant » : `:953`.
- Crédit de recharge par polling sans contrôle du montant (le montant est comparé à lui-même) : `topup/[reference]/route.ts:186-204`. Ne créditer que par webhook, ou avec le montant du fournisseur.
- `purchaseId` et `generationId` sont régénérés à chaque appel : un double tap ou une nouvelle tentative facture deux fois. Voir `offersApi.ts:38`, `OffersModal.tsx:55` et `WritingWorkshopModal.tsx:128`.
- Le montant présélectionné vaut 500 F alors que l'offre coûte plus cher : `PaymentModal.tsx:52`, avec un 409 au retour.
- Aucune garde contre une clé `sk_test_` en production : `payments.ts:234`.
- IA de l'éditeur en fail-open : une erreur de base de données donne une génération gratuite (`documents/ai/route.ts:107`). Un échec IA est débité sans remboursement et renvoie le prompt comme résultat (`:136-143`).
- Le quota IA PDF est consommé même quand l'IA échoue (`ai/pdf-chat/route.ts:71`), et un 402 compte quand même dans le quota de 60 requêtes.
- Le débit a lieu à la génération du CV, donc avant la confirmation d'envoi. Les canaux manuels (mailto annulé, WhatsApp) débitent sans envoyer : `AiApplyModal.tsx:246-296, 492, 550, 610`.
- Pas d'idempotence de l'envoi : un double appel envoie deux fois au recruteur (`stages-db.ts:648`).
- ✅ Récompense de contribution : le serveur crédite 50 coins (`pricing.ts:76`), l'interface en annonce 10 (`SharePdfsModal.tsx:83`, `ContributionStatus.tsx:13`, `MyContributionsScreen.tsx:47,77`).
- Unités incohérentes pour la même somme : « C », « cr », « Coins », « FCFA », « F ». Choisir une unité et un seul formateur.
- Monnaie `ia_credits` héritée : 50 crédits offerts, aucune route d'achat, puis des 402 sans issue (`documents/ai`, `generate`, `generate-full`). Elle n'est pas alignée sur le §19.
- Transactions `pending` jamais expirées. Bonus d'inscription sans ligne d'historique (`mobile-access.ts:149`).

## Lot 3 : suivi des candidatures, à mettre en route

- Transitions de statut côté recruteur ou admin : route authentifiée et boutons dans l'admin. Ajouter le statut « vue ».
- Callback n8n vers le PATCH sécurisé de dispatch (DELIVERED / FAILED), et vérifier sur quelle base n8n écrit (REST Supabase ou `DATABASE_URL`).
- Notifications push `application_status` : l'app les attend (`AppShell.tsx:1135`), mais le serveur ne les envoie jamais.
- Notes privées : enregistrées en local seulement, alors que l'interface affiche « enregistrées » (`stagesApi.ts:620`). Il faut une route PATCH.
- Relance J+7 : `last_reminded_at` n'est jamais écrit, la relance est enregistrée avant l'envoi et l'éligibilité ne tient pas compte de la dernière relance (`stagesApi.ts:635-659`).
- Progression du détail : `findIndex` vaut -1 pour SENT_PENDING, DELIVERED et FAILED, donc aucune étape n'est cochée (`ApplicationDetailModal.tsx:779`).
- Écran vide trompeur au démarrage, cache disque jamais relu, et liste effacée si un rafraîchissement échoue (`ApplicationsTimelineScreen.tsx:120,352`).
- DDL `ALTER TYPE` exécuté à chaque envoi (`stages-db.ts:626`), contraire au §5. Si l'appel échoue, le statut est écrit en PENDING avec un tag `[Status: X]` dans les notes. Il faut une migration versionnée pour SENT_PENDING, DELIVERED, FAILED et WITHDRAWN, et vérifier l'état de la migration 0011.
- Un renvoi écrase le dossier : statut et `applied_at` sont réinitialisés (`stages-db.ts:648`).
- Copier ne copie rien sur mobile (`RN.Clipboard` absent, `expo-clipboard` non installé) : `whatsappService.ts:93`, `ApplicationDetailModal.tsx:263`.
- La déconnexion WhatsApp annonce un succès même si elle échoue (`whatsapp/instance/route.ts:342`, `whatsappService.ts:177`).
- L'instance WhatsApp est liée à un numéro non vérifié et non unique (`account/route.ts:137`) : un compte peut interroger ou déconnecter celle d'un autre.

## Lot 4 : sécurité (P1/P2)

- iframe `srcDoc` de l'éditeur sans `sandbox` sur le web : XSS possible via `draft_section`, qui n'est pas nettoyé côté serveur, et la regex de `aiHtml.ts:22` se contourne avec `/onerror` (`EditorSurface.tsx:46`, `[id]/chat/route.ts:172`). Même problème pour `CvTemplatePreview.tsx:35`.
- PDF non publiés ou archivés téléchargeables : aucun filtre `status` dans `signed-url/route.ts:86`, ni dans `stream/route.ts:48`. Les contributions refusées restent publiques sur Cloudinary.
- `public/pdf-viewer.html:465` : `innerHTML` avec un paramètre d'URL.
- Destinataire d'une offre importée extrait par l'IA, puis envoi 1-clic sans afficher l'adresse (`external-offer.ts:105`).
- E-mail de l'élève dans l'URL de partage (`StagesScreen.tsx:398`). La promesse d'un jeton de parrainage n'a aucun code derrière.
- Corps de requêtes IA non bornés (`ai/pdf-chat`, `cv-background`, `cover_data`, `cvPdfBase64`).
- Session expirée affichée comme connectée (`betterAuth.ts:356`). Un profil 400 passe en faux succès local (`betterAuth.ts:617`).
- Inscription possible sans vérification si `auth-capabilities` échoue (`AppShell.tsx:543,772`).
- Suppression de compte : tables legacy non purgées et réanimées à la réinscription. `ilike '%email%'` (`account-deletion.ts:114`). Aucune réauthentification. Le cookie `__Secure-` n'est pas effacé.
- Jeton push réattribuable à n'importe quel compte (`notifications/register/route.ts:39`), et non désenregistré à la déconnexion.
- `TRUST_PROXY` à vérifier sur le VPS : sinon toutes les IP valent `unknown` et un tiers peut verrouiller un compte.

## Lot 5 : UX et design

- ✅ `npm run lint:colors` est en échec sur `main` : `DocumentsScreen.tsx` passe de 11 à 15 couleurs en dur (lignes 51-54). La CI design-guard échouera.
- Modales sans ScrollView ni clavier : `PaymentModal`, `ApplicationDetailModal`, `ZoneQuestionSheet`, `DeleteAccountModal`, `SelectWithOther`, `AppAlert` (sans `maxHeight`), `ExternalOfferModal` et `StudentProfileExpressModal`. `KeyboardAvoidingView` n'est actif que sur iOS, et `softwareKeyboardLayoutMode` n'est pas réglé.
- Barre d'onglets à environ 358 px sur 360 avec « Ressources » active. Pieds de carte et onglets de modales sans `flexWrap`.
- Cibles tactiles sous 44 px : les « ✕ » de 30 px et 32 px, onglets inactifs à environ 38 px, boutons d'envoi à 38 px, barre d'outils de l'éditeur à environ 30 px.
- Contrastes insuffisants : badges jaune, vert et violet clairs sur fond blanc, entre 1,7 et 2,7:1 ; `inkSubtle` à 2,56:1.
- Données inventées affichées : « ★ 4.8 » sur chaque PDF, « employeur partenaire vérifié », « Score de conformité 98 % », photos Unsplash de « locaux », « Douala / 3 à 6 mois », « Lucien Miguel » et un avatar Unsplash dans le profil, et le badge « Vérifié » du suivi.
- `Toast` collé au bord haut parce que `topInset` n'est pas passé (`AppShell.tsx:1181`).
- Textes : tutoiement et vouvoiement mélangés, accents manquants (« Revision », « Selection », « Reinitialiser »…), restes d'anglais (« Preview puis achat »), emojis mêlés aux icônes Lucide.
- Filtres PDF avec des écoles inventées (`PdfStudentSection.tsx:273`), catégories de l'accueil sans effet, « Présentiel » affiché en dur.
- Code mort : deux `OnboardingScreen`, une dizaine de composants de `GlassComponents`, le modal « Compte » jamais ouvert, `direct-reach`, `ai/diagram`.
- Nationalité et âge toujours « [à compléter] » sur le CV : aucun champ ne permet de les saisir.
- Composants communs à créer : `ModalSheet` (SafeArea, clavier, défilement) et un `Button` unique (44 px minimum, état de chargement).

---

## Décisions à prendre avant l'exécution

1. **Fournisseur de paiement** : le code utilise SasPay, alors que CLAUDE.md, `contexte.md` et `contexte-code.md` parlent de Notch Pay. Je corrige la doc en SasPay ?
2. **Onboarding des PDF gratuits** : supprimer l'étape, ou la transformer en « ajouter à ma bibliothèque » ?
3. **`ia_credits` hérités** (éditeur IA, génération complète) : les remplacer par le modèle v2 (coins et Pass), ou les garder ?
4. **Récompense de contribution** : 50 coins (le serveur) ou 10 (l'interface) ?
5. **Source des statuts** : qui fait passer une candidature en entretien, acceptée ou refusée ? L'admin à la main, le recruteur via un portail, ou les réponses e-mail et WhatsApp ?
