import { NextRequest, NextResponse } from 'next/server';

import { getUpload, isUploadOwner, updateUploadSheet } from '@/lib/contributions-db';
import { isUuid, sanitizeSheetPatch } from '@/lib/contributions-rules';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

// The student can correct the sheet of an upload still awaiting review.
const STUDENT_EDITABLE = ['pending_review', 'probable_duplicate'] as const;

const json = (request: NextRequest, body: unknown, status = 200) =>
  withCors(NextResponse.json(body, { status }), request);

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const { id } = await context.params;
    if (!isUuid(id)) return json(request, { error: 'Envoi introuvable.' }, 404);
    await enforceRateLimit(request, { bucket: 'contributions-edit', max: 30, windowMs: 60_000, userId: access.user.id });

    const patch = sanitizeSheetPatch(await request.json().catch(() => null));
    if (Object.keys(patch).length === 0) return json(request, { error: 'Aucune modification valide.' }, 400);

    const updated = await updateUploadSheet(id, access.user.id, patch, STUDENT_EDITABLE);
    if (!updated) {
      return (await isUploadOwner(id, access.user.id))
        ? json(request, { error: 'Cet envoi ne peut plus être modifié.' }, 409)
        : json(request, { error: 'Envoi introuvable.' }, 404);
    }
    return json(request, { upload: await getUpload(id) });
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

