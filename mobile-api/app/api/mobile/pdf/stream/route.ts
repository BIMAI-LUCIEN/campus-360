import { NextRequest, NextResponse } from 'next/server';

import { fetchCatalogPdf } from '@/lib/catalog-pdf';
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
  always_free?: boolean | null;
  file_path: string | null;
  preview_path: string | null;
};

// Reading every PDF of the catalogue is free (contexte.md §19); only the AI on a PDF is limited.
// An archived PDF (withdrawn from the catalogue) is not served, as in the catalogue listing.
const canReadFullDocument = async (_document: CatalogDocument, _user: MobileUser) => true;

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
      `select id, price_coins, always_free, file_path, preview_path
       from public.documents
       where (id::text = $1 or file_path = $1 or preview_path = $1)
         and coalesce(status, 'published') <> 'archived'
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

    const pdfBuffer = await fetchCatalogPdf(targetUrl);
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
