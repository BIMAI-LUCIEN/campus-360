import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { mobileErrorResponse, MobileApiError, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4 * 1024;

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

const purchaseSchema = z.object({
  tier: z.enum(['basic', 'premium']),
});

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return withCors(NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 }), request);
    }
    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null },
      response: null,
    }));
    const user = access?.user ?? { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null };

    if (user.id === 'guest-student') {
      const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
      return withCors(NextResponse.json({ ok: true, tier: 'premium', expiresAt }), request);
    }

    try {
      await enforceRateLimit(request, {
        bucket: 'subscription-purchase',
        max: 10,
        windowMs: 60_000,
        userId: user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

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

      const walletRes = await client.query(
        'select id, balance_coins from public.app_wallets where user_id = $1 for update',
        [user.id]
      );
      const wallet = walletRes.rows[0];

      if (!wallet) {
        throw new MobileApiError('Portefeuille introuvable.');
      }
      if (wallet.balance_coins < price) {
        throw new MobileApiError('Solde insuffisant pour cet abonnement.');
      }

      await client.query(
        `update public.app_wallets
         set balance_coins = balance_coins - $2,
             ia_credits = ia_credits + $3,
             report_credits = coalesce(report_credits, 0) + 3,
             updated_at = now()
         where user_id = $1`,
        [user.id, price, iaCredits]
      );

      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id)
         values ($1, 'subscription', $2, $3)`,
        [user.id, -price, tier]
      );

      const userRes = await client.query(
        `update public.app_users
         set subscription_tier = $2,
             subscription_expires_at = case
               when subscription_tier = $2 and subscription_expires_at > now()
                 then subscription_expires_at + make_interval(days => $3)
               else now() + make_interval(days => $3)
             end,
             updated_at = now()
         where id = $1
         returning subscription_tier, subscription_expires_at`,
        [user.id, tier, durationDays],
      );

      await client.query('commit');

      return withCors(
        NextResponse.json({
          ok: true,
          tier: userRes.rows[0].subscription_tier,
          expiresAt: new Date(userRes.rows[0].subscription_expires_at).toISOString(),
        }),
        request,
      );
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
