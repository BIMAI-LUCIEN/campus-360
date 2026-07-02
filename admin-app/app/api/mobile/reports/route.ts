import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse, MobileApiError } from '@/lib/mobile-access';
import { listUserReports, createReport } from '@/lib/reports-db';

export const runtime = 'nodejs';

const createReportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().default(''),
  templateType: z.enum(['stage', 'memoire', 'blank']).default('stage'),
});

const REPORT_PRICE_COINS = 3000;
const FREE_REPORTS_PER_MONTH = 3;

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const reports = await listUserReports(access.user.id);
    return NextResponse.json({ reports });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const body = await request.json().catch(() => null);
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    }

    const { title, description, templateType } = parsed.data;
    const user = access.user;
    const isSubscriber =
      (user.subscription_tier === 'basic' || user.subscription_tier === 'premium') &&
      (!user.subscription_expires_at || new Date(user.subscription_expires_at) > new Date());

    const client = await (await import('@/lib/database')).databasePool.connect();
    try {
      await client.query('begin');

      // Check wallet
      const walletRes = await client.query(
        'select id, balance_coins, report_credits from public.app_wallets where user_id = $1 for update',
        [user.id]
      );
      const wallet = walletRes.rows[0];
      if (!wallet) throw new MobileApiError('Portefeuille introuvable.', 404);

      const reportCredits = Number(wallet.report_credits ?? 0);
      const balanceCoins = Number(wallet.balance_coins ?? 0);

      // Determine pricing
      if (reportCredits > 0) {
        // Use free credit
        await client.query(
          `update public.app_wallets set report_credits = report_credits - 1, updated_at = now() where user_id = $1`,
          [user.id]
        );
        await client.query(
          `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
           values ($1, 'report', 0, 'free_credit', 'success')`,
          [user.id]
        );
      } else if (isSubscriber && balanceCoins >= REPORT_PRICE_COINS) {
        // Subscriber pays but with loyalty discount (full price via coins)
        await client.query(
          `update public.app_wallets set balance_coins = balance_coins - $2, updated_at = now() where user_id = $1`,
          [user.id, REPORT_PRICE_COINS]
        );
        await client.query(
          `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
           values ($1, 'report', $2, $3, 'success')`,
          [user.id, -REPORT_PRICE_COINS, templateType]
        );
      } else if (balanceCoins >= REPORT_PRICE_COINS) {
        // Pay-per-report
        await client.query(
          `update public.app_wallets set balance_coins = balance_coins - $2, updated_at = now() where user_id = $1`,
          [user.id, REPORT_PRICE_COINS]
        );
        await client.query(
          `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
           values ($1, 'report', $2, $3, 'success')`,
          [user.id, -REPORT_PRICE_COINS, templateType]
        );
      } else {
        // Not enough coins
        await client.query('rollback');
        return NextResponse.json(
          {
            error: `Solde insuffisant. Il te faut au moins ${REPORT_PRICE_COINS} C pour créer un rapport. Recharge ton wallet.`,
            code: 'INSUFFICIENT_BALANCE',
            required: REPORT_PRICE_COINS,
            current: balanceCoins,
            reportCredits,
            isSubscriber,
          },
          { status: 402 },
        );
      }

      // Create the report in the same transaction — atomic with wallet deduction
      const report = await createReport(user.id, title, description, templateType, client);

      await client.query('commit');
      return NextResponse.json({ report }, { status: 201 });
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
