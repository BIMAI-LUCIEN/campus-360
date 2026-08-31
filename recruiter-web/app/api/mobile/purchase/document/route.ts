import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';
import { sendPushToUser } from '@/lib/push';

export const runtime = 'nodejs';

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

const bodySchema = z.object({
  documentId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Identifiant invalide.'),
});

const MAX_BODY_BYTES = 4 * 1024;

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
      const { documentId } = bodySchema.parse(await request.json().catch(() => ({})));
      return withCors(NextResponse.json({ id: 'mock-purchase', document_id: documentId, buyer_id: 'guest-student' }), request);
    }

    try {
      await enforceRateLimit(request, {
        bucket: 'purchase-document',
        max: 20,
        windowMs: 60_000,
        userId: user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

    const { documentId } = bodySchema.parse(await request.json());
    const client = await databasePool.connect();
    try {
      await client.query('begin');
      const existing = await client.query(
        'select id from public.app_document_purchases where document_id = $1 and buyer_id = $2',
        [documentId, user.id],
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
        [user.id],
      );
      if (!wallet.rows[0] || Number(wallet.rows[0].balance_coins) < price) {
        throw new MobileApiError('Solde insuffisant.', 409);
      }

      const purchase = await client.query(
        `insert into public.app_document_purchases (document_id, buyer_id, amount_coins)
         values ($1, $2, $3) returning id, document_id, buyer_id`,
        [documentId, user.id, price],
      );
      await client.query(
        'update public.app_wallets set balance_coins = balance_coins - $1, updated_at = now() where user_id = $2',
        [price, user.id],
      );
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id)
         values ($1, 'purchase', $2, $3)`,
        [user.id, -price, documentId],
      );
      await client.query('update public.documents set sales_count = sales_count + 1, updated_at = now() where id = $1', [documentId]);
      await client.query('commit');

      void sendPushToUser(user.id, {
        title: 'Achat confirmé 🎉',
        body: 'Ton PDF est disponible dans Mes PDF.',
        data: { type: 'purchase', documentId },
      });
      return withCors(NextResponse.json(purchase.rows[0]), request);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
