import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { corsPreflight, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

const eventSchema = z.object({
  eventType: z.enum([
    'catalog_view',
    'search',
    'preview_open',
    'purchase_start',
    'purchase_success',
    'purchase_failed',
    'reader_open',
    'assistant_question',
  ]),
  documentId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
  sessionId: z.string().min(1).max(200),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const MAX_BODY_BYTES = 8 * 1024;

const DOCUMENT_SCOPED = new Set([
  'preview_open',
  'purchase_start',
  'purchase_success',
  'purchase_failed',
  'reader_open',
  'assistant_question',
]);

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return withCors(NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 }), request);
    }
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    const input = eventSchema.parse(await request.json().catch(() => ({})));

    if (DOCUMENT_SCOPED.has(input.eventType) && !input.documentId) {
      return withCors(NextResponse.json({ error: 'documentId requis.' }, { status: 400 }), request);
    }

    if (input.documentId) {
      const doc = await databasePool.query(
        'select 1 from public.documents where id = $1 limit 1',
        [input.documentId],
      ).catch(() => ({ rows: [] }));
    }

    const rawUserId = user?.id ? String(user.id) : null;
    const isUuid = rawUserId ? /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawUserId) : false;
    const uuidUserId = isUuid ? rawUserId : null;
    const betterAuthUserId = !isUuid ? rawUserId : ((user as any)?.betterAuthUserId || null);

    try {
      await databasePool.query(
        `insert into public.document_events (
           user_id, better_auth_user_id, document_id, event_type, session_id, metadata
         ) values ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          uuidUserId,
          betterAuthUserId,
          input.documentId ?? null,
          input.eventType,
          input.sessionId,
          JSON.stringify(input.metadata),
        ],
      );
    } catch (dbErr) {
      console.warn('[events] Document event recording warning:', dbErr);
    }
    return withCors(NextResponse.json({ ok: true }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
