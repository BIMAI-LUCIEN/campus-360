import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse } from '@/lib/mobile-access';
import { getDocumentById, getDocumentSections, updateDocumentSettings, deleteDocument } from '@/lib/documents-db';

export const runtime = 'nodejs';

const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  font_family: z.string().trim().optional(),
  line_spacing: z.number().min(0.5).max(4.0).optional(),
  margins: z.enum(['normal', 'narrow', 'wide']).optional(),
  cover_template: z.enum(['classic', 'minimalist', 'tech']).optional(),
  cover_data: z.record(z.string(), z.any()).optional(),
  document_metadata: z.record(z.string(), z.any()).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const document = await getDocumentById(id, access.user.id);
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    }

    const sections = await getDocumentSections(id);
    return NextResponse.json({ document, sections });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const body = await request.json().catch(() => null);
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    }

    const document = await updateDocumentSettings(id, access.user.id, parsed.data);
    return NextResponse.json({ document });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const success = await deleteDocument(id, access.user.id);
    if (!success) {
      return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
