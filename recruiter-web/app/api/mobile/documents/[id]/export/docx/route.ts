import { NextRequest, NextResponse } from 'next/server';
import { Document as DocxDocument, HeadingLevel, Packer, PageBreak, Paragraph } from 'docx';

import { getDocumentExportPolicy } from '@/lib/document-export-policy';
import { getDocumentById, getDocumentSections } from '@/lib/documents-db';
import { requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const decodeHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/li>|<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

const safeFilename = (value: string) =>
  value.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 80) || 'Rapport_de_stage';

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
        NextResponse.json(
          { error: "L'export Word est réservé à l'abonnement Premium.", code: 'PREMIUM_REQUIRED' },
          { status: 403 },
        ),
        request,
      );
    }

    const cover = document.cover_data || {};
    const children: Paragraph[] = [
      new Paragraph({ text: String(cover.school || 'Établissement'), heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: String(cover.title || document.title), heading: HeadingLevel.TITLE }),
      new Paragraph({ text: String(cover.subtitle || '') }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: `Présenté par : ${cover.studentName || ''}` }),
      new Paragraph({ text: `Entreprise d'accueil : ${cover.company || ''}` }),
      new Paragraph({ text: `Maître de stage : ${cover.tutorCorporate || ''}` }),
      new Paragraph({ text: `Encadreur académique : ${cover.tutorAcademic || ''}` }),
      new Paragraph({ text: `Année académique : ${cover.year || ''}` }),
      new Paragraph({ children: [new PageBreak()] }),
    ];

    const sections = await getDocumentSections(id);
    for (const section of sections) {
      const title = section.title.toLowerCase();
      if (title === 'page de garde') continue;

      children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }));
      if (title === 'sommaire') {
        sections
          .filter((item) => !['page de garde', 'sommaire'].includes(item.title.toLowerCase()))
          .forEach((item) => children.push(new Paragraph({ text: `• ${item.title}` })));
      } else {
        const lines = decodeHtml(section.content_html || '');
        (lines.length ? lines : ['...']).forEach((text) => children.push(new Paragraph({ text })));
      }
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    const buffer = await Packer.toBuffer(new DocxDocument({ sections: [{ children }] }));
    return withCors(
      new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${safeFilename(document.title)}.docx"`,
          'Cache-Control': 'no-store',
        },
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  return GET(request, context);
}
