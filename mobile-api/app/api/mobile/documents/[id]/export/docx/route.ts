import { NextRequest, NextResponse } from 'next/server';

import { buildDocumentDocx } from '@/lib/document-docx';
import { getDocumentExportPolicy } from '@/lib/document-export-policy';
import { loadDocumentImages, readImageSize } from '@/lib/document-images';
import { resolveStyle } from '@/lib/document-style';
import { getDocumentById, getDocumentSections } from '@/lib/documents-db';
import { isEmptyEditorHtml, stripEditorPlaceholder } from '@/lib/editor-html';
import { attachmentDisposition, documentDownloadName } from '@/lib/document-filename';
import type { DocxImage } from '@/lib/html-to-docx';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const { id } = await context.params;
    const document = await getDocumentById(id, access.user.id);
    if (!document) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const exportPolicy = await getDocumentExportPolicy(access.user.id);
    if (!exportPolicy.canExportDocx) {
      return withCors(
        NextResponse.json({ error: 'L’export Word n’est pas disponible pour ce compte.', code: 'ELITE_REQUIRED' }, { status: 403 }),
        request,
      );
    }

    const style = resolveStyle(document.document_style);
    const storedSections = await getDocumentSections(id);
    const logoIds = [style.cover.schoolLogoFileId, style.cover.companyLogoFileId, style.cover.departmentLogoFileId].filter((v): v is string => Boolean(v));
    const loaded = await loadDocumentImages(
      [...storedSections.map((s) => s.content_html || ''), ...logoIds.map((logoId) => `<img data-file-id="${logoId}">`)].join('\n'),
      access.user.id,
      id,
      request.nextUrl.origin,
    );
    const images = new Map<string, DocxImage>(
      Array.from(loaded.entries()).map(([fileId, image]) => {
        const size = readImageSize(image.data, image.mime);
        return [fileId, { ...image, width: size?.width, height: size?.height }];
      }),
    );
    const logo = (fileId: string | null) => (fileId ? images.get(fileId) ?? null : null);

    const buffer = await buildDocumentDocx({
      document: { title: document.title, template_type: document.template_type, cover_data: document.cover_data || {} },
      sections: storedSections.map((s) => ({
        id: s.id,
        title: s.title,
        content_html: isEmptyEditorHtml(s.content_html || '') ? '' : stripEditorPlaceholder(s.content_html || ''),
      })),
      style,
      images,
      logos: {
        school: logo(style.cover.schoolLogoFileId),
        company: logo(style.cover.companyLogoFileId),
        department: logo(style.cover.departmentLogoFileId),
      },
    });

    return withCors(
      new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': attachmentDisposition(documentDownloadName(document.title, 'docx', 'Document')),
          'Cache-Control': 'no-store',
        },
      }),
      request,
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  return GET(request, context);
}
