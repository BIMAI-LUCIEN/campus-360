import { NextRequest, NextResponse } from 'next/server';

import { enforcePdfIntakeQuota } from '@/lib/ai-quota';
import { countUploads, listUploadsForUser, recordIntake } from '@/lib/contributions-db';
import { checkBatchAllowance, isUuid, sanitizeFileName } from '@/lib/contributions-rules';
import { FileValidationError, MAX_SOURCE_BYTES } from '@/lib/file-validation';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

// One PDF per request (Nginx caps bodies at 25 Mo); files of a batch share a batchId.
const MAX_REQUEST_BYTES = MAX_SOURCE_BYTES + 512 * 1024;

const json = (request: NextRequest, body: unknown, status = 200) =>
  withCors(NextResponse.json(body, { status }), request);

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    return json(request, { uploads: await listUploadsForUser(access.user.id) });
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    await enforceRateLimit(request, { bucket: 'contributions-upload', max: 20, windowMs: 60_000, userId });

    if (Number(request.headers.get('content-length') || 0) > MAX_REQUEST_BYTES) {
      return json(request, { error: 'Fichier trop volumineux (maximum 20 Mo).' }, 413);
    }

    const form = await request.formData().catch(() => null);
    const entry = form?.get('file');
    if (!form || !(entry instanceof Blob)) return json(request, { error: 'Requête invalide : fichier PDF requis.' }, 400);
    if (form.get('rightsDeclared') !== 'true') {
      return json(request, { error: 'Confirmez que vous avez le droit de partager ce document.' }, 400);
    }
    const batchId = form.get('batchId');
    if (!isUuid(batchId)) return json(request, { error: 'Identifiant de lot invalide.' }, 400);
    if (entry.size > MAX_REQUEST_BYTES) return json(request, { error: 'Fichier trop volumineux (maximum 20 Mo).' }, 413);

    const allowance = checkBatchAllowance(await countUploads(userId, batchId));
    if (!allowance.ok) {
      const response = json(request, { error: allowance.error }, allowance.status);
      if (allowance.status === 429) response.headers.set('Retry-After', '3600');
      return response;
    }

    const upload = await recordIntake({
      buffer: Buffer.from(await entry.arrayBuffer()),
      declaredMime: entry.type || null,
      originalName: sanitizeFileName(entry instanceof File ? entry.name : 'document.pdf'),
      batchId,
      uploaderId: userId,
      source: 'student',
      rightsDeclared: true,
      reserveQuota: () => enforcePdfIntakeQuota(request, { userId }),
    });
    return json(request, { upload }, 201);
  } catch (error) {
    if (error instanceof FileValidationError) return json(request, { error: error.message }, error.status);
    return mobileErrorResponse(error, request);
  }
}
