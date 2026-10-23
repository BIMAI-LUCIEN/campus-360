import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_TEMPLATES_BUCKET, assertUuid, templateJson, withAdmin } from '@/lib/admin-template-routes';
import { templatePatchSchema } from '@/lib/template-schema';
import { getTemplate, TemplateError, updateTemplate } from '@/lib/templates-db';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return withAdmin(request, ADMIN_TEMPLATES_BUCKET, async () => {
    const id = assertUuid((await context.params).id);
    const template = await getTemplate(id);
    if (!template) throw new TemplateError('Modèle introuvable.', 404);
    return NextResponse.json({ template: await templateJson(template) });
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withAdmin(request, ADMIN_TEMPLATES_BUCKET, async () => {
    const id = assertUuid((await context.params).id);
    const patch = templatePatchSchema.parse(await request.json());
    const template = await updateTemplate(id, patch);
    return NextResponse.json({ template: await templateJson(template) });
  });
}
