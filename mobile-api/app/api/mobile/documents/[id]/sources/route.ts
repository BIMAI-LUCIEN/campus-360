import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';
import { getDocumentById, getDocumentSources, addDocumentSource } from '@/lib/documents-db';

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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const document = await getDocumentById(documentId, userId);
    if (!document) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const sources = await getDocumentSources(documentId, userId);
    return withCors(NextResponse.json({ sources }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

const addSourceSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().default('pdf'),
  fileSize: z.number().optional().default(0),
  fileUrl: z.string().min(1),
  extractedText: z.string().optional().default(''),
  summary: z.string().optional().default(''),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const document = await getDocumentById(documentId, userId);
    if (!document) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const body = await request.json().catch(() => null);
    const parsed = addSourceSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Données invalides.', details: parsed.error.issues }, { status: 400 }), request);
    }

    let extractedText = parsed.data.extractedText;
    let summary = parsed.data.summary;

    // If summary is empty but we have text, generate a quick 2-line summary
    if (!summary && extractedText && extractedText.length > 50) {
      summary = extractedText.slice(0, 240).replace(/\s+/g, ' ').trim() + '...';
    }

    const source = await addDocumentSource({
      documentId,
      userId,
      fileName: parsed.data.fileName,
      fileType: parsed.data.fileType,
      fileSize: parsed.data.fileSize,
      fileUrl: parsed.data.fileUrl,
      extractedText,
      summary,
    });

    return withCors(NextResponse.json({ source }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
