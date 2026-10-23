import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { ADMIN_TEMPLATES_BUCKET, assertUuid, templateJson, withAdmin } from '@/lib/admin-template-routes';
import { renderHtmlToJpeg } from '@/lib/pdf-render';
import { templatePreviewHtml } from '@/lib/template-preview';
import { addTemplateAsset, setTemplatePreview, setTemplateStatus } from '@/lib/templates-db';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({ status: z.enum(['draft', 'published', 'archived']) }).strict();

// Publishing also stores a 360 px JPEG of the cover for the student gallery.
// A failed thumbnail does not block the publication; the response says so.
export async function POST(request: NextRequest, context: RouteContext) {
  return withAdmin(request, ADMIN_TEMPLATES_BUCKET, async () => {
    const id = assertUuid((await context.params).id);
    const { status } = bodySchema.parse(await request.json());
    let template = await setTemplateStatus(id, status);
    let previewError: string | null = null;
    if (status === 'published') {
      try {
        // Placeholders instead of the imported logos: a published template shows no
        // institution's logo (decision 21), its thumbnail neither.
        const html = templatePreviewHtml(template.document_style, template.outline, {}).replace('<style>', '<style>body { zoom: 0.4535; } ');
        const jpeg = await renderHtmlToJpeg(html, 360, 510);
        const asset = await addTemplateAsset(id, 'preview', jpeg);
        await setTemplatePreview(id, asset.id);
        template = { ...template, preview_asset_id: asset.id };
      } catch (error) {
        console.warn('[admin-templates] preview failed', error);
        previewError = 'Aperçu non généré (navigateur indisponible sur le serveur).';
      }
    }
    return NextResponse.json({ template: await templateJson(template), previewError });
  });
}
