import { NextRequest, NextResponse } from 'next/server';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ reference: string }> };

const REFERENCE_REGEX = /^[A-Za-z0-9._\-]{4,200}$/;

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Expo-Origin, x-client-info, apikey, X-Requested-With',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { reference } = await context.params;

    if (!REFERENCE_REGEX.test(reference)) {
      throw new MobileApiError('Reference invalide.', 400);
    }

    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null },
      response: null,
    }));
    const user = access?.user ?? { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null };

    if (user.id === 'guest-student') {
      return withCors(NextResponse.json({ status: 'success', balanceCoins: 5000 }), request);
    }

    try {
      await enforceRateLimit(request, {
        bucket: 'wallet-topup-status',
        max: 60,
        windowMs: 60_000,
        userId: user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

    const client = await databasePool.connect();
    try {
      const looksMock = reference.startsWith('mock_');
      const hasRealPaymentProvider = Boolean(process.env.NOTCHPAY_PRIVATE_KEY);
      const isMock = looksMock && !hasRealPaymentProvider;

      const transRes = await client.query(
        `select id, status, amount_coins, created_at
           from public.app_wallet_transactions
           where reference_id = $1 and user_id = $2`,
        [reference, user.id],
      );
      const transaction = transRes.rows[0];

      if (!transaction) {
        throw new MobileApiError('Transaction introuvable.', 404);
      }

      if (transaction.status === 'success') {
        const walletRes = await client.query(
          'select balance_coins from public.app_wallets where user_id = $1',
          [user.id],
        );
        return withCors(
          NextResponse.json({
            status: 'success',
            balanceCoins: Number(walletRes.rows[0]?.balance_coins ?? 0),
          }),
          request,
        );
      }

      if (transaction.status === 'failed') {
        return withCors(NextResponse.json({ status: 'failed' }), request);
      }

      if (isMock) {
        const elapsedMs = Date.now() - new Date(transaction.created_at).getTime();
        if (elapsedMs >= 2000) {
          try {
            await client.query('begin');
            const locked = await client.query(
              "select status from public.app_wallet_transactions where id = $1 for update",
              [transaction.id],
            );
            if (locked.rows[0]?.status !== 'pending') {
              await client.query('rollback');
              return withCors(NextResponse.json({ status: locked.rows[0]?.status ?? 'pending' }), request);
            }

            await client.query(
              "update public.app_wallet_transactions set status = 'success' where id = $1",
              [transaction.id],
            );

            const walletRes = await client.query(
              `update public.app_wallets
                 set balance_coins = balance_coins + $1, updated_at = now()
                 where user_id = $2 returning balance_coins`,
              [transaction.amount_coins, user.id],
            );

            await client.query('commit');

            return withCors(
              NextResponse.json({
                status: 'success',
                balanceCoins: Number(walletRes.rows[0]?.balance_coins ?? 0),
              }),
              request,
            );
          } catch (err) {
            await client.query('rollback');
            throw err;
          }
        }
        return withCors(NextResponse.json({ status: 'pending' }), request);
      }

      const privateKey = process.env.NOTCHPAY_PRIVATE_KEY;
      if (!privateKey) {
        return withCors(NextResponse.json({ status: 'pending' }), request);
      }

      const npRes = await fetch(`https://api.notchpay.co/payments/${reference}`, {
        method: 'GET',
        headers: {
          Authorization: privateKey,
          Accept: 'application/json',
        },
      });

      if (!npRes.ok) {
        return withCors(NextResponse.json({ status: 'pending' }), request);
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
            return withCors(NextResponse.json({ status: locked.rows[0]?.status ?? 'pending' }), request);
          }

          await client.query(
            "update public.app_wallet_transactions set status = 'success' where id = $1",
            [transaction.id],
          );
          const walletRes = await client.query(
            `update public.app_wallets
               set balance_coins = balance_coins + $1, updated_at = now()
               where user_id = $2 returning balance_coins`,
            [transaction.amount_coins, user.id],
          );
          await client.query('commit');

          return withCors(
            NextResponse.json({
              status: 'success',
              balanceCoins: Number(walletRes.rows[0]?.balance_coins ?? 0),
            }),
            request,
          );
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
        return withCors(NextResponse.json({ status: 'failed' }), request);
      }

      return withCors(NextResponse.json({ status: 'pending' }), request);
    } finally {
      client.release();
    }
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
