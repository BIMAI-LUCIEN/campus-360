import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';

const eventSchema = z.object({
  eventType: z.enum(['catalog_view', 'search', 'preview_open', 'purchase_start', 'purchase_success', 'purchase_failed', 'reader_open', 'assistant_question']),
  documentId: z.string().max(200).optional(),
  sessionId: z.string().min(1).max(200),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;
    const input = eventSchema.parse(await request.json());
    await databasePool.query(
      `insert into public.document_events (
         user_id, better_auth_user_id, document_id, event_type, session_id, metadata
       ) values (null, $1, nullif($2, ''), $3, $4, $5::jsonb)`,
      [access.user.betterAuthUserId, input.documentId ?? '', input.eventType, input.sessionId, JSON.stringify(input.metadata)],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

