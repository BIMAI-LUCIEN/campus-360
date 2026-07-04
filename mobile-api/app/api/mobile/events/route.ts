import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';

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
  documentId: z.string().uuid().optional(),
  sessionId: z.string().min(1).max(200),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8 * 1024;

// Events that REQUIRE a documentId (anything that ties to a specific PDF).
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
      return NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 });
    }
    const access = await requireMobileUser(request);
    if (access.response) return access.response;
    const input = eventSchema.parse(await request.json());

    if (DOCUMENT_SCOPED.has(input.eventType) && !input.documentId) {
      return NextResponse.json({ error: 'documentId requis.' }, { status: 400 });
    }

    // Verify the document actually exists before recording the event. Cheap FK
    // check prevents polluting the analytics table with random UUIDs.
    if (input.documentId) {
      const doc = await databasePool.query(
        'select 1 from public.documents where id = $1 limit 1',
        [input.documentId],
      );
      if (!doc.rows[0]) {
        return NextResponse.json({ error: 'documentId inconnu.' }, { status: 400 });
      }
    }

    await databasePool.query(
      `insert into public.document_events (
         user_id, better_auth_user_id, document_id, event_type, session_id, metadata
       ) values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        access.user.id,
        access.user.betterAuthUserId,
        input.documentId ?? null,
        input.eventType,
        input.sessionId,
        JSON.stringify(input.metadata),
      ],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
