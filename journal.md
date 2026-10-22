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
