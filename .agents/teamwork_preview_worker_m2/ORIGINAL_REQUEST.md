## 2026-06-26T19:56:47Z
You are the teamwork_preview_worker.
Your working directory is: `c:/Users/migue/Desktop/mes projets/campus 360/.agents/teamwork_preview_worker_m2`.
Your objective is to implement the improvements for Campus-360 admin-app, covering R1, R2, R3, R4, and compile checks.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT
hardcode test results, create dummy/facade implementations, or
circumvent the intended task. A Forensic Auditor will independently
verify your work. Integrity violations WILL be detected and your
work WILL be rejected.

Please execute the following tasks:

1. Add Dependency:
   - Install `pdf-lib` in the `admin-app` directory (you can run `npm install pdf-lib` inside `admin-app`).

2. Update Schema & Types:
   - In `admin-app/lib/course-db.ts`:
     - Add `previewPath: string | null` to the `PdfDocument` interface.
     - Add `previewPath?: string` to `CreatePdfInput`.
     - Update the `mapPdf` function to map `row.preview_path` (from Supabase DB) to `previewPath`.
     - Update `createPdf` function to pass `previewPath` (either `input.previewPath` or default `null`) to the document object.
   - In `admin-app/lib/supabase-pdf.ts`:
     - Update `upsertSupabasePdf` to insert and update the `preview_path` column in the database queries.

3. Implement R2 (Automatic Watermarked Preview Generation):
   - Create `admin-app/lib/pdf-preview.ts`.
   - Implement `generateWatermarkedPreview(pdfBuffer: Buffer, watermarkText?: string): Promise<Buffer>` using `pdf-lib`:
     - Load the full PDF document.
     - Copy the first page (index 0) of the source PDF.
     - Create a new PDF document and add the copied page.
     - Overlay a diagonal, semi-transparent, highly visible watermark: "Campus-Bordes Preview" (e.g. bold font, rotation 45 degrees, opacity ~0.4, colored red/orange) centered on the page.
     - Save the document and return it as a Buffer.
   - In `admin-app/app/api/pdf/route.ts` (the upload route):
     - In the `POST` function:
       - Generate the watermarked preview PDF buffer from the uploaded file bytes using `generateWatermarkedPreview`.
       - Upload this preview buffer to the private `document-previews` bucket on Supabase Storage using the path `admin/${fileName}` (the same safe file name as the original document).
       - Create or modify a utility function (e.g., `uploadSupabaseFile` or update `uploadSupabasePdfBytes` to take bucket name) so that you can upload to both buckets.
       - Store the preview path (`admin/${fileName}`) in the `previewPath` of the document created.

4. Implement R4 (Catalog Management & Sync + File Deletion):
   - In `admin-app/lib/supabase-pdf.ts`:
     - Update `deleteSupabasePdf` so that when a document is deleted, it:
       1. Retrieves the `file_path` and `preview_path` from `public.documents` for that document ID.
       2. If the files exist in storage, calls a `DELETE` request via the Supabase Storage API to remove the full PDF from `documents` bucket, and the preview PDF from `document-previews` bucket.
       3. Unlinks/deletes the local file at `public/uploads/pdfs/[filename]` if it exists.
       4. Deletes the document database record.
     - Create a helper `deleteSupabaseFile(bucket, storagePath)` that issues a `DELETE` request to `${getSupabaseUrl()}/storage/v1/object/${bucket}/${storagePath}` authenticated with `SUPABASE_SERVICE_ROLE_KEY`.

5. Implement R3 (Live Analytics Dashboard):
   - In `admin-app/lib/supabase-pdf.ts` (`getSupabasePdfAnalytics`):
     - Fix the email query join: join the events table with `public.profiles` on `profiles.id = document_events.user_id` instead of the Better-Auth `"user"` table. This is because mobile users are stored in Supabase profiles.
     - Fix the revenue calculation: query the sum of `amount_coins` from `public.document_purchases` instead of using `sum(d.price_coins)` (which multiplies the current price of documents by total events).
     - Ensure the query counts search queries correctly and returns `searches` in `totals`.
   - Create a Next.js API route `admin-app/app/api/admin/analytics/route.ts`:
     - Secure it using `requireAdminApi()`.
     - Fetch the latest analytics via `getSupabasePdfAnalytics()` and return it as JSON.
   - Refactor `admin-app/app/admin/analytics/page.tsx`:
     - Add a card in the KPI card grid to display "Nombre de recherches" (the total search queries from `analytics.totals.searches`).
     - Turn the analytics page (or parts of it) into a client-rendered component or add a client-side wrapper that queries `/api/admin/analytics` and polls it every 10 seconds to dynamically update the dashboard (sessions, revenue, purchases, conversion rate, search count, charts, and recent events stream). Make sure to show the live update state clearly.

6. Validation:
   - Ensure the Next.js admin app builds successfully: run `npm.cmd run typecheck` or `npm.cmd run build` inside `admin-app/` and verify there are no TypeScript or build compilation errors.
   - Verify that your code changes don't introduce any errors.

Please document all files modified/created, the commands run, and the outcomes in your agent directory, and write a `handoff.md` reporting back to me.
