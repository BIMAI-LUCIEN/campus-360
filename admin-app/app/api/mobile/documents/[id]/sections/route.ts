import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse } from '@/lib/mobile-access';
import { getDocumentById, addDocumentSection, reorderDocumentSections } from '@/lib/documents-db';

export const runtime = 'nodejs';

const addSectionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  sort_order: z.number().int().default(0),
});

const reorderSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int(),
    })
  ),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    // Check ownership
    const document = await getDocumentById(documentId, access.user.id);
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = addSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    }

    const { title, sort_order } = parsed.data;
    const section = await addDocumentSection(documentId, title, sort_order);

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    // Check ownership
    const document = await getDocumentById(documentId, access.user.id);
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données de tri invalides.' }, { status: 400 });
    }

    await reorderDocumentSections(documentId, parsed.data.orders);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
