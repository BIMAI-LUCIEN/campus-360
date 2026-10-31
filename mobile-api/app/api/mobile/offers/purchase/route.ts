import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { purchaseOffer } from '@/lib/offers';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 2 * 1024;

const bodySchema = z.object({
  code: z.enum(['STARTER', 'RECHERCHE_ACTIVE', 'PASS_24H', 'PASS_7J']),
  purchaseId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
      return withCors(NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 }), request);
    }
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    try {
      await enforceRateLimit(request, { bucket: 'purchase-offer', max: 20, windowMs: 60_000, userId });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Offre invalide.' }, { status: 400 }), request);
    }
    const result = await purchaseOffer(userId, parsed.data.code, parsed.data.purchaseId);
    return withCors(NextResponse.json({ success: true, ...result }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
