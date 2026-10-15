import { NextRequest, NextResponse } from 'next/server';

import { deleteDocumentFile } from '@/lib/document-files-db';
import { getDocumentById } from '@/lib/documents-db';
import { canStoreFiles, deleteStoredFile } from '@/lib/file-storage';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; sourceId: string }> };

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

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

    const result = await deleteDocumentFile(sourceId, documentId, userId, 'source');
    if (!result.deleted) {
      return withCors(NextResponse.json({ error: 'Source introuvable.' }, { status: 404 }), request);
    }
    // Off the VPS the disk copy is left for the orphan purge job.
    if (result.storageKey && canStoreFiles()) await deleteStoredFile(result.storageKey).catch(() => undefined);
    return withCors(NextResponse.json({ success: true }), request);
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
