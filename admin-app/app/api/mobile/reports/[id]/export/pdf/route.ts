import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

import { requireMobileUser, mobileErrorResponse } from '@/lib/mobile-access';
import { getReportById, getReportSections } from '@/lib/reports-db';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

function renderCoverPage(template: string, data: Record<string, any>): string {
  const school = data.school || 'Nom de l\'Établissement';
  const title = data.title || 'Titre du Rapport de Stage';
  const subtitle = data.subtitle || 'Sujet ou thématique principale';
  const studentName = data.studentName || 'Prénom Nom';
  const company = data.company || 'Entreprise d\'Accueil';
  const tutorCorporate = data.tutorCorporate || 'Maitre de Stage';
  const tutorAcademic = data.tutorAcademic || 'Tuteur Académique';
  const year = data.year || '2025 - 2026';
  const logoUrl = data.logoUrl || '';

  if (template === 'minimalist') {
    return `
      <div class="cover-page cover-minimalist">
        <div class="top-meta">
          <div class="school">${school}</div>
          <div class="year">${year}</div>
        </div>
        <div class="middle-title">
          <div class="title">${title}</div>
          <div class="subtitle">${subtitle}</div>
        </div>
        <div class="bottom-details">
          <div class="left-col">
            <div class="label">Rédigé par</div>
            <div class="val">${studentName}</div>
          </div>
          <div class="right-col">
            <div class="label">Entreprise</div>
            <div class="val">${company}</div>
          </div>
        </div>
      </div>
    `;
  }

  if (template === 'tech') {
    return `
      <div class="cover-page cover-tech">
        <div class="tech-header">
          <div class="tech-indicator">RAPPORT TECH</div>
          <div class="school">${school}</div>
        </div>
        <div class="tech-body">
          <h1 class="title">${title}</h1>
          <p class="subtitle">${subtitle}</p>
          <div class="meta-box">
            <div class="meta-row"><strong>Écrit par :</strong> ${studentName}</div>
            <div class="meta-row"><strong>Firme :</strong> ${company}</div>
            <div class="meta-row"><strong>Superviseur :</strong> ${tutorCorporate}</div>
            <div class="meta-row"><strong>Encadreur :</strong> ${tutorAcademic}</div>
          </div>
        </div>
        <div class="tech-footer">
          <div>Session ${year}</div>
        </div>
      </div>
    `;
  }

  // Classic template (Default)
  return `
    <div class="cover-page cover-classic">
      <div class="school">${school}</div>
      ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Logo" />` : '<div class="logo-spacer"></div>'}
      <div class="title-container">
        <div class="title">${title}</div>
        <div class="subtitle">${subtitle}</div>
      </div>
      <div class="details">
        <div class="student-info">
          <strong>Présenté par :</strong><br/>
          ${studentName}<br/>
          <em>Filière / Niveau</em>
        </div>
        <div class="tutors-info">
          <strong>Sous l'encadrement de :</strong><br/>
          ${tutorCorporate} (Tuteur en Entreprise)<br/>
          ${tutorAcademic} (Tuteur Académique)
        </div>
      </div>
      <div class="footer-info">
        <strong>Entreprise d'accueil :</strong> ${company}<br/>
        Année académique : ${year}
      </div>
    </div>
  `;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const report = await getReportById(id, access.user.id);
    if (!report) {
      return NextResponse.json({ error: 'Rapport introuvable.' }, { status: 404 });
    }

    const sections = await getReportSections(id);

    // Assemble HTML
    const coverHtml = renderCoverPage(report.cover_template, report.cover_data);

    // Map margin size
    let marginStyle = 'margin: 2.5cm 2.5cm 2.5cm 2.5cm;'; // normal
    if (report.margins === 'narrow') {
      marginStyle = 'margin: 1.5cm 1.5cm 1.5cm 1.5cm;';
    } else if (report.margins === 'wide') {
      marginStyle = 'margin: 3.0cm 3.0cm 3.0cm 3.0cm;';
    }

    // Dynamic TOC (Table of Contents)
    const tocItems = sections
      .filter((s) => s.title.toLowerCase() !== 'page de garde' && s.title.toLowerCase() !== 'sommaire')
      .map((s) => `<div class="toc-row"><span>${s.title}</span><span class="dots"></span></div>`)
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,700;1,400&display=swap');
          
          body {
            font-family: '${report.font_family === 'Times New Roman' ? 'Lora, serif' : report.font_family}', serif;
            line-height: ${report.line_spacing};
            font-size: 12pt;
            color: #1A1A1A;
            margin: 0;
            padding: 0;
          }
          
          .cover-page {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            box-sizing: border-box;
            page-break-after: always;
            padding: 3cm;
          }
          
          /* Classic cover */
          .cover-classic {
            text-align: center;
            border: 2px solid #E2E8F0;
          }
          .cover-classic .school { font-size: 14pt; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; width: 100%; }
          .cover-classic .logo { max-height: 80px; margin: 40px auto; display: block; }
          .cover-classic .logo-spacer { height: 80px; margin: 40px auto; }
          .cover-classic .title-container { margin: 60px 0; }
          .cover-classic .title { font-size: 26pt; font-weight: 800; color: #1E293B; line-height: 1.2; margin-bottom: 15px; }
          .cover-classic .subtitle { font-size: 16pt; color: #64748B; font-style: italic; }
          .cover-classic .details { display: flex; justify-content: space-between; width: 100%; text-align: left; margin-top: 80px; font-size: 11pt; }
          .cover-classic .footer-info { font-size: 11pt; border-top: 1px solid #E2E8F0; padding-top: 20px; width: 100%; margin-top: auto; }

          /* Minimalist cover */
          .cover-minimalist {
            align-items: flex-start;
            text-align: left;
            padding: 4cm;
          }
          .cover-minimalist .top-meta { display: flex; justify-content: space-between; width: 100%; font-size: 10pt; text-transform: uppercase; color: #64748B; border-bottom: 1px solid #E2E8F0; padding-bottom: 15px; }
          .cover-minimalist .middle-title { margin: 150px 0; }
          .cover-minimalist .title { font-size: 32pt; font-weight: 800; color: #0F172A; margin-bottom: 20px; }
          .cover-minimalist .subtitle { font-size: 16pt; color: #475569; }
          .cover-minimalist .bottom-details { display: flex; gap: 80px; margin-top: auto; border-top: 1px solid #E2E8F0; padding-top: 30px; width: 100%; }
          .cover-minimalist .label { font-size: 9pt; text-transform: uppercase; color: #94A3B8; margin-bottom: 5px; }
          .cover-minimalist .val { font-size: 12pt; font-weight: 700; color: #1E293B; }

          /* Tech cover */
          .cover-tech {
            background-color: #0F172A;
            color: #F8FAFC;
            text-align: left;
            padding: 3cm;
          }
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

          /* Document Body Styles */
          .document-content {
            ${marginStyle}
            box-sizing: border-box;
          }
          
          .section-block {
            page-break-after: always;
          }
          
          .section-block:last-child {
            page-break-after: avoid;
          }
          
          h1 {
            page-break-before: always;
            font-size: 22pt;
            font-weight: 700;
            color: #0F172A;
            margin-top: 0;
            margin-bottom: 24px;
            border-bottom: 1px solid #E2E8F0;
            padding-bottom: 12px;
          }
          
          h2 {
            font-size: 16pt;
            font-weight: 600;
            color: #1E293B;
            margin-top: 30px;
            margin-bottom: 16px;
          }
          
          p {
            margin-bottom: 16px;
            text-align: justify;
          }
          
          ul, ol {
            margin-bottom: 16px;
            padding-left: 24px;
          }
          
          li {
            margin-bottom: 8px;
          }
          
          strong {
            font-weight: 700;
          }
          
          /* Sommaire khusus */
          .sommaire-block {
            page-break-after: always;
          }
          .toc-container {
            margin-top: 40px;
          }
          .toc-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 15px;
            font-size: 12pt;
          }
          .toc-row span:first-child {
            background-color: #FFF;
            padding-right: 5px;
            z-index: 2;
          }
          .toc-row .dots {
            flex-grow: 1;
            border-bottom: 1px dotted #94A3B8;
            margin: 0 10px 4px 10px;
            z-index: 1;
          }
          
          @media print {
            .cover-page {
              height: 100vh !important;
            }
          }
        </style>
      </head>
      <body>
        <!-- 1. Cover Page -->
        ${coverHtml}
        
        <!-- 2. Content -->
        <div class="document-content">
          ${sections.map((section) => {
            const lowerTitle = section.title.toLowerCase();
            if (lowerTitle === 'page de garde') return '';
            
            if (lowerTitle === 'sommaire') {
              return `
                <div class="sommaire-block">
                  <h1>Sommaire</h1>
                  <div class="toc-container">
                    ${tocItems}
                  </div>
                </div>
              `;
            }
            
            return `
              <div class="section-block">
                <h1>${section.title}</h1>
                <div class="section-body">
                  ${section.content_html || `<p style="color: #94A3B8; font-style: italic;">Rédigez le contenu de cette section...</p>`}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </body>
      </html>
    `;

    // 2. Launch Puppeteer
    console.log(`[PDF Export] Launching Puppeteer for report "${report.title}"...`);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any });

    // 3. Print PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size: 8px; width: 100%; text-align: right; padding-right: 30px; font-family: sans-serif; color: #94A3B8;">${report.title}</div>`,
      footerTemplate: `<div style="font-size: 8px; width: 100%; text-align: center; font-family: sans-serif; color: #94A3B8;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
      margin: {
        top: '1.5cm',
        bottom: '1.5cm',
        left: '0px',
        right: '0px', // We handled margins in css class '.document-content' so cover page is perfectly fullscreen!
      },
    });

    await browser.close();

    // 4. Return PDF
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rapport_Stage_${report.title.replace(/\s+/g, '_')}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('[PDF Export] Error:', error);
    return NextResponse.json({ error: `Erreur d'exportation PDF : ${error.message}` }, { status: 500 });
  }
}
