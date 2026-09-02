import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import {
  MobileApiError,
  mobileErrorResponse,
  requireMobileUser,
  type MobileUser,
  withCors,
} from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

const bodySchema = z.object({
  bucket: z.enum(['documents', 'document-previews']),
  path: z.string().min(1).max(2000),
  expiresIn: z.number().int().min(60).max(1800).default(900),
});

type CatalogDocument = {
  id: string;
  price_coins: number | string | null;
  file_path: string | null;
  preview_path: string | null;
};

export const runtime = 'nodejs';

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
};

const hasActiveSubscription = (user: MobileUser) =>
  ['basic', 'pro', 'elite'].includes(user.subscription_tier ?? '') &&
  Boolean(user.subscription_expires_at) &&
  new Date(user.subscription_expires_at as string) > new Date();

const canReadFullDocument = async (document: CatalogDocument, user: MobileUser) => {
  if (Number(document.price_coins ?? 0) <= 0 || hasActiveSubscription(user)) return true;

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
  return Boolean(allowed.rows[0]);
};

const normalizeStoragePath = (storedPath: string, bucket: string, supabaseUrl: URL) => {
  if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) {
    const parsed = new URL(storedPath);
    if (parsed.origin !== supabaseUrl.origin) {
      if (parsed.hostname === 'cloudinary.com' || parsed.hostname.endsWith('.cloudinary.com')) {
        return { directUrl: parsed.toString(), storagePath: null };
      }
      throw new MobileApiError('Source du document non autorisee.', 403);
    }
    const bucketMarker = `/${bucket}/`;
    const markerIndex = parsed.pathname.indexOf(bucketMarker);
    if (markerIndex < 0) throw new MobileApiError('Chemin de fichier invalide.', 400);
    storedPath = parsed.pathname.slice(markerIndex + bucketMarker.length);
  }

  const cleanPath = storedPath.replace(/^\/+/, '').replace(new RegExp(`^${bucket}/`), '');
  if (!cleanPath || cleanPath.includes('..') || cleanPath.includes('\\')) {
    throw new MobileApiError('Chemin de fichier invalide.', 400);
  }
  return { directUrl: null, storagePath: cleanPath };
};

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    try {
      await enforceRateLimit(request, {
        bucket: 'pdf-signed-url',
        max: 60,
        windowMs: 60_000,
        userId: access.user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

    const input = bodySchema.parse(await request.json());
    const lookupValue = input.path.trim();
    const result = await databasePool.query<CatalogDocument>(
      `select id, price_coins, file_path, preview_path
       from public.documents
       where id = $1 or file_path = $1 or preview_path = $1
       limit 1`,
      [lookupValue],
    );
    const document = result.rows[0];
    if (!document) throw new MobileApiError('Document non trouve.', 404);

    const storedPath = input.bucket === 'document-previews' ? document.preview_path : document.file_path;
    if (!storedPath) throw new MobileApiError('Document non trouve.', 404);
    if (lookupValue !== document.id && lookupValue !== storedPath) {
      throw new MobileApiError('Document non trouve.', 404);
    }

    if (input.bucket === 'documents' && !(await canReadFullDocument(document, access.user))) {
      throw new MobileApiError('Ce PDF ne fait pas partie de ta bibliotheque.', 403);
    }

    const supabaseUrl = new URL(requireEnv('SUPABASE_URL'));
    const resolved = normalizeStoragePath(storedPath, input.bucket, supabaseUrl);
    if (resolved.directUrl) {
      return withCors(NextResponse.json({ url: resolved.directUrl }), request);
    }

    const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const response = await fetch(
      `${supabaseUrl.origin}/storage/v1/object/sign/${input.bucket}/${resolved.storagePath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: input.expiresIn }),
        redirect: 'error',
      },
    );
    if (!response.ok) {
      console.error('[signed-url] Supabase storage sign error:', response.status);
      throw new MobileApiError('Impossible d ouvrir ce PDF.', 502);
    }

    const resultBody = (await response.json()) as { signedURL: string };
    return withCors(
      NextResponse.json({ url: `${supabaseUrl.origin}/storage/v1${resultBody.signedURL}` }),
      request,
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
