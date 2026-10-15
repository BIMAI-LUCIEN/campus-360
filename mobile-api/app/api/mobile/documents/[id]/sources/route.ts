import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listDocumentFiles, toPublicFile } from '@/lib/document-files-db';
import { getDocumentById } from '@/lib/documents-db';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';
import { parsePublicUrl, SafeFetchError } from '@/lib/safe-fetch';
import { ingestTextSource, ingestUrlSource } from '@/lib/source-ingest';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Sources of a document. Files (PDF, DOCX, TXT) are uploaded to the files host
// via /documents/[id]/files; this route lists every source and adds the two
// kinds that need no upload: a web page (fetched server-side) and pasted text.

type RouteContext = { params: Promise<{ id: string }> };

const json = (request: NextRequest, body: unknown, status = 200) =>
  withCors(NextResponse.json(body, { status }), request);

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const document = await getDocumentById(documentId, access.user.id);
    if (!document) return json(request, { error: 'Document introuvable.' }, 404);

    const sources = await listDocumentFiles(documentId, access.user.id, 'source');
    return json(request, { sources: sources.map(toPublicFile) });
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

const addSourceSchema = z.union([
  z.object({
    url: z.string().trim().min(1).max(2048),
    title: z.string().trim().max(200).optional(),
  }),
  z.object({
    text: z.string().trim().min(1).max(200_000),
    title: z.string().trim().min(1).max(200),
  }),
]);

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    await enforceRateLimit(request, { bucket: 'document-sources-add', max: 20, windowMs: 10 * 60_000, userId });

    const document = await getDocumentById(documentId, userId);
    if (!document) return json(request, { error: 'Document introuvable.' }, 404);

    const parsed = addSourceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return json(request, { error: 'Indiquez une adresse web ou un texte avec un titre.' }, 400);
    }

    if ('url' in parsed.data) {
      try {
        parsePublicUrl(parsed.data.url);
      } catch (error) {
        if (error instanceof SafeFetchError) return json(request, { error: error.message, code: error.code }, 400);
        throw error;
      }
      const file = await ingestUrlSource({ documentId, userId, url: parsed.data.url, title: parsed.data.title });
      return json(request, { source: toPublicFile(file) });
    }

    const file = await ingestTextSource({ documentId, userId, title: parsed.data.title, text: parsed.data.text });
    return json(request, { source: toPublicFile(file) });
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
