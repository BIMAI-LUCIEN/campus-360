import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

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

const escapeHtml = (value: unknown): string => {
  const str = value == null ? '' : String(value);
  return str.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
};

const findSystemChromium = (): string | undefined => {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return undefined;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null },
      response: null,
    }));
    const user = access?.user ?? { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null };

    try {
      await enforceRateLimit(request, {
        bucket: 'document-pdf-export',
        max: 20,
        windowMs: 60_000,
        userId: user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

    const document = await getDocumentById(id, user.id);
    if (!document) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const sections = await getDocumentSections(id);
    const cd = document.cover_data || {};

    const coverHtml = `
      <div class="cover-page">
        <div class="header-box">
          <div class="school">${escapeHtml(cd.school || 'CAMPUS 360 - ÉTABLISSEMENT UNIVERSITAIRE')}</div>
          <div class="academic-year">ANNÉE ACADÉMIQUE : ${escapeHtml(cd.year || '2025 - 2026')}</div>
        </div>
        <div class="title-box">
          <h1 class="main-title">${escapeHtml(document.title || 'RAPPORT DE STAGE')}</h1>
          ${cd.subtitle ? `<p class="subtitle">${escapeHtml(cd.subtitle)}</p>` : ''}
        </div>
        <div class="meta-box">
          <div class="meta-item"><strong>Étudiant :</strong> ${escapeHtml(cd.studentName || 'Étudiant Campus 360')}</div>
          <div class="meta-item"><strong>Entreprise d'accueil :</strong> ${escapeHtml(cd.company || 'Campus 360 Inc.')}</div>
          <div class="meta-item"><strong>Maître de Stage :</strong> ${escapeHtml(cd.tutorCorporate || 'Superviseur Entreprise')}</div>
          <div class="meta-item"><strong>Tuteur Académique :</strong> ${escapeHtml(cd.tutorAcademic || 'Encadreur Universitaire')}</div>
        </div>
        <div class="footer-box">Document académique officiel généré via Campus 360</div>
      </div>
    `;

    const sectionsHtml = sections
      .map((s) => {
        if (s.title.toLowerCase() === 'page de garde') return '';
        return `
          <div class="section-page">
            <h2 class="section-title">${escapeHtml(s.title)}</h2>
            <div class="section-content">${s.content_html || '<p>Contenu en cours de rédaction...</p>'}</div>
          </div>
        `;
      })
      .join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 1.8cm 2cm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1E293B; margin: 0; padding: 0; font-size: 11pt; }
          .cover-page { height: 92vh; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; box-sizing: border-box; }
          .header-box { background: #0F172A; color: #F8FAFC; padding: 25px 30px; border-radius: 8px; }
          .school { font-size: 15pt; font-weight: 800; color: #38BDF8; letter-spacing: 0.5px; }
          .academic-year { font-size: 9.5pt; color: #94A3B8; margin-top: 6px; }
          .title-box { margin: 60px 0; text-align: left; }
          .main-title { font-size: 24pt; font-weight: 800; color: #0F172A; line-height: 1.2; margin-bottom: 12px; }
          .subtitle { font-size: 13pt; color: #64748B; font-style: italic; }
          .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #38BDF8; padding: 22px 26px; border-radius: 6px; margin-bottom: 40px; }
          .meta-item { margin-bottom: 8px; font-size: 10.5pt; color: #334155; }
          .meta-item strong { color: #0F172A; font-weight: 700; }
          .footer-box { font-size: 9pt; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 15px; }
          .section-page { page-break-before: always; padding-top: 10px; }
          .section-title { font-size: 17pt; font-weight: 700; color: #0F172A; border-bottom: 2px solid #38BDF8; padding-bottom: 10px; margin-bottom: 24px; }
          .section-content { font-size: 11pt; color: #334155; text-align: justify; }
          .section-content p { margin-bottom: 14px; line-height: 1.65; }
          .section-content h2, .section-content h3 { color: #1E293B; margin-top: 22px; margin-bottom: 10px; }
          .section-content ul, .section-content ol { margin-bottom: 14px; padding-left: 24px; }
          .section-content li { margin-bottom: 6px; }
          .section-content strong { color: #0F172A; }
        </style>
      </head>
      <body>
        ${coverHtml}
        ${sectionsHtml}
      </body>
      </html>
    `;

    let pdfBuffer: Buffer | null = null;
    const chromiumBin = findSystemChromium();

    if (chromiumBin) {
      const tmpHtmlPath = path.join(os.tmpdir(), `doc_${id}_${Date.now()}.html`);
      const tmpPdfPath = path.join(os.tmpdir(), `doc_${id}_${Date.now()}.pdf`);

      try {
        fs.writeFileSync(tmpHtmlPath, fullHtml, 'utf8');
        const fileUrl = `file:///${tmpHtmlPath.replace(/\\/g, '/')}`;
        const cmd = `"${chromiumBin}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${tmpPdfPath}" "${fileUrl}"`;
        execSync(cmd, { timeout: 25000, stdio: 'pipe' });

        if (fs.existsSync(tmpPdfPath)) {
          pdfBuffer = fs.readFileSync(tmpPdfPath);
        }
      } catch (cliErr) {
        console.warn('[PDF Export] CLI Chromium error:', cliErr);
      } finally {
        try {
          if (fs.existsSync(tmpHtmlPath)) fs.unlinkSync(tmpHtmlPath);
        } catch {}
        try {
          if (fs.existsSync(tmpPdfPath)) fs.unlinkSync(tmpPdfPath);
        } catch {}
      }
    }

    // Try Puppeteer if CLI wasn't available
    if (!pdfBuffer) {
      try {
        const puppeteer = (await import('puppeteer')).default;
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        try {
          const page = await browser.newPage();
          await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' });
          const buffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '1.5cm', bottom: '1.5cm', left: '1.5cm', right: '1.5cm' },
          });
          pdfBuffer = Buffer.from(buffer);
        } finally {
          await browser.close().catch(() => {});
        }
      } catch (pupErr) {
        console.warn('[PDF Export] Puppeteer error:', pupErr);
      }
    }

    console.log('[PDF Export] Generated PDF bytes:', pdfBuffer.length);

    const filename = `Document_${String(document.title || 'document')
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .slice(0, 80)}.pdf`;

    const res = new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
    return withCors(res as any, request);
  } catch (error) {
    console.error('[PDF Export] Global Error:', error);
    return withCors(mobileErrorResponse(error, request), request);
  }
}
