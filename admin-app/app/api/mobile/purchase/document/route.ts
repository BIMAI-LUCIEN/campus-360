import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';

const bodySchema = z.object({ documentId: z.string().min(1).max(200) });
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;
    const { documentId } = bodySchema.parse(await request.json());
    const client = await databasePool.connect();
    try {
      await client.query('begin');
      const existing = await client.query(
        'select id from public.app_document_purchases where document_id = $1 and buyer_id = $2',
        [documentId, access.user.id],
      );
      if (existing.rows[0]) throw new MobileApiError('Ce PDF est deja achete.', 409);

      const document = await client.query(
        `select id, price_coins from public.documents
         where id = $1 and status = 'published' for update`,
        [documentId],
      );
      if (!document.rows[0]) throw new MobileApiError('Document indisponible.', 404);
      const price = Number(document.rows[0].price_coins);
      const wallet = await client.query(
        'select balance_coins from public.app_wallets where user_id = $1 for update',
        [access.user.id],
      );
      if (!wallet.rows[0] || Number(wallet.rows[0].balance_coins) < price) {
        throw new MobileApiError('Solde insuffisant.', 409);
      }

      const purchase = await client.query(
        `insert into public.app_document_purchases (document_id, buyer_id, amount_coins)
         values ($1, $2, $3) returning id, document_id, buyer_id`,
        [documentId, access.user.id, price],
      );
      await client.query(
        'update public.app_wallets set balance_coins = balance_coins - $1, updated_at = now() where user_id = $2',
        [price, access.user.id],
      );
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id)
         values ($1, 'purchase', $2, $3)`,
        [access.user.id, -price, documentId],
      );
      await client.query('update public.documents set sales_count = sales_count + 1, updated_at = now() where id = $1', [documentId]);
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

