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
  // Catalog document ids are app-generated (pdf_…, slugs), not RFC UUIDs.
  documentId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
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

    const rawUserId = access.user?.id ? String(access.user.id) : null;
    const isUuid = rawUserId ? /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawUserId) : false;
    const uuidUserId = isUuid ? rawUserId : null;
    const betterAuthUserId = !isUuid ? rawUserId : (access.user?.betterAuthUserId || null);

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
    return NextResponse.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
