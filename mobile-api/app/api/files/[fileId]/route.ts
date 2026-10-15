import { NextRequest, NextResponse } from 'next/server';

import { getDocumentFileForSignedAccess } from '@/lib/document-files-db';
import { verifyFileSignature } from '@/lib/file-signing';
import { canStoreFiles, readStoredFile } from '@/lib/file-storage';

export const runtime = 'nodejs';

// Serves a stored file to whoever holds a valid, unexpired signed URL
// (the app's WebView, Puppeteer during PDF export). Served by the files host.

type RouteContext = { params: Promise<{ fileId: string }> };

const plain = (status: number, message: string) =>
  new NextResponse(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { fileId } = await context.params;
    const params = request.nextUrl.searchParams;
    const check = verifyFileSignature(fileId, params.get('exp'), params.get('sig'));
    if (check === 'expired') return plain(403, 'Lien expiré.');
    if (check !== 'valid') return plain(403, 'Lien invalide.');

    if (!canStoreFiles()) return plain(404, 'Fichier introuvable.');
    const file = await getDocumentFileForSignedAccess(fileId);
    if (!file?.storage_key) return plain(404, 'Fichier introuvable.');

    const data = await readStoredFile(file.storage_key).catch(() => null);
    if (!data) return plain(404, 'Fichier introuvable.');

    const isImage = file.kind === 'image';
    const asciiName = (file.original_name || 'fichier').replace(/[^\w.\- ]/g, '_').slice(0, 100);
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': file.mime,
        'Content-Length': String(data.length),
        'Content-Disposition': `${isImage ? 'inline' : 'attachment'}; filename="${asciiName}"`,
        'Cache-Control': 'private, max-age=600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    console.error('[files] serve error', error);
    return plain(500, 'Erreur serveur.');
  }
}
