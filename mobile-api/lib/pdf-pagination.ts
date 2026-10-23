import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';

// Second half of the PDF pipeline: find on which page each invisible marker
// landed, then stamp page numbers, headers, footers and borders with pdf-lib.

// ── Marker pages (pdfjs) ────────────────────────────────────────────────────

export const findMarkerPages = async (pdf: Buffer): Promise<{ pages: Map<string, number>; pageCount: number }> => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
  const pages = new Map<string, number>();
  try {
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      // Letter-spaced titles split glyphs with spaces: compare without whitespace.
      const text = content.items.map((item) => ('str' in item ? item.str : '')).join('').replace(/\s+/g, '');
      for (const match of text.matchAll(/MKR\d+Q/g)) {
        if (!pages.has(match[0])) pages.set(match[0], n - 1);
      }
      page.cleanup();
    }
    return { pages, pageCount: doc.numPages };
  } finally {
    await doc.destroy();
  }
};

// ── Stamping (pdf-lib) ──────────────────────────────────────────────────────

export type PageStamp = {
  header?: { left?: string; right?: string };
  footer?: { left?: string; center?: string; right?: string };
  border?: 'none' | 'single' | 'double';
  headerRule?: boolean;
  logo?: boolean;
  // Module 24: coloured band across the top (replaces the header texts), line
  // above the footer, frame around the page number (in the footer slot `numberSlot`).
  band?: { color: string; textColor: string; text: string };
  footerRule?: boolean;
  numberFrame?: boolean;
  numberSlot?: 'left' | 'center' | 'right';
  // The left footer slot gets two thirds of the width (author label + name).
  wideFooterLeft?: boolean;
  // Start of the left footer text printed in bold ("Rédigé et présenté par :").
  footerBoldPrefix?: string;
  bandBorder?: string; // #RRGGBB
};

export type StampOptions = {
  marginPt: number;
  serif: boolean;
  accentColor: string; // #RRGGBB
  logo?: { data: Buffer; mime: string } | null;
};

const toRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

// Standard PDF fonts only cover WinAnsi; anything else is replaced, never thrown.
const safeText = (font: PDFFont, text: string) => {
  try {
    font.encodeText(text);
    return text;
  } catch {
    return Array.from(text)
      .map((ch) => {
        try {
          font.encodeText(ch);
          return ch;
        } catch {
          return '?';
        }
      })
      .join('');
  }
};

const fit = (font: PDFFont, text: string, size: number, maxWidth: number) => {
  let value = safeText(font, text.trim());
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  while (value.length > 1 && font.widthOfTextAtSize(`${value}…`, size) > maxWidth) value = value.slice(0, -1);
  return `${value.trimEnd()}…`;
};

const drawBorder = (page: PDFPage, kind: 'single' | 'double', inset: number, color: ReturnType<typeof rgb>) => {
  const { width, height } = page.getSize();
  const rect = (d: number, thickness: number) =>
    page.drawRectangle({ x: d, y: d, width: width - 2 * d, height: height - 2 * d, borderColor: color, borderWidth: thickness });
  if (kind === 'single') rect(inset, 0.8);
  else {
    rect(inset, 1.6);
    rect(inset + 3.5, 0.6);
  }
};

export const stampPdf = async (pdf: Buffer, stamps: PageStamp[], options: StampOptions): Promise<Buffer> => {
  const doc = await PDFDocument.load(pdf);
  const font = await doc.embedFont(options.serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
  const bold = await doc.embedFont(options.serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
  const color = rgb(0.33, 0.33, 0.33);
  const accent = toRgb(options.accentColor);
  let logo: PDFImage | null = null;
  if (options.logo) {
    try {
      logo = options.logo.mime === 'image/png' ? await doc.embedPng(options.logo.data) : options.logo.mime === 'image/jpeg' ? await doc.embedJpg(options.logo.data) : null;
    } catch {
      logo = null;
    }
  }
  const size = 9;
  const m = options.marginPt;

  doc.getPages().forEach((page, index) => {
    const stamp = stamps[index];
    if (!stamp) return;
    const { width, height } = page.getSize();
    const half = (width - 2 * m) / 2 - 6;

    if (stamp.border && stamp.border !== 'none') drawBorder(page, stamp.border, Math.max(12, m * 0.45), accent);

    const headerY = height - m / 2 - 2;
    const band = stamp.band;
    if (band) {
      // Drawn before any text, inside the top margin; a long title wraps on two lines.
      const bandSize = 7.5;
      const maxWidth = width - 2 * m - 16;
      const words = safeText(bold, band.text.toUpperCase()).split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      for (const word of words) {
        const last = lines[lines.length - 1];
        if (last !== undefined && bold.widthOfTextAtSize(`${last} ${word}`, bandSize) <= maxWidth) lines[lines.length - 1] = `${last} ${word}`;
        else lines.push(word);
      }
      const shown = lines.slice(0, 2);
      if (lines.length > 2) shown[1] = fit(bold, `${shown[1]} ${lines.slice(2).join(' ')}`, bandSize, maxWidth);
      const bandHeight = shown.length * (bandSize + 2) + 10;
      const bandTop = height - Math.max(8, m * 0.35);
      page.drawRectangle({
        x: m, y: bandTop - bandHeight, width: width - 2 * m, height: bandHeight, color: toRgb(band.color),
        ...(stamp.bandBorder ? { borderColor: toRgb(stamp.bandBorder), borderWidth: 0.75 } : {}),
      });
      shown.forEach((line, i) => {
        const y = bandTop - 5 - (i + 1) * (bandSize + 2) + 2;
        page.drawText(line, { x: (width - bold.widthOfTextAtSize(line, bandSize)) / 2, y, size: bandSize, font: bold, color: toRgb(band.textColor) });
      });
    }
    let leftX = m;
    if (stamp.logo && logo) {
      const h = 16;
      const w = (logo.width / logo.height) * h;
      page.drawImage(logo, { x: m, y: headerY - 4, width: w, height: h });
      leftX = m + w + 6;
    }
    if (stamp.header?.left && !stamp.band) {
      page.drawText(fit(font, stamp.header.left, size, half - (leftX - m)), { x: leftX, y: headerY, size, font, color });
    }
    if (stamp.header?.right && !stamp.band) {
      const text = fit(font, stamp.header.right, size, half);
      page.drawText(text, { x: width - m - font.widthOfTextAtSize(text, size), y: headerY, size, font, color });
    }
    if (!stamp.band && stamp.headerRule && (stamp.header?.left || stamp.header?.right || stamp.logo)) {
      page.drawLine({ start: { x: m, y: headerY - 6 }, end: { x: width - m, y: headerY - 6 }, thickness: 0.5, color: accent });
    }

    const footerY = m / 2 - 4;
    const third = (width - 2 * m) / 3;
    if (stamp.footerRule) {
      page.drawLine({ start: { x: m, y: footerY + 12 }, end: { x: width - m, y: footerY + 12 }, thickness: 0.5, color: accent });
    }
    // The page number is written last: readers of the PDF (and the tests) take
    // the last text of a page as its number.
    const slots: { key: 'left' | 'center' | 'right'; text: string; max: number; x: (w: number) => number }[] = [];
    if (stamp.footer?.left) slots.push({ key: 'left', text: stamp.footer.left, max: stamp.wideFooterLeft ? 2 * third : third, x: () => m });
    if (stamp.footer?.center) slots.push({ key: 'center', text: stamp.footer.center, max: third, x: (w) => (width - w) / 2 });
    if (stamp.footer?.right) slots.push({ key: 'right', text: stamp.footer.right, max: third, x: (w) => width - m - w });
    slots.sort((a, b) => Number(a.key === stamp.numberSlot) - Number(b.key === stamp.numberSlot));
    for (const slot of slots) {
      const text = fit(font, slot.text, size, slot.max);
      const w = font.widthOfTextAtSize(text, size);
      const x = slot.x(w);
      if (stamp.numberFrame && slot.key === stamp.numberSlot) {
        page.drawRectangle({ x: x - 4, y: footerY - 3.5, width: w + 8, height: size + 5, borderColor: accent, borderWidth: 0.75 });
      }
      const prefix = slot.key === 'left' && stamp.footerBoldPrefix && text.startsWith(stamp.footerBoldPrefix) ? safeText(bold, stamp.footerBoldPrefix) : '';
      if (prefix) {
        page.drawText(prefix, { x, y: footerY, size, font: bold, color });
        page.drawText(text.slice(stamp.footerBoldPrefix!.length), { x: x + bold.widthOfTextAtSize(prefix, size), y: footerY, size, font, color });
      } else {
        page.drawText(text, { x, y: footerY, size, font, color });
      }
    }
  });

  return Buffer.from(await doc.save());
};
