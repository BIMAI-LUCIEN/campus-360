import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';

const bodySchema = z.object({
  bucket: z.enum(['documents', 'document-previews']),
  path: z.string().min(1).max(500),
  expiresIn: z.number().int().min(60).max(1800).default(900),
});
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;
    const input = bodySchema.parse(await request.json());

    if (input.bucket === 'documents') {
      const hasSubscription =
        (access.user.subscription_tier === 'basic' || access.user.subscription_tier === 'premium') &&
        (!access.user.subscription_expires_at || new Date(access.user.subscription_expires_at) > new Date());

      if (!hasSubscription) {
        const allowed = await databasePool.query(
          `select d.id from public.documents d
           where d.file_path = $1 and d.status = 'published' and (
             d.price_coins = 0
             or exists (select 1 from public.app_document_purchases p where p.document_id = d.id and p.buyer_id = $2)
             or exists (
               select 1 from public.app_pack_purchases pp
               join public.pdf_pack_items pi on pi.pack_id = pp.pack_id
               where pp.buyer_id = $2 and pi.document_id = d.id
             )
           ) limit 1`,
          [input.path, access.user.id],
        );
        if (!allowed.rows[0]) throw new MobileApiError('Ce PDF ne fait pas partie de ta bibliotheque.', 403);
      } else {
        const exists = await databasePool.query(
          `select id from public.documents
           where file_path = $1 and status = 'published' limit 1`,
          [input.path]
        );
        if (!exists.rows[0]) throw new MobileApiError('Document introuvable ou non publie.', 404);
      }
    }

    const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!baseUrl || !serviceKey) throw new MobileApiError('Stockage PDF indisponible.', 503);
    const response = await fetch(`${baseUrl}/storage/v1/object/sign/${input.bucket}/${input.path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: input.expiresIn }),
    });
    if (!response.ok) throw new MobileApiError('Impossible d ouvrir ce PDF.', 502);
    const result = await response.json() as { signedURL: string };
    return NextResponse.json({ url: `${baseUrl}/storage/v1${result.signedURL}` });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

