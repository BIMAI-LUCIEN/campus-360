import { NextRequest, NextResponse } from 'next/server';
// Puppeteer is intentionally a dynamic import: it pulls native Chromium
// bindings that must not be traced by webpack on Vercel. Combined with
// `serverExternalPackages: ['puppeteer']` in next.config.ts this avoids
// the `Module not found` webpack error during page data collection.

import { requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';
import { getDocumentById, getDocumentSections } from '@/lib/documents-db';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Expo-Origin, x-client-info, apikey, X-Requested-With',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return new NextResponse(null, { status: 204, headers });
}

type RouteContext = { params: Promise<{ id: string }> };

// Allowlist of tags we permit in section bodies. Anything else is stripped.
const SECTION_ALLOWED_TAGS = new Set([
  'P',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'BR',
  'H1',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'A',
  // Images embedded from the editor (base64 data: URIs — network is blocked by
  // the Puppeteer request interceptor, and javascript: srcs are stripped below).
  'IMG',
]);

// Allowlist of CSS font names. Anything outside this list falls back to
// 'Lora, serif' so a malicious cover_data entry cannot inject CSS rules.
const ALLOWED_FONTS = new Set([
  'Inter',
  'Lora',
  'Playfair Display',
  'Times New Roman',
  'Arial',
  'Georgia',
  'Helvetica',
]);

// Robust HTML-attribute / text escape. Used for everything we drop into HTML
// strings via interpolation (not for the section_html body which is
// separately sanitised below).
const escapeHtml = (value: unknown): string => {
  const str = value == null ? '' : String(value);
  return str.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
};

// Escape a URL for use in `href` or `src`. Allow only http(s), data:image,
// mailto, and relative paths; reject everything else.
const sanitizeUrl = (raw: unknown): string => {
  const str = typeof raw === 'string' ? raw.trim() : '';
  if (!str) return '';
  try {
    const u = new URL(str, 'https://placeholder.local/');
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return u.toString();
    }
    if (u.protocol === 'mailto:') {
      return u.toString();
    }
    return '';
  } catch {
    return '';
  }
};

// Strip every tag not in the allowlist and drop any leftover on* handlers /
// javascript: URLs. Returns a safe HTML fragment suitable for embedding inside
// a <div>.
const sanitizeSectionHtml = (raw: unknown): string => {
  const str = typeof raw === 'string' ? raw : '';
  let html = str;
  // Drop <script>, <style>, <iframe>, <object>, <embed> entirely (including content).
  html = html.replace(
    /<(script|style|iframe|object|embed|link|meta|base)\b[^>]*>[\s\S]*?<\/\1>/gi,
    '',
  );
  html = html.replace(/<(script|style|iframe|object|embed|link|meta|base)\b[^>]*\/?>/gi, '');
  // Filter tags.
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    return SECTION_ALLOWED_TAGS.has(String(tag).toUpperCase()) ? match : '';
  });
  // Strip event handlers and javascript: URLs from any remaining attributes.
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '');
  // Force external links to open safely.
  html = html.replace(/<a\s+([^>]*?)href=/gi, (match, attrs) => {
    if (/target\s*=/i.test(attrs)) return match;
    return `<a ${attrs} target="_blank" rel="noopener noreferrer" href=`;
  });
  return html.trim();
};

const renderCoverPage = (
  template: string,
  data: Record<string, unknown>,
): string => {
  // All values go through escapeHtml / sanitizeUrl.
  const safeData = {
    school: escapeHtml(data.school ?? "Nom de l'etablissement"),
    title: escapeHtml(data.title ?? 'Titre du document'),
    subtitle: escapeHtml(data.subtitle ?? 'Sujet ou thematique principale'),
    studentName: escapeHtml(data.studentName ?? 'Prenom Nom'),
    company: escapeHtml(data.company ?? "Entreprise d'accueil"),
    tutorCorporate: escapeHtml(data.tutorCorporate ?? 'Maitre de Stage'),
    tutorAcademic: escapeHtml(data.tutorAcademic ?? 'Tuteur Academique'),
    year: escapeHtml(data.year ?? '2025 - 2026'),
    logoUrl: sanitizeUrl(data.logoUrl),
  };

  if (template === 'minimalist') {
    return `
      <div class="cover-page cover-minimalist">
        <div class="top-meta">
          <div class="school">${safeData.school}</div>
          <div class="year">${safeData.year}</div>
        </div>
        <div class="middle-title">
          <div class="title">${safeData.title}</div>
          <div class="subtitle">${safeData.subtitle}</div>
        </div>
        <div class="bottom-details">
          <div class="left-col">
            <div class="label">Redige par</div>
            <div class="val">${safeData.studentName}</div>
          </div>
          <div class="right-col">
            <div class="label">Entreprise</div>
            <div class="val">${safeData.company}</div>
          </div>
        </div>
      </div>
    `;
  }

  if (template === 'tech') {
    return `
      <div class="cover-page cover-tech">
        <div class="tech-header">
          <div class="tech-indicator">DOCUMENT TECH</div>
          <div class="school">${safeData.school}</div>
        </div>
        <div class="tech-body">
          <h1 class="title">${safeData.title}</h1>
          <p class="subtitle">${safeData.subtitle}</p>
          <div class="meta-box">
            <div class="meta-row"><strong>Ecrit par :</strong> ${safeData.studentName}</div>
            <div class="meta-row"><strong>Firme :</strong> ${safeData.company}</div>
            <div class="meta-row"><strong>Superviseur :</strong> ${safeData.tutorCorporate}</div>
            <div class="meta-row"><strong>Encadreur :</strong> ${safeData.tutorAcademic}</div>
          </div>
        </div>
        <div class="tech-footer">
          <div>Session ${safeData.year}</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="cover-page cover-classic">
      <div class="school">${safeData.school}</div>
      ${
        safeData.logoUrl
          ? `<img class="logo" src="${escapeHtml(safeData.logoUrl)}" alt="Logo" />`
          : '<div class="logo-spacer"></div>'
      }
      <div class="title-container">
        <div class="title">${safeData.title}</div>
        <div class="subtitle">${safeData.subtitle}</div>
      </div>
      <div class="details">
        <div class="student-info">
          <strong>Presente par :</strong><br/>
          ${safeData.studentName}<br/>
          <em>Filiere / Niveau</em>
        </div>
        <div class="tutors-info">
          <strong>Sous l'encadrement de :</strong><br/>
          ${safeData.tutorCorporate} (Tuteur en Entreprise)<br/>
          ${safeData.tutorAcademic} (Tuteur Academique)
        </div>
      </div>
      <div class="footer-info">
        <strong>Entreprise d'accueil :</strong> ${safeData.company}<br/>
        Annee academique : ${safeData.year}
      </div>
    </div>
  `;
};

const safeFont = (raw: unknown) => {
  const str = typeof raw === 'string' ? raw.trim() : '';
  return ALLOWED_FONTS.has(str) ? str : 'Lora';
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    // PDF rendering launches a full Chromium process — very expensive. Hard cap.
    try {
      await enforceRateLimit(request, {
        bucket: 'document-pdf-export',
        max: 5,
        windowMs: 60_000,
        userId: access.user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return response;
      throw error;
    }

    const document = await getDocumentById(id, access.user.id);
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
    }

    const sections = await getDocumentSections(id);

    const coverHtml = renderCoverPage(document.cover_template, document.cover_data ?? {});

    let marginStyle = 'margin: 2.5cm 2.5cm 2.5cm 2.5cm;';
    if (document.margins === 'narrow') {
      marginStyle = 'margin: 1.5cm 1.5cm 1.5cm 1.5cm;';
    } else if (document.margins === 'wide') {
      marginStyle = 'margin: 3.0cm 3.0cm 3.0cm 3.0cm;';
    }

    // TOC: section titles get escapeHtml, never the raw value.
    const tocItems = sections
      .filter(
        (s) =>
          s.title.toLowerCase() !== 'page de garde' &&
          s.title.toLowerCase() !== 'sommaire',
      )
      .map(
        (s) =>
          `<div class="toc-row"><span>${escapeHtml(s.title)}</span><span class="dots"></span></div>`,
      )
      .join('');

    // Font must be allowlisted to avoid CSS injection.
    const fontFamily = safeFont(document.font_family);
    const lineSpacing = Number(document.line_spacing);
    const safeLineSpacing =
      Number.isFinite(lineSpacing) && lineSpacing >= 0.5 && lineSpacing <= 4.0
        ? String(lineSpacing)
        : '1.5';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: '${fontFamily === 'Times New Roman' ? 'Lora, serif' : fontFamily}', serif;
            line-height: ${safeLineSpacing};
            font-size: 12pt;
            color: #1A1A1A;
            margin: 0;
            padding: 0;
          }
          .cover-page { width: 100%; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; align-items: center; box-sizing: border-box; page-break-after: always; padding: 3cm; }
          .cover-classic { text-align: center; border: 2px solid #E2E8F0; }
          .cover-classic .school { font-size: 14pt; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; width: 100%; }
          .cover-classic .logo { max-height: 80px; margin: 40px auto; display: block; }
          .cover-classic .logo-spacer { height: 80px; margin: 40px auto; }
          .cover-classic .title-container { margin: 60px 0; }
          .cover-classic .title { font-size: 26pt; font-weight: 800; color: #1E293B; line-height: 1.2; margin-bottom: 15px; }
          .cover-classic .subtitle { font-size: 16pt; color: #64748B; font-style: italic; }
          .cover-classic .details { display: flex; justify-content: space-between; width: 100%; text-align: left; margin-top: 80px; font-size: 11pt; }
          .cover-classic .footer-info { font-size: 11pt; border-top: 1px solid #E2E8F0; padding-top: 20px; width: 100%; margin-top: auto; }
          .cover-minimalist { align-items: flex-start; text-align: left; padding: 4cm; }
          .cover-minimalist .top-meta { display: flex; justify-content: space-between; width: 100%; font-size: 10pt; text-transform: uppercase; color: #64748B; border-bottom: 1px solid #E2E8F0; padding-bottom: 15px; }
          .cover-minimalist .middle-title { margin: 150px 0; }
          .cover-minimalist .title { font-size: 32pt; font-weight: 800; color: #0F172A; margin-bottom: 20px; }
          .cover-minimalist .subtitle { font-size: 16pt; color: #475569; }
          .cover-minimalist .bottom-details { display: flex; gap: 80px; margin-top: auto; border-top: 1px solid #E2E8F0; padding-top: 30px; width: 100%; }
          .cover-minimalist .label { font-size: 9pt; text-transform: uppercase; color: #94A3B8; margin-bottom: 5px; }
          .cover-minimalist .val { font-size: 12pt; font-weight: 700; color: #1E293B; }
          .cover-tech { background-color: #0F172A; color: #F8FAFC; text-align: left; padding: 3cm; }
          .cover-tech .tech-header { display: flex; justify-content: space-between; width: 100%; border-bottom: 2px solid #38BDF8; padding-bottom: 20px; }
          .cover-tech .tech-indicator { background: #38BDF8; color: #0F172A; font-weight: 800; font-size: 9pt; padding: 4px 10px; border-radius: 4px; }
          .cover-tech .school { font-size: 11pt; font-weight: 700; color: #94A3B8; }
          .cover-tech .tech-body { margin: 100px 0; flex: 1; display: flex; flex-direction: column; justify-content: center; }
          .cover-tech .title { font-size: 30pt; font-weight: 800; color: #FFFFFF; line-height: 1.1; margin-bottom: 20px; }
          .cover-tech .subtitle { font-size: 15pt; color: #38BDF8; margin-bottom: 60px; }
          .cover-tech .meta-box { background: #1E293B; border-left: 4px solid #38BDF8; padding: 25px; border-radius: 4px; font-size: 11pt; width: 80%; }
          .cover-tech .meta-row { margin-bottom: 10px; color: #CBD5E1; }
          .cover-tech .meta-row strong { color: #FFFFFF; }
          .cover-tech .tech-footer { border-top: 1px solid #334155; padding-top: 20px; width: 100%; color: #64748B; font-size: 10pt; }
          .document-content { ${marginStyle} box-sizing: border-box; }
          .section-block { page-break-after: always; }
          .section-block:last-child { page-break-after: avoid; }
          h1 { page-break-before: always; font-size: 22pt; font-weight: 700; color: #0F172A; margin-top: 0; margin-bottom: 24px; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px; }
          h2 { font-size: 16pt; font-weight: 600; color: #1E293B; margin-top: 30px; margin-bottom: 16px; }
          p { margin-bottom: 16px; text-align: justify; }
          ul, ol { margin-bottom: 16px; padding-left: 24px; }
          li { margin-bottom: 8px; }
          strong { font-weight: 700; }
          .sommaire-block { page-break-after: always; }
          .toc-container { margin-top: 40px; }
          .toc-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; font-size: 12pt; }
          .toc-row span:first-child { background-color: #FFF; padding-right: 5px; z-index: 2; }
          .toc-row .dots { flex-grow: 1; border-bottom: 1px dotted #94A3B8; margin: 0 10px 4px 10px; z-index: 1; }
          @media print { .cover-page { height: 100vh !important; } }
        </style>
      </head>
      <body>
        ${coverHtml}
        <div class="document-content">
          ${sections
            .map((section) => {
              const lowerTitle = section.title.toLowerCase();
              if (lowerTitle === 'page de garde') return '';

              if (lowerTitle === 'sommaire') {
                return `
                  <div class="sommaire-block">
                    <h1>Sommaire</h1>
                    <div class="toc-container">${tocItems}</div>
                  </div>
                `;
              }

              const safeBody = section.content_html
                ? sanitizeSectionHtml(section.content_html)
                : `<p style="color: #94A3B8; font-style: italic;">Redigez le contenu de cette section...</p>`;

              return `
                <div class="section-block">
                  <h1>${escapeHtml(section.title)}</h1>
                  <div class="section-body">${safeBody}</div>
                </div>
              `;
            })
            .join('')}
        </div>
      </body>
      </html>
    `;

    console.log('[PDF Export] Launching Puppeteer', { documentId: id, userId: access.user.id });

    // Dynamic import — see top of file. Keeps puppeteer out of the webpack
    // bundle and lets Next.js resolve it at runtime on the serverless image.
    const { default: puppeteer } = await import('puppeteer');

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // Defence in depth: even if a malicious payload somehow executes
        // before our sanitiser runs, this prevents the page from making
        // network calls to anywhere except what's embedded.
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    try {
      const page = await browser.newPage();
      // Block network requests for anything we didn't embed — the only external
      // resource we want is the Google Fonts CSS, which is HTTPS-only.
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        // Always allow data: and about: requests.
        if (url.startsWith('data:') || url.startsWith('about:')) {
          req.continue();
          return;
        }
        try {
          const parsed = new URL(url);
          if (parsed.protocol === 'https:') {
            req.continue();
            return;
          }
        } catch {
          // Fall through to abort.
        }
        req.abort();
      });

      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size: 8px; width: 100%; text-align: right; padding-right: 30px; font-family: sans-serif; color: #94A3B8;">${escapeHtml(document.title)}</div>`,
        footerTemplate:
          '<div style="font-size: 8px; width: 100%; text-align: center; font-family: sans-serif; color: #94A3B8;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        margin: { top: '1.5cm', bottom: '1.5cm', left: '0px', right: '0px' },
      });

      const filename = `Document_${String(document.title || 'document')
        .replace(/[^\p{L}\p{N}_-]+/gu, '_')
        .slice(0, 80)}.pdf`;

      return new NextResponse(pdfBuffer as unknown as ArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch (error) {
    console.error('[PDF Export] Error:', error);
    if (error instanceof Error && /timeout|exited|launch/i.test(error.message)) {
      return NextResponse.json(
        { error: "Le moteur PDF est indisponible. Reessayez dans quelques instants." },
        { status: 503 },
      );
    }
    return mobileErrorResponse(error);
  }
}
