import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

const bodySchema = z.object({
  bucket: z.enum(['documents', 'document-previews']),
  // Strict path shape: forward-slash separated segments, no traversal, ASCII-safe.
  // Caps length to prevent abuse; storage paths are short (bucket/owner/uuid.pdf).
  path: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[A-Za-z0-9._\-/]+$/, 'Chemin de fichier invalide.'),
  expiresIn: z.number().int().min(60).max(1800).default(900),
});
export const runtime = 'nodejs';

// Reject any path that resolves outside the bucket (../, absolute paths, encoded tricks).
const assertSafePath = (path: string) => {
  if (path.includes('..') || path.startsWith('/') || path.includes('\\')) {
    throw new MobileApiError('Chemin de fichier invalide.', 400);
  }
};

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    // Signed URLs are cheap but each one is a downstream Supabase call; bound
    // them so a compromised session can't hammer storage.
    try {
      await enforceRateLimit(request, {
        bucket: 'pdf-signed-url',
        max: 60,
        windowMs: 60_000,
        userId: access.user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return response;
      throw error;
    }

    const input = bodySchema.parse(await request.json());
    assertSafePath(input.path);

    // Always resolve the document_id from the path before issuing a signed URL,
    // so subscription users cannot request signed URLs for documents that do not exist
    // and cannot reference documents via guessed storage paths.
    const documentLookup = await databasePool.query(
      `select id, price_coins from public.documents
       where file_path = $1 and status = 'published' limit 1`,
      [input.path],
    );
    const document = documentLookup.rows[0];
    if (!document) {
      throw new MobileApiError('Document introuvable ou non publie.', 404);
    }

    if (input.bucket === 'documents') {
      const hasSubscription =
        (access.user.subscription_tier === 'basic' || access.user.subscription_tier === 'premium') &&
        (!access.user.subscription_expires_at ||
          new Date(access.user.subscription_expires_at) > new Date());

      if (!hasSubscription) {
        // Non-subscribers must have purchased the document (or received it via a pack).
        const allowed = await databasePool.query(
          `select 1 from public.app_document_purchases
             where document_id = $1 and buyer_id = $2
           union all
           select 1 from public.app_pack_purchases pp
             join public.pdf_pack_items pi on pi.pack_id = pp.pack_id
             where pp.buyer_id = $2 and pi.document_id = $1
           limit 1`,
          [document.id, access.user.id],
        );
        if (!allowed.rows[0]) {
          throw new MobileApiError('Ce PDF ne fait pas partie de ta bibliotheque.', 403);
        }
      }
      // For subscribers: ownership of an active subscription is enough to read any
      // *published* document. The published-existence check above prevents
      // signed URLs for non-existent / draft / archived paths.
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
    const result = (await response.json()) as { signedURL: string };
    return NextResponse.json({ url: `${baseUrl}/storage/v1${result.signedURL}` });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
