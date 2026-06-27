import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

const bodySchema = z.object({ packId: z.string().uuid() });
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4 * 1024;

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
        bucket: 'purchase-pack',
        max: 20,
        windowMs: 60_000,
        userId: access.user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return response;
      throw error;
    }

    const { packId } = bodySchema.parse(await request.json());
    const client = await databasePool.connect();
    try {
      await client.query('begin');
      const existing = await client.query(
        'select id from public.app_pack_purchases where pack_id = $1 and buyer_id = $2',
        [packId, access.user.id],
      );
      if (existing.rows[0]) throw new MobileApiError('Ce pack est deja achete.', 409);

      const pack = await client.query(
        `select id, price_coins from public.pdf_packs
         where id = $1 and status = 'published' for update`,
        [packId],
      );
      if (!pack.rows[0]) throw new MobileApiError('Pack indisponible.', 404);
      const items = await client.query(
        `select i.document_id from public.pdf_pack_items i
         join public.documents d on d.id = i.document_id
         where i.pack_id = $1 and d.status = 'published' order by i.sort_order`,
        [packId],
      );
      const documentIds = items.rows.map((row) => String(row.document_id));
      if (!documentIds.length) throw new MobileApiError('Ce pack ne contient aucun PDF publie.', 422);

      const price = Number(pack.rows[0].price_coins);
      const wallet = await client.query(
        'select balance_coins from public.app_wallets where user_id = $1 for update',
        [access.user.id],
      );
      if (!wallet.rows[0] || Number(wallet.rows[0].balance_coins) < price) {
        throw new MobileApiError('Solde insuffisant.', 409);
      }

      const purchase = await client.query(
        `insert into public.app_pack_purchases (pack_id, buyer_id, amount_coins, document_ids)
         values ($1, $2, $3, $4) returning id, pack_id, buyer_id, document_ids`,
        [packId, access.user.id, price, documentIds],
      );
      await client.query(
        'update public.app_wallets set balance_coins = balance_coins - $1, updated_at = now() where user_id = $2',
        [price, access.user.id],
      );
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id)
         values ($1, 'purchase', $2, $3)`,
        [access.user.id, -price, packId],
      );
      await client.query(
        `update public.pdf_packs set sales_count = sales_count + 1,
         revenue_coins = revenue_coins + $1, updated_at = now() where id = $2`,
        [price, packId],
      );
      await client.query('commit');
      return NextResponse.json(purchase.rows[0]);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

