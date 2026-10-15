import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import {
  createDocumentFile,
  deleteDocumentFile,
  getUserStorageBytes,
  listDocumentFiles,
  setFileReady,
  toPublicFile,
  type FileKind,
} from '@/lib/document-files-db';
import { getDocumentById } from '@/lib/documents-db';
import { canStoreFiles, deleteStoredFile, saveFile } from '@/lib/file-storage';
import { FileValidationError, MAX_SOURCE_BYTES, validateUpload } from '@/lib/file-validation';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';
import { ingestUploadedSource } from '@/lib/source-ingest';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Uploads land on the VPS (files host). Per-user storage quota.
const USER_QUOTA_BYTES = 200 * 1024 * 1024;
// Multipart overhead on top of the largest accepted file.
const MAX_REQUEST_BYTES = MAX_SOURCE_BYTES + 512 * 1024;

type RouteContext = { params: Promise<{ id: string }> };

const json = (request: NextRequest, body: unknown, status = 200) =>
  withCors(NextResponse.json(body, { status }), request);

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

const parseKind = (value: unknown): FileKind | null => (value === 'image' || value === 'source' ? value : null);

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const document = await getDocumentById(documentId, access.user.id);
    if (!document) return json(request, { error: 'Document introuvable.' }, 404);

    const kindParam = request.nextUrl.searchParams.get('kind');
    const kind = kindParam ? parseKind(kindParam) : undefined;
    if (kind === null) return json(request, { error: 'Type de fichier invalide.' }, 400);

    const files = await listDocumentFiles(documentId, access.user.id, kind);
    return json(request, { files: files.map(toPublicFile) });
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    await enforceRateLimit(request, { bucket: 'document-files-upload', max: 30, windowMs: 10 * 60_000, userId });

    if (!canStoreFiles()) {
      return json(request, { error: 'Envoi de fichiers indisponible sur ce serveur. Mettez l’application à jour.' }, 503);
    }

    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > MAX_REQUEST_BYTES) {
      return json(request, { error: 'Fichier trop volumineux (maximum 20 Mo).' }, 413);
    }

    const document = await getDocumentById(documentId, userId);
    if (!document) return json(request, { error: 'Document introuvable.' }, 404);

    const form = await request.formData().catch(() => null);
    const entry = form?.get('file');
    const kind = parseKind(form?.get('kind'));
    if (!form || !(entry instanceof Blob) || !kind) {
      return json(request, { error: 'Requête invalide : fichier et type (image ou source) requis.' }, 400);
    }
    if (entry.size > MAX_REQUEST_BYTES) {
      return json(request, { error: 'Fichier trop volumineux (maximum 20 Mo).' }, 413);
    }

    const data = Buffer.from(await entry.arrayBuffer());
    const detected = validateUpload(data, kind, entry.type);

    const used = await getUserStorageBytes(userId);
    if (used + data.length > USER_QUOTA_BYTES) {
      return json(request, { error: 'Espace de stockage plein (200 Mo). Supprimez des fichiers inutilisés.' }, 413);
    }

    const originalName = (entry instanceof File && entry.name ? entry.name : `fichier.${detected.extension}`)
      .replace(/[\u0000-\u001f\u007f/\\]/g, '_')
      .slice(0, 200);
    const rawTitle = form.get('title');
    const title = (typeof rawTitle === 'string' && rawTitle.trim() ? rawTitle.trim() : originalName.replace(/\.[^.]+$/, '')).slice(0, 200);

    const storageKey = await saveFile(userId, detected.extension, data);
    let file;
    try {
      file = await createDocumentFile({
        documentId,
        userId,
        kind,
        origin: 'upload',
        storageKey,
        originalName,
        title,
        mime: detected.mime,
        bytes: data.length,
        sha256: crypto.createHash('sha256').update(data).digest('hex'),
      });
    } catch (error) {
      await deleteStoredFile(storageKey).catch(() => undefined);
      throw error;
    }

    const processed = kind === 'image'
      ? (await setFileReady(file.id, userId, 0)) ?? file
      : await ingestUploadedSource(file, data);

    return json(request, { file: toPublicFile(processed) });
  } catch (error) {
    if (error instanceof FileValidationError) return json(request, { error: error.message }, error.status);
    return mobileErrorResponse(error, request);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const fileId = request.nextUrl.searchParams.get('fileId');
    if (!fileId) return json(request, { error: 'fileId requis.' }, 400);

    const result = await deleteDocumentFile(fileId, documentId, access.user.id);
    if (!result.deleted) return json(request, { error: 'Fichier introuvable.' }, 404);
    // Off the VPS the disk copy is left for the orphan purge job.
    if (result.storageKey && canStoreFiles()) await deleteStoredFile(result.storageKey).catch(() => undefined);
    return json(request, { success: true });
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
