import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { mobileErrorResponse, MobileApiError, requireMobileUser } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4 * 1024;

const purchaseSchema = z.object({
  packId: z.enum(['micro', 'standard', 'boost']),
});

const PACKS = {
  micro: { price: 250, credits: 20 },
  standard: { price: 500, credits: 50 },
  boost: { price: 1000, credits: 120 },
};

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 });
    }
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    try {
      await enforceRateLimit(request, {
        bucket: 'purchase-ia-pack',
        max: 10,
        windowMs: 60_000,
        userId: access.user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return response;
      throw error;
    }

    const body = await request.json().catch(() => null);
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileApiError('Pack invalide.');
    }

    const packId = parsed.data.packId;
    const { price, credits } = PACKS[packId];

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
        throw new MobileApiError('Solde insuffisant pour ce pack.');
      }

      // Deduct balance and add credits
      const updatedWalletRes = await client.query(
        `update public.app_wallets
         set balance_coins = balance_coins - $2,
             ia_credits = ia_credits + $3,
             updated_at = now()
         where user_id = $1
         returning balance_coins, ia_credits`,
        [access.user.id, price, credits]
      );

      // Log transaction
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id)
         values ($1, 'ia_pack', $2, $3)`,
        [access.user.id, -price, packId]
      );

      await client.query('commit');

      return NextResponse.json({
        ok: true,
        balanceCoins: Number(updatedWalletRes.rows[0].balance_coins),
        iaCredits: Number(updatedWalletRes.rows[0].ia_credits),
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
