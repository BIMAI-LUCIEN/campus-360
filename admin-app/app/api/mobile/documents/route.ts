import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';
import { listUserDocuments, createDocument } from '@/lib/documents-db';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Expo-Origin, x-client-info, apikey, X-Requested-With',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return new NextResponse(null, { status: 204, headers });
}

const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().default(''),
  templateType: z.enum(['stage', 'memoire', 'cv', 'lettre_motivation', 'blank']).default('stage'),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null },
      response: null,
    }));
    const userId = access?.user?.id ?? 'guest-student';

    const documents = await listUserDocuments(userId);
    return withCors(NextResponse.json({ documents }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null },
      response: null,
    }));
    const userId = access?.user?.id ?? 'guest-student';

    const body = await request.json().catch(() => null);
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Données invalides.' }, { status: 400 }), request);
    }

    const { title, description, templateType } = parsed.data;
    const document = await createDocument(userId, title, description, templateType);

    return withCors(NextResponse.json({ document }, { status: 201 }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
