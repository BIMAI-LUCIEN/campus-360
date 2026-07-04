import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse } from '@/lib/mobile-access';
import { listUserDocuments, createDocument } from '@/lib/documents-db';

export const runtime = 'nodejs';

const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().default(''),
  templateType: z.enum(['stage', 'memoire', 'cv', 'lettre_motivation', 'blank']).default('stage'),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const documents = await listUserDocuments(access.user.id);
    return NextResponse.json({ documents });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const body = await request.json().catch(() => null);
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    }

    const { title, description, templateType } = parsed.data;
    const document = await createDocument(access.user.id, title, description, templateType);

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
