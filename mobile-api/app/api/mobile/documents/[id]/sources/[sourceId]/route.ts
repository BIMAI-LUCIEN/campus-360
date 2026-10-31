import { NextRequest, NextResponse } from 'next/server';

import { deleteDocumentFile, parseSourceRole, setSourceRole, toPublicFile } from '@/lib/document-files-db';
import { getDocumentById } from '@/lib/documents-db';
import { canStoreFiles, deleteStoredFile } from '@/lib/file-storage';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; sourceId: string }> };

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

// Moves a source between « Référence » and « Mes documents ».
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId, sourceId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
    const role = parseSourceRole(body?.role);
    if (!role) {
      return withCors(NextResponse.json({ error: 'Rôle de source invalide.' }, { status: 400 }), request);
    }

    const updated = await setSourceRole(sourceId, documentId, access.user.id, role);
    if (!updated) {
      return withCors(NextResponse.json({ error: 'Source introuvable.' }, { status: 404 }), request);
    }
    return withCors(NextResponse.json({ source: toPublicFile(updated) }), request);
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
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
