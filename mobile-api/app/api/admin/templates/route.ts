import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_TEMPLATES_BUCKET, templateJson, withAdmin } from '@/lib/admin-template-routes';
import { templateInputSchema } from '@/lib/template-schema';
import { assetDataUris, createTemplate, listTemplates } from '@/lib/templates-db';

export const runtime = 'nodejs';

// Report templates, admin side (Module 24). Called by the admin web only.
export async function GET(request: NextRequest) {
  return withAdmin(request, ADMIN_TEMPLATES_BUCKET, async () => {
    const status = request.nextUrl.searchParams.get('status');
    const establishment = request.nextUrl.searchParams.get('establishment')?.slice(0, 120) || undefined;
    const templates = await listTemplates({
      status: status === 'draft' || status === 'published' || status === 'archived' ? status : undefined,
      establishment,
    });
    const previews = await assetDataUris(templates.map((t) => t.preview_asset_id));
    return NextResponse.json({
      templates: templates.map(({ document_style: _style, source_report: _report, ...t }) => ({
        ...t,
        previewDataUri: t.preview_asset_id ? previews.get(t.preview_asset_id) ?? null : null,
      })),
    });
  });
}

export async function POST(request: NextRequest) {
  return withAdmin(request, ADMIN_TEMPLATES_BUCKET, async (admin) => {
    const input = templateInputSchema.parse(await request.json());
    const template = await createTemplate(input, admin.appUserId, { format: 'manual' });
    return NextResponse.json({ template: await templateJson(template) }, { status: 201 });
  });
}
