import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse } from '@/lib/mobile-access';
import { getDocumentById, updateDocumentSection, deleteDocumentSection } from '@/lib/documents-db';

export const runtime = 'nodejs';

const updateSectionSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content_html: z.string().optional(),
  content_json: z.any().optional(),
  sort_order: z.number().int().optional(),
});

type RouteContext = { params: Promise<{ id: string; sectionId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId, sectionId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    // Check ownership
    const document = await getDocumentById(documentId, access.user.id);
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    }

    const section = await updateDocumentSection(documentId, sectionId, parsed.data);
    return NextResponse.json({ section });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId, sectionId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    // Check ownership
    const document = await getDocumentById(documentId, access.user.id);
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    }

    const success = await deleteDocumentSection(documentId, sectionId);
    if (!success) {
      return NextResponse.json({ error: 'Section introuvable ou non supprimable.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
