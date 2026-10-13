# Handoff Report: Backend & APIs Architecture Survey (R1 & R2)

**Agent:** explorer_survey_backend_1  
**Working Directory:** `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_survey_backend_1`  
**Handoff Type:** Hard (Mission Survey Complete)

---

## 1. Observation

1. **Evolution API Status & Version:**
   - Command: `fetch('https://wa.blackcompany.site')`
   - Verbatim response: `{"status":200,"message":"Welcome to the Evolution API, it is working!","version":"2.3.7","clientName":"evolution_exchange","manager":"http://wa.blackcompany.site/manager","documentation":"https://doc.evolution-api.com","whatsappWebVersion":"2.3000.1049321010"}`
   - Observation: Evolution API v2.3.7 est en ligne et fonctionnelle.

2. **Structure `mobile-api/package.json` :**
   - File: `mobile-api/package.json`
   - Dependencies: `@better-auth/expo: ^1.6.19`, `better-auth: ^1.3.34`, `docx: ^9.7.1`, `next: ^15.5.7`, `pg: ^8.21.0`, `puppeteer: ^25.1.0`, `react: ^19.1.0`, `resend: ^4.0.0`, `zod: ^4.3.6`.
   - Observation: `@supabase/supabase-js` n'est PAS installé dans `mobile-api`. Le code existant (ex: `recruiter-web/lib/supabase-pdf.ts`, `mobile-api/app/api/mobile/pdf/signed-url/route.ts`) interagit avec Supabase Storage via `fetch` standard (`${SUPABASE_URL}/storage/v1/object/...`) avec les headers `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` et `apikey: ${SUPABASE_SERVICE_ROLE_KEY}`.

3. **Schéma Live PostgreSQL de `stage_applications` :**
   - Query: `SELECT column_name, data_type, udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'stage_applications';`
   - Colonnes retournées :
     - `id` (uuid, not null, default: `gen_random_uuid()`)
     - `student_id` (uuid, not null)
     - `job_id` (uuid, not null)
     - `status` (USER-DEFINED: `stage_app_status`, not null, default: `'PENDING'::stage_app_status`)
     - `applied_at` (timestamptz, not null, default: `now()`)
     - `cv_file_url` (text, nullable)
     - `letter_file_url` (text, nullable)
     - `generated_cv_text` (text, nullable)
     - `generated_letter_text` (text, nullable)
     - `last_reminded_at` (timestamptz, nullable)
     - `notes` (text, nullable)
   - Labels enum `stage_app_status` actuels :
     `[ 'PENDING', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED' ]`
   - Observation : L'enum n'inclut pas encore `'SENT_PENDING'`, `'DELIVERED'`, `'FAILED'`. Une insertion de ces valeurs échouera avec une erreur de contrainte type enum si aucune migration n'est exécutée.

4. **État des Buckets Supabase Storage :**
   - Query: `GET ${SUPABASE_URL}/storage/v1/bucket`
   - Résultat retourné :
     `[ { id: 'documents', name: 'documents', public: false }, { id: 'document-previews', name: 'document-previews', public: false } ]`
   - Observation : Le bucket `cvs` n'existe pas encore sur le projet Supabase.

5. **Existant des Routes Stages Mobile :**
   - Files: `mobile-api/app/api/mobile/stages/apply/route.ts`, `mobile-api/app/api/mobile/stages/applications/route.ts`, `mobile-api/app/api/mobile/stages/direct-reach/route.ts`, `mobile-api/lib/stages-db.ts`.
   - Modèle d'accès utilisateur: `const access = await requireMobileUser(request);`
   - Modèle CORS: `withCors(...)` avec réponse `OPTIONS 204`.
   - Modèle de résilience: Fallback gracieux en cas de coupure réseau pour éviter tout crash de l'UI mobile.

6. **Validation TypeScript Actuelle :**
   - Command: `cd mobile-api && npm run typecheck` -> Exit code 0 (`tsc --noEmit`).
   - Command: `npm run typecheck` (root) -> Exit code 0 (`tsc --noEmit`).

---

## 2. Logic Chain

1. **R1 (WhatsApp Session Management via Evolution API) :**
   - *Depuis Obs 1 & 5 :* Evolution API est disponible sur `https://wa.blackcompany.site`. Pour créer l'instance et obtenir le code de jumelage à 8 chiffres sans exposer les clés d'API au client React Native, `mobile-api` doit exposer `POST /api/mobile/whatsapp/instance` et `GET /api/mobile/whatsapp/instance`.
   - *Raisonnement :* Le format de nom d'instance doit être strictement `student-<phone>` où `<phone>` est normalisé (ex: `237672364124`). Le endpoint proxy appellera `POST /instance/create` puis `POST /instance/connect/:instance` pour récupérer `pairingCode`. Le polling `GET` interrogera `GET /instance/connectionState/:instance` pour détecter l'état `open`.
   - *Résilience :* En mode dev/offline ou si Evolution API est temporairement indisponible, le endpoint doit renvoyer un mock pairing code (`7842 - 9012`, `offline: true`) pour permettre les tests UI et le flux utilisateur sans rupture.

2. **R2 (Acheminement Candidatures & Stockage Cloud) :**
   - *Depuis Obs 2, 3 & 4 :* La table `stage_applications` existe mais son enum `stage_app_status` doit être mis à jour (`ALTER TYPE stage_app_status ADD VALUE ...`) pour supporter `'SENT_PENDING'`, `'DELIVERED'`, `'FAILED'`.
   - *Depuis Obs 2 & 4 :* Le bucket `cvs` doit être créé (idéalement public) via l'API REST de Supabase Storage. Le PDF reçu en base64 (`cvPdfBase64`) sera uploadé sous `cvs/cv-${studentId}-${timestamp}.pdf` via un appel `fetch` HTTP direct utilisant `SUPABASE_SERVICE_ROLE_KEY`. Si l'upload échoue, le base64 est conservé comme fallback dans le payload N8N.
   - *Depuis Obs 5 :* La route `POST /api/mobile/stages/dispatch` doit valider les entrées avec Zod (`jobId`, `channel`, `whatsappPitch`, `letterText`, `cvPdfBase64`), enregistrer la candidature en base, puis transmettre le payload JSON au webhook N8N `https://n8n.blackcompany.site/webhook/send-stage-application` avec un timeout de 10s.

---

## 3. Caveats

1. **Clé API Evolution API en Production :** Si la variable `EVOLUTION_API_KEY` n'est pas encore définie dans `.env.local`, le proxy doit obligatoirement basculer sur un mode simulation/fallback gracieux (renvoi d'un code simulé) sans faire crasher la route.
2. **Droits d'écriture de l'agent Explorer :** Conformément au rôle READ-ONLY de l'explorer, aucun code source d'application n'a été créé ou modifié dans `mobile-api/` ou `src/`. Tous les fichiers, types, endpoints et requêtes SQL sont documentés de manière exhaustive dans `survey_report.md` pour l'agent d'implémentation.

---

## 4. Conclusion

L'architecture backend de `mobile-api` est saine, rigoureusement typée (0 erreur tsc), et prête pour l'implémentation directe de R1 et R2.
- **R1** nécessite :
  - `mobile-api/lib/evolution-api.ts` (client TypeScript Evolution API)
  - `mobile-api/app/api/mobile/whatsapp/instance/route.ts` (proxy endpoints POST & GET)
  - Variables d'environnement `EVOLUTION_API_URL` et `EVOLUTION_API_KEY`
- **R2** nécessite :
  - Migration SQL `ALTER TYPE stage_app_status ADD VALUE ...`
  - Création/assurance du bucket Supabase Storage `cvs` (public)
  - `mobile-api/app/api/mobile/stages/dispatch/route.ts` (route de dispatch vers N8N avec upload PDF)
  - Script de test de non-régression `scripts/test-stage-dispatch.mjs`

---

## 5. Verification Method

Pour vérifier de manière indépendante ces constatations :

1. **Vérifier la connectivité d'Evolution API :**
   ```bash
   node -e "fetch('https://wa.blackcompany.site').then(r => r.json()).then(console.log)"
   ```
   *Attendu :* Message `Welcome to the Evolution API, it is working!` version `2.3.7`.

2. **Vérifier les types et l'intégrité de compilation :**
   ```bash
   cd mobile-api && npm run typecheck
   npm run typecheck
   ```
   *Attendu :* Code de sortie 0, aucune erreur TypeScript.

3. **Vérifier le rapport d'investigation détaillé :**
   Inspecter `c:\Users\DELL\Desktop\mes projet\campus-360\.agents\teamwork\explorer_survey_backend_1\survey_report.md`.
