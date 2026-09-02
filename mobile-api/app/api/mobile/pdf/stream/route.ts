import { NextRequest, NextResponse } from 'next/server';

import { getCloudinaryConfig } from '@/lib/cloudinary';
import { databasePool } from '@/lib/database';
import {
  MobileApiError,
  mobileErrorResponse,
  requireMobileUser,
  type MobileUser,
  withCors,
} from '@/lib/mobile-access';

export const runtime = 'nodejs';

type CatalogDocument = {
  id: string;
  price_coins: number | string | null;
  file_path: string | null;
  preview_path: string | null;
};

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

const isCloudinaryHost = (hostname: string) =>
  hostname === 'cloudinary.com' || hostname.endsWith('.cloudinary.com');

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const { searchParams } = new URL(request.url);
    const lookupValue = searchParams.get('id')?.trim() || searchParams.get('path')?.trim();
    if (!lookupValue) throw new MobileApiError('Document non trouve.', 404);

    const result = await databasePool.query<CatalogDocument>(
      `select id, price_coins, file_path, preview_path
       from public.documents
       where id = $1 or file_path = $1 or preview_path = $1
       limit 1`,
      [lookupValue],
    );
    const document = result.rows[0];
    if (!document) throw new MobileApiError('Document non trouve.', 404);

    const previewRequested = lookupValue === document.preview_path;
    if (!previewRequested && !(await canReadFullDocument(document, access.user))) {
      throw new MobileApiError('Ce PDF ne fait pas partie de ta bibliotheque.', 403);
    }

    const targetUrl = previewRequested ? document.preview_path : document.file_path;
    if (!targetUrl) throw new MobileApiError('Document non trouve.', 404);

    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      throw new MobileApiError('Source du document invalide.', 502);
    }

    let pdfResponse: Response;
    if (isCloudinaryHost(parsedTarget.hostname)) {
      const { apiKey, apiSecret } = getCloudinaryConfig();
      const cloudAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      pdfResponse = await fetch(parsedTarget, {
        headers: { Authorization: `Basic ${cloudAuth}` },
        redirect: 'error',
      });
      if (!pdfResponse.ok && parsedTarget.pathname.includes('/image/upload/')) {
        const rawUrl = new URL(parsedTarget);
        rawUrl.pathname = rawUrl.pathname.replace('/image/upload/', '/raw/upload/');
        pdfResponse = await fetch(rawUrl, {
          headers: { Authorization: `Basic ${cloudAuth}` },
          redirect: 'error',
        });
      }
    } else {
      const supabaseUrl = new URL(requireEnv('SUPABASE_URL'));
      if (parsedTarget.origin !== supabaseUrl.origin) {
        throw new MobileApiError('Source du document non autorisee.', 403);
      }
      const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
      pdfResponse = await fetch(parsedTarget, {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        redirect: 'error',
      });
    }

    if (!pdfResponse.ok) {
      console.warn('[pdf/stream] Fetching PDF source failed:', pdfResponse.status);
      throw new MobileApiError('Impossible de charger ce PDF.', 502);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    return withCors(
      new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline',
          'Cache-Control': 'private, no-store',
        },
      }),
      request,
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
