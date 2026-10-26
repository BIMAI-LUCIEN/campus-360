import { NextRequest, NextResponse } from 'next/server';

import { processSaspayWebhook } from '@/lib/payments';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024; // 64 KB

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload trop volumineux.' }, { status: 413 });
    }

    const result = await processSaspayWebhook(rawBody, request.headers);

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[Payment Webhook Error]', error);
    const message = error instanceof Error ? error.message : 'Erreur interne de traitement';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
