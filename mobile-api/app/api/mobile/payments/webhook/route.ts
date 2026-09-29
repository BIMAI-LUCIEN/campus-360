import { NextRequest, NextResponse } from 'next/server';

import { verifyAndProcessMobilePaymentWebhook } from '@/lib/payments';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024; // 64 KB

export async function POST(request: NextRequest) {
  try {
    const signature =
      request.headers.get('x-notch-signature') ||
      request.headers.get('x-cinetpay-signature') ||
      request.headers.get('x-webhook-signature');

    const rawBody = await request.text();

    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload trop volumineux.' }, { status: 413 });
    }

    let eventPayload: Record<string, unknown> = {};
    try {
      eventPayload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
    }

    const payloadNormalized = {
      event: String(eventPayload.event || ''),
      status: String(eventPayload.status || (eventPayload.data as Record<string, unknown>)?.status || ''),
      reference: String(
        eventPayload.reference ||
          (eventPayload.data as Record<string, unknown>)?.reference ||
          (eventPayload.transaction as Record<string, unknown>)?.reference ||
          '',
      ),
      amount: Number(eventPayload.amount || (eventPayload.data as Record<string, unknown>)?.amount || 0),
    };

    const result = await verifyAndProcessMobilePaymentWebhook({
      rawBody,
      signature,
      eventPayload: payloadNormalized,
    });

    return NextResponse.json({
      received: true,
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error('[Payment Webhook Error]', error);
    const message = error instanceof Error ? error.message : 'Erreur interne de traitement';
    const status = message.includes('Signature') ? 401 : 500;
    return NextResponse.json({ error: message, success: false }, { status });
  }
}
