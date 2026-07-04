import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { databasePool } from '@/lib/database';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024; // 64 KB — webhooks are small

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-notch-signature');
    const rawBody = await request.text();

    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload trop volumineux.' }, { status: 413 });
    }

    const webhookSecret = process.env.NOTCHPAY_WEBHOOK_SECRET;

    // Webhook signing secret MUST be configured. If we ever ship without one,
    // refuse webhooks outright instead of crediting wallets on unauthenticated
    // requests.
    if (!webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[Webhook Wallet] NOTCHPAY_WEBHOOK_SECRET missing in production.');
        return NextResponse.json({ error: 'Webhook non configure.' }, { status: 503 });
      }
      console.warn('[Webhook Wallet] NOTCHPAY_WEBHOOK_SECRET not set; signature check skipped (dev only).');
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
