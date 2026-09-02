import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { mobileErrorResponse, MobileApiError, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';
import { purchaseSubscription } from '@/lib/subscriptions';

export const runtime = 'nodejs';

const purchaseSchema = z.object({
  tier: z.enum(['basic', 'pro', 'elite']),
});

export const OPTIONS = (request: NextRequest) =>
  withCors(new NextResponse(null, { status: 204 }), request);

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return withCors(access.response, request);

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > 4 * 1024) {
      throw new MobileApiError('Requete trop volumineuse.', 413);
    }
    const { tier } = purchaseSchema.parse(await request.json());

    try {
      await enforceRateLimit(request, {
        bucket: 'subscription-purchase',
        max: 10,
        windowMs: 60_000,
        userId: access.user!.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

    const result = await purchaseSubscription(access.user!.id, tier);
    if (!result.ok) {
      const messages = {
        already_active: 'Cet abonnement est deja actif.',
        downgrade_blocked: "Le changement d'offre sera possible a la fin de la periode en cours.",
        insufficient_balance: 'Solde insuffisant pour cet abonnement.',
        no_wallet: 'Portefeuille introuvable.',
      } as const;
      throw new MobileApiError(messages[result.code], result.code === 'insufficient_balance' ? 402 : 409);
    }

    return withCors(
      NextResponse.json({
        ok: true,
        tier: result.subscription.tier,
        expiresAt: result.subscription.currentPeriodEnd,
      }),
      request,
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
