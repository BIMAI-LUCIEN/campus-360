import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { ADMIN_IMPORT_BUCKET, readMultipart, templateJson, withAdmin } from '@/lib/admin-template-routes';
import { detectFileType } from '@/lib/file-validation';
import { importDocxTemplate, MAX_TEMPLATE_FILE_BYTES, TemplateImportError } from '@/lib/template-import-docx';
import { importPdfTemplate } from '@/lib/template-import-pdf';
import { addTemplateAsset, createTemplate, setTemplateLogo } from '@/lib/templates-db';

export const runtime = 'nodejs';
export const maxDuration = 60;

const nameSchema = z.string().trim().min(1).max(120);

// Import of a report (.docx or .pdf) as a draft template. The file itself is
// never stored: only the layout read from it, the logos and the report.
export async function POST(request: NextRequest) {
  return withAdmin(request, ADMIN_IMPORT_BUCKET, async (admin) => {
    const { form, data } = await readMultipart(request, MAX_TEMPLATE_FILE_BYTES);
    const name = nameSchema.parse(form.get('name'));
    const type = detectFileType(data);
    const format = type?.extension === 'docx' ? 'docx' : type?.extension === 'pdf' ? 'pdf' : null;
    if (!format) throw new TemplateImportError('Envoyez un document Word (.docx) ou un PDF.', 415);
    const imported = format === 'docx' ? await importDocxTemplate(data) : await importPdfTemplate(data, { useVision: false });
    let template = await createTemplate(
      { name, establishment: '', degree: '', kind: 'both', documentStyle: imported.style, outline: imported.outline },
      admin.appUserId,
      { format, report: imported.report },
    );
    for (const logo of imported.logos) {
      const asset = await addTemplateAsset(template.id, 'logo', logo.data);
      template = await setTemplateLogo(template.id, logo.slot, asset.id);
    }
    return NextResponse.json({ template: await templateJson(template), report: imported.report }, { status: 201 });
  });
}
