# Handoff Report - Campus-360 Admin-App improvements exploration

## 1. Observation

- **Database schema definition:** In `docs/PDF_SUPABASE.sql` (line 51) and `admin-app/scripts/setup-supabase-pdf.mjs` (line 72), the `public.documents` table is defined to include a `preview_path text` column.
- **Codebase Mapping & Type Definitions:** In `admin-app/lib/course-db.ts` (lines 7-37), the `PdfDocument` TypeScript type lacks any property for `previewPath`. In `admin-app/lib/supabase-pdf.ts` (lines 110-176), `upsertSupabasePdf` does not specify `preview_path` in its `insert` statement or the `on conflict` update clause.
- **Access Control:** In `admin-app/middleware.ts` (lines 29-31), Next.js middleware is configured to only match `/api/auth/:path*` and `/api/mobile/:path*` for CORS. Role validation for admins/super-admins is instead processed inside Server Components/API routes using functions in `admin-app/lib/access.ts` (lines 82-100), specifically `requireAdminPage()` and `requireAdminApi()`. These functions check session attributes and compare emails using environment variables `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_ALLOWED_EMAILS` (lines 16-21).
- **Syncing Profiles:** In `admin-app/lib/access.ts` (line 38), `syncProfile` executes:
  ```typescript
  const existing = await pool.query('select id from public.profiles where id = $1', [user.id]);
  ```
  It checks if a user profile exists in Supabase. It does not check if the user is authorized. It updates/inserts the role computed from the Better-Auth session role and env variables into `public.profiles`.
- **PDF Upload Route:** In `admin-app/app/api/pdf/route.ts` (lines 142-143), uploads are handled by calling:
  ```typescript
  const storagePath = `admin/${fileName}`;
  await uploadSupabasePdfBytes(storagePath, bytes);
  ```
  which POSTs to `${getSupabaseUrl()}/storage/v1/object/documents/${filePath}` using the service role key. It does not generate or upload previews.
- **Document Deletion:** In `admin-app/lib/course-db.ts` (line 319), `deletePdf` calls `deleteSupabasePdf(pdfId)`. In `admin-app/lib/supabase-pdf.ts` (lines 252-256), `deleteSupabasePdf` is implemented as:
  ```typescript
  export const deleteSupabasePdf = async (documentId: string) => {
    const db = getPool();
    if (!db) return;
    await db.query('delete from public.documents where id = $1', [documentId]);
  };
  ```
  It does not execute storage bucket API DELETE requests or local filesystem cleanups.
- **Analytics Queries:** In `admin-app/lib/supabase-pdf.ts` (lines 303-307), the query for recent events joins the Better-Auth user table:
  ```sql
  left join "user" u on u.id = e.user_id
  ```
  And in `totalsResult` (lines 274), revenue is estimated using the document's current price:
  ```sql
  sum(coalesce(d.price_coins, 0)) filter (where e.event_type = 'purchase_success')::int as revenue
  ```

---

## 2. Logic Chain

1. **Database Schema:** Because `preview_path` exists in the database schema but is absent from the `PdfDocument` TypeScript type and `upsertSupabasePdf` DB utility, the backend database row is initialized with the column, but the app code cannot write or retrieve it.
2. **Access Control:** The admin validation logic relies on Better-Auth's active session role and the local allowed-email list env variables. It writes the result *to* Supabase `profiles` during request-time syncing instead of querying Supabase `profiles` to check permissions. Therefore, the source of truth is the Next.js local credentials database and env variables.
3. **PDF Previews:** Since no watermarking logic or `document-previews` bucket upload exists in the `/api/pdf` upload route, uploading a PDF currently results in a complete, unwatermarked document being saved to the private bucket, with no 1-page preview generated.
4. **Watermarking Approach:** `pdfjs-dist` is a rendering-only tool and requires native packages (like `canvas`) to draw pages on Node.js, which are prone to deployment errors on serverless. Puppeteer is too resource-heavy. `pdf-lib` is pure JS, can modify PDFs, extract pages, and overlay watermarks without native bindings, making it the most suitable choice.
5. **Deletion Cleanups:** Because `deleteSupabasePdf` only runs a `DELETE` SQL query on `public.documents`, files uploaded to the private `documents` bucket, their associated preview PDFs, and the local server files (under `public/uploads/pdfs/`) are left behind, leaking storage.
6. **Analytics Schema & Email Join:** Mobile user actions generate events in `public.document_events` containing the mobile user's UUID. Since mobile users are registered in Supabase, they have a record in `public.profiles` but not in Better-Auth's local `"user"` table. Joining with `"user"` returns NULL for user emails. Joining with `public.profiles` resolves this.
7. **Revenue Inaccuracy:** Calculating revenue based on `sum(d.price_coins)` at query time reflects the *current* price of a document, not what the buyer originally paid. Querying `sum(amount_coins)` from `public.document_purchases` (and `public.pack_purchases`) resolves this.

---

## 3. Caveats

- We assumed the database structure was created exactly via `docs/PDF_SUPABASE.sql` or `setup-supabase-pdf.mjs` (which define the `preview_path` column).
- We were unable to query the live Supabase PostgreSQL database directly using local shell command utilities because command execution timed out on the Windows runner waiting for permission approval. However, the files and logic in the repository provide conclusive static evidence.

---

## 4. Conclusion

- The Supabase database tables are correctly initialized structurally, but the `preview_path` column is ignored by the backend API.
- The admin app uses Better-Auth sessions and environment variables as the source of truth for access control, and only writes-syncs to Supabase `profiles`.
- PDF uploads are processed securely to the private bucket, but lack the R2 preview generation.
- `pdf-lib` is the best library for PDF page extraction and text watermarking.
- Document deletion is incomplete, leaking files in storage and the filesystem.
- Analytics queries suffer from data mismatch on user emails (joining wrong table) and incorrect revenue estimations (omitting historical price changes and pack sales).

---

## 5. Verification Method

To verify these findings:
1. Run `npm.cmd run typecheck` inside `admin-app/` to verify that there are currently no TypeScript errors.
2. Inspect `admin-app/lib/course-db.ts` (lines 7-37) to verify the absence of `previewPath` in `PdfDocument`.
3. Inspect `admin-app/lib/supabase-pdf.ts` (line 104) to verify `preview_path` is missing from `upsertSupabasePdf`.
4. Inspect `admin-app/lib/supabase-pdf.ts` (line 252) to verify `deleteSupabasePdf` does not make any storage deletion requests.
5. Inspect `admin-app/lib/supabase-pdf.ts` (line 307) to verify the incorrect `left join "user" u` join.
