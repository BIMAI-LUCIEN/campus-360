## Forensic Audit Report

**Work Product**: Next.js Admin App and Mobile Integration Codebase
**Profile**: General Project
**Verdict**: CLEAN

### Phase Results
- **Hardcoded output detection**: PASS — Checked routes `/api/pdf`, `/api/pdf/[id]`, `/api/admin/analytics`, and `/api/mobile/*`. No test results or expected values are hardcoded in the source code or API routes.
- **Facade detection**: PASS — Investigated `lib/pdf-preview.ts` (which implements authentic watermarking using `pdf-lib` page extraction and canvas drawing), `lib/supabase-pdf.ts` (which does live bucket uploads and deletion), and the Postgres transaction logs. No dummy/facade implementations exist that pretend to perform logic but actually shortcut or return static values.
- **Pre-populated artifact detection**: PASS — No fabricated logs, verification artifacts, or test runs are pre-populated.
- **Behavioral verification**: PASS — Next.js admin app compiled successfully with no TypeScript compilation errors.
- **Dependency audit**: PASS — Third-party libraries (`pdf-lib`, `pg`, `better-auth`) are used appropriately for integration, not to bypass or simulate target features.

### Evidence

#### 1. PDF Watermarking Logic (lib/pdf-preview.ts)
Authentic page extraction and drawing:
```typescript
export async function generateWatermarkedPreview(
  pdfBuffer: Buffer,
  watermarkText: string = 'Campus-Bordes Preview'
): Promise<Buffer> {
  const srcDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = srcDoc.getPageCount();
  if (pageCount === 0) {
    throw new Error('Le document PDF ne contient aucune page.');
  }

  const previewDoc = await PDFDocument.create();
  const [copiedPage] = await previewDoc.copyPages(srcDoc, [0]);
  const page = previewDoc.addPage(copiedPage);
  
  const helveticaBold = await previewDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 40;
  const textWidth = helveticaBold.widthOfTextAtSize(watermarkText, fontSize);
  const textHeight = helveticaBold.heightAtSize(fontSize);
  const { width, height } = page.getSize();
  
  const theta = 45;
  const rad = (theta * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const x = width / 2 - (textWidth / 2) * cos + (textHeight / 2) * sin;
  const y = height / 2 - (textWidth / 2) * sin - (textHeight / 2) * cos;
  
  page.drawText(watermarkText, {
    x,
    y,
    size: fontSize,
    font: helveticaBold,
    color: rgb(1, 0.25, 0.1),
    opacity: 0.4,
    rotate: degrees(theta),
  });
  
  const pdfBytes = await previewDoc.save();
  return Buffer.from(pdfBytes);
}
```

#### 2. Supabase Storage and Database Deletion (lib/supabase-pdf.ts)
Removes raw PDF from `documents`, watermarked preview from `document-previews`, and unlinks local file from disk:
```typescript
export const deleteSupabasePdf = async (documentId: string) => {
  const db = getPool();
  if (!db) return;

  const { rows } = await db.query(
    'select file_path, preview_path from public.documents where id = $1',
    [documentId]
  );
  const doc = rows[0];

  if (doc) {
    if (doc.file_path) {
      await deleteSupabaseFile('documents', doc.file_path);
    }
    if (doc.preview_path) {
      await deleteSupabaseFile('document-previews', doc.preview_path);
    }
    if (doc.file_path) {
      const filename = doc.file_path.split('/').pop();
      if (filename) {
        const localPath = path.join(pdfUploadDir, filename);
        try {
          await unlink(localPath);
        } catch (err: any) {
          if (err.code !== 'ENOENT') {
            console.error(`Error deleting local file ${localPath}:`, err);
          }
        }
      }
    }
  }

  await db.query('delete from public.documents where id = $1', [documentId]);
};
```

#### 3. Analytics Resolution (lib/supabase-pdf.ts)
Performs SQL queries to compute metrics and trace email info from `public.profiles`:
```typescript
      db.query(`
        select
          e.id,
          e.event_type,
          e.document_id,
          e.session_id,
          e.user_id,
          e.created_at,
          coalesce(d.title, e.document_id, 'Catalogue') as document_title,
          p.email as user_email
        from public.document_events e
        left join public.documents d on d.id = e.document_id
        left join public.profiles p on p.id = e.user_id
        order by e.created_at desc
        limit 20
      `)
```
