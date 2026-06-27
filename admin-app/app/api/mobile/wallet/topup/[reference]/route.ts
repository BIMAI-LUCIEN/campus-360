import { NextRequest, NextResponse } from 'next/server';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ reference: string }> };

const REFERENCE_REGEX = /^[A-Za-z0-9._\-]{4,200}$/;

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { reference } = await context.params;

    // Reject anything that isn't a clean reference id (prevents SQLi /
    // log-injection via URL). Real notchpay refs are short alphanumeric.
    if (!REFERENCE_REGEX.test(reference)) {
      throw new MobileApiError('Reference invalide.', 400);
    }

    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    // This endpoint is polled every 3s by the client during a topup. Cap it
    // generously to allow that without letting it become a vector for
    // unbounded DB load (or scraping transaction rows by guessing refs).
    try {
      await enforceRateLimit(request, {
        bucket: 'wallet-topup-status',
        max: 60,
        windowMs: 60_000,
        userId: access.user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return response;
      throw error;
    }

    const client = await databasePool.connect();
    try {
      // Mock sandbox uses a recognisable prefix. Only fall into the auto-approve
      // path when BOTH the reference looks mock AND no real payment provider is
      // configured. Otherwise a forged mock_pay_xxx reference could escape.
      const looksMock = reference.startsWith('mock_');
      const hasRealPaymentProvider = Boolean(process.env.NOTCHPAY_PRIVATE_KEY);
      const isMock = looksMock && !hasRealPaymentProvider;

      const transRes = await client.query(
        `select id, status, amount_coins, created_at
           from public.app_wallet_transactions
           where reference_id = $1 and user_id = $2`,
        [reference, access.user.id],
      );
      const transaction = transRes.rows[0];

      if (!transaction) {
        throw new MobileApiError('Transaction introuvable.', 404);
      }

      if (transaction.status === 'success') {
        const walletRes = await client.query(
          'select balance_coins from public.app_wallets where user_id = $1',
          [access.user.id],
        );
        return NextResponse.json({
          status: 'success',
          balanceCoins: Number(walletRes.rows[0]?.balance_coins ?? 0),
        });
      }

      if (transaction.status === 'failed') {
        return NextResponse.json({ status: 'failed' });
      }

      if (isMock) {
        // Auto-approve after 3 seconds in mock sandbox mode.
        const elapsedMs = Date.now() - new Date(transaction.created_at).getTime();
        if (elapsedMs >= 3000) {
          try {
            await client.query('begin');
            // Re-read the transaction FOR UPDATE so a concurrent /poll from the
            // same client cannot double-credit.
            const locked = await client.query(
              "select status from public.app_wallet_transactions where id = $1 for update",
              [transaction.id],
            );
            if (locked.rows[0]?.status !== 'pending') {
              await client.query('rollback');
              return NextResponse.json({ status: locked.rows[0]?.status ?? 'pending' });
            }

            await client.query(
              "update public.app_wallet_transactions set status = 'success' where id = $1",
              [transaction.id],
            );

            const walletRes = await client.query(
              `update public.app_wallets
                 set balance_coins = balance_coins + $1, updated_at = now()
                 where user_id = $2 returning balance_coins`,
              [transaction.amount_coins, access.user.id],
            );

            await client.query('commit');

            return NextResponse.json({
              status: 'success',
              balanceCoins: Number(walletRes.rows[0]?.balance_coins ?? 0),
            });
          } catch (err) {
            await client.query('rollback');
            throw err;
          }
        }
        return NextResponse.json({ status: 'pending' });
      }

      // Real payment: ask Notch Pay (fallback only — webhook is the source of truth).
      const privateKey = process.env.NOTCHPAY_PRIVATE_KEY;
      if (!privateKey) {
        return NextResponse.json({ status: 'pending' });
      }

      const npRes = await fetch(`https://api.notchpay.co/payments/${reference}`, {
        method: 'GET',
        headers: {
          Authorization: privateKey,
          Accept: 'application/json',
        },
      });

      if (!npRes.ok) {
        // If Notch Pay returns an error, keep pending locally.
        return NextResponse.json({ status: 'pending' });
      }

      const npData = (await npRes.json()) as { status?: string; data?: { status?: string } };
      const npStatus = npData.status || npData.data?.status || '';

      if (npStatus === 'complete' || npStatus === 'confirmed') {
        try {
          await client.query('begin');
          const locked = await client.query(
            "select status from public.app_wallet_transactions where id = $1 for update",
            [transaction.id],
          );
          if (locked.rows[0]?.status !== 'pending') {
            await client.query('rollback');
            return NextResponse.json({ status: locked.rows[0]?.status ?? 'pending' });
          }

          await client.query(
            "update public.app_wallet_transactions set status = 'success' where id = $1",
            [transaction.id],
          );
          const walletRes = await client.query(
            `update public.app_wallets
               set balance_coins = balance_coins + $1, updated_at = now()
               where user_id = $2 returning balance_coins`,
            [transaction.amount_coins, access.user.id],
          );
          await client.query('commit');

          return NextResponse.json({
            status: 'success',
            balanceCoins: Number(walletRes.rows[0]?.balance_coins ?? 0),
          });
        } catch (err) {
          await client.query('rollback');
          throw err;
        }
      }

      if (npStatus === 'failed') {
        await client.query(
          "update public.app_wallet_transactions set status = 'failed' where id = $1",
          [transaction.id],
        );
        return NextResponse.json({ status: 'failed' });
      }

      return NextResponse.json({ status: 'pending' });
    } finally {
      client.release();
    }
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
