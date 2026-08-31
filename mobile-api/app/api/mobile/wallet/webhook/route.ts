import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { databasePool } from '@/lib/database';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024; // 64 KB — webhooks are small

export async function POST(request: NextRequest) {
  try {
    // Unauthenticated route (no user session to key off of) — bound by IP.
    try {
      await enforceRateLimit(request, { bucket: 'wallet-webhook', max: 30, windowMs: 60_000 });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return response;
      throw error;
    }

    const signature = request.headers.get('x-notch-signature');
    const rawBody = await request.text();

    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload trop volumineux.' }, { status: 413 });
    }

    const webhookSecret = process.env.NOTCHPAY_WEBHOOK_SECRET;
    // Same convention used by topup/route.ts and topup/[reference]/route.ts:
    // a configured NOTCHPAY_PRIVATE_KEY means a real payment provider is wired
    // up. Trusting NODE_ENV alone to decide "is this really dev" is fragile
    // (a staging/preview deploy can easily run with NODE_ENV !== 'production'
    // while still being reachable by the public internet with real money
    // flowing through it) — require the signature whenever a real provider is
    // configured, and only skip it in genuine mock/sandbox mode.
    const hasRealPaymentProvider = Boolean(process.env.NOTCHPAY_PRIVATE_KEY);

    // Webhook signing secret MUST be configured. If we ever ship without one,
    // refuse webhooks outright instead of crediting wallets on unauthenticated
    // requests.
    if (!webhookSecret) {
      if (hasRealPaymentProvider || process.env.NODE_ENV === 'production') {
        console.error('[Webhook Wallet] NOTCHPAY_WEBHOOK_SECRET missing while a real payment provider is configured.');
        return NextResponse.json({ error: 'Webhook non configure.' }, { status: 503 });
      }
      console.warn('[Webhook Wallet] NOTCHPAY_WEBHOOK_SECRET not set; signature check skipped (mock sandbox only).');
    } else {
      if (!signature) {
        return NextResponse.json({ error: 'Signature manquante.' }, { status: 401 });
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      // timingSafeEqual requires equal-length buffers.
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSignature);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return NextResponse.json({ error: 'Signature invalide.' }, { status: 401 });
      }
    }

    let payload: { event?: string; reference?: string; data?: { reference?: string } };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
    }
    console.log('[Webhook Wallet] Received event:', payload.event);

    if (payload.event === 'payment.complete' || payload.event === 'payment.confirmed') {
      const reference = payload.data?.reference || payload.reference;

      if (!reference || typeof reference !== 'string' || reference.length > 200) {
        return NextResponse.json({ error: 'Reference invalide.' }, { status: 400 });
      }

      const client = await databasePool.connect();
      try {
        await client.query('begin');

        // Lock the transaction row first; skip if not pending (idempotency).
        const transRes = await client.query(
          `select id, user_id, status, amount_coins
             from public.app_wallet_transactions
             where reference_id = $1
             for update`,
          [reference],
        );
        const transaction = transRes.rows[0];

        if (!transaction) {
          await client.query('rollback');
          console.warn('[Webhook Wallet] Unknown reference:', reference);
          return NextResponse.json({ ok: true });
        }

        if (transaction.status !== 'pending') {
          await client.query('rollback');
          console.log('[Webhook Wallet] Already processed:', reference);
          return NextResponse.json({ ok: true });
        }

        await client.query(
          "update public.app_wallet_transactions set status = 'success' where id = $1",
          [transaction.id],
        );
        await client.query(
          `update public.app_wallets
             set balance_coins = balance_coins + $1, updated_at = now()
             where user_id = $2`,
          [transaction.amount_coins, transaction.user_id],
        );

        await client.query('commit');
        console.log(
          `[Webhook Wallet] Credited ${transaction.amount_coins} coins to user ${transaction.user_id}`,
        );
      } catch (err) {
        await client.query('rollback');
        console.error('[Webhook Wallet] DB error:', err);
        return NextResponse.json({ error: 'Internal DB Error' }, { status: 500 });
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.error('[Webhook Wallet] Error:', message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
