import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAdminService } from '@/lib/admin-service';
import { PublishError, publishUpload, rejectUpload } from '@/lib/contribution-publish';
import { getUpload, reanalyzeUpload, updateUploadSheet } from '@/lib/contributions-db';
import { EDITABLE_STATUSES, isUuid, sanitizeSheetPatch } from '@/lib/contributions-rules';
import { databasePool } from '@/lib/database';
import { mobileErrorResponse } from '@/lib/mobile-access';
import { sendPushToUser } from '@/lib/push';
import { enforceRateLimit } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('edit'), sheet: z.record(z.string(), z.unknown()) }),
  z.object({ action: z.literal('publish'), sheet: z.record(z.string(), z.unknown()).optional(), force: z.boolean().optional() }),
  z.object({ action: z.literal('reject'), reason: z.string() }),
  z.object({ action: z.literal('reanalyze') }),
]);

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireAdminService(request);
    if (access.response) return access.response;
    const adminId = access.admin.appUserId;
    await enforceRateLimit(request, { bucket: 'admin-pdf-intake-review', max: 120, windowMs: 60_000, userId: adminId });

    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Envoi introuvable.' }, { status: 404 });
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    const body = parsed.data;

    if (body.action === 'reanalyze') return NextResponse.json({ upload: await reanalyzeUpload(id) });

    if ((body.action === 'edit' || body.action === 'publish') && body.sheet) {
      const patch = sanitizeSheetPatch(body.sheet);
      if (Object.keys(patch).length) await updateUploadSheet(id, null, patch, EDITABLE_STATUSES);
      if (body.action === 'edit') return NextResponse.json({ upload: await getUpload(id, true) });
    }

    const client = await databasePool.connect();
    try {
      if (body.action === 'reject') {
        await rejectUpload(client, { uploadId: id, adminAppUserId: adminId, reason: body.reason });
        return NextResponse.json({ upload: await getUpload(id, true) });
      }
      const result = await publishUpload(client, { uploadId: id, adminAppUserId: adminId, force: body.action === 'publish' && body.force });
      if (result.credited && result.contributorId) {
        // D27.5 : best effort, never blocks the publication.
        void sendPushToUser(result.contributorId, {
          title: 'Ton PDF est publié : +10 coins',
          body: `« ${result.title} » est maintenant dans le catalogue. Merci pour ta contribution !`,
          data: { type: 'contribution_published', uploadId: id },
        });
      }
      return NextResponse.json({ result, upload: await getUpload(id, true) });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof PublishError) return NextResponse.json({ error: error.message }, { status: error.status });
    return mobileErrorResponse(error, request);
  }
}
