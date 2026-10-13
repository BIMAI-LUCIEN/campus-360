# Rapport d'Investigation Technique Backend & APIs (R1 & R2)
**Auteur :** explorer_survey_backend_1  
**Date :** 2026-10-05  
**Projet :** Campus 360  
**Périmètre :** Backend Mobile API (`mobile-api/`), Supabase PostgreSQL, Supabase Storage, Evolution API, N8N Webhook

---

## 1. Résumé Exécutif

L'investigation technique a analysé l'architecture backend existante de Campus 360 afin d'établir la feuille de route exhaustive pour l'implémentation des exigences **R1** (Gestion des sessions WhatsApp via Evolution API) et **R2** (Acheminement des candidatures & Stockage cloud des CV).

### Points Clés Découverts
1. **Evolution API v2.3.7 Active :** Le serveur d'API WhatsApp self-hosted est en ligne à l'adresse `https://wa.blackcompany.site` (réponse HTTP 200 confirmée, moteur Baileys v2.3000). Il supporte nativement la création d'instances et la génération de code de jumelage 8 chiffres (`pairingCode`).
2. **PostgreSQL & Table `stage_applications` :** La table `public.stage_applications` existe déjà en production dans PostgreSQL (Supabase). Néanmoins, son enum `stage_app_status` ne contient actuellement que `('PENDING', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED')`. Pour satisfaire R2 (`SENT_PENDING`, `DELIVERED`, `FAILED`), une migration SQL `ALTER TYPE stage_app_status ADD VALUE ...` ou l'ajout d'une colonne dédiée `dispatch_status` est indispensable.
3. **Supabase Storage :** Actuellement, seuls les buckets `documents` et `document-previews` (privés) existent. Le bucket `cvs` doit être initialisé (idéalement en `public: true`) via l'API REST Supabase Storage, ou accessible via une URL signée / fallback base64.
4. **Zéro dépendance `@supabase/supabase-js` dans `mobile-api` :** `mobile-api` utilise nativement `pg` (Pool PostgreSQL) et des requêtes `fetch` directes vers l'API REST Supabase (`${SUPABASE_URL}/storage/v1/...`). Ce pattern éprouvé évite d'alourdir le bundle tout en étant 100% conforme.
5. **N8N Automation :** L'instance N8N `https://n8n.blackcompany.site` héberge déjà 11 workflows actifs. Le webhook cible `POST https://n8n.blackcompany.site/webhook/send-stage-application` recevra le payload normalisé pour router vers WhatsApp (Evolution API) ou Email (SMTP).

---

## 2. Investigation Détaillée R1 : Gestion des Sessions WhatsApp (Evolution API)

### 2.1 État des Lieux & Diagnostic
- **Host Evolution API :** `https://wa.blackcompany.site`
- **Version Détectée :** `2.3.7` (Exchange Baileys)
- **Authentification :** Header `apikey: <EVOLUTION_API_KEY>` (secret serveur).
- **Sécurité :** Les clés ne doivent en aucun cas être communiquées au client mobile. Tout échange passe par le proxy backend dans `mobile-api`.

### 2.2 Spécification des Endpoints du Proxy Backend
**Fichier à créer :** `mobile-api/app/api/mobile/whatsapp/instance/route.ts`  
**Helper à créer :** `mobile-api/lib/evolution-api.ts`

#### A. Génération du Code de Jumelage (`POST /api/mobile/whatsapp/instance`)
1. **Authentification Client :** `const access = await requireMobileUser(request);`
2. **Entrée :**
   ```ts
   const schema = z.object({
     phone: z.string().min(8).max(20).optional(), // Si omis, déduit de user.whatsappPhone ou user.phone
   });
   ```
3. **Normalisation du Numéro :**
   - Suppression des espaces, tirets et `+`.
   - Si numéro camerounais à 9 chiffres commençant par 6 (ex: `672364124`), préfixer par `237` -> `237672364124`.
4. **Nom de l'Instance :** Standard imposé `student-<phone>` (ex: `student-237672364124`).
5. **Création d'Instance sur Evolution API :**
   - Appel `POST ${EVOLUTION_API_URL}/instance/create`
   - Body : `{ instanceName, qrcode: false, integration: "WHATSAPP-BAILEYS" }`
   - Si l'instance existe déjà (HTTP 409 ou retour spécifique), continuer sans bloquer.
6. **Demande du Pairing Code :**
   - Appel `POST ${EVOLUTION_API_URL}/instance/connect/${instanceName}` avec `{ number: phone }` (ou `GET /instance/connect/${instanceName}?number=${phone}`).
   - Récupération du `pairingCode` (ex: `78429012` ou formaté `7842 - 9012`).
7. **Réponse Mobile :**
   ```json
   {
     "success": true,
     "instanceName": "student-237672364124",
     "pairingCode": "7842 - 9012",
     "state": "connecting"
   }
   ```
8. **Résilience & Mode Déconnecté :**
   Si Evolution API est inaccessible ou la clé serveur non encore renseignée, retourner un code de secours avec indicateur `{ success: true, pairingCode: "7842 - 9012", offline: true }` pour permettre le test de l'interface mobile sans rupture.

#### B. Vérification de l'État de Connexion (`GET /api/mobile/whatsapp/instance`)
1. **Entrée :** Paramètre query `?instance=student-237...` ou déduit du profil utilisateur authentifié.
2. **Appel Evolution API :**
   - `GET ${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`
   - Header `apikey: ${EVOLUTION_API_KEY}`
3. **Réponse Evolution API v2 :**
   ```json
   {
     "instance": {
       "instanceName": "student-237672364124",
       "state": "open" | "close" | "connecting"
     }
   }
   ```
4. **Réponse Mobile :**
   ```json
   {
     "success": true,
     "instanceName": "student-237672364124",
     "state": "open" | "close" | "connecting",
     "isConnected": true // si state === "open"
   }
   ```

### 2.3 Variables d'Environnement Requises
Dans `mobile-api/.env.example` et `.env.local` :
```env
EVOLUTION_API_URL=https://wa.blackcompany.site
EVOLUTION_API_KEY=<evolution-api-secret-key>
```

---

## 3. Investigation Détaillée R2 : Acheminement Candidatures & Stockage PDF

### 3.1 État Réel de la Base de Données PostgreSQL
La vérification directe de la base de données PostgreSQL de Supabase confirme :
```
Table : public.stage_applications
Colonnes existantes :
- id (uuid, PK)
- student_id (uuid, FK stage_students)
- job_id (uuid, FK stage_jobs)
- status (stage_app_status: 'PENDING', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED')
- applied_at (timestamptz)
- cv_file_url (text, nullable)
- letter_file_url (text, nullable)
- generated_cv_text (text, nullable)
- generated_letter_text (text, nullable)
- last_reminded_at (timestamptz, nullable)
- notes (text, nullable)
Index unique : (student_id, job_id)
```

#### Problématique Enum & Solution Retenue
L'exigence R2 stipule : *« status tracking (`SENT_PENDING`, `DELIVERED`, `FAILED`) »*.  
L'enum actuel `stage_app_status` rejetterait `'SENT_PENDING'` avec une erreur PostgreSQL.  
**Recommandation Technique :**
1. Exécuter la migration SQL :
   ```sql
   ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'SENT_PENDING';
   ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'DELIVERED';
   ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'FAILED';
   ```
2. Mettre à jour le type TypeScript dans `mobile-api/lib/stages-db.ts` :
   ```ts
   export type StageStatus = 'PENDING' | 'REVIEWING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED' | 'SENT_PENDING' | 'DELIVERED' | 'FAILED';
   ```
3. Ajouter en complément sur `stage_applications` deux colonnes d'audit traçables :
   ```sql
   ALTER TABLE public.stage_applications 
     ADD COLUMN IF NOT EXISTS dispatch_status TEXT DEFAULT 'SENT_PENDING',
     ADD COLUMN IF NOT EXISTS dispatch_channel TEXT;
   ```

### 3.2 Gestion du Stockage Cloud Supabase (`cvs/`)
- Les buckets actuels de Supabase sont `documents` et `document-previews` (privés).
- Pour que Evolution API puisse récupérer le PDF via son URL publique et l'expédier aux recruteurs, le bucket `cvs` doit être créé avec visibilité publique :
  ```ts
  // Initialisation idempotente du bucket cvs
  await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: 'cvs', name: 'cvs', public: true }),
  });
  ```
- **Upload du PDF :**
  Lorsqu'un payload `cvPdfBase64` arrive sur le backend :
  ```ts
  const pdfBuffer = Buffer.from(cvPdfBase64, 'base64');
  const filePath = `cv-${studentId}-${Date.now()}.pdf`;
  const uploadRes = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/cvs/${filePath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true',
    },
    body: pdfBuffer,
  });
  const cvPdfUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/cvs/${filePath}`;
  ```
- **Fallback Base64 :** Si l'upload échoue (ex: problème réseau ou quota), la chaîne base64 est conservée telle quelle dans le champ `cvPdfBase64` transmis au webhook N8N, garantissant zéro interruption de service.

### 3.3 Endpoint de Dispatch Backend
**Fichier à créer :** `mobile-api/app/api/mobile/stages/dispatch/route.ts`  
**Méthode :** `POST`

#### Schéma de Validation Zod
```ts
const dispatchSchema = z.object({
  jobId: z.string().min(1),
  channel: z.enum(['whatsapp', 'email']),
  whatsappPitch: z.string().optional(),
  letterText: z.string().optional(),
  cvPdfBase64: z.string().optional(),
  cvPdfUrl: z.string().url().optional(),
  phoneNumber: z.string().optional(),
});
```

#### Workflow d'Exécution
1. **Contrôle d'accès :** `requireMobileUser(request)`.
2. **Récupération des données Offre & Recruteur :** `getStageJob(jobId)` via `stages-db.ts` pour obtenir le titre, l'entreprise, le numéro WhatsApp recruteur et l'email RH.
3. **Résolution du Candidat :** `ensureStageStudent(user)` pour obtenir son profil complet et son `studentId`.
4. **Persistance du PDF :** Upload vers Supabase Storage `cvs/` -> obtention de `cvPdfUrl`.
5. **Enregistrement DB :**
   ```sql
   INSERT INTO public.stage_applications (
     student_id, job_id, status, cv_file_url,
     generated_cv_text, generated_letter_text, notes, applied_at
   ) VALUES ($1, $2, 'SENT_PENDING', $3, $4, $5, $6, now())
   ON CONFLICT (student_id, job_id) DO UPDATE SET
     status = 'SENT_PENDING',
     cv_file_url = coalesce(excluded.cv_file_url, stage_applications.cv_file_url),
     applied_at = now()
   RETURNING id;
   ```
6. **Transmission Webhook N8N :**
   - Webhook URL : `https://n8n.blackcompany.site/webhook/send-stage-application`
   - Timeout de sécurité : 10 secondes (via `AbortController`).
   - Structure du payload conforme à la section 3.2 de `contexte.md` :
     ```json
     {
       "applicationId": "app-uuid-1234",
       "channel": "whatsapp",
       "student": {
         "fullName": "Dave Lionel KAMENI",
         "phoneWhatsapp": "237672364124",
         "email": "dave.kameni@polytechnique.cm",
         "major": "Génie Logiciel",
         "university": "Polytechnique Yaoundé",
         "instanceName": "student-237672364124"
       },
       "job": {
         "title": "Stagiaire Développeur Frontend React",
         "companyName": "TechNovation Labs",
         "location": "Douala, Akwa",
         "recruiterWhatsapp": "237699112233",
         "recruiterEmail": "recrutement@technovation.cm"
       },
       "dossier": {
         "cvPdfUrl": "https://zlzwoqqnkvxndmtnzdsm.supabase.co/storage/v1/object/public/cvs/cv-xxx.pdf",
         "cvPdfBase64": "... (optionnel)",
         "letterText": "Madame, Monsieur...",
         "whatsappPitch": "Bonjour TechNovation Labs..."
       }
     }
     ```
7. **Statut & Traçabilité :**
   - Si N8N accepte la requête (200/202) -> retour `{ success: true, status: 'SENT_PENDING', applicationId }`.
   - Si N8N échoue -> mise à jour DB à `'FAILED'`, et retour informatif.
8. **Callback N8N (Mise à jour `DELIVERED`) :**
   - Endpoint `PATCH /api/mobile/stages/dispatch` (ou direct DB query depuis le nœud Postgres N8N) recevant `{ applicationId, status: 'DELIVERED' }` avec token secret.

---

## 4. Analyse des Dépendances & Normes du Codebase

| Composant | État Actuel | Action Recommandée |
|-----------|-------------|-------------------|
| `zod` | v4.3.6 installé dans `mobile-api` | Valider strictement tous les payloads entrant |
| `pg` | Pool fonctionnel dans `mobile-api/lib/database.ts` | Utiliser pour les requêtes paramétrées SQL |
| `@supabase/supabase-js` | Non installé dans `mobile-api` | **Ne pas installer** : Utiliser l'API REST via `fetch` standard |
| `better-auth` | v1.3.34 opérationnel | Sessions validées via `requireMobileUser` |
| `resend` | Configuré pour les emails transactionnels | N8N prend en charge l'envoi SMTP des candidatures email |
| Typecheck | 0 erreurs (`mobile-api` & root) | Maintenir le niveau de typage strict sans `any` |

---

## 5. Synthèse & Plan d'Implémentation Recommandé

1. **Migration SQL :**
   - Créer `docs/STAGES_DISPATCH_MIGRATION.sql` et appliquer sur la DB pour enrichir l'enum `stage_app_status` avec `'SENT_PENDING'`, `'DELIVERED'`, `'FAILED'`.
2. **Service Evolution API (`mobile-api/lib/evolution-api.ts`) :**
   - Fonctions : `normalizePhoneNumber`, `ensureInstance`, `getPairingCode`, `getConnectionState`.
3. **Route Proxy WhatsApp (`mobile-api/app/api/mobile/whatsapp/instance/route.ts`) :**
   - `POST` : création d'instance et génération du code de jumelage 8 chiffres.
   - `GET` : vérification de l'état `open` / `close` / `connecting`.
4. **Service Dispatch & Storage (`mobile-api/lib/stages-dispatch.ts`) :**
   - Fonctions : `uploadCvPdfToSupabase`, `forwardToN8nWebhook`.
5. **Route Dispatch Candidature (`mobile-api/app/api/mobile/stages/dispatch/route.ts`) :**
   - `POST` : réception du CV, stockage cloud, enregistrement DB, envoi N8N.
   - `PATCH` : callback de notification N8N pour basculer à `DELIVERED`.
6. **Script de Test Automatisé (`scripts/test-stage-dispatch.mjs`) :**
   - Vérifie la validation des schémas, la génération du pairing code, et la construction du payload de dispatch N8N.
