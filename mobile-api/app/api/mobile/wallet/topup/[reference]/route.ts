import { NextRequest, NextResponse } from 'next/server';

import { databasePool } from '@/lib/database';
import { sendTopUpReceipt } from '@/lib/automations';
import { corsPreflight, MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { isMockAllowed } from '@/lib/payment-rules';
import { getSaspayBaseUrl } from '@/lib/payments';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ reference: string }> };

const REFERENCE_REGEX = /^[A-Za-z0-9._\-]{4,200}$/;

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
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
        `select id, status, pack_type, amount_coins, created_at, failure_message
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

      const saspayApiKey = process.env.SASPAY_API_KEY?.trim();

      const storedFailure: string =
        transaction.failure_message || 'La transaction a été rejetée ou a expiré.';
      const isLocallyFailed = transaction.status === 'failed';
      const failedResponse = (message: string) =>
        withCors(NextResponse.json({ status: 'failed', failureMessage: message }), request);

      // SasPay keeps a FAILED session payable: re-check it so a retry that succeeded is credited.
      if (isLocallyFailed && (!saspayApiKey || reference.startsWith('mock_'))) {
        return failedResponse(storedFailure);
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

      if (!saspayApiKey) {
        return withCors(NextResponse.json({ status: 'pending' }), request);
      }

      let providerStatus = '';
      let providerPaid: boolean | undefined;
      let providerAmount: number | null = null;
      let failureMessage = 'La transaction a été rejetée ou a expiré.';

      if (saspayApiKey) {
        const baseUrl = getSaspayBaseUrl();
        const statusRes = await fetch(
          `${baseUrl}/payments/${encodeURIComponent(reference)}/verify/`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${saspayApiKey}`,
              Accept: 'application/json',
            },
          },
        );

        if (!statusRes.ok) {
          return isLocallyFailed
            ? failedResponse(storedFailure)
            : withCors(NextResponse.json({ status: 'pending' }), request);
        }

        const statusData = (await statusRes.json()) as {
          status?: string;
          data?: { status?: string };
        };
        const rawStatus = String(statusData.data?.status || statusData.status || '').toUpperCase();

        if (rawStatus === 'SUCCESS') {
          providerStatus = 'success';
          providerPaid = true;
          // verify ne renvoie pas le montant : on compare au montant de la transaction locale.
          providerAmount = Number(transaction.amount_coins);
        } else if (rawStatus === 'FAILED' || rawStatus === 'CANCELLED') {
          providerStatus = 'failed';
          providerPaid = false;
        } else {
          providerStatus = 'pending';
        }
      }

      const isSuccessStatus =
        (providerStatus === 'complete' ||
          providerStatus === 'completed' ||
          providerStatus === 'confirmed' ||
          providerStatus === 'paid' ||
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
          const lockedStatus = locked.rows[0]?.status;
          if (lockedStatus !== 'pending' && lockedStatus !== 'failed') {
            await client.query('rollback');
            return withCors(NextResponse.json({ status: lockedStatus ?? 'pending' }), request);
          }

          await client.query(
            "update public.app_wallet_transactions set status = 'success', failure_message = null where id = $1",
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

          if (transaction.pack_type !== 'discovery_500') {
            await sendTopUpReceipt(user.id, Number(transaction.amount_coins), reference).catch(() => {});
          }

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

      if (isLocallyFailed) {
        return failedResponse(storedFailure);
      }

      if (
        providerStatus === 'failed' ||
        providerStatus === 'canceled' ||
        providerStatus === 'cancelled' ||
        providerStatus === 'expired'
      ) {
        await client.query(
          "update public.app_wallet_transactions set status = 'failed', failure_message = $2 where id = $1",
          [transaction.id, failureMessage],
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
