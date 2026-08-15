import { NextRequest, NextResponse } from 'next/server';
import { databasePool } from '@/lib/database';
import { withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  return withCors(res);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const path = searchParams.get('path');
    const directUrl = searchParams.get('url');

    let targetUrl = directUrl || '';

    if (!targetUrl && (id || path)) {
      const docLookup = await databasePool.query(
        `select file_path, preview_path from public.documents where id = $1 or file_path = $1 limit 1`,
        [id || path],
      );
      if (docLookup.rows[0]) {
        targetUrl = docLookup.rows[0].file_path || docLookup.rows[0].preview_path;
      }
    }

    if (!targetUrl) {
      const res = NextResponse.json({ error: 'Document non trouvé.' }, { status: 404 });
      return withCors(res);
    }

    // If targetUrl is Cloudinary, use basic auth with API credentials to bypass delivery restrictions
    const cloudApiKey = process.env.CLOUDINARY_API_KEY || '477236452447892';
    const cloudApiSecret = process.env.CLOUDINARY_API_SECRET || 'VPm-MMHKLgEy1aZUyPHpITD6T7k';
    const cloudAuth = Buffer.from(`${cloudApiKey}:${cloudApiSecret}`).toString('base64');

    let pdfResponse: Response;
    if (targetUrl.includes('cloudinary.com')) {
      pdfResponse = await fetch(targetUrl, {
        headers: {
          Authorization: `Basic ${cloudAuth}`,
        },
      });
      // If image/upload is restricted even with auth, try raw or signed URL
      if (!pdfResponse.ok) {
        const rawUrl = targetUrl.replace('/image/upload/', '/raw/upload/');
        pdfResponse = await fetch(rawUrl, {
          headers: {
            Authorization: `Basic ${cloudAuth}`,
          },
        });
      }
    } else {
      // Supabase or standard URL
      const serviceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsendvcXFua3Z4bmRtdG56ZHNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTczMzQ4NiwiZXhwIjoyMDk3MzA5NDg2fQ.M_C0q0S-GwVXIAaVsvV2-LpJ1K6T29QkEL49zKreSrQ';
      pdfResponse = await fetch(targetUrl, {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      });
    }

    if (!pdfResponse.ok) {
      console.warn('[pdf/stream] Fetching PDF source failed:', pdfResponse.status, targetUrl);
      // If direct PDF binary fails, redirect to direct URL
      return NextResponse.redirect(targetUrl);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const res = new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
    return withCors(res);
  } catch (error) {
    console.error('[pdf/stream] Streaming error:', error);
    const res = NextResponse.json({ error: 'Erreur lors du chargement du fichier PDF.' }, { status: 500 });
    return withCors(res);
  }
}
