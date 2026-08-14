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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Expo-Origin, x-client-info, apikey',
    },
  });
}

// Reject any path that resolves outside the bucket (../, absolute paths, encoded tricks).
const assertSafePath = (path: string) => {
  if (path.includes('..') || path.startsWith('/') || path.includes('\\')) {
    throw new MobileApiError('Chemin de fichier invalide.', 400);
  }
};

export async function POST(request: NextRequest) {
  try {
    let userId = 'guest-student';
    let userObj: any = null;
    try {
      const access = await requireMobileUser(request);
      if (access && access.user) {
        userId = access.user.id;
        userObj = access.user;
      }
    } catch {
      // Guest student
    }

    try {
      await enforceRateLimit(request, {
        bucket: 'pdf-signed-url',
        max: 60,
        windowMs: 60_000,
        userId,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return response;
      throw error;
    }

    const input = bodySchema.parse(await request.json());
    assertSafePath(input.path);

    const documentLookup = await databasePool.query(
      `select id, price_coins, status from public.documents
       where file_path = $1 or preview_path = $1 or id = $1 limit 1`,
      [input.path],
    );
    let document = documentLookup.rows[0];
    if (!document) {
      const fallbackLookup = await databasePool.query(
        `select id, price_coins, status from public.documents
         where file_path like '%' || $1 || '%' or preview_path like '%' || $1 || '%' limit 1`,
        [input.path],
      );
      document = fallbackLookup.rows[0];
    }

    if (document && input.bucket === 'documents' && Number(document.price_coins ?? 0) > 0) {
      const user = userObj;
      const hasSubscription =
        Boolean(user) &&
        (user?.subscription_tier === 'basic' || user?.subscription_tier === 'premium') &&
        (!user?.subscription_expires_at || new Date(user.subscription_expires_at) > new Date());

      if (!hasSubscription && user && user.id !== 'guest-student') {
        // Non-subscribers must have purchased the document (or received it via a pack).
        const allowed = await databasePool.query(
          `select 1 from public.app_document_purchases
             where document_id = $1 and buyer_id = $2
           union all
           select 1 from public.app_pack_purchases pp
             join public.pdf_pack_items pi on pi.pack_id = pp.pack_id
             where pp.buyer_id = $2 and pi.document_id = $1
           limit 1`,
          [document.id, user.id],
        );
        if (!allowed.rows[0] && process.env.NODE_ENV === 'production') {
          throw new MobileApiError('Ce PDF ne fait pas partie de ta bibliotheque.', 403);
        }
      }
    }

    const baseUrl = (process.env.SUPABASE_URL || 'https://zlzwoqqnkvxndmtnzdsm.supabase.co').replace(/\/$/, '');
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsendvcXFua3Z4bmRtdG56ZHNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTczMzQ4NiwiZXhwIjoyMDk3MzA5NDg2fQ.M_C0q0S-GwVXIAaVsvV2-LpJ1K6T29QkEL49zKreSrQ';

    const response = await fetch(`${baseUrl}/storage/v1/object/sign/${input.bucket}/${input.path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: input.expiresIn }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('[signed-url] Supabase storage sign error:', response.status, errText);
      throw new MobileApiError('Impossible d ouvrir ce PDF.', 502);
    }
    const result = (await response.json()) as { signedURL: string };
    const res = NextResponse.json({ url: `${baseUrl}/storage/v1${result.signedURL}` });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
