import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

/** GET /api/mobile/notifications — the student's inbox (latest 50) and the unread count. */
export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 60 });
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;
    const [list, unread] = await Promise.all([
      databasePool.query<{ id: string; type: string; title: string; body: string; data: unknown; created_at: string; read_at: string | null }>(
        `select id, type, title, body, data, created_at, read_at
           from public.app_notifications
          where user_id = $1
          order by created_at desc
          limit 50`,
        [userId],
      ),
      databasePool.query<{ count: string }>(
        'select count(*) from public.app_notifications where user_id = $1 and read_at is null',
        [userId],
      ),
    ]);
    return withCors(
      NextResponse.json({
        notifications: list.rows.map((row) => ({
          id: String(row.id),
          type: row.type,
          title: row.title,
          body: row.body,
          data: row.data ?? {},
          createdAt: new Date(String(row.created_at)).toISOString(),
          read: Boolean(row.read_at),
        })),
        unread: Number(unread.rows[0]?.count ?? 0),
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

const patchSchema = z.union([
  z.object({ all: z.literal(true) }).strict(),
  z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).strict(),
]);

/** PATCH /api/mobile/notifications — marks all, or some, notifications as read. */
export async function PATCH(request: NextRequest) {
  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 60 });
    if (access.response || !access.user) return withCors(access.response!, request);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new MobileApiError('Requête invalide.', 400);
    if ('all' in parsed.data) {
      await databasePool.query(
        'update public.app_notifications set read_at = now() where user_id = $1 and read_at is null',
        [access.user.id],
      );
    } else {
      await databasePool.query(
        'update public.app_notifications set read_at = now() where user_id = $1 and id = any($2::uuid[]) and read_at is null',
        [access.user.id, parsed.data.ids],
      );
    }
    return withCors(NextResponse.json({ ok: true }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

/** DELETE /api/mobile/notifications — « Tout effacer » in the app. */
export async function DELETE(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    await databasePool.query('delete from public.app_notifications where user_id = $1', [access.user.id]);
    return withCors(NextResponse.json({ ok: true }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
