import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

import { requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';
import { getDocumentById, getDocumentSections } from '@/lib/documents-db';
import { getDocumentExportPolicy } from '@/lib/document-export-policy';
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
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
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
    const rawParams = context?.params;
    const resolvedParams = rawParams instanceof Promise ? await rawParams : rawParams;
    const id = resolvedParams?.id || '';

    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

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
      console.warn('[PDF Export] Rate limit check bypassed:', error);
    }

    const document = await getDocumentById(id, user.id);
    if (!document) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const exportPolicy = await getDocumentExportPolicy(user.id);
    if (!exportPolicy.canExportPdf) {
      return withCors(
        NextResponse.json(
          { error: 'Un abonnement Basic ou Premium est requis pour exporter en PDF.', code: 'SUBSCRIPTION_REQUIRED' },
          { status: 403 },
        ),
        request,
      );
    }

    const watermarkHtml = exportPolicy.pdfRequiresWatermark
      ? `<div class="subscription-watermark">Campus 360 - Version Basic - ${escapeHtml(user.email)}</div>`
      : '';

    const rawSections = await getDocumentSections(id);
    const cd = document.cover_data || {};

    const studentName = cd.studentName || 'Lucien Nkouam';
    const studentMatricule = cd.matricule || '22GL049';
    const studentSpecialty = cd.specialty || 'Master 2 - Génie Logiciel & Systèmes d\'Information';
    const schoolName = cd.school || 'ÉCOLE NATIONALE SUPÉRIEURE POLYTECHNIQUE';
    const universityName = cd.university || 'UNIVERSITÉ DE YAOUNDÉ I';
    const facultyName = cd.faculty || 'DÉPARTEMENT DE GÉNIE INFORMATIQUE ET TÉLÉCOMMUNICATIONS';
    const companyName = cd.company || 'Campus 360 Inc. (Division R&D)';
    const tutorCorporate = cd.tutorCorporate || 'M. Lucien Nkouam (Lead Architecte Logiciel)';
    const tutorAcademic = cd.tutorAcademic || 'Dr. / Pr. Encadreur Universitaire';
    const academicYear = cd.year || '2025 - 2026';
    const docTitle = document.title || 'RAPPORT DE STAGE ACADÉMIQUE DE FIN D\'ÉTUDES';
    const docSubtitle = cd.subtitle || 'Conception et Déploiement d\'une Plateforme Mobile Sécurisée avec IA Générative';

    // 1. Official Academic Cover Page
    const coverHtml = `
      <div class="page cover-page">
        <div class="national-header">
          <div class="nat-col">
            <strong>RÉPUBLIQUE DU CAMEROUN</strong><br>
            <span class="sub-nat">Paix - Travail - Patrie</span><br>
            <span class="sep-line">---------</span><br>
            <strong>MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR</strong><br>
            <span class="univ-nat">${escapeHtml(universityName)}</span><br>
            <span class="school-nat">${escapeHtml(schoolName)}</span><br>
            <span class="fac-nat">${escapeHtml(facultyName)}</span>
          </div>
          <div class="logo-col">
            <div class="academic-crest">
              <svg width="70" height="70" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="#F8FAFC" stroke="#0F172A" stroke-width="2.5"/>
                <polygon points="50,15 80,75 20,75" fill="#0284C7" fill-opacity="0.2" stroke="#0284C7" stroke-width="2"/>
                <circle cx="50" cy="45" r="14" fill="#0F172A"/>
                <path d="M 30 75 Q 50 60 70 75" fill="none" stroke="#0284C7" stroke-width="3"/>
                <text x="50" y="90" font-family="'Segoe UI', Arial" font-size="9" font-weight="bold" fill="#0F172A" text-anchor="middle">CAMPUS 360</text>
              </svg>
            </div>
          </div>
          <div class="nat-col">
            <strong>REPUBLIC OF CAMEROON</strong><br>
            <span class="sub-nat">Peace - Work - Fatherland</span><br>
            <span class="sep-line">---------</span><br>
            <strong>MINISTRY OF HIGHER EDUCATION</strong><br>
            <span class="univ-nat">${escapeHtml(universityName)}</span><br>
            <span class="school-nat">${escapeHtml(schoolName)}</span><br>
            <span class="fac-nat">${escapeHtml(facultyName)}</span>
          </div>
        </div>

        <div class="title-frame">
          <div class="doc-badge">RAPPORT DE STAGE ACADÉMIQUE DE FIN D'ÉTUDES</div>
          <div class="diploma-goal">En vue de l'obtention du Diplôme de Master Professionnel en Génie Logiciel</div>
          <div class="theme-label">THÈME :</div>
          <h1 class="theme-title">${escapeHtml(docTitle)}</h1>
          ${docSubtitle ? `<div class="theme-subtitle">${escapeHtml(docSubtitle)}</div>` : ''}
          <div class="stage-place">Effectué du 1er Mars au 31 Août 2026 à : <strong>${escapeHtml(companyName)}</strong></div>
        </div>

        <div class="supervision-grid">
          <div class="sup-col">
            <div class="sup-heading">RÉDIGÉ ET PRÉSENTÉ PAR :</div>
            <div class="sup-name">${escapeHtml(studentName)}</div>
            <div class="sup-details">
              <strong>Matricule :</strong> ${escapeHtml(studentMatricule)}<br>
              <strong>Filière :</strong> ${escapeHtml(studentSpecialty)}<br>
              <strong>Promotion :</strong> 2025 / 2026
            </div>
          </div>
          <div class="sup-col">
            <div class="sup-heading">SOUS L'ENCADREMENT DE :</div>
            <div class="sup-item">
              <span class="sup-role">Encadreur Professionnel :</span><br>
              <strong>${escapeHtml(tutorCorporate)}</strong>
            </div>
            <div class="sup-item" style="margin-top: 8px;">
              <span class="sup-role">Encadreur Académique :</span><br>
              <strong>${escapeHtml(tutorAcademic)}</strong>
            </div>
          </div>
        </div>

        <div class="academic-year-bar">
          <strong>ANNÉE ACADÉMIQUE : ${escapeHtml(academicYear)}</strong>
        </div>
      </div>
    `;

    // 2. Build Dynamic Table of Contents (Sommaire)
    const contentSections = rawSections.filter((s) => s.title.toLowerCase() !== 'page de garde');
    
    // Build TOC Items with page estimates
    let runningPage = 2;
    const tocItems: Array<{ title: string; page: number; isChapter: boolean }> = [];

    contentSections.forEach((s) => {
      const isChapter = s.title.toLowerCase().startsWith('chapitre') || s.title.toLowerCase().startsWith('conclusion') || s.title.toLowerCase().startsWith('bibliographie');
      tocItems.push({
        title: s.title,
        page: runningPage,
        isChapter,
      });
      runningPage += (s.content_html && s.content_html.length > 2500) ? 2 : 1;
    });

    const dynamicTocHtml = `
      <div class="page preliminary-page">
        <h2 class="prelim-title">SOMMAIRE / TABLE DES MATIÈRES</h2>
        <div class="toc-container">
          ${tocItems
            .map(
              (item) => `
                <div class="toc-line ${item.isChapter ? 'toc-chapter' : ''}">
                  <span class="toc-title">${escapeHtml(item.title)}</span>
                  <span class="toc-dots"></span>
                  <span class="toc-num">${item.page}</span>
                </div>
              `,
            )
            .join('')}
        </div>
      </div>
    `;

    // 3. Render all sections with academic formatting
    const sectionsHtml = contentSections
      .map((s) => {
        const lower = s.title.toLowerCase();
        if (lower === 'sommaire') {
          return dynamicTocHtml;
        }

        const isPrelim = lower.includes('fiche') || lower.includes('dédicace') || lower.includes('remerciement') || lower.includes('abréviation') || lower.includes('liste des figures');
        
        return `
          <div class="page ${isPrelim ? 'preliminary-page' : 'body-page'}">
            <h2 class="academic-section-heading">${escapeHtml(s.title)}</h2>
            <div class="academic-body-content">
              ${s.content_html || '<p>Contenu en cours de rédaction académique...</p>'}
            </div>
          </div>
        `;
      })
      .join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(docTitle)}</title>
        <style>
          @page {
            size: A4;
            margin: 2cm 2.2cm 2cm 2.2cm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Times New Roman', 'Cambria', 'Segoe UI', serif;
            line-height: 1.5;
            color: #0F172A;
            margin: 0;
            padding: 0;
            font-size: 11.5pt;
            background: #FFFFFF;
          }
          
          /* Page Structure */
          .page {
            page-break-after: always;
            box-sizing: border-box;
            position: relative;
          }

          /* Cover Page Styling */
          .cover-page {
            height: 94vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
            border: 3px double #0F172A;
            padding: 24px 20px;
          }
          .national-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 7pt;
            line-height: 1.25;
            border-bottom: 1.5px solid #0F172A;
            padding-bottom: 12px;
          }
          .nat-col { width: 38%; }
          .logo-col { width: 24%; display: flex; justify-content: center; align-items: center; }
          .sub-nat { font-style: italic; font-size: 6.5pt; color: #475569; }
          .sep-line { color: #94A3B8; }
          .univ-nat { font-weight: bold; color: #0284C7; font-size: 7.5pt; }
          .school-nat { font-weight: bold; color: #0F172A; font-size: 7pt; }
          .fac-nat { font-size: 6.5pt; color: #334155; }

          .title-frame {
            margin: 20px 0;
            padding: 18px 14px;
            border: 2px solid #0284C7;
            background: #F8FAFC;
            border-radius: 4px;
          }
          .doc-badge {
            font-size: 11pt;
            font-weight: 800;
            color: #0284C7;
            letter-spacing: 1px;
            margin-bottom: 6px;
          }
          .diploma-goal {
            font-size: 9pt;
            font-style: italic;
            color: #475569;
            margin-bottom: 14px;
          }
          .theme-label {
            font-size: 10pt;
            font-weight: bold;
            color: #0F172A;
            letter-spacing: 0.5px;
          }
          .theme-title {
            font-size: 16pt;
            font-weight: 900;
            color: #0F172A;
            line-height: 1.25;
            margin: 8px 0;
            text-transform: uppercase;
          }
          .theme-subtitle {
            font-size: 11pt;
            font-style: italic;
            color: #0369A1;
            margin-bottom: 10px;
          }
          .stage-place {
            font-size: 9.5pt;
            color: #334155;
            margin-top: 10px;
            border-top: 1px dashed #CBD5E1;
            padding-top: 8px;
          }

          .supervision-grid {
            display: flex;
            justify-content: space-between;
            text-align: left;
            margin-top: 15px;
            border-top: 1.5px solid #0F172A;
            padding-top: 14px;
          }
          .sup-col { width: 48%; font-size: 9pt; line-height: 1.4; }
          .sup-heading { font-weight: bold; font-size: 8.5pt; color: #0284C7; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 6px; }
          .sup-name { font-size: 11pt; font-weight: bold; color: #0F172A; }
          .sup-details { font-size: 8.5pt; color: #334155; margin-top: 4px; }
          .sup-role { font-size: 8pt; color: #64748B; font-style: italic; }

          .academic-year-bar {
            border-top: 1.5px solid #0F172A;
            padding-top: 8px;
            font-size: 9.5pt;
            color: #0F172A;
          }

          /* Preliminary Pages & Body Pages */
          .prelim-title, .academic-section-heading {
            font-size: 15pt;
            font-weight: bold;
            color: #0F172A;
            border-bottom: 2px solid #0284C7;
            padding-bottom: 8px;
            margin-top: 0;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .academic-body-content {
            font-size: 11.5pt;
            line-height: 1.6;
            color: #1E293B;
            text-align: justify;
            text-justify: inter-word;
          }
          .academic-body-content p {
            margin-bottom: 12px;
            text-indent: 1.5em;
          }
          .academic-body-content h2 {
            font-size: 13pt;
            font-weight: bold;
            color: #0369A1;
            margin-top: 22px;
            margin-bottom: 8px;
            border-left: 3px solid #0284C7;
            padding-left: 10px;
          }
          .academic-body-content h3 {
            font-size: 12pt;
            font-weight: bold;
            color: #0F172A;
            margin-top: 16px;
            margin-bottom: 6px;
          }
          .academic-body-content ul, .academic-body-content ol {
            margin-bottom: 12px;
            padding-left: 28px;
          }
          .academic-body-content li {
            margin-bottom: 6px;
          }

          /* Table of Contents */
          .toc-container { margin-top: 15px; }
          .toc-line {
            display: flex;
            align-items: baseline;
            margin-bottom: 8px;
            font-size: 10.5pt;
          }
          .toc-chapter {
            font-weight: bold;
            margin-top: 12px;
            font-size: 11pt;
            color: #0F172A;
          }
          .toc-title { white-space: nowrap; }
          .toc-dots {
            flex-grow: 1;
            border-bottom: 1px dotted #94A3B8;
            margin: 0 8px;
            position: relative;
            top: -3px;
          }
          .toc-num { font-weight: bold; color: #0284C7; }

          /* Figures & Tables */
          .figure-container {
            margin: 22px 0;
            text-align: center;
            page-break-inside: avoid;
          }
          table {
            page-break-inside: avoid;
          }
          blockquote {
            margin: 16px 0;
            padding: 10px 18px;
            background: #F8FAFC;
            border-left: 4px solid #0284C7;
            font-style: italic;
            color: #334155;
          }
          .subscription-watermark {
            position: fixed;
            top: 46%;
            left: 8%;
            width: 84%;
            transform: rotate(-32deg);
            color: rgba(15, 23, 42, 0.12);
            font-size: 34pt;
            font-weight: 800;
            text-align: center;
            z-index: 9999;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        ${watermarkHtml}
        ${coverHtml}
        ${sectionsHtml}
      </body>
      </html>
    `;

    let pdfBuffer: Buffer | null = null;
    const chromiumBin = findSystemChromium();

    if (chromiumBin) {
      const tmpHtmlPath = path.join(os.tmpdir(), `academic_doc_${id}_${Date.now()}.html`);
      const tmpPdfPath = path.join(os.tmpdir(), `academic_doc_${id}_${Date.now()}.pdf`);
      const userProfileDir = path.join(os.tmpdir(), `chrome_pdf_prof_${id}_${Date.now()}`);

      try {
        fs.mkdirSync(userProfileDir, { recursive: true });
        fs.writeFileSync(tmpHtmlPath, fullHtml, 'utf8');
        const cmd = `"${chromiumBin}" --headless --disable-gpu --no-sandbox --disable-software-rasterizer --user-data-dir="${userProfileDir}" --no-pdf-header-footer --print-to-pdf="${tmpPdfPath}" "${tmpHtmlPath}"`;
        execSync(cmd, { timeout: 35000, stdio: 'pipe' });

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
        try {
          if (fs.existsSync(userProfileDir)) fs.rmSync(userProfileDir, { recursive: true, force: true });
        } catch {}
      }
    }

    if (!pdfBuffer) {
      throw new Error('Moteur de génération PDF indisponible.');
    }

    console.log('[PDF Export] Generated High-Fidelity Academic PDF bytes:', pdfBuffer.length);

    const filename = `Rapport_de_Stage_${String(document.title || 'Stage')
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .slice(0, 80)}.pdf`;

    const res = new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
    return withCors(res, request);
  } catch (error: any) {
    console.error('[PDF Export] Global Error:', error?.stack || error);
    return withCors(
      NextResponse.json(
        { error: error?.message || 'Erreur lors de la génération PDF.' },
        { status: 500 },
      ),
      request,
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  return GET(request, context);
}
