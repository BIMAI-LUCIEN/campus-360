import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { resolveStyle } from '@/lib/document-style';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';
import { applyTemplateToDocument, ApplyTemplateError } from '@/lib/template-apply-service';
import { getPublishedTemplate } from '@/lib/templates-db';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bodySchema = z.object({ templateId: z.string().uuid() }).strict();

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

// Applies a published template to the student's document (Module 24): style,
// cover and missing sections. The student's text is not touched.
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;
    await enforceRateLimit(request, { bucket: 'apply-template', max: 10, windowMs: 10 * 60_000, userId });
    const { id } = await context.params;
    if (!UUID_RE.test(id)) return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return withCors(NextResponse.json({ error: 'Données invalides.' }, { status: 400 }), request);
    const template = await getPublishedTemplate(parsed.data.templateId);
    if (!template) return withCors(NextResponse.json({ error: 'Modèle indisponible.' }, { status: 404 }), request);

    const client = await databasePool.connect();
    try {
      const result = await applyTemplateToDocument(client, {
        documentId: id,
        userId,
        template: { id: template.id, outline: template.outline, style: template.document_style },
      });
      return withCors(
        NextResponse.json({
          document: { ...result.document, line_spacing: Number(result.document.line_spacing), document_style: resolveStyle(result.document.document_style) },
          addedSections: result.addedSections,
        }),
        request,
      );
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof ApplyTemplateError) return withCors(NextResponse.json({ error: error.message }, { status: error.status }), request);
    return withCors(mobileErrorResponse(error, request), request);
  }
}
