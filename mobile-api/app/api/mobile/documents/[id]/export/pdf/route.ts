import { NextRequest, NextResponse } from 'next/server';

import { getDocumentExportPolicy } from '@/lib/document-export-policy';
import { inlineDocumentImages, loadDocumentImages } from '@/lib/document-images';
import { renderDocumentPdf, type LoadedLogo } from '@/lib/document-pdf';
import { escapeHtml, FONT_STACKS } from '@/lib/document-render';
import { resolveStyle } from '@/lib/document-style';
import { getDocumentById, getDocumentSections } from '@/lib/documents-db';
import { isEmptyEditorHtml, stripEditorPlaceholder } from '@/lib/editor-html';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { renderHtmlToPdf } from '@/lib/pdf-render';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

// CV and cover letter: one flowing page set, no cover, no academic pagination.
const careerHtml = (title: string, sectionsHtml: string, fontStack: string, lineSpacing: number, isCv: boolean) => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 1.4cm 1.6cm; }
  body { margin: 0; font-family: ${fontStack}; color: #172033; line-height: ${lineSpacing}; font-size: ${isCv ? '10.5pt' : '11.5pt'}; }
  h1 { font-size: 24pt; margin: 0 0 6px; color: #0F3D56; }
  h2 { font-size: 12pt; margin: 16px 0 6px; padding-bottom: 4px; border-bottom: 1.5px solid #0F6B78; color: #0F6B78; text-transform: uppercase; letter-spacing: 0.5px; }
  p { margin: 0 0 8px; }
  ul, ol { margin: 5px 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 0.75pt solid #BFC5CC; padding: 4pt 6pt; text-align: left; }
  img { max-width: 100%; }
</style></head><body>${sectionsHtml}</body></html>`;

const safeFilename = (prefix: string, title: string) =>
  `${prefix}_${String(title || 'Document').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 80)}.pdf`;

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    try {
      await enforceRateLimit(request, { bucket: 'document-pdf-export', max: 20, windowMs: 60_000, userId: user.id });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

    const document = await getDocumentById(id, user.id);
    if (!document) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const exportPolicy = await getDocumentExportPolicy(user.id);
    if (!exportPolicy.canExportPdf) {
      return withCors(
        NextResponse.json({ error: 'L’export PDF n’est pas disponible pour ce compte.', code: 'SUBSCRIPTION_REQUIRED' }, { status: 403 }),
        request,
      );
    }

    const style = resolveStyle(document.document_style);
    const storedSections = await getDocumentSections(id);

    // Uploaded images (and cover logos) are embedded as data URIs.
    const logoIds = [style.cover.schoolLogoFileId, style.cover.companyLogoFileId, style.cover.departmentLogoFileId].filter((v): v is string => Boolean(v));
    const images = await loadDocumentImages(
      [...storedSections.map((s) => s.content_html || ''), ...logoIds.map((logoId) => `<img data-file-id="${logoId}">`)].join('\n'),
      user.id,
      id,
      request.nextUrl.origin,
    );
    const sections = storedSections.map((s) => ({
      id: s.id,
      title: s.title,
      // Legacy hint text never reaches the PDF; empty sections stay empty.
      content_html: isEmptyEditorHtml(s.content_html || '') ? '' : inlineDocumentImages(stripEditorPlaceholder(s.content_html || ''), images),
    }));

    const isCareer = document.template_type === 'cv' || document.template_type === 'lettre_motivation';
    const watermark = exportPolicy.pdfRequiresWatermark ? `Campus 360 — ${user.email}` : null;

    let pdf: Buffer;
    if (isCareer) {
      const body = sections
        .filter((s) => s.content_html.trim())
        .map((s) => `<section>${s.content_html}</section>`)
        .join('');
      pdf = await renderHtmlToPdf(
        careerHtml(document.title, body, FONT_STACKS[style.typography.bodyFont], style.typography.lineSpacing, document.template_type === 'cv'),
      );
    } else {
      const logo = (fileId: string | null): LoadedLogo => (fileId ? images.get(fileId) ?? null : null);
      pdf = await renderDocumentPdf({
        document: { title: document.title, template_type: document.template_type, cover_data: document.cover_data || {} },
        sections,
        style,
        logos: {
          school: logo(style.cover.schoolLogoFileId),
          company: logo(style.cover.companyLogoFileId),
          department: logo(style.cover.departmentLogoFileId),
        },
        watermark,
      });
    }

    const prefix = document.template_type === 'cv'
      ? 'CV'
      : document.template_type === 'lettre_motivation'
        ? 'Lettre_de_Motivation'
        : document.template_type === 'memoire'
          ? 'Memoire'
          : 'Rapport_de_Stage';
    return withCors(
      new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeFilename(prefix, document.title)}"`,
          'Cache-Control': 'no-store',
        },
      }),
      request,
    );
  } catch (error) {
    console.error('[PDF Export] error:', error);
    return mobileErrorResponse(error, request);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  return GET(request, context);
}
