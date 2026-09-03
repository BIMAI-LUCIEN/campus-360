import { NextRequest, NextResponse } from 'next/server';

import { requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';
import { getDocumentById, deleteDocumentSource } from '@/lib/documents-db';

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

type RouteContext = { params: Promise<{ id: string; sourceId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId, sourceId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const document = await getDocumentById(documentId, userId);
    if (!document) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const success = await deleteDocumentSource(sourceId, documentId, userId);
    if (!success) {
      return withCors(NextResponse.json({ error: 'Source introuvable.' }, { status: 404 }), request);
    }

    return withCors(NextResponse.json({ success: true }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
