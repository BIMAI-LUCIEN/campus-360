import { NextRequest, NextResponse } from 'next/server';
import { isValidHealthSecret } from '@/lib/health-secret';
import { renderHtmlToPdf } from '@/lib/pdf-render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const providedSecret = request.headers.get('x-health-secret');
  const expectedSecret = process.env.HEALTH_PDF_SECRET;

  if (!isValidHealthSecret(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const testHtml = '<html><body><h1>Campus 360</h1><p>Test PDF</p></body></html>';
    
    // Maximum 10 seconds rendering timeout for health check probe
    const renderPromise = renderHtmlToPdf(testHtml);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Rendu PDF expiré après 10s')), 10_000);
    });

    const pdfBuffer = await Promise.race([renderPromise, timeoutPromise]);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[health/pdf] Échec du moteur PDF :', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Moteur PDF indisponible.' }, { status: 503 });
  }
}
