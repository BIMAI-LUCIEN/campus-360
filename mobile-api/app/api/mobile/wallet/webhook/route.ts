import { NextRequest, NextResponse } from 'next/server';

import { processNotchWebhook } from '@/lib/payments';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024; // 64 KB

export async function POST(request: NextRequest) {
  try {
    try {
      await enforceRateLimit(request, { bucket: 'wallet-webhook', max: 30, windowMs: 60_000 });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return response;
      throw error;
    }

    const rawBody = await request.text();

    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload trop volumineux.' }, { status: 413 });
    }

    const result = await processNotchWebhook(rawBody, request.headers);

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[Wallet Webhook Error]', error);
    const message = error instanceof Error ? error.message : 'Erreur interne de traitement';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
