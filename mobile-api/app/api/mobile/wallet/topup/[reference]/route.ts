import { NextRequest, NextResponse } from 'next/server';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { isMockAllowed } from '@/lib/payment-rules';
import { getNyoleBaseUrl } from '@/lib/payments';
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

    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

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
      const isMock = looksMock && isMockAllowed(process.env);

      const transRes = await client.query(
        `select id, status, pack_type, amount_coins, created_at
           from public.app_wallet_transactions
           where reference_id = $1 and user_id = $2`,
        [reference, user.id],
      );
      const transaction = transRes.rows[0];

      if (!transaction) {
        throw new MobileApiError('Transaction introuvable.', 404);
      }

      if (transaction.status === 'success' || transaction.status === 'completed') {
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

      const nyoleSecretKey = process.env.NYOLE_SECRET_KEY?.trim();
      const legacyPrivateKey = process.env.NOTCHPAY_PRIVATE_KEY?.trim();

      if (transaction.status === 'failed') {
        let failureMessage = 'La transaction a été rejetée ou a expiré.';
        if (nyoleSecretKey && reference.startsWith('cm')) {
          try {
            const baseUrl = getNyoleBaseUrl();
            const sRes = await fetch(
              `${baseUrl}/v1/checkout/sessions/${encodeURIComponent(reference)}/status`,
              {
                headers: {
                  Authorization: `Bearer ${nyoleSecretKey}`,
                  Accept: 'application/json',
                },
              },
            );
            if (sRes.ok) {
              const sData = (await sRes.json()) as {
                failure_message?: string;
                data?: { failure_message?: string };
              };
              const msg = sData.failure_message || sData.data?.failure_message;
              if (msg) failureMessage = msg;
            }
          } catch {}
        }
        return withCors(NextResponse.json({ status: 'failed', failureMessage }), request);
      }

      if (isMock) {
        const elapsedMs = Date.now() - new Date(transaction.created_at).getTime();
        if (elapsedMs >= 2000) {
          try {
            await client.query('begin');
            const locked = await client.query(
              'select status from public.app_wallet_transactions where id = $1 for update',
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

            if (transaction.pack_type === 'discovery_500') {
              await client.query(
                `update public.stage_students
                   set tokens = tokens + 5
                   where auth_id = $1 or id::text = $1 or app_user_id::text = $1`,
                [user.id],
              );
            } else {
              await client.query(
                `insert into public.app_wallets (user_id, balance_coins)
                 values ($1, $2)
                 on conflict (user_id) do update
                   set balance_coins = public.app_wallets.balance_coins + excluded.balance_coins,
                       updated_at = now()`,
                [user.id, Number(transaction.amount_coins)],
              );
            }

            const walletRes = await client.query(
              'select balance_coins from public.app_wallets where user_id = $1',
              [user.id],
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

      if (!nyoleSecretKey && !legacyPrivateKey) {
        return withCors(NextResponse.json({ status: 'pending' }), request);
      }

      let providerStatus = '';
      let providerPaid: boolean | undefined;
      let providerAmount: number | null = null;
      let failureMessage = 'La transaction a été rejetée ou a expiré.';

      const elapsedMs = Date.now() - new Date(transaction.created_at).getTime();

      if (nyoleSecretKey) {
        // Wait 15s before polling Nyole's /status endpoint so the initial USSD push
        // has time to initialize on the operator side without being aborted at t+3s.
        if (elapsedMs < 15_000) {
          return withCors(NextResponse.json({ status: 'pending' }), request);
        }

        const baseUrl = getNyoleBaseUrl();
        const statusRes = await fetch(
          `${baseUrl}/v1/checkout/sessions/${encodeURIComponent(reference)}/status`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${nyoleSecretKey}`,
              Accept: 'application/json',
            },
          },
        );

        if (!statusRes.ok) {
          return withCors(NextResponse.json({ status: 'pending' }), request);
        }

        const statusData = (await statusRes.json()) as {
          status?: string;
          paid?: boolean;
          amount?: number;
          failure_message?: string;
          data?: { status?: string; paid?: boolean; amount?: number; failure_message?: string };
        };
        providerStatus = String(statusData.status || statusData.data?.status || '').toLowerCase();
        providerPaid = statusData.paid ?? statusData.data?.paid;
        const rawAmount = statusData.amount ?? statusData.data?.amount;
        providerAmount = rawAmount !== null && rawAmount !== undefined ? Number(rawAmount) : null;
        const msg = statusData.failure_message || statusData.data?.failure_message;
        if (msg) failureMessage = msg;
      } else if (legacyPrivateKey) {
        const npRes = await fetch(`https://api.notchpay.co/payments/${reference}`, {
          method: 'GET',
          headers: {
            Authorization: legacyPrivateKey,
            Accept: 'application/json',
          },
        });

        if (!npRes.ok) {
          return withCors(NextResponse.json({ status: 'pending' }), request);
        }

        const npData = (await npRes.json()) as {
          status?: string;
          amount?: number;
          data?: { status?: string; amount?: number };
        };
        providerStatus = String(npData.status || npData.data?.status || '').toLowerCase();
        const rawAmount = npData.amount ?? npData.data?.amount;
        providerAmount = rawAmount !== null && rawAmount !== undefined ? Number(rawAmount) : null;
      }

      const isSuccessStatus =
        (providerStatus === 'complete' ||
          providerStatus === 'completed' ||
          providerStatus === 'confirmed' ||
          providerStatus === 'success') &&
        providerPaid !== false;

      if (isSuccessStatus) {
        if (providerAmount !== null && providerAmount !== Number(transaction.amount_coins)) {
          console.warn(
            `[topup status] Amount mismatch for ${reference}: expected ${transaction.amount_coins}, got ${providerAmount}`,
          );
          await client.query(
            "update public.app_wallet_transactions set status = 'failed' where id = $1",
            [transaction.id],
          );
          return withCors(NextResponse.json({ status: 'failed', failureMessage }), request);
        }

        try {
          await client.query('begin');
          const locked = await client.query(
            'select status from public.app_wallet_transactions where id = $1 for update',
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

          if (transaction.pack_type === 'discovery_500') {
            await client.query(
              `update public.stage_students
                 set tokens = tokens + 5
                 where auth_id = $1 or id::text = $1 or app_user_id::text = $1`,
              [user.id],
            );
          } else {
            await client.query(
              `insert into public.app_wallets (user_id, balance_coins)
               values ($1, $2)
               on conflict (user_id) do update
                 set balance_coins = public.app_wallets.balance_coins + excluded.balance_coins,
                     updated_at = now()`,
              [user.id, Number(transaction.amount_coins)],
            );
          }

          const walletRes = await client.query(
            'select balance_coins from public.app_wallets where user_id = $1',
            [user.id],
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

      if (
        providerStatus === 'failed' ||
        providerStatus === 'canceled' ||
        providerStatus === 'cancelled' ||
        providerStatus === 'expired'
      ) {
        await client.query(
          "update public.app_wallet_transactions set status = 'failed' where id = $1",
          [transaction.id],
        );
        return withCors(NextResponse.json({ status: 'failed', failureMessage }), request);
      }

      return withCors(NextResponse.json({ status: 'pending' }), request);
    } finally {
      client.release();
    }
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
