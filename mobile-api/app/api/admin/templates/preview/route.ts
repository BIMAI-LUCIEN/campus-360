import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { ADMIN_TEMPLATES_BUCKET, withAdmin } from '@/lib/admin-template-routes';
import { templatePreviewHtml } from '@/lib/template-preview';
import { templateInputSchema } from '@/lib/template-schema';
import { assetDataUris, getTemplate } from '@/lib/templates-db';

export const runtime = 'nodejs';

const bodySchema = z
  .object({
    documentStyle: templateInputSchema.shape.documentStyle,
    outline: templateInputSchema.shape.outline,
    templateId: z.string().uuid().optional(),
  })
  .strict();

// HTML preview of a style being edited (for a sandboxed iframe in the admin web).
export async function POST(request: NextRequest) {
  return withAdmin(request, ADMIN_TEMPLATES_BUCKET, async () => {
    const body = bodySchema.parse(await request.json());
    let logos: Record<string, string | null> = {};
    if (body.templateId) {
      const template = await getTemplate(body.templateId);
      if (template) {
        const uris = await assetDataUris(Object.values(template.logo_assets));
        logos = Object.fromEntries(Object.entries(template.logo_assets).map(([slot, id]) => [slot, uris.get(id as string) ?? null]));
      }
    }
    return NextResponse.json({ html: templatePreviewHtml(body.documentStyle, body.outline, logos) });
  });
}
