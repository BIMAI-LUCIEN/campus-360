import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const registerTokenSchema = z.object({
  pushToken: z.string().trim().min(5),
  deviceName: z.string().trim().optional(),
  deviceType: z.enum(['ios', 'android', 'web']).optional(),
});

export async function POST(request: NextRequest) {
  try {
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

    console.log(`[PushNotification] Token registered for user ${user.email}: ${pushToken}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
