# Journal de travail : Campus 360

Une entrée par action de tout skill qui agit (`date · tâche · skill · commit · fichiers · preuve · points ouverts`). Plus récent en tête.

---

**2026-10-31 · hors plan · (direct) · non commité · Rapport et mémoire : l'IA rédige à partir des documents de l'étudiant et de ses références**

- **Rôle de source :** migration `0025_source_role.sql` (`app_document_files.source_role` : `personal` = rapports journaliers, notes, livrables ; `reference` = cours, articles, liens, consignes de l'encadreur ; pages web existantes passées en `reference`). Rôle accepté par `POST /documents/[id]/files` (champ `role`), `POST /documents/[id]/sources` (`role`), changeable par `PATCH /documents/[id]/sources/[sourceId]`.
- **IA :** `lib/source-grounding.ts` (pur) construit deux blocs étiquetés, documents de l'étudiant puis références, numérotation « Source n » partagée ; `retrieveSourcesContext` cherche dans chaque groupe séparément (6 extraits par groupe). `generate-full` ne lisait aucune source : il les injecte maintenant section par section avec `SOURCES_GROUNDING_RULES`, et la bibliographie liste les références réellement jointes. Chat et « Rédiger avec moi » reçoivent la même distinction.
- **App :** chat de génération (`DocGenChat`) : boutons « Mon fichier », « Fichier de référence », « Lien de référence » avant la rédaction ; `DocumentsScreen` les envoie juste après la création du document, puis lance la génération (alerte si un document n'a pas pu être lu). Onglet Sources : choix « Mes documents / Référence » à l'ajout, liste groupée, bouton pour reclasser.
- **Commandes :** `npm test` (mobile-api) 367 tests, 353 pass, 0 échec ; `tsc --noEmit` mobile-api 0 ; `npm run typecheck` app 0 ; `lint:colors` signale +4 dans `DocumentsScreen.tsx`, venant de modifications non commitées antérieures (aucune couleur ajoutée ici).
- **Points ouverts :** migration 0025 à appliquer (`npm run migrate`) avant le déploiement de l'API, sinon les insertions échouent ; parcours réel non testé (pas de base de test locale) ; recherche lexicale seulement (pas d'embeddings).

---

**2026-10-26 · hors plan · test-and-verify · 22ebc6a · Upload d'images de la rédaction (serveur de fichiers `files.campus360b.site`)**

- **Cause du « Connexion impossible » :** `files.campus360b.site` n'avait aucun enregistrement DNS. Corrigé côté infra : enregistrement A posé par l'utilisateur, certificat certbot (expire le 2027-01-24, renouvellement auto), `nginx-files.conf` corrigé (regex `{36}` entre guillemets, sinon `nginx -t` échoue ; correctif présent dans `9137225`), `campus360-mobile-api` remis en ligne sur le VPS (`node_modules` et `.next` absents → `next: not found`, 26 redémarrages ; `npm ci`, `npm run build`, `pm2 restart`).
- **Commandes :** `npm test` (mobile-api) 257 tests, 238 pass, 0 échec, 19 ignorés (contrôle PDF live et base de test absente) ; `tsc --noEmit` mobile-api 0 ; `npm run typecheck` app 0 ; `lint:colors` 189/189.
- **Production, sans écriture :** POST upload sans session → 401 `Session requise.` ; préflight depuis `https://campus360b.site` → 204 avec allow-origin ; origine non approuvée → pas d'allow-origin ; route hors liste → 404 ; livraison signée sans signature → 403 ; API locale VPS 204, PM2 `online` stable.
- **Parcours navigateur non fait :** pas de base de test (le `mobile-api` local pointe vers la même base Supabase que la production ; ni Docker ni PostgreSQL sur le poste).

| Fonctionnalité | Interface | Réseau | Donnée | Erreur | Mobile | Verdict |
|---|---|---|---|---|---|---|
| Serveur de fichiers (DNS, TLS, routes, auth, CORS) | n/a | 🟢 | n/a | 🟢 401 / 403 / 404 | n/a | 🟢 VERIFIED |
| API mobile VPS remise en ligne | n/a | 🟢 204 | n/a | n/a | n/a | 🟢 VERIFIED |
| Choisir une photo → visible dans « Images du document » | ⚪ | 🟠 401 sans session seulement | ⚪ | 🟠 tests unitaires (PDF déguisé refusé) | ⚪ | 🟠 PARTIEL |
| Insérer l'image comme figure dans la section | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | 🟠 PARTIEL |

- **Points ouverts :** le DNS du routeur local (`flybox.home`) renvoie encore « domaine inexistant » (cache négatif) : un téléphone sur ce Wi-Fi verra toujours « Connexion impossible » jusqu'à expiration (passer en 4G, ou redémarrer le routeur) ; parcours réel d'upload à faire sur le téléphone ou avec le compte de test sur la base partagée (accord requis) ; cause des redémarrages PM2 antérieurs (le déploiement a laissé `mobile-api` sans dépendances, voir `22ebc6a`) non analysée.

---

**2026-10-24 · Livraison 35f8228 · vps-deploy · 35f8228 · Paiement à l'acte, 5 000 coins, descriptions intégrales en production**

- **VPS :** `deploy-vps.yml` réussi sur `35f8228` (migrations 0017 et 0018 appliquées par le script) ; `FREE_LAUNCH_MODE=false` et `STARTING_COINS=5000` posés dans `mobile-api/.env.local` et `recruiter-web/.env.production` (sauvegardes `.bak-<horodatage>`) ; `pm2 restart --update-env` + `pm2 save`.
- **Preuves :** `api/health` 200 `db: connected`, admin 200, landing 200 ; 3 bonus `launch-bonus-5000` (1 750 coins au total), 0 étudiant sous 5 000 sur 10 ; contrainte description `<= 20000` ; `/api/mobile/stages` : 28 offres, 25 à 1 000 (rémunérées), 3 à 500, donc gratuit coupé. OTA `eas-update.yml` réussie.
- **Hors sujet, déjà en échec avant :** workflows Vercel (backend et mobile-api) en échec sur les 4 derniers commits.

**2026-10-24 · hors plan · (direct) · 35f8228 · Paiement à l'acte des candidatures, 5 000 coins de lancement, descriptions intégrales**

- **Décisions utilisateur :** candidature 1 000 coins si l'offre est rémunérée (ou emploi), 500 sinon ou si la rémunération n'est pas précisée ; tout payant, sans 1ère offerte (`FREE_LAUNCH_MODE=false` à poser sur le VPS) ; 5 000 coins pour les nouveaux comptes et complément unique à 5 000 pour les anciens ; fiche LinkedIn complète via Treg (`harvestapi.linkedin.job.get`, ~0,001 $).
- **Serveur :** `lib/stage-pricing.ts` (règles pures, copie identique `src/features/stages/stagePricing.ts`), `lib/stage-charge.ts` (débit une fois par offre et par utilisateur, wallet verrouillé, 409 si solde insuffisant, remboursement si l'envoi échoue) branché dans `stages/apply` et `stages/dispatch` ; chaque offre renvoie `isPaid` et `applyPriceCoins` ; `STARTING_COINS` par défaut 5000 (les deux `free-launch.ts`) ; ingest n8n : plus de description, durée, rémunération ni compétences inventées, description jusqu'à 20 000 caractères.
- **Migrations :** `0017_launch_bonus_5000.sql` (type `bonus`, complément tracé `launch-bonus-5000`), `0018_stage_jobs_full_description.sql` (limite 2 000 → 20 000). **Non appliquées.**
- **App :** prix de candidature sur la carte d'offre, la fiche détaillée et la fenêtre de candidature (`applyPrice.ts`).
- **Scraping :** `job_store.py` enregistre le texte source et non plus le résumé IA ; plus de coupe à 1 200 caractères dans les collecteurs ; `TregLinkedInAgent.fetch_details` (plafond `TREG_MAX_DETAIL_CALLS_PER_RUN`, 20) ; la rémunération LinkedIn alimente le prix.
- **Preuves :** `npm test` (mobile-api) 260 tests, 0 échec ; `python -m unittest` (agents) 63 OK ; `tsc` mobile-api 0.
- **Points ouverts :** migrations 0017/0018 et `FREE_LAUNCH_MODE=false` sur le VPS ; non vérifié dans le navigateur ; offres déjà en base gardent leur résumé (relancer `reprocess_existing.py` ne récupère pas le texte d'origine).

---

**2026-10-24 · 26.6 · vps-deploy · 525c3f1 → 014b254 → 85cb5db · Livraison paiement Nyole + numéros MTN/Orange (VPS + OTA)**

- **Push :** `525c3f1` (26.6), `014b254` (correctif workflow OTA), `85cb5db` (correctif script de déploiement) sur `origin/main`.
- **OTA :** échec sur `525c3f1` (`eas-update.yml` collait le message de commit dans le script bash : `${t}` → `unbound variable`, et injection possible) ; corrigé en passant le message par variable d'environnement ; OTA publiée sur `014b254` (branche `production`, Android + iOS, runtime 1.2.0, groupe `ceadcbaf-b326-4222-a2d8-edf5c113bb93`).
- **VPS :** deux runs `deploy-vps.yml` annulés et revenus à `3fa6572` : `scripts/deploy-vps.sh` lisait `puppeteer.executablePath()` (Promise en puppeteer 25) → « Chromium introuvable ». Corrigé (`85cb5db`), mais le workflow exécute le script déjà présent sur le VPS : déploiement fait à la main (`git reset --hard origin/main`, `npm ci`, `migrate` sans nouvelle migration, `npm run build`, `pm2 restart campus360-mobile-api`, `pm2 save`). Les prochains runs utiliseront le script corrigé.
- **Preuves :** VPS sur `85cb5db`, PM2 `online` ; `api/health` 200 `db: connected`, admin 200, landing 200 ; `POST /api/mobile/payments/initiate` et `/payments/webhook` 401 sans session ni signature ; message « ni MTN ni Orange » présent dans le build.
- **Points ouverts :** export PDF cassé en production (antérieur) : Chrome 149/150 ne démarre pas, 12 bibliothèques système manquantes (`libatk-1.0.so.0`, `libgbm.so.1`, `libcups.so.2`…), installation `apt-get` à valider ; `HEALTH_PDF_SECRET` absent donc pas de contrôle PDF au déploiement ; `vercel-mobile-api.yml` échoue à chaque push depuis au moins 6 commits ; clé Nyole **live** dans `mobile-api/.env.local` (pas de clé de test en local) ; parcours navigateur de 26.6 en attente de la connexion de l'utilisateur.

---

**2026-10-24 · 26.6 · execute · non commité (base 3fa6572) · Validation numéros camerounais MTN/Orange & alignement doc Nyole**

- **Fichiers :** `mobile-api/lib/cameroon-phone.ts` + jumeau `src/features/wallet/cameroonPhone.ts` (nouveaux), `mobile-api/lib/payments.ts`, `mobile-api/lib/payment-rules.ts`, `mobile-api/app/api/mobile/wallet/topup/route.ts`, `mobile-api/app/api/mobile/wallet/topup/[reference]/route.ts`, `src/features/wallet/PaymentModal.tsx`, `src/features/wallet/walletApi.ts`, `src/AppShell.tsx`, `mobile-api/tests/cameroon-phone.test.mjs` (nouveau), `mobile-api/tests/payments.test.mjs`.
- **Preuve :** `npm test` (mobile-api) 235 pass / 0 fail / 19 skip ; tests ciblés 16/16 ; `tsc --noEmit` app et API code 0 ; `lint:colors` 189/189 (le code USSD `#150` était compté comme couleur : centralisé dans `ORANGE_MONEY_APPROVAL_USSD`, et `#D1FAE5` illisible sur fond clair remplacé par `stitchColors.emerald`).
- **Doc Nyole lue (nyole.com/docs) :** session `POST /v1/checkout/sessions`, statut `GET /v1/checkout/sessions/{id}/status` (PENDING/SUCCESS/FAILED/CANCELLED/REFUNDED, FAILED = rejouable), webhooks `payment.completed|failed|cancelled|updated`, signature `X-Afriflow-Signature: t=…,v1=<hex>` sur `${t}.${corps}`, sandbox `POST /api/checkout/sandbox`.
- **Points ouverts :** parcours navigateur non fait (connexion requise) ; préfixes MTN/Orange non confirmés par l'ART ; `payment.cancelled` à cocher dans le tableau de bord Nyole ; commit, déploiement VPS et OTA non faits.
- **À reporter dans contexte-code.md :** §6 paiements : nouveau fichier jumeau `lib/cameroon-phone.ts` ↔ `src/features/wallet/cameroonPhone.ts` ; `formatPhoneForOperator`/`detectCameroonOperator` remplacés par `requireCameroonMobileMoney` ; `verifyNyoleSignature` n'accepte plus le HMAC du corps seul ; `decideWebhookCredit` crédite aussi une transaction `failed`.

---

**2026-10-23 · vps-deploy · Déploiement production VPS sur commit ed520e4 (Module 24 App Docs & Module 26 Nyole)**

- **Pre-flight local :** `tsc --noEmit` ×4 (app, `mobile-api`, `recruiter-web`, `landing-site`) = code 0.
- **Synchronisation VPS :** `/opt/campus-360` aligné sur `origin/main` (`ed520e4`), 13 migrations (`0000` à `0015`) vérifiées appliquées (`0013_document_templates.sql` incluse).
- **Builds & PM2 :** `campus360-mobile-api` (40 routes compilées, dont `/api/mobile/templates*`, `/api/mobile/documents/[id]/apply-template`, `/api/admin/templates/*`) et `campus360-recruiter-web` (CSS + 21 routes dont `/admin/templates*`) compilés et redémarrés (`online`, `pm2 save` exécuté).
- **Contrôles HTTP :** `https://api.campus360b.site/api/health` 200 (`db: connected`), `https://admin.campus360b.site` 200, `https://campus360b.site` 200, `https://api.campus360b.site/api/mobile/templates` 401 (`Session requise.`).
- **Points ouverts (variables d'environnement) :** définir `ADMIN_SERVICE_SECRET` dans `/opt/campus-360/mobile-api/.env.local` et `/opt/campus-360/recruiter-web/.env.production` (ainsi qu'en local), et `MOBILE_API_INTERNAL_URL=http://127.0.0.1:3002` dans `/opt/campus-360/recruiter-web/.env.production` pour activer le relais de l'atelier admin `/admin/templates`.

---

**2026-10-22 · vps-deploy · Synchronisation VPS /opt/campus-360 sur commit db93fd5**

- **Synchronisation :** /opt/campus-360 aligné sur origin/main (db93fd5 feat(app): charte v1 dans l'app).
- **Statut PM2 :** 3 services online (landing-site, mobile-api, recruiter-web). pm2 save exécuté.
- **Contrôles HTTP :** API 200 (db connected), Admin 200, Landing 200, APK download 200 (build 114, 75 Mo).
- **Fichiers modifiés :** contexte-code.md (§12 mise à jour release), journal.md.



**2026-10-20 · module 25 (scraping des offres) · /execute ALL · commit de référence fcd08ed (arbre de travail non commité)**

- **Validées (DoD passée) :** 25.1 (tests Python `unittest`, 13 puis 56 tests OK), 25.3 (extracteur et harnais de mesure, jeu réel en attente), 25.4 (test M3, 83/83), 25.6 (expiration), 25.7 (plafond 20 par jour, avant collecte), 25.8 (journal de passage), 25.9 (démon unique, heure du Cameroun), 25.11 (adaptateur Treg LinkedIn), 25.12 (branchement LinkedIn : Treg, Apify, repli).
- **Partiellement faites :** 25.5 (migration 0014 écrite, non appliquée), 25.10 (configuration faite, rotation 🔒), 25.13 et 25.14 (fonction de date validée ; affichage non vérifié à l'écran), 25.15 (passage hors ligne réel sur jeu synthétique, code 0 ; le jeu réel attend 25.2).
- **Non faites :** 25.2 (🔒), 25.16 (🔒), 25.17 (postuler par lien : à détailler avec `/plan-detail`).
- **Fichiers :** `scripts/agents/` (treg_linkedin_agent.py, daily_cap.py, evaluate_pipeline.py nouveaux ; config.py, job_store.py, offer_pipeline.py, orchestrator.py, run_scraper.py, daily_scheduler.py modifiés ; 9 fichiers de test) ; `mobile-api/sql/0014_scrape_runs_and_expiry.sql` et `mobile-api/tests/migration-0014.test.mjs` (nouveaux) ; `mobile-api/tests/stage-added-at.test.mjs` (nouveau) ; `src/features/stages/addedAt.ts` (nouveau) ; `src/ui/screens/StagesScreen.tsx` ; `scripts/test-challenger-m3-adversarial.mjs` ; `.gitignore` ; `.skills/environments.md`.
- **Preuves :** unittest `scripts/agents` 56 OK ; `npm test` mobile-api 124 réussis, 0 échec ; `npx tsc --noEmit` 0 ; `lint:colors` 192 ; test M3 83/83 ; `run_scraper.py --dry-run --no-db --from-fixture … --offline-llm` : code 0, `cap_reached: True`, 5 publiées sur 5 de plafond ; `run_scraper.py --dry-run --live` : code 2.
- **Sécurité :** aucun secret dans les fichiers modifiés (grep) ; aucun appel payant sans `--live` ; `--no-db` ne se connecte pas à la base ; le plafond est vérifié avant tout appel payant ; la fixture réelle est ignorée par git.
- **Points ouverts :** voir le bloc « Reprise » de `plan.md`.
- **À reporter dans contexte-code.md :** §3.7 (LinkedIn via Treg, plafond, expiration, journal, démon), §5 (migration 0014 écrite, prochain numéro 0015), §9 (variables TREG_* et DAILY_OFFER_CAP), §10 (pièges 14 à 16) ; mis à jour par `/execute` dans la carte elle-même, aucune écriture ici.


---

**2026-10-20 · tâche 25.17 · /plan-detail (fait seul, une tâche) · commit de référence fcd08ed (arbre de travail non commité)**

- **Détaillée :** 25.17 (postuler par lien) réécrite dans `plan.md` avec les huit rubriques, à partir du code (chemins:ligne vérifiés).
- **Constats :** `mapJob` ne renvoie pas `source_url` (la requête le lit déjà) ; le type `apply_method` est un enum SQL de la baseline (0000) ; les routes de candidature ne regardent pas `applyMethod`.
- **Décisions prises (réversibles) :** valeur `LINK`, règle WHATSAPP > EMAIL > LINK > PHYSICAL, libellé « Postuler sur le site de l'offre », candidatures par lien non suivies.
- **Non exécutée :** `/execute 25.17` attend le feu vert pour la migration 0015 sur la base partagée (🔒), mais le code peut être écrit et testé avant.
- **À reporter dans contexte-code.md :** §5 (migration 0015 prévue pour le type `apply_method`), §10 (piège : offres à lien seul en `PHYSICAL`).


---

**2026-10-20 · tâche 25.17 · /execute · commit de référence 5458012**

- **Faite :** postuler à une offre qui n'a qu'un lien. Valeur `LINK` ajoutée au type `apply_method` (migration 0015, instruction seule car une valeur d'enum n'est utilisable qu'après le commit de sa transaction).
- **Fichiers :** créés `mobile-api/sql/0015_apply_method_link.sql`, `src/features/stages/applyTarget.ts`, `mobile-api/tests/apply-method-link.test.mjs`, `scripts/agents/tests/test_job_store_apply_method.py` ; modifiés `src/types.ts`, `src/ui/screens/StagesScreen.tsx`, `src/features/stages/AiApplyModal.tsx`, `mobile-api/lib/stages-db.ts`, `mobile-api/app/api/mobile/stages/{dispatch,apply}/route.ts`, `scripts/agents/job_store.py`, `recruiter-web/lib/admin-platform-service.ts`.
- **Preuves :** `npm test` mobile-api 177 réussis, 0 échec, 18 ignorés ; unittest `scripts/agents` 60 OK ; `npx tsc --noEmit` racine, mobile-api et recruiter-web = code 0 ; `npm run lint:colors` 191 = base.
- **Sécurité :** l'URL vient d'une source externe, `safeApplyUrl` n'accepte que `https://` (test : `javascript:`, `http:`, schéma d'app et chaîne vide refusés) ; le serveur refuse en 422 toute candidature ou tout envoi sur une offre `LINK`, donc aucun envoi sans destinataire.
- **Écart avec le guide :** module `applyTarget.ts` ajouté, non prévu par le guide, pour rendre la validation de l'URL testable (il n'existe pas de test de rendu React Native).
- **Non vérifié :** migration 0015 non appliquée (aucune base de test ; base partagée 🔒) ; affichage non vu à l'écran (session requise, pas d'identifiants de test).
- **Fait hors de cette session :** le code du module 25 a été commité par un autre intervenant pendant l'exécution (`e88439b`, `a2283cd`, `5458012`, auteur BIMAI-LUCIEN). Je n'ai pas commité. Les compteurs de tests et la base de couleurs ont changé (124 → 177 tests, 192 → 191 couleurs) à cause de ce travail parallèle, pas de 25.17.
- **Points ouverts :** voir le bloc « Reprise » de `plan.md`. **Appliquer 0015 avant le premier passage réel du scraper**, sinon l'écriture d'une offre `LINK` sera refusée par l'enum.
- **À reporter dans contexte-code.md :** §3.2 (`applyTarget.ts`, méthode `LINK`, `sourceUrl` renvoyé par `mapJob`), §5 (migration 0015 écrite, prochain numéro libre 0016), §6 (dispatch et apply renvoient 422 sur une offre `LINK`), §10 (le piège 14 est traité).

---

**2026-10-23 · plan-check · Module 24 · prêtes 11 · corrigées 1 · à détailler 0 · bloquées 0**

- **Contrôlé :** 24.1 en détail (fichiers, fonctions et numéros de ligne de `document-style.ts`, `document-style-schema.ts`, `document-render.ts`, `document-numbering.ts`, `DocumentStylePanel.tsx` : tous exacts) ; 24.2 à 24.12 : fichiers cités présents, dépendances dans l'ordre du module, décisions déjà tranchées (tableau du 2026-10-15, lignes 19 à 22).
- **Corrigée :** 24.3, « État actuel » périmé : dernière migration `0015` (et non `0008`), `0013` libre, `npm run migrate` existe et applique `0013` même après `0015` ; `recruiter-web/lib/documents-db.ts` n'existe plus.
- **Carte :** commit analysé `fcd08ed` ; depuis, seul `src/features/documents/DocumentsScreen.tsx` a changé dans la zone, sans effet sur le module 24.
- **Prochaine :** `/execute 24.1`.

---

**2026-10-23 · Tâche 24.1 (options de style manquantes) · execute · commit de référence 9fec41d (non commité)**

- **Fait :** nouvelles options du style, valeurs par défaut identiques pour les 4 styles prêts (aucun document existant ne change de numérotation ni d'en-tête) : numérotation `chapter-section-roman` (SECTION 1 : / I. / 1.), en-tête `headerStyle` (simple / bandeau), `headerTextColor`, `authorLabel` (60 caractères, conservé au changement de style), `footerRule`, `pageNumberFrame`, `page.bandColor`, blocs `captions` (par chapitre / sur tout le document ; italique centrée / gras à gauche), `lists` (puce ronde / losange ❖), `dedication.frame`. Blanc ajouté en fin de palette (texte du bandeau).
- **Fichiers :** modifiés `mobile-api/lib/document-style.ts` + `src/features/documents/documentStyle.ts`, `mobile-api/lib/document-style-schema.ts`, `mobile-api/lib/document-numbering.ts`, `mobile-api/lib/document-render.ts` + `src/features/documents/documentRender.ts`, `src/features/documents/DocumentStylePanel.tsx`, `mobile-api/tests/document-style.test.mjs`, `mobile-api/tests/document-render.test.mjs` ; créé `mobile-api/tests/twin-files.test.mjs` (parité de `document-render.ts`, fins de ligne normalisées).
- **Preuves :** avant : `npm test` 198 tests, 180 réussis, 0 échec, 18 ignorés ; après : 206 tests, 188 réussis, 0 échec, 18 ignorés ; `npx tsc --noEmit` mobile-api code 0 ; `npm run typecheck` app code 0 ; `npm run lint:colors` 189 = base.
- **Écart de rendu voulu par le guide :** la légende de tableau prend la présentation choisie (italique centrée par défaut), alors qu'elle était droite et non italique.
- **Non vérifié :** le panneau « Style du document » n'a pas été ouvert à l'écran (session étudiante requise, pas d'identifiants de test utilisés). Le bandeau d'en-tête, le libellé auteur, le filet du pied et le numéro encadré sont enregistrés mais pas encore dessinés : écran en 24.4, PDF en 24.5, Word en 24.6.
- **Sécurité :** aucun secret ; `authorLabel` borné à 60 caractères par le schéma (400 au-delà) et par `resolveStyle`, échappé au rendu (24.4 à 24.6) ; nouvelles couleurs validées en `#RRGGBB`.
- **À reporter dans contexte-code.md :** §3 (documents : nouvelles clés du style, schéma `chapter-section-roman`, `captions.scope`) ; §8 (jumeaux : `document-render.ts` désormais couvert par `tests/twin-files.test.mjs`).

---

**2026-10-23 · Tâches 24.2 à 24.11 (module 24, galerie de modèles) · execute -all · commit de référence 6a106e3 (non commité)**

- **Validées :** 24.2 (garde par blocs, non-régression du texte des 4 gardes contre des fixtures écrites avant le changement, comparaison visuelle avant/après), 24.4 (aperçu : bandeau, pied auteur, numéro encadré, logo du département ; HTML réel rendu à 375 px sans défilement horizontal), 24.5 (PDF : bandeau, pied auteur, filet, numéro encadré écrit en dernier, sommaire `toc-chapter`), 24.7 (import Word, `jszip` en dépendance directe), 24.8 (import PDF approché, confiance par réglage), 24.9 (API admin + relais `recruiter-web`).
- **Faites, vérification restante 🔒 :** 24.3 (migration 0013 non appliquée), 24.6 (ouverture du .docx d'exemple dans Word), 24.10 (atelier admin : parcours avec session admin), 24.11 (galerie : parcours expo-web avec un modèle publié).
- **Non faites :** 24.12 (avec l'utilisateur), 24.13 (nouvelle tâche : IA de vision, décision 20).
- **Écarts au guide :** blocs de garde enrichis pour exprimer les 4 gardes actuelles (logo central de l'en-tête bilingue, texte entre logos, encadreurs `author-left`, bandeau d'année `rule`, espace extensible, `[optionnel]`, `**gras**`, `*italique*`, `{placeIntro}`) ; pas de fixture `.docx` commitée (document produit par notre export dans le test) ; logos de modèle jamais copiés chez l'étudiant ni dans la vignette (décision 21) ; dédicace PDF poussée par `margin-top` (le cadre annulait `padding-top`).
- **Fichiers :** voir `git status` ; principaux nouveaux : `mobile-api/lib/{document-cover,ooxml,pdf-layout,template-*,templates-db,admin-service*,admin-template-routes}.ts`, `mobile-api/sql/0013_document_templates.sql`, `mobile-api/app/api/admin/templates/**`, `mobile-api/app/api/mobile/templates/**`, `mobile-api/app/api/mobile/documents/[id]/apply-template/route.ts`, `recruiter-web/app/admin/templates/**`, `recruiter-web/app/api/admin/templates/**`, `recruiter-web/lib/mobile-api-proxy.ts`, `src/features/documents/{documentCover.ts,TemplateGallery.tsx,templatesApi.ts}`.
- **Preuves :** `npm test` mobile-api : 241 tests, 227 réussis, 0 échec, 14 ignorés (un premier passage a vu `documents.test.mjs` échouer pendant la compilation du serveur de dev ; seul et au second passage complet : réussi) ; `npx tsc --noEmit` mobile-api 0, recruiter-web 0, app 0 ; `npm run lint:colors` 189 = base ; `recruiter-web` `npm run build` 0 ; `curl` 401 sans secret (mobile-api) et sans session (relais) ; captures et exemples dans `.agent/screenshots/m24/`.
- **Sécurité :** routes admin derrière un secret de service comparé à temps constant (32 caractères minimum) puis rôle lu en base ; relais sans cookies, segments filtrés ; imports : taille, type réel, bombe ZIP, DTD refusée, 500 entrées, 60 pages ; aucun texte propre au rapport recopié dans un modèle (testé) ; aperçu admin en `iframe sandbox=""` ; application d'un modèle sans écriture de `content_html` ni suppression (testé) ; documents toujours filtrés par propriétaire.
- **À reporter dans contexte-code.md :** §3 documents (garde par blocs `document-cover.ts` + jumeau, modèles : tables, routes admin et étudiant, imports Word/PDF) ; §5 (migration 0013 écrite, non appliquée) ; §8 (jumeaux : `document-cover.ts` ↔ `documentCover.ts`, testés par `twin-files.test.mjs`) ; §9 (`ADMIN_SERVICE_SECRET`, `MOBILE_API_INTERNAL_URL`) ; §10 (piège : `next build` dans `recruiter-web` écrase le `.next` d'un `next dev` lancé).

---

**2026-10-23 · Tâche 24.3 (migration 0013) · execute · commit de référence 6a106e3 (non commité)**

- **Fait (accord de l'utilisateur) :** `npm run migrate -- --dry-run` (seule 0013 à appliquer), puis `npm run migrate` : « appliquée : 0013_document_templates.sql » ; second `npm run migrate` : « déjà appliquée ». Base lue depuis `mobile-api/.env.local`.
- **Preuves :** réexécution du SQL de 0013 dans une transaction annulée : sans erreur (idempotence) ; `app_documents.template_id` présent ; tables `app_document_templates`, `app_template_assets` et leurs contraintes présentes ; ligne dans `schema_migrations` ; 0 modèle en base.
- **Débloque :** parcours de 24.10, 24.11, 24.12 (restent la session admin, les variables `ADMIN_SERVICE_SECRET` / `MOBILE_API_INTERNAL_URL` et un modèle publié de test).
- **À reporter dans contexte-code.md :** §5 (migration 0013 appliquée le 2026-10-23 ; prochain numéro libre 0016).

---

**2026-10-23 · Tâche 24.12 (modèle « IUT de Douala — Rapport de stage ») · execute · commit de référence af05514 (non commité)**

- **Demande :** copier complètement le style du rapport de référence et rendre la mise en forme utilisable dans l'app.
- **Bloqué :** téléchargement du rapport de référence (Cloudinary) refusé par le garde-fou « données personnelles » de l'agent ; modèle construit d'après la description notée dans l'en-tête du module 24.
- **Fait :** options `headings.titleAlign` et `headings.uppercaseSections` (style, schéma, CSS partagé, Word, import Word, panneau app, atelier) ; modèle `mobile-api/templates/iut-douala-rapport-de-stage.json` ; script `mobile-api/scripts/publish-template.mjs` (validation par le schéma de l'API, mise à jour par nom, vignette avec emplacements de logos vides) ; modèle publié en base (`f9bcb567-2cf4-4908-9d73-66fcd3d3baae`) ; boutons de titres de l'éditeur nommés selon la numérotation ; libellé de la période « Ex. : du 3 juin au 30 août 2026 » ; logos de garde fluides (débordement à 375 px corrigé) ; script de parcours `scripts/template-flow-captures.cjs`.
- **Preuves :** `npm test` mobile-api 244 tests, 225 réussis, 0 échec, 19 ignorés ; tsc app, mobile-api, recruiter-web 0 ; lint:colors 189 ; `template-iut-douala.test.mjs` 3/3 ; captures `.agent/screenshots/m24/app-apercu-iut-375.png`.
- **Non vérifié :** parcours réel dans l'app (le `mobile-api` local n'atteint pas la base distante en moins de 3 s : session non reconnue, 401/503) ; comparaison visuelle avec la référence.
- **À reporter dans contexte-code.md :** §3 documents (options `titleAlign`, `uppercaseSections` ; dossier `mobile-api/templates/` et script `publish-template.mjs`) ; §10 (piège : `mobile-api` en dev local, délai de connexion de 3 s vers la base distante).

---

**2026-10-23 · Tâche 24.12 (comparaison avec le rapport de référence) · execute · commit de référence af05514 (non commité)**

- **Fait :** référence téléchargée à la demande de l'utilisateur (téléchargement signé de l'API Cloudinary ; l'URL enregistrée répond 401) dans `reference-privee/`, ajouté au `.gitignore` ; 39 pages ; rendus et lecture de 12 pages ; mesures automatiques (Times 12, interligne 1,5, marges ≈ 3 cm, pied auteur, numéro encadré i/ii puis 1/2, légendes continues) ; couleurs au pixel.
- **Moteur :** options `paragraphIndent`, `paragraphSpacing`, `titleSize`, `boldLabel`, `fill` des bandeaux de garde, 12 lignes d'en-tête bilingue, bandeau d'en-tête sur deux lignes dans la marge haute avec bordure, libellé du pied en gras (PDF et Word), tableau d'abréviations, sommaire en majuscules ; panneau de l'app et atelier admin à jour.
- **Modèle :** en-tête complet de l'IUT (ministère, BP, téléphone, e-mail), logo de l'établissement au centre de l'en-tête, département et entreprise sur la ligne suivante, bandeaux #4472C4, bandeau d'en-tête #5B9BD5, titres à la taille du texte, paragraphes sans retrait séparés d'une ligne ; republié.
- **Preuves :** `npm test` mobile-api 244 tests, 225 réussis, 0 échec, 19 ignorés ; tsc app, mobile-api, recruiter-web 0 ; lint:colors 189 ; captures fictives `.agent/screenshots/m24/modele-iut-garde-prelim.png` et `modele-iut-pages.png`.
- **Écarts restants :** rubans et parchemin dessinés en bandeaux droits ; puces rondes dans le corps ; titre du sommaire non souligné ; import PDF : bandeau d'en-tête et plan non détectés sur la référence (à améliorer).
- **Données personnelles :** la référence et ses rendus restent dans `reference-privee/` (ignoré) ; rien d'elle dans le dépôt, les tests ou ce journal.
- **À reporter dans contexte-code.md :** §3 documents (nouvelles options de style, `fill` des bandeaux) ; §10 (URL Cloudinary des PDF en 401 avec l'authentification Basic).

---

**2026-10-23 · Livraison du module 24 (variables VPS) · deploy-and-push · release `ed520e4`**

- **Vérifications avant livraison :** `npm test` mobile-api 244 tests, 225 réussis, 0 échec ; tsc app, mobile-api, recruiter-web 0 ; build recruiter-web 0 ; lint:colors 189 ; aucun secret ni donnée du rapport de référence dans le diff.
- **Push et déploiement du code :** `af05514` et `74fb8ee` étaient déjà sur `origin/main` et sur le VPS (`ed520e4`, déployé par un autre intervenant avec des correctifs de paiement).
- **Fait sur le VPS (accord utilisateur) :** sauvegarde des fichiers d'environnement ; `ADMIN_SERVICE_SECRET` généré (64 caractères, valeur jamais affichée) dans `mobile-api/.env.local` et `recruiter-web/.env.production` ; `MOBILE_API_INTERNAL_URL=http://127.0.0.1:3002` dans `recruiter-web/.env.production` ; `pm2 restart … --update-env` des deux services.
- **Preuves :** health 200 `db: connected` ; landing 200 ; admin 200 ; `/admin/templates` 307 vers la connexion ; `/api/admin/templates` 401 sans secret, 403 avec le secret et un utilisateur inconnu ; relais admin 401 sans session ; modèle IUT `published` avec vignette en base de production.
- **Non fait :** OTA de l'app ; `a4cde78` (paiements, autre intervenant) non déployé ici ; branche `claude/vigorous-carson-30db9e` (correctif PDF Cloudinary) non fusionnée.
- **Retour arrière :** `bash scripts/deploy-vps.sh --rollback` ; variables : restaurer les `.env*.bak-<date>` puis redémarrer PM2.
- 2026-10-29 · Cadrage validé : dashboard admin et pilotage de l'app mobile · brainstorming · contexte.md §17 · CRUD offres stage/emploi (même table, kind), fiche étudiant 360° avec crédit de coins audité, app_config (maintenance, version min, interrupteurs, bandeau), journal d'audit ; push en V1.5 · à planifier avec /plan-task
- 2026-10-29 · Cadrage validé : import PDF en lot, analyse IA, anti-doublon et contributions étudiantes · brainstorming · contexte.md §18 · lots de 10, fiche IA, anti-doublon hash + texte + similarité/embeddings sur trois niveaux, +10 coins à la publication avec plafond de 30 par jour, modération manuelle en V1.5 · à planifier avec /plan-task
- 2026-10-29 · Module 27 planifié : import PDF en lot, analyse IA, anti-doublon, contributions étudiantes · plan-task · plan.md Module 27 (27.1 à 27.8) · décisions D27.1 à D27.5 ouvertes · suite : /plan-detail 27
- 2026-10-30 · Module 27 détaillé · plan-detail · 8 tâches · décisions : 7 (D27.1 à D27.7) · À reporter dans contexte-code.md : §5 migrations périmé (prochaine 0023, 0021 non suivi par git), table documents absente des tables clés, aucune fonction de crédit wallet générique, recruiter-web n'a plus de copies /api/mobile/*, file-validation accepte DOCX/TXT, base lint:colors 189, relais admin mobile-api-proxy figé sur templates
- 2026-10-30 · Décisions D27.1 à D27.7 arbitrées (recommandations acceptées) · plan-detail · plan.md Module 27 · suite : /plan-check puis /execute 27.1
- 2026-10-30 · Tâche 27.1 validée · execute · mobile-api/sql/0023_pdf_dedup_contributions.sql, mobile-api/tests/migration-0023.test.mjs · migration-0023 3 pass / 1 skip (base de test absente), migrate.test 4 pass / 1 skip, migrate --dry-run : seule 0023 à appliquer, 0021 déjà appliquée, typecheck mobile-api code 0 · sécurité : aucune donnée supprimée, contrainte de type reconstruite avec les 8 types existants · migration NON appliquée (🔒) · À reporter dans contexte-code.md : tables pdf_uploads, contribution_rewards, colonnes d'empreinte de documents, type contribution_reward ; 0021 est appliquée en base
- 2026-10-30 · Cadrage validé : modèle économique v2 · brainstorming · contexte.md §19 · candidature 300/500 F CV inclus, packs 1 000 F (5 crédits) et 2 000 F (12 crédits), rapport 2 000 F, mémoire 4 000 F ou 1 000 F/chapitre, PDF gratuits, Pass Révision 200 F/24 h et 1 000 F/7 j, 3 actions IA gratuites/jour, bonus 1 000 coins au lancement puis 300, contribution 50 coins, prix appliqués dès le lancement · à planifier avec /plan-task
- 2026-10-30 · Tâche 27.2 validée · execute · mobile-api/lib/pdf-dedup.ts, mobile-api/tests/pdf-dedup.test.mjs · pdf-dedup 9/9 pass, typecheck mobile-api code 0 · écart au guide : cas « probable » testé avec 1 phrase sur 12 remplacée (20 % donne une similarité de shingles d'environ 0,56 < 0,70 avec k=5) ; MinHash ramené en int32 signé pour la colonne integer[] · À reporter dans contexte-code.md : lib/pdf-dedup.ts (sha256, normalizeText, textFingerprint, minhashSignature, classifyDuplicate)
- 2026-10-30 · Dashboard admin nettoyé et déployé · execute + deploy-and-push + vps-deploy · 0e18a77..1d2e483 sur main, migrations 0021 et 0022 appliquées, OTA publiée · health api/admin/landing 200 · À reporter dans contexte-code.md : pages admin students, mobile, notifications ; settings, documents, recruteur supprimées ; route GET /api/mobile/config ; tables app_config, app_push_campaigns
- 2026-10-30 · Tâche 27.3 validée · execute · mobile-api/lib/pdf-intake.ts, lib/ai-quota-rules.ts (clé pdf-intake 30/h), tests/pdf-intake.test.mjs · pdf-intake 13/13 + ai-quota pass (1 skip serveur), typecheck code 0 · le scan sans texte est refusé (D27.2), le quota est injecté (reserveQuota) : la route doit appliquer D27.1 hors du compteur de 60/jour · À reporter dans contexte-code.md : lib/pdf-intake.ts (analyzePdf à dépendances injectées, PDF_SHEET_SCHEMA)
- 2026-10-30 · Module 28 planifié : modèle économique v2 (crédits de candidature, packs, Pass Révision, nouveaux prix) · plan-task · plan.md Module 28 (28.1 à 28.12) · décisions D28.1 à D28.5 ouvertes · suite : /plan-detail 28 · À reporter dans contexte-code.md : §3.4 passerelle (SasPay en principal selon la carte, Nyole selon Module 26)
- 2026-10-30 · Tâche 27.4 validée · execute · mobile-api/lib/contributions-rules.ts, lib/contributions-db.ts, lib/ai-quota.ts (enforcePdfIntakeQuota, hors quota de 60/jour, D27.1), app/api/mobile/contributions/route.ts et [id]/route.ts, tests/contributions.test.mjs · 10 pass / 2 skip (HTTP sans serveur) · tests sur base non écrits faute de base de test · un fichier par requête, batchId commun, plafonds 10/lot et 30/jour comptés en base, stockage Cloudinary campus-360/contributions (D27.4) seulement si le fichier n'est ni doublon ni refusé · À reporter dans contexte-code.md : routes /api/mobile/contributions (GET, POST multipart, PATCH [id])
- 2026-10-30 · Tâche 27.5 validée · execute · mobile-api/lib/contribution-publish.ts, app/api/admin/pdf-intake/route.ts et [id]/route.ts (edit, publish, reject, reanalyze), lib/contributions-db.ts (reanalyzeUpload, 3 tentatives), recruiter-web/lib/mobile-api-proxy.ts (préfixe templates|pdf-intake), recruiter-web/app/api/pdf/intake/[[...path]]/route.ts, tests/contribution-publish.test.mjs · 9/9 + admin-templates pass, typecheck ×2 code 0 · sécurité : publication et crédit dans une transaction, clé unique contribution_rewards, 23505 sur le hash → doublon 409, force exigé pour doublon probable/droits/données personnelles, push après commit (D27.5), always_free pour les contributions (D27.6) · À reporter dans contexte-code.md : routes /api/admin/pdf-intake*, relais /api/pdf/intake/*, forwardToMobileApi a un paramètre prefix
- 2026-10-30 · Tâche 27.6 en cours [~] · execute · recruiter-web/app/admin/pdf/PdfDashboardClient.tsx (onglets Catalogue / Import en lot / Contributions étudiantes, « Nouveau PDF » ouvre l'import, D27.7), BatchImport.tsx, ContributionsReview.tsx, intakeApi.ts · typecheck code 0, build code 0 (route /api/pdf/intake/[[...path]] générée) · NON vérifié dans le navigateur : migration 0023 non appliquée · compteur de contributions en attente sur l'onglet non fait
- 2026-10-30 · Tâche 27.7 en cours [~] · execute · src/features/pdf/contributionsApi.ts, SharePdfsModal.tsx, MyContributionsScreen.tsx, ContributionStatus.tsx, src/ui/screens/LibraryScreen.tsx, ResourcesScreen.tsx, src/AppShell.tsx (modales, libellé « Récompense contribution PDF », notification contribution_published), src/features/pdf/pdfApi.ts (catalogue en colonnes explicites), src/types.ts, betterAuth.ts, GlassComponents.tsx (type contribution_reward) · typecheck app code 0 ; lint:colors : aucun hexadécimal dans les fichiers du module, mais échec existant sur DocumentsScreen.tsx (11 → 15, commit 65679ce) · NON vérifié dans expo-web : migration 0023 non appliquée · OTA 🔒 après déploiement serveur
- 2026-10-30 · Migration 0023 appliquée sur la base réelle (accord de l'utilisateur) · execute · npm run migrate a aussi appliqué 0024_pricing_v2.sql (autre chantier, non commité, additif, garde contribution_reward) : ce fichier ne peut plus être modifié · vérifications HTTP locales : POST /api/mobile/contributions sans session 401, /api/admin/pdf-intake sans secret 401, relais /api/pdf/intake sans session 401 · parcours navigateur 27.6/27.7 bloqué : navigation du navigateur intégré refusée, ADMIN_SERVICE_SECRET et MOBILE_API_INTERNAL_URL absents des .env.local, sessions à ouvrir par l'utilisateur
- 2026-10-30 · Variables locales posées (accord de l'utilisateur) · execute · ADMIN_SERVICE_SECRET (secret de test généré, jamais affiché) dans mobile-api/.env.local et recruiter-web/.env.local, MOBILE_API_INTERNAL_URL=http://127.0.0.1:3002 dans recruiter-web/.env.local (fichiers ignorés par git) · serveurs relancés · /admin/pdf → /admin/forbidden : le compte connecté dans le navigateur intégré n'est pas admin ; parcours 27.6 en attente d'une session admin ouverte par l'utilisateur
- 2026-10-30 · Module 28 exécuté (28.1–28.7, 28.13 validées ; 28.8–28.12 [!]) · execute -all · mobile-api : sql/0024_pricing_v2.sql, lib/{pricing,offers,offers-core,stage-charge,stage-charge-core,ai-allowance,ai-allowance-core,workshop,workshop-charge-core,free-launch,stage-pricing,stages-db,contribution-publish}.ts, routes offers/, offers/purchase/, ai/pdf-chat, documents/workshop, stages/{apply,dispatch,cv}, pdf/{signed-url,stream} (lecture gratuite), purchase/{pack,document} et ia-packs/purchase (410) ; recruiter-web/lib/free-launch.ts ; app : wallet/{offersApi.ts,OffersModal.tsx}, AiApplyModal, applyPrice, stagePricing, SimplePdfReaderModal, pdfAssistant, PdfStudentSection, pdfApi, WritingWorkshopModal, DocumentsScreen, ProfileScreen, walletApi, types.ts ; landing (tarifs, pricing, aide, conditions, fonctionnalités, inscription, accueil, compte, remboursement, télécharger, scroll-story) ; CLAUDE.md §3, contexte.md §5.1 · preuves : mobile-api npm test 339 pass / 0 fail / 17 skip, typecheck app + mobile-api + recruiter-web code 0, recruiter-web build code 0, landing tsc 0, /tarifs rendu (200, nouvelle grille) · non vérifié : parcours de l'app dans le navigateur (session étudiante requise) ; 0024 appliquée sur la base par le chantier du Module 27 · sécurité : achats sous session, Zod, rate limit purchase- fermé, références uniques anti double débit, wallet verrouillé (for update), aucun secret · lint:colors : DocumentsScreen 15 > 11 déjà dans HEAD (pas ce module) · À reporter dans contexte-code.md : §3.4 (pricing.ts source des prix, offres, crédits, Pass, actions IA gratuites, achats PDF retirés), §5 tables app_credit_grants, app_credit_usages, app_revision_passes, app_ai_free_actions, app_thesis_purchases, migration 0024, types pack_purchase / pass_purchase, §6 routes /api/mobile/offers et /offers/purchase
- 2026-10-30 · Vérification 28.8–28.11 (interrompue : limite d'usage) · test-and-verify · 28.8 🟢 VERIFIED (achat Starter, POST offers/purchase 200, 5 crédits persistants, solde −1 000) ; 28.9 🟢 VERIFIED (prix « 500 FCFA ou 2 crédits », génération : creditsUsed 2, solde inchangé, base credits_left 3, rien envoyé au recruteur) ; 28.10 PARTIEL (prix affichés, sujet vide refusé ; plan gratuit et chapitres non encore testés) ; 28.11 non testé · cas solde insuffisant couvert par tests unitaires seulement · compte de démo landing-demo+campus360 : compétence « Linux » ajoutée, 1 000 coins dépensés, 2 crédits consommés sur l'offre Orange Cameroun
- 2026-10-30 · Parcours 27.6 partiel (navigateur, session admin de l'utilisateur) · import en lot de 3 PDF de test (A, B, copie de A) : A et B « Prêt » avec une fiche IA correcte (matière, école, année, type, résumé, mots-clés), la copie classée « Doublon » avec le titre de l'original (course entre deux envois arbitrée par l'index unique) · « Publier tout ce qui est prêt » : la requête PATCH part, mais à l'arrêt la page affichait encore « Prêt » ; publication non confirmée, à vérifier en base · incident corrigé : un npm run build avait corrompu le .next du serveur de dev (500), dossier supprimé et serveur relancé · reste : confirmer la publication puis archiver les 2 PDF « TEST Campus 360 » du catalogue réel, contributions étudiantes, 27.7, 27.8 · arrêt : limite d'usage atteinte
- 2026-10-31 · Audit de sécurité complet (secrets, code, configuration ; dépendances non faites) · cybersec all · aucun fichier de code modifié ; plan.md Module 29 (29.1 à 29.7) et bloc Reprise · preuves : `git ls-files` (seuls les `.env.example` suivis, `.env*` ignorés), `git grep` de motifs de secrets (valeurs masquées), relecture des gardes d'accès, des webhooks, des en-têtes et du CORS · npm audit refusé pendant l'audit (tâche 29.7) · À reporter dans contexte-code.md : §11
  - Statut : 🔴 — dernier audit : 2026-10-31 (all : secrets, sast, config ; deps non faites)
  - Contrôles validés : `.env*` hors git (seuls les `.env.example`) ; aucune clé privée ni jeton de fournisseur connu (AWS, GitHub, Slack, Stripe, Google, OpenAI) ; SQL paramétré (aucune requête construite par interpolation trouvée) ; routes admin de `mobile-api` derrière `withAdmin` → `requireAdminService` (secret comparé par `timingSafeEqual`, rôle admin vérifié) ; webhooks de paiement vérifiés par signature HMAC avant tout traitement (`lib/payments.ts:305-316`) ; fichiers servis par URL signée (`app/api/files/[fileId]`) ; `pdf/stream` vérifie la propriété ; routes d'achat retirées en 410 ; `withCors` limité aux origines de confiance ; cookies Better Auth `HttpOnly` et `SameSite=Lax` ; `dangerouslySetInnerHTML` seulement pour du JSON-LD ; messages de l'iframe d'édition filtrés par `event.source` ; erreurs renvoyées au client = erreurs métier typées.
  - Points ouverts :
    - critique · identifiants Cloudinary en dur, dans l'historique · scripts/upload_all_exams_to_cloudinary.mjs:11 · scripts/run_full_authentic_exams_pipeline.mjs:14 · tâche 29.1
    - moyen · secret de webhook littéral (production ou test : à confirmer) · scripts/test-payments-flow.mjs:48 · tâche 29.2
    - moyen · CORS de `/api/auth/*` reflète toute origine avec credentials · mobile-api/app/api/auth/[...all]/route.ts:11 · tâche 29.3
    - faible · 17 pré-vols OPTIONS reflètent toute origine avec credentials · mobile-api/app/api/ai/pdf-chat/route.ts:47 (et 16 autres) · tâche 29.4
    - faible · secret n8n comparé par `!==` · mobile-api/app/api/mobile/stages/ingest/route.ts:51 · tâche 29.5
    - faible · ni CSP ni HSTS côté applications, landing sans en-têtes (à confirmer sur Nginx) · mobile-api/middleware.ts:26 · tâche 29.6
    - à confirmer · attribut `Secure` du cookie de session en production (non relu) ; TLS base `DATABASE_SSL_REJECT_UNAUTHORIZED=false` sur le VPS (§10.8, déjà connu)
    - non fait · audit des dépendances · tâche 29.7
- 2026-10-31 · Cadrage validé : entourer une zone du PDF pour questionner l'IA · brainstorming · contexte.md §20 · lasso + page entière en repli, découpe dans le viewer (plan B coordonnées), modèles vision seuls, zone = question normale, aucune image stockée · à planifier avec /plan-task
- 2026-10-31 · Module 30 planifié (entourer une zone du PDF pour l'IA) · plan-task · aucun commit · plan.md · 9 tâches en 5 lots, source contexte.md §20 · à trancher : appel OpenRouter test (30.1), miniature dans l'historique SecureStore (30.6) ; suite /plan-detail Module 30
- 2026-10-31 · Tâches 30.1 à 30.9 (zone du PDF pour l'IA) · execute · aucun commit · mobile-api/lib/pdf-zone.ts (nouveau), mobile-api/tests/pdf-zone.test.mjs (nouveau), mobile-api/app/api/ai/pdf-chat/route.ts, pdf-viewer.html ×4 (public, mobile-api, landing-site, recruiter-web), src/features/pdf/{pdfAssistant.ts, ZoneQuestionSheet.tsx (nouveau), SimplePdfReaderModal.tsx} · preuve : Cloudinary ACAO * et canvas lisible (T1), pdf-zone 8/8, npm test 361 pass / 0 fail / 14 skip, typecheck app et mobile-api 0, viewer testé dans le navigateur (zone 37 Ko, page entière 46 Ko, bouton absent hors app), POST sans session → 401 · points ouverts : 30.3/30.8/30.9 bloquées sur une session étudiante (vraie réponse IA avec image, parcours dans l'app), pont WebView non testé sur téléphone, décision miniature, accord appel OpenRouter, lint:colors toujours en échec sur DocumentsScreen.tsx (hors module) · À reporter dans contexte-code.md : §8 fichiers jumeaux, pdf-viewer.html existe en 4 copies et l'app charge celle de recruiter-web (authWebBaseUrl) ; §6 /api/ai/pdf-chat accepte `zone`
- 2026-10-31 · Tâches 30.3, 30.8 validées, 30.9 partielle · execute · aucun commit · aucun fichier de code modifié · preuve : expo-web-local connecté avec le compte de test (.env.e2e.local), PDF concours-iut-douala-2023 : ✨ IA → zone → feuille (miniature 55 Ko, Page 1) → « Explique » → POST /api/ai/pdf-chat 200 (openai/gpt-4o-mini, réponse fondée sur l'image) → « Continuer dans l'Assistant » (bulle « Zone, page 1 », 2 actions restantes) ; historique local sans image ; zones GIF / page 0 / 2 Mo → 400 · points ouverts : coût OpenRouter non relevé, cas Pass requis et scan flou non joués, pont WebView non testé sur téléphone, contexte-code.md à synchroniser, nouvelle tâche 30.10 (contenu du PDF concours-iut-douala-2023 = sujet ENAM 2010, différent de son titre), captures du volet navigateur tronquées à dpr 2,5 (pilotage par coordonnées et lecture du DOM)
