import { NextRequest, NextResponse } from 'next/server';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ reference: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { reference } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const client = await databasePool.connect();
    try {
      const isMock = reference.startsWith('mock_');

      // Fetch transaction
      const transRes = await client.query(
        'select id, status, amount_coins, created_at from public.app_wallet_transactions where reference_id = $1 and user_id = $2',
        [reference, access.user.id]
      );
      const transaction = transRes.rows[0];

      if (!transaction) {
        throw new MobileApiError('Transaction introuvable.', 404);
      }

      if (transaction.status === 'success') {
        const walletRes = await client.query(
          'select balance_coins from public.app_wallets where user_id = $1',
          [access.user.id]
        );
        return NextResponse.json({
          status: 'success',
          balanceCoins: Number(walletRes.rows[0]?.balance_coins ?? 0),
        });
      }

      if (transaction.status === 'failed') {
        return NextResponse.json({ status: 'failed' });
      }

      // If pending:
      if (isMock) {
        // Auto-approve after 3 seconds in mock sandbox mode
        const elapsedMs = Date.now() - new Date(transaction.created_at).getTime();
        if (elapsedMs >= 3000) {
          await client.query('begin');
          try {
            // Lock and update transaction status to success
            await client.query(
              "update public.app_wallet_transactions set status = 'success' where id = $1",
              [transaction.id]
            );

            // Credit wallet
            const walletRes = await client.query(
              `update public.app_wallets
               set balance_coins = balance_coins + $1, updated_at = now()
               where user_id = $2 returning balance_coins`,
              [transaction.amount_coins, access.user.id]
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
        } else {
          return NextResponse.json({ status: 'pending' });
        }
      } else {
        // Real payment: Check Notch Pay API as a fallback if still pending
        const privateKey = process.env.NOTCHPAY_PRIVATE_KEY;
        if (!privateKey) {
          return NextResponse.json({ status: 'pending' });
        }

        const npRes = await fetch(`https://api.notchpay.co/payments/${reference}`, {
          method: 'GET',
          headers: {
            'Authorization': privateKey,
            'Accept': 'application/json',
          },
        });

        if (!npRes.ok) {
          // If Notch Pay returns error, keep pending locally for safety
          return NextResponse.json({ status: 'pending' });
        }

        const npData = await npRes.json();
        // Notch Pay statuses: 'complete', 'confirmed', 'failed', 'pending', etc.
        const npStatus = npData.status || npData.data?.status || '';

        if (npStatus === 'complete' || npStatus === 'confirmed') {
          await client.query('begin');
          try {
            await client.query(
              "update public.app_wallet_transactions set status = 'success' where id = $1",
              [transaction.id]
            );

            const walletRes = await client.query(
              `update public.app_wallets
               set balance_coins = balance_coins + $1, updated_at = now()
               where user_id = $2 returning balance_coins`,
              [transaction.amount_coins, access.user.id]
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
        } else if (npStatus === 'failed') {
          await client.query(
            "update public.app_wallet_transactions set status = 'failed' where id = $1",
            [transaction.id]
          );
          return NextResponse.json({ status: 'failed' });
        }

        return NextResponse.json({ status: 'pending' });
      }

    } finally {
      client.release();
    }
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
