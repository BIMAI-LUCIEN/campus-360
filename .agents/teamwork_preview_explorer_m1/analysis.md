# Technical Exploration Analysis - Campus-360 Admin-App Improvements

This report documents the investigation of the Campus-360 admin-app codebase, database schema, access control, upload/deletion flows, and analytics system. It includes observations, feasibility assessments, and proposed code changes.

---

## 1. Database State Analysis

### Observation
- The Supabase database tables are set up using the SQL script defined in `docs/PDF_SUPABASE.sql` and the setup script `admin-app/scripts/setup-supabase-pdf.mjs`.
- The setup script `setup-supabase-pdf.mjs` initializes storage buckets (`documents`, `document-previews`) and tables (`public.profiles`, `public.wallets`, `public.documents`, `public.document_purchases`, `public.pdf_packs`, `public.pdf_pack_items`, `public.pack_purchases`, `public.wallet_transactions`, `public.ia_usage_logs`, `public.subscription_plans`, `public.ia_packs`, `public.document_events`).

### Column & Table Discrepancies
Upon comparing `docs/PDF_SUPABASE.sql` and `admin-app/scripts/setup-supabase-pdf.mjs`, we find that:
- **`public.documents` Table:**
  - Both files correctly define the columns including `preview_path text`.
- **Codebase Mapping Discrepancy:**
  - In `admin-app/lib/course-db.ts`, the TypeScript interface `PdfDocument` **completely lacks** the `previewPath` property.
  - The database mapper function `mapPdf` does not map the `preview_path` database column to the JS object.
  - In `admin-app/lib/supabase-pdf.ts`, the `upsertSupabasePdf` function does not insert or update the `preview_path` column in Supabase (it is missing from the column list and variables).

---

## 2. Access Control Analysis

### Middleware & Request Interception
- **`admin-app/middleware.ts`:**
  - This Next.js middleware is only configured for CORS headers: `matcher: ['/api/auth/:path*', '/api/mobile/:path*']`.
  - It does **not** enforce admin page protections or administrative API credentials.
- **`admin-app/lib/access.ts`:**
  - Administrative protection is enforced on a per-page and per-route basis via `requireAdminPage()` (for pages) and `requireAdminApi()` (for API routes).
  - Both check the active Better-Auth session (`auth.api.getSession`) and verify if the user's role is `admin` or `super_admin`, or if their email is in `ADMIN_ALLOWED_EMAILS` or `ADMIN_BOOTSTRAP_EMAIL` from env variables.

### Querying the `profiles` Table
- `lib/access.ts` does **not** query `public.profiles` to *verify* if a user is an admin.
- Instead, it performs a write-sync: `syncProfile(user)` checks if the profile exists in `public.profiles`.
  - If not, it inserts the user into `public.profiles` and creates a wallet in `public.wallets`.
  - If it exists, it updates the `role` in `public.profiles` based on Better-Auth's session role or environment variables.
- Therefore, Better-Auth (storing records in the `databasePool` `"user"` and `public.app_users` tables) and environment variables are the **source of truth** for admin permissions, and `public.profiles` is only synced downstream.

---

## 3. PDF Upload Analysis

### How the Upload Route Works (`/api/pdf/route.ts`)
- Spawns in a Node.js runtime and authenticates using `requireAdminApi()`.
- Validates fields via Zod (`pdfSchema`), ensuring the file is a PDF and size <= 20MB.
- Generates a unique filename: `${Date.now()}-${safeName(file.name)}.pdf`.
- Saves the file locally to `public/uploads/pdfs/` on standard environments (or `tmp` on Vercel) using `writeFile`.
- Uploads the file bytes to the private `documents` bucket in Supabase Storage under `admin/${fileName}` using a `fetch` request authenticated with the `SUPABASE_SERVICE_ROLE_KEY`.
- Runs local metadata inference (`inferPdfIntelligence`) and calls `createPdf` to write to the `public.documents` table via `upsertSupabasePdf`.

### Bucket Access Configuration
- The `documents` bucket is private (`public = false`), protected by Row-Level Security (RLS).
- Next.js bypasses RLS using the `SUPABASE_SERVICE_ROLE_KEY`.
- Mobile users access full documents by posting to `/api/mobile/pdf/signed-url` which generates a temporary signed URL after verifying the user has purchased the document or has an active subscription.
- Currently, **no preview PDF** is generated or uploaded to `document-previews` during this process.

---

## 4. Watermarking & Preview Feasibility (R2)

### Comparison of Approaches

| Approach | Pros | Cons | Recommendation |
| :--- | :--- | :--- | :--- |
| **pdfjs-dist (custom canvas script)** | Already in `package.json`. Good for rendering pages to image buffers. | Requires native `canvas` binary compilation in Node.js (highly unstable on serverless/Vercel environments). Cannot output a PDF. | Not recommended for PDF generation. |
| **Puppeteer** | Spawns headless browser to print to PDF. | Huge memory/CPU footprint. Unstable on serverless platforms. Slow. | Avoid. |
| **pdf-lib** | Pure JavaScript (no native code). Can easily load a PDF, copy the first page, draw text watermarks (with rotation, opacity), and save. | Needs to be installed via npm. | **Highly Recommended**. Extremely lightweight, fast, and robust. |

### Feasibility Code Sketch (`lib/pdf-preview.ts`)
To implement R2, we propose adding the `pdf-lib` package and creating the following utility:

```typescript
// admin-app/lib/pdf-preview.ts
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

/**
 * Extracts the first page of a PDF buffer, overlays a diagonal watermark, and returns the preview PDF buffer.
 */
export async function generateWatermarkedPreview(pdfBuffer: Buffer, watermarkText = 'Campus-Bordes Preview'): Promise<Buffer> {
  // Load the full PDF document
  const srcDoc = await PDFDocument.load(pdfBuffer);
  
  if (srcDoc.getPageCount() === 0) {
    throw new Error('PDF has no pages.');
  }

  // Create a new PDF document for the preview
  const previewDoc = await PDFDocument.create();
  
  // Copy the first page (index 0) of the source PDF
  const [firstPage] = await previewDoc.copyPages(srcDoc, [0]);
  previewDoc.addPage(firstPage);
  
  const { width, height } = firstPage.getSize();
  
  // Embed a standard bold font
  const helveticaFont = await previewDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Calculate text sizing
  const fontSize = 40;
  const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
  const textHeight = helveticaFont.heightOfSize(fontSize);
  
  // Draw diagonal watermark (centered on the page)
  firstPage.drawText(watermarkText, {
    x: (width - textWidth) / 2 + 50,
    y: (height - textHeight) / 2 - 100,
    size: fontSize,
    font: helveticaFont,
    color: rgb(0.8, 0.2, 0.2), // High-visibility red/orange
    rotate: degrees(45),
    opacity: 0.4,
  });
  
  // Optional: Add header/footer watermarks
  firstPage.drawText(watermarkText, {
    x: 20,
    y: height - 30,
    size: 12,
    font: helveticaFont,
    color: rgb(0.5, 0.5, 0.5),
    opacity: 0.3,
  });

  const previewBytes = await previewDoc.save();
  return Buffer.from(previewBytes);
}
```

---

## 5. Catalog Management & Deletion (R4)

### Current API Endpoint Architecture
- **Edit / Metadata:** Splitted endpoints:
  - `app/api/pdf/[id]/status/route.ts` (PATCH status update, uses `updatePdfStatus`)
  - `app/api/pdf/[id]/price/route.ts` (PATCH price update, uses `updatePdfPrice`)
  - `app/api/pdf/[id]/analyze/route.ts` (POST re-run AI indexing, uses `updatePdfAiMetadata`)
- **Delete:**
  - `app/api/pdf/[id]/route.ts` (DELETE endpoint, calls `deletePdf` from `lib/course-db.ts`)

### Current Deletion Implementation
- `deletePdf` in `lib/course-db.ts` calls `deleteSupabasePdf(pdfId)` from `lib/supabase-pdf.ts`.
- `deleteSupabasePdf` executes only `delete from public.documents where id = $1` on the Postgres pool.
- **Problem:** Files are left stranded in both the `documents` and `document-previews` buckets, and the local server directory `public/uploads/pdfs/`.

### Proposed Deletion Modification
We should update `deleteSupabasePdf` in `admin-app/lib/supabase-pdf.ts` to delete both the database record and the associated storage files:

```typescript
// admin-app/lib/supabase-pdf.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { pdfUploadDir } from './paths';

export const deleteSupabaseFile = async (bucket: string, storagePath: string) => {
  if (!isSupabaseStorageConfigured()) return;
  const baseUrl = getSupabaseUrl();
  const response = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${storagePath}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    },
  });
  if (!response.ok) {
    console.error(`Failed to delete storage file from ${bucket}/${storagePath}:`, await response.text());
  }
};

export const deleteSupabasePdf = async (documentId: string) => {
  const db = getPool();
  if (!db) return;

  // 1. Retrieve the file path and preview path before deletion
  const { rows } = await db.query(
    'select file_path, preview_path from public.documents where id = $1',
    [documentId]
  );

  if (rows[0]) {
    const { file_path, preview_path } = rows[0];

    // 2. Delete full PDF from storage and local folder
    if (file_path) {
      await deleteSupabaseFile('documents', file_path);
      try {
        const localFileName = file_path.split('/').pop();
        if (localFileName) {
          await fs.unlink(path.join(pdfUploadDir, localFileName));
        }
      } catch (err) {
        // Silently ignore if local file doesn't exist (e.g. Vercel)
      }
    }

    // 3. Delete preview PDF from storage
    if (preview_path) {
      await deleteSupabaseFile('document-previews', preview_path);
    }
  }

  // 4. Delete the DB record
  await db.query('delete from public.documents where id = $1', [documentId]);
};
```

---

## 6. Analytics Optimization (R3)

### Current Architecture
- The Next.js page `app/admin/analytics/page.tsx` directly queries the Postgres pool using `getSupabasePdfAnalytics()` in `lib/supabase-pdf.ts`.
- There is **no** `/api/analytics` endpoint.

### Query Limitations & Flaws

1. **Incorrect User Joins in Recent Events:**
   The recent events query performs: `left join "user" u on u.id = e.user_id`. Since mobile users are authenticated through Supabase Auth, they exist in `public.profiles` but not in Better-Auth's local `"user"` table. This causes their email to display as `NULL`.
   *Fix:* Join with `public.profiles` instead:
   ```sql
   left join public.profiles p on p.id = e.user_id
   ```

2. **Inaccurate Revenue Estimation:**
   The totals query estimates revenue using:
   `sum(coalesce(d.price_coins, 0)) filter (where e.event_type = 'purchase_success')`
   This sums the *current* document price. If a document's price was changed, historical analytics would be incorrect.
   *Fix:* Query the actual coin amounts paid from the transactions/purchases tables:
   ```sql
   -- Query sum(amount_coins) from document_purchases and pack_purchases
   select coalesce(sum(amount_coins), 0)::int from public.document_purchases
   ```

### Proposed Solutions for Live Analytics (Polling & Streams)

To support **live updates** on the dashboard, we should implement a polling architecture:

1. **Create an API Route `/api/admin/analytics/route.ts`:**
   ```typescript
   // admin-app/app/api/admin/analytics/route.ts
   import { NextResponse } from 'next/server';
   import { requireAdminApi } from '@/lib/access';
   import { getSupabasePdfAnalytics } from '@/lib/supabase-pdf';

   export const runtime = 'nodejs';

   export async function GET() {
     const { response } = await requireAdminApi();
     if (response) return response;
     
     const analytics = await getSupabasePdfAnalytics();
     return NextResponse.json({ analytics });
   }
   ```

2. **Refactor the Dashboard to Poll / Client-Render:**
   Create a client component wrappers around KPI cards and the recent events feed that triggers a `fetch('/api/admin/analytics')` call every 10 seconds. This avoids the heavy websocket dependencies on the frontend while providing a fresh stream of live actions (searches, preview openings, purchases).

---

## Proposed Database and TypeScript Schema Updates

### Typescript update (`admin-app/lib/course-db.ts`):
```typescript
export type PdfDocument = {
  // ... existing fields ...
  previewPath: string | null;
  // ...
}
```

### Database mapper update (`admin-app/lib/course-db.ts`):
```typescript
const mapPdf = (row: any): PdfDocument => ({
  // ...
  previewPath: row.preview_path ? String(row.preview_path) : null,
  // ...
});
```
