# Journal de travail : Campus 360

Une entrée par action de tout skill qui agit (`date · tâche · skill · commit · fichiers · preuve · points ouverts`). Plus récent en tête.

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
