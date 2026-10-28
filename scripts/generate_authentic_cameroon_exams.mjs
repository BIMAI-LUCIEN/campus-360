import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PDFDocument, rgb, StandardFonts } = require('../mobile-api/node_modules/pdf-lib');
const pg = require('../mobile-api/node_modules/pg');
const { Pool } = pg;

fs.mkdirSync('public/annales', { recursive: true });

function sanitize(str) {
  if (!str) return '';
  return str
    .replace(/[λΛ]/g, 'lambda')
    .replace(/[ωΩ]/g, 'omega')
    .replace(/[θΘ]/g, 'theta')
    .replace(/[πΠ]/g, 'pi')
    .replace(/[αΑ]/g, 'alpha')
    .replace(/[βΒ]/g, 'beta')
    .replace(/[γΓ]/g, 'gamma')
    .replace(/[δΔ]/g, 'delta')
    .replace(/[εΕ]/g, 'epsilon')
    .replace(/[μΜ]/g, 'mu')
    .replace(/[σΣ]/g, 'sigma')
    .replace(/[φΦ]/g, 'phi')
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[≠]/g, '!=')
    .replace(/[≈]/g, '~=')
    .replace(/[∈]/g, 'dans')
    .replace(/[∉]/g, 'pas dans')
    .replace(/[∩]/g, 'inter')
    .replace(/[∪]/g, 'union')
    .replace(/[⊂]/g, 'inclus dans')
    .replace(/[→]/g, '->')
    .replace(/[↔]/g, '<->')
    .replace(/[⇒]/g, '=>')
    .replace(/[∫]/g, 'Integrale')
    .replace(/[∑]/g, 'Somme')
    .replace(/[√]/g, 'racine')
    .replace(/[∞]/g, 'infini')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, '-');
}

function wrapText(rawText, font, fontSize, maxWidth) {
  const text = sanitize(rawText);
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function buildExamPdf(exam) {
  const pdfDoc = await PDFDocument.create();
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  // Each exam has exactly 3 pages: page 1, page 2, page 3
  for (let pageNum = 1; pageNum <= 3; pageNum++) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // ── Header ──
    if (pageNum === 1) {
      // Official Bilateral Cameroon Header
      page.drawText('RÉPUBLIQUE DU CAMEROUN', { x: margin, y, size: 8, font: timesBold, color: rgb(0.1, 0.1, 0.1) });
      const enRep = 'REPUBLIC OF CAMEROON';
      page.drawText(enRep, { x: pageWidth - margin - timesBold.widthOfTextAtSize(enRep, 8), y, size: 8, font: timesBold, color: rgb(0.1, 0.1, 0.1) });

      y -= 10;
      page.drawText('Paix - Travail - Patrie', { x: margin + 10, y, size: 7.5, font: timesItalic, color: rgb(0.3, 0.3, 0.3) });
      const enMotto = 'Peace - Work - Fatherland';
      page.drawText(enMotto, { x: pageWidth - margin - timesItalic.widthOfTextAtSize(enMotto, 7.5) - 6, y, size: 7.5, font: timesItalic, color: rgb(0.3, 0.3, 0.3) });

      y -= 10;
      page.drawText('MINISTÈRE DE L’ENSEIGNEMENT SUPÉRIEUR', { x: margin, y, size: 7.5, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
      const enMinesup = 'MINISTRY OF HIGHER EDUCATION';
      page.drawText(enMinesup, { x: pageWidth - margin - helveticaBold.widthOfTextAtSize(enMinesup, 7.5), y, size: 7.5, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });

      y -= 11;
      const uniUpper = sanitize(exam.university.toUpperCase());
      page.drawText(uniUpper, { x: margin, y, size: 8, font: helveticaBold, color: rgb(0.12, 0.23, 0.53) });
      const facUpper = sanitize(exam.faculty.toUpperCase());
      page.drawText(facUpper, { x: pageWidth - margin - helveticaBold.widthOfTextAtSize(facUpper, 7.5), y, size: 7.5, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) });

      y -= 8;
      page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1.2, color: rgb(0.12, 0.23, 0.53) });
      y -= 18;

      // Title Banner Box
      page.drawRectangle({
        x: margin,
        y: y - 36,
        width: contentWidth,
        height: 48,
        color: rgb(0.95, 0.96, 0.98),
        borderColor: rgb(0.12, 0.23, 0.53),
        borderWidth: 1,
      });

      const examTypeTitle = exam.level === 'Concours' ? "CONCOURS OFFICIEL D'ENTRÉE DU SUPÉRIEUR" : "EXAMEN DE SESSION NORMALE (SN) - SUPÉRIEUR";
      page.drawText(examTypeTitle, {
        x: margin + (contentWidth - helveticaBold.widthOfTextAtSize(examTypeTitle, 10.5)) / 2,
        y: y - 10,
        size: 10.5,
        font: helveticaBold,
        color: rgb(0.12, 0.23, 0.53),
      });

      const subTitle = sanitize(`${exam.title} - Année ${exam.academic_year || '2023-2024'}`);
      page.drawText(subTitle, {
        x: margin + (contentWidth - timesBold.widthOfTextAtSize(subTitle, 8.5)) / 2,
        y: y - 24,
        size: 8.5,
        font: timesBold,
        color: rgb(0.15, 0.15, 0.15),
      });

      const metaLine = sanitize(`Épreuve : ${exam.subject}  |  Niveau : ${exam.level}  |  Durée : 3h00  |  Barème : 20 pts`);
      page.drawText(metaLine, {
        x: margin + (contentWidth - timesItalic.widthOfTextAtSize(metaLine, 7.5)) / 2,
        y: y - 34,
        size: 7.5,
        font: timesItalic,
        color: rgb(0.35, 0.35, 0.35),
      });

      y -= 48;

      // Instructions block
      page.drawText("CONSIGNES GÉNÉRALES : La clarté, la rigueur de la démarche et la précision du vocabulaire académique sont impératives.", {
        x: margin,
        y,
        size: 7.5,
        font: timesItalic,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 16;
    } else {
      // Pages 2 & 3 header
      page.drawText(sanitize(`${exam.title} — ${exam.university}`), {
        x: margin,
        y,
        size: 8,
        font: timesItalic,
        color: rgb(0.35, 0.35, 0.35),
      });
      const pageIndicator = `Page ${pageNum} / 3`;
      page.drawText(pageIndicator, {
        x: pageWidth - margin - timesBold.widthOfTextAtSize(pageIndicator, 8),
        y,
        size: 8,
        font: timesBold,
        color: rgb(0.12, 0.23, 0.53),
      });
      y -= 6;
      page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.6, color: rgb(0.7, 0.7, 0.7) });
      y -= 18;
    }

    // Render Page Content
    const pageData = exam.pages[pageNum - 1];
    if (pageData) {
      // Section Banner
      page.drawRectangle({
        x: margin,
        y: y - 18,
        width: contentWidth,
        height: 22,
        color: rgb(0.92, 0.94, 0.97),
      });
      const sectionHeader = sanitize(`${pageData.sectionTitle.toUpperCase()} (${pageData.points})`);
      page.drawText(sectionHeader, {
        x: margin + 8,
        y: y - 13,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.12, 0.23, 0.53),
      });
      y -= 28;

      // Section intro or context if present
      if (pageData.context) {
        const ctxLines = wrapText(pageData.context, timesItalic, 8.5, contentWidth);
        for (const cl of ctxLines) {
          page.drawText(cl, { x: margin, y, size: 8.5, font: timesItalic, color: rgb(0.25, 0.25, 0.25) });
          y -= 12;
        }
        y -= 4;
      }

      // Code or Table or Schema box if present on this page
      if (pageData.codeBlock) {
        const codeLines = pageData.codeBlock.split('\n');
        const boxHeight = codeLines.length * 11 + 10;
        page.drawRectangle({
          x: margin,
          y: y - boxHeight,
          width: contentWidth,
          height: boxHeight,
          color: rgb(0.97, 0.97, 0.98),
          borderColor: rgb(0.75, 0.75, 0.8),
          borderWidth: 0.8,
        });
        let codeY = y - 11;
        for (const cl of codeLines) {
          page.drawText(sanitize(cl), { x: margin + 10, y: codeY, size: 7.5, font: courier, color: rgb(0.1, 0.2, 0.3) });
          codeY -= 11;
        }
        y -= (boxHeight + 8);
      }

      // Table if present
      if (pageData.table) {
        const { headers, rows } = pageData.table;
        const colWidth = contentWidth / headers.length;
        const rowHeight = 15;
        // Table header
        page.drawRectangle({
          x: margin,
          y: y - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: rgb(0.88, 0.9, 0.95),
          borderColor: rgb(0.6, 0.65, 0.75),
          borderWidth: 0.5,
        });
        headers.forEach((h, ci) => {
          page.drawText(sanitize(h), { x: margin + ci * colWidth + 4, y: y - 11, size: 7.5, font: helveticaBold, color: rgb(0.1, 0.1, 0.2) });
        });
        y -= rowHeight;
        // Table rows
        for (const row of rows) {
          page.drawRectangle({
            x: margin,
            y: y - rowHeight,
            width: contentWidth,
            height: rowHeight,
            color: rgb(1, 1, 1),
            borderColor: rgb(0.8, 0.8, 0.85),
            borderWidth: 0.5,
          });
          row.forEach((cell, ci) => {
            page.drawText(sanitize(cell), { x: margin + ci * colWidth + 4, y: y - 11, size: 7, font: timesRoman, color: rgb(0.2, 0.2, 0.2) });
          });
          y -= rowHeight;
        }
        y -= 8;
      }

      // Questions
      for (const item of pageData.items) {
        if (y < margin + 35) break; // keep safety margin

        // Question Title / Lead
        if (item.lead) {
          const leadLines = wrapText(item.lead, timesBold, 8.5, contentWidth);
          for (const ll of leadLines) {
            page.drawText(ll, { x: margin, y, size: 8.5, font: timesBold, color: rgb(0.15, 0.15, 0.2) });
            y -= 12;
          }
        }

        // Sub-questions
        if (item.sub) {
          for (const sq of item.sub) {
            if (y < margin + 30) break;
            const sqLines = wrapText(sq, timesRoman, 8, contentWidth - 12);
            for (let idx = 0; idx < sqLines.length; idx++) {
              const indent = idx === 0 ? margin + 10 : margin + 18;
              page.drawText(sqLines[idx], { x: indent, y, size: 8, font: timesRoman, color: rgb(0.2, 0.2, 0.2) });
              y -= 11.5;
            }
            y -= 2;
          }
        }
        y -= 4;
      }
    }

    // ── Footer ──
    const footerText = `Campus 360  |  Banque Officielle d'Annales et Concours du Supérieur Camerounais  |  Page ${pageNum}/3`;
    page.drawText(footerText, {
      x: margin + (contentWidth - helvetica.widthOfTextAtSize(footerText, 7)) / 2,
      y: margin - 15,
      size: 7,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, pageCount: pdfDoc.getPageCount() };
}
