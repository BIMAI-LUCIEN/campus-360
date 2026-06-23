import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { mobileErrorResponse, MobileApiError, requireMobileUser } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const purchaseSchema = z.object({
  tier: z.enum(['basic', 'premium']),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const body = await request.json().catch(() => null);
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileApiError('Forfait invalide.');
    }

    const tier = parsed.data.tier;
    const price = tier === 'premium' ? 2000 : 1000;
    const iaCredits = tier === 'premium' ? 100 : 0;
    const durationDays = 30;

    const client = await databasePool.connect();
    try {
      await client.query('begin');

      // Check balance
      const walletRes = await client.query(
        'select id, balance_coins from public.app_wallets where user_id = $1 for update',
        [access.user.id]
      );
      const wallet = walletRes.rows[0];

      if (!wallet) {
        throw new MobileApiError('Portefeuille introuvable.');
      }
      if (wallet.balance_coins < price) {
        throw new MobileApiError('Solde insuffisant pour cet abonnement.');
      }

      // Deduct balance and add credits
      await client.query(
        `update public.app_wallets
         set balance_coins = balance_coins - $2,
             ia_credits = ia_credits + $3,
             updated_at = now()
         where user_id = $1`,
        [access.user.id, price, iaCredits]
      );

      // Log transaction
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id)
         values ($1, 'subscription', $2, $3)`,
        [access.user.id, -price, tier]
      );

      // Update user profile
      const userRes = await client.query(
        `update public.app_users
         set subscription_tier = $2,
             subscription_expires_at = now() + interval '${durationDays} days',
             updated_at = now()
         where id = $1
         returning subscription_tier, subscription_expires_at`,
        [access.user.id, tier]
      );

      await client.query('commit');

      return NextResponse.json({
        ok: true,
        tier: userRes.rows[0].subscription_tier,
        expiresAt: new Date(userRes.rows[0].subscription_expires_at).toISOString(),
      });
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
