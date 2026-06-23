import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { databasePool } from '@/lib/database';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-notch-signature');
    const rawBody = await request.text();

    const webhookSecret = process.env.NOTCHPAY_WEBHOOK_SECRET;

    // Verify webhook signature if secret is defined
    if (webhookSecret) {
      if (!signature) {
        console.warn('[Webhook Wallet] Missing signature header X-Notch-Signature.');
        return NextResponse.json({ error: 'Signature manquante.' }, { status: 401 });
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      try {
        const isValid = crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(signature)
        );
        if (!isValid) {
          console.warn('[Webhook Wallet] Invalid webhook signature.');
          return NextResponse.json({ error: 'Signature invalide.' }, { status: 401 });
        }
      } catch (err) {
        console.error('[Webhook Wallet] Signature comparison failed:', err);
        return NextResponse.json({ error: 'Erreur de signature.' }, { status: 401 });
      }
    } else {
      console.warn('[Webhook Wallet] NOTCHPAY_WEBHOOK_SECRET is not defined. Signature check skipped.');
    }

    const payload = JSON.parse(rawBody);
    console.log('[Webhook Wallet] Received payment event:', payload.event, payload.data?.reference);

    // Notch Pay sends 'payment.complete' or 'payment.failed'
    if (payload.event === 'payment.complete' || payload.event === 'payment.confirmed') {
      const reference = payload.data?.reference || payload.reference;

      if (!reference) {
        return NextResponse.json({ error: 'Référence manquante.' }, { status: 400 });
      }

      const client = await databasePool.connect();
      try {
        await client.query('begin');

        // Check if transaction exists and is pending
        const transRes = await client.query(
          "select id, user_id, status, amount_coins from public.app_wallet_transactions where reference_id = $1 for update",
          [reference]
        );
        const transaction = transRes.rows[0];

        if (transaction && transaction.status === 'pending') {
          // Update transaction to success
          await client.query(
            "update public.app_wallet_transactions set status = 'success' where id = $1",
            [transaction.id]
          );

          // Credit the wallet with the coin amount stored in the database transaction record (secure)
          await client.query(
            `update public.app_wallets
             set balance_coins = balance_coins + $1, updated_at = now()
             where user_id = $2`,
            [transaction.amount_coins, transaction.user_id]
          );

          await client.query('commit');
          console.log(`[Webhook Wallet] Successfully credited ${transaction.amount_coins} coins to user ID: ${transaction.user_id}`);
        } else {
          await client.query('rollback');
          console.log('[Webhook Wallet] Transaction already processed or not found:', reference);
        }
      } catch (err) {
        await client.query('rollback');
        console.error('[Webhook Wallet] Error updating transaction:', err);
        return NextResponse.json({ error: 'Internal DB Error' }, { status: 500 });
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Webhook Wallet] Error processing webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
