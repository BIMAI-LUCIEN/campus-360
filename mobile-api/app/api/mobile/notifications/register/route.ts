import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const registerTokenSchema = z.object({
  pushToken: z.string().trim().min(8).max(400),
  deviceName: z.string().trim().max(120).optional(),
  deviceType: z.enum(['ios', 'android', 'web']).optional(),
});

const MAX_BODY_BYTES = 2 * 1024;

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 });
    }
    const access = await requireMobileUser(request);
    if (access.response) return access.response;
    const user = access.user;

    const body = await request.json().catch(() => null);
    const parsed = registerTokenSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileApiError('Token de notification invalide.', 400);
    }

    const { pushToken, deviceName, deviceType } = parsed.data;

    // Save token in public.app_user_push_tokens (upsert on conflict push_token)
    await databasePool.query(
      `insert into public.app_user_push_tokens (user_id, push_token, device_name, device_type, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (push_token) do update set
         user_id = excluded.user_id,
         device_name = excluded.device_name,
         device_type = excluded.device_type,
         updated_at = now()`,
      [user.id, pushToken, deviceName || null, deviceType || null]
    );

    // Do NOT log full push tokens or email addresses: push tokens are
    // addressable identifiers (similar to a phone number) and must not land in
    // shared logs.
    console.log('[PushNotification] Token registered', {
      userId: user.id,
      deviceType: deviceType ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
