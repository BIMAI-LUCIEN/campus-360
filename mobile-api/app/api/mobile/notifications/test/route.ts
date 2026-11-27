import { NextRequest, NextResponse } from 'next/server';

import { corsPreflight, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { sendTestPushToUser } from '@/lib/push';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => corsPreflight(request);

/** POST /api/mobile/notifications/test — Triggers a live Expo/FCM test push to the caller's registered device(s). */
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    try {
      await enforceRateLimit(request, {
        bucket: 'notifications-test',
        max: 5,
        windowMs: 60 * 60 * 1000,
        userId,
      });
    } catch (error) {
      const limited = rateLimitFailedResponse(error);
      if (limited) return withCors(limited, request);
      throw error;
    }

    const report = await sendTestPushToUser(userId);
    if (report.tokenCount === 0) {
      return withCors(
        NextResponse.json(
          {
            ok: false,
            error: 'Aucun appareil enregistré pour les alertes push sur ce compte. Clique sur « Réessayer l’activation ».',
            ...report,
          },
          { status: 422 },
        ),
        request,
      );
    }

    return withCors(
      NextResponse.json({
        ok: report.delivered > 0,
        ...report,
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
