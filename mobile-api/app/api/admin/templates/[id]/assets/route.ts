import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_TEMPLATES_BUCKET, assertUuid, readMultipart, templateJson, withAdmin } from '@/lib/admin-template-routes';
import { addTemplateAsset, getTemplate, MAX_TEMPLATE_ASSET_BYTES, setTemplateLogo, TemplateError } from '@/lib/templates-db';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const SLOTS = ['school', 'company', 'department'] as const;

// A logo of the template (multipart: `file`, `slot`), or its removal (DELETE ?slot=).
export async function POST(request: NextRequest, context: RouteContext) {
  return withAdmin(request, ADMIN_TEMPLATES_BUCKET, async () => {
    const id = assertUuid((await context.params).id);
    const current = await getTemplate(id);
    if (!current || current.status === 'archived') throw new TemplateError('Modèle introuvable ou archivé.', 404);
    const { form, data } = await readMultipart(request, MAX_TEMPLATE_ASSET_BYTES);
    const slot = SLOTS.find((s) => s === form.get('slot'));
    if (!slot) throw new TemplateError('Emplacement de logo inconnu.', 400);
    const asset = await addTemplateAsset(id, 'logo', data);
    const template = await setTemplateLogo(id, slot, asset.id);
    return NextResponse.json({ template: await templateJson(template) });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withAdmin(request, ADMIN_TEMPLATES_BUCKET, async () => {
    const id = assertUuid((await context.params).id);
    const slot = SLOTS.find((s) => s === request.nextUrl.searchParams.get('slot'));
    if (!slot) throw new TemplateError('Emplacement de logo inconnu.', 400);
    const template = await setTemplateLogo(id, slot, null);
    return NextResponse.json({ template: await templateJson(template) });
  });
}
