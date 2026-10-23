import {
  presetStyle,
  resolveStyle,
  STYLE_FONTS,
  type CoverBlock,
  type CoverLogoSlot,
  type CoverTextStyle,
  type DocumentStyle,
  type StyleFont,
} from './document-style';
import { detectFileType } from './file-validation';
import {
  bodySize,
  captionScope,
  headerBand,
  linesOf,
  pageNumbering,
  runningLines,
  textOnBand,
  type PdfPage,
  type PdfRect,
  type PdfTextItem,
} from './pdf-layout';
import { TemplateImportError, type ImportedTemplate, type ImportReport } from './template-import-docx';

// Import of a report PDF as a template (Module 24): an approximate draft that the
// admin corrects. Measures fonts, sizes, margins, running header and footer,
// page numbers, captions and the cover from the text and shapes of the pages.
// Only the layout is kept: the report's own texts become fields or are dropped.
// The vision model (decision 20) is not wired here: `useVision` is reported as
// unused.

export const MAX_TEMPLATE_PDF_PAGES = 60;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const PT_PER_CM = 28.3465;

export type PdfImportReport = ImportReport & { confidence: Record<string, number> };

const GENERIC = [
  'Rédigé et présenté par', 'Présenté par', 'Sous l’encadrement de', 'Sous la direction de', 'THÈME', 'Année académique',
  'Encadreur académique', 'Encadreur professionnel', 'Matricule', 'RAPPORT DE STAGE ACADÉMIQUE', 'RAPPORT DE STAGE',
  'MÉMOIRE DE FIN D’ÉTUDES', 'MÉMOIRE', 'République du Cameroun', 'Republic of Cameroon', 'Paix – Travail – Patrie', 'Peace – Work – Fatherland',
];
const OUTLINE = [
  'Dédicace', 'Remerciements', 'Sommaire', 'Résumé', 'Abstract', 'Liste des figures', 'Liste des tableaux', 'Liste des abréviations',
  'Introduction générale', 'Conclusion générale', 'Références bibliographiques', 'Bibliographie', 'Table des matières', 'Annexes', 'Avant-propos',
];
const fold = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '’').replace(/\s+/g, ' ').trim();
const genericLabel = (text: string) => GENERIC.find((label) => fold(text).startsWith(fold(label))) ?? null;
const isGeneric = (text: string) => {
  const label = genericLabel(text);
  return label !== null && fold(text).replace(/[\s:]+$/, '') === fold(label);
};
const SERIF = /times|georgia|garamond|cambria|roman|serif|book|palatino|century/i;
const nearestFont = (name: string): { font: StyleFont; exact: boolean } => {
  const clean = name.replace(/^[A-Z]{6}\+/, '').replace(/[-,](Bold|Italic|Oblique|Regular|PS|MT).*$/i, '').replace(/PS(MT)?$|MT$/, '');
  const exact = STYLE_FONTS.find((f) => f.replace(/\s/g, '').toLowerCase() === clean.replace(/\s/g, '').toLowerCase());
  return exact ? { font: exact, exact: true } : { font: SERIF.test(name) ? 'Times New Roman' : 'Arial', exact: false };
};

// ── Reading the PDF with pdf.js ────────────────────────────────────────────

type Matrix = [number, number, number, number, number, number];
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: Matrix, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const toHex = (args: unknown[]): string | null => {
  if (typeof args[0] === 'string' && /^#[0-9a-f]{6}$/i.test(args[0])) return args[0].toUpperCase();
  if (args.length >= 3 && args.slice(0, 3).every((v) => typeof v === 'number')) {
    const nums = args.slice(0, 3) as number[];
    const scale = nums.some((v) => v > 1) ? 1 : 255;
    return `#${nums.map((v) => Math.round(v * scale).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }
  return null;
};

type ReadPdf = { pages: PdfPage[]; items: PdfTextItem[]; rects: PdfRect[]; images: { page: number; x: number; y: number; w: number; h: number }[] };

const readPdf = async (data: Buffer): Promise<ReadPdf> => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { OPS } = pdfjs;
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 }).promise;
  } catch (error) {
    if ((error as { name?: string })?.name === 'PasswordException') throw new TemplateImportError('Ce PDF est protégé par un mot de passe.');
    throw new TemplateImportError('Ce PDF est illisible ou endommagé.');
  }
  try {
    if (doc.numPages > MAX_TEMPLATE_PDF_PAGES) throw new TemplateImportError(`Ce PDF a trop de pages (${MAX_TEMPLATE_PDF_PAGES} maximum).`);
    const out: ReadPdf = { pages: [], items: [], rects: [], images: [] };
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const [, , width, height] = page.view;
      out.pages.push({ page: n, width, height });

      // Shapes: filled or stroked paths, and images, in page coordinates.
      const ops = await page.getOperatorList();
      let ctm: Matrix = [1, 0, 0, 1, 0, 0];
      const stack: Matrix[] = [];
      let fill: string | null = null;
      let pending: number[] | null = null;
      const pushRect = (box: number[], kind: 'fill' | 'stroke') => {
        const [x1, y1] = apply(ctm, box[0], box[1]);
        const [x2, y2] = apply(ctm, box[2], box[3]);
        out.rects.push({ page: n, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), fill: kind === 'fill' ? fill : null, stroke: kind === 'stroke' });
      };
      for (let i = 0; i < ops.fnArray.length; i += 1) {
        const fn = ops.fnArray[i];
        const args = ops.argsArray[i] as any[];
        if (fn === OPS.save) stack.push(ctm);
        else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
        else if (fn === OPS.transform) ctm = multiply(ctm, args as unknown as Matrix);
        else if (fn === OPS.setFillRGBColor) fill = toHex(args);
        else if (fn === OPS.constructPath) {
          // pdf.js 5: [drawOp, [path], minMax]; earlier: [ops, coords, minMax] then a separate draw op.
          const minMax = args[2] as number[] | undefined;
          const box = minMax && minMax.length >= 4 ? Array.from(minMax) : null;
          if (typeof args[0] === 'number' && box) {
            const draw = args[0];
            if (draw === OPS.fill || draw === OPS.eoFill || draw === OPS.fillStroke || draw === OPS.eoFillStroke) pushRect(box, 'fill');
            else if (draw === OPS.stroke || draw === OPS.closeStroke) pushRect(box, 'stroke');
          } else pending = box;
        } else if (pending && (fn === OPS.fill || fn === OPS.eoFill)) {
          pushRect(pending, 'fill');
          pending = null;
        } else if (pending && (fn === OPS.stroke || fn === OPS.closeStroke)) {
          pushRect(pending, 'stroke');
          pending = null;
        } else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
          const [x1, y1] = apply(ctm, 0, 0);
          const [x2, y2] = apply(ctm, 1, 1);
          out.images.push({ page: n, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
        }
      }

      const content = await page.getTextContent();
      for (const item of content.items as any[]) {
        if (!('str' in item) || !item.str) continue;
        let font = String(content.styles?.[item.fontName]?.fontFamily || '');
        try {
          const loaded = page.commonObjs.get(item.fontName) as { name?: string } | undefined;
          if (loaded?.name) font = loaded.name;
        } catch {
          // Font object not resolved: keep the family.
        }
        const [, , c, d, x, y] = item.transform as number[];
        out.items.push({
          page: n, str: item.str, x, y, w: item.width || 0, size: Math.hypot(c, d), font,
          bold: /bold|black|heavy|semibold/i.test(font), italic: /italic|oblique/i.test(font),
        });
      }
      page.cleanup();
    }
    return out;
  } finally {
    await doc.destroy();
  }
};

// ── Cover ───────────────────────────────────────────────────────────────────

// Cover lines split in columns: a gap wider than 30 pt starts a new piece.
const coverPieces = (items: PdfTextItem[]) => {
  const rows: PdfTextItem[][] = [];
  for (const item of items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((r) => Math.abs(r[0].y - item.y) <= 2);
    if (row) row.push(item);
    else rows.push([item]);
  }
  const pieces: { y: number; x: number; end: number; text: string; size: number; bold: boolean; italic: boolean }[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let current: PdfTextItem[] = [];
    const flush = () => {
      if (!current.length) return;
      const main = current.reduce((best, p) => (p.str.length > best.str.length ? p : best), current[0]);
      pieces.push({ y: current[0].y, x: current[0].x, end: Math.max(...current.map((p) => p.x + p.w)), text: current.map((p) => p.str).join(' ').replace(/\s+/g, ' ').trim(), size: main.size, bold: main.bold, italic: main.italic });
      current = [];
    };
    for (const item of row) {
      const last = current[current.length - 1];
      if (last && item.x - (last.x + last.w) > 30) flush();
      current.push(item);
    }
    flush();
  }
  return pieces;
};

const readCover = (read: ReadPdf, report: PdfImportReport, style: DocumentStyle): CoverBlock[] => {
  const page = read.pages[0];
  if (!page) return [];
  const blocks: CoverBlock[] = [];
  const mid = page.width / 2;
  const align = (x: number, end: number): CoverTextStyle['align'] =>
    Math.abs((x + end) / 2 - mid) < page.width * 0.05 ? 'center' : x > mid ? 'right' : 'left';
  const st = (p: { x: number; end: number; size: number; bold: boolean; italic: boolean; text: string }): CoverTextStyle => ({
    align: align(p.x, p.end), size: Math.min(28, Math.max(8, Math.round(p.size * 2) / 2)), bold: p.bold, italic: p.italic,
    uppercase: p.text === p.text.toUpperCase() && /[A-Z]/.test(p.text), underline: false, color: null,
  });
  const pieces = coverPieces(read.items.filter((i) => i.page === 1));
  const bands = read.rects.filter((r) => r.page === 1 && r.fill && !r.stroke && r.w > page.width * 0.4 && r.h >= 10 && r.h <= 60);
  const bandFor = (y: number) => bands.find((b) => y >= b.y - 2 && y <= b.y + b.h);

  // Logos: images of page 1 grouped by row.
  const images = read.images.filter((i) => i.page === 1 && i.w > 10 && i.h > 10).sort((a, b) => b.y - a.y || a.x - b.x);
  const logoRowY = images.length ? images[0].y : null;
  const rowImages = images.filter((i) => logoRowY !== null && Math.abs(i.y - logoRowY) < 20).sort((a, b) => a.x - b.x);
  const slotsFor = (count: number): CoverLogoSlot[] => (count >= 3 ? ['department', 'school', 'company'] : count === 2 ? ['school', 'company'] : ['school']);
  let logosPlaced = false;
  const placeLogos = () => {
    if (logosPlaced || !rowImages.length) return;
    logosPlaced = true;
    const slots = slotsFor(rowImages.length);
    const position = (img: { x: number; w: number }) => align(img.x, img.x + img.w);
    const byPos: Record<'left' | 'center' | 'right', CoverLogoSlot | null> = { left: null, center: null, right: null };
    rowImages.slice(0, 3).forEach((img, i) => {
      byPos[rowImages.length >= 3 ? (['left', 'center', 'right'] as const)[i] : position(img)] = slots[i];
    });
    blocks.push({ id: `logos-${blocks.length + 1}`, type: 'logos', left: byPos.left, center: byPos.center, right: byPos.right, height: Math.min(120, Math.max(20, Math.round(rowImages[0].h))), centerText: '', rule: false, style: { align: 'center', size: 11, bold: false, italic: false, uppercase: false, underline: false, color: null } });
    report.guessed.push(`Garde : ${rowImages.length} logo(s) repérés ; emplacements supposés, images à fournir par l’étudiant`);
  };

  // Bilingual header: pieces in two columns at the top, above the logos.
  const topLimit = logoRowY ?? page.height * 0.7;
  const top = pieces.filter((p) => p.y > topLimit);
  const left = top.filter((p) => p.end < mid + 10);
  const right = top.filter((p) => p.x > mid - 10);
  let field = 0;
  const fieldLine = (p: { text: string; bold: boolean; italic: boolean }) => {
    if (isGeneric(p.text)) return p.bold ? `**${p.text}**` : p.italic ? `*${p.text}*` : p.text;
    return null;
  };
  if (left.length && right.length) {
    const lines = (col: typeof left) => {
      let f = 0;
      return col.map((p) => fieldLine(p) ?? ['{university}', '{school}', '{faculty}'][f++] ?? null).filter((l): l is string => l !== null);
    };
    blocks.push({ id: 'header', type: 'bilingual-header', left: lines(left), right: lines(right), center: null, style: { ...st(left[0]), align: 'center' } });
    report.sure.push('Garde : en-tête bilingue sur deux colonnes');
    field = 1;
  }
  placeLogos();

  let dropped = 0;
  let afterAuthor = false;
  let supervisorLabel: string | null = null;
  // Pieces of the bilingual header are already used.
  for (const p of pieces.filter((x) => !field || x.y <= topLimit)) {
    const band = bandFor(p.y);
    const label = genericLabel(p.text);
    if (band && label === 'Année académique') {
      style.page.bandColor = band.fill as string;
      blocks.push({ id: 'year', type: 'year-banner', template: 'Année académique {year}', variant: 'band', style: st(p) });
      continue;
    }
    if (band || label === 'THÈME') {
      if (band) style.page.bandColor = band.fill as string;
      if (blocks.some((b) => b.type === 'title-banner')) continue; // second line of a long title
      blocks.push({ id: 'title', type: 'title-banner', prefix: label === 'THÈME' ? 'THÈME :' : '', variant: band ? 'band' : 'plain', style: st(p) });
      report.sure.push(`Garde : ${band ? `bandeau ${band.fill} ` : ''}titre${label === 'THÈME' ? ' précédé de « THÈME : »' : ''}`);
      continue;
    }
    if (label && /présenté par/i.test(label)) {
      blocks.push({ id: 'author', type: 'author', label: `${label} :`, matriculeLabel: 'Matricule :', style: st(p) });
      afterAuthor = true;
      continue;
    }
    if (label === 'Matricule') continue;
    if (label === 'Sous l’encadrement de' || label === 'Sous la direction de') {
      supervisorLabel = `${label} :`;
      continue;
    }
    if (label === 'Encadreur académique' || label === 'Encadreur professionnel') {
      if (!blocks.some((b) => b.type === 'supervisors')) {
        blocks.push({ id: 'supervisors', type: 'supervisors', layout: 'columns', label: supervisorLabel ?? '', academicLabel: 'Encadreur académique', corporateLabel: 'Encadreur professionnel', authorLabel: '', matriculeLabel: '', specialtyLabel: '', style: { ...st(p), align: 'left' } });
      }
      continue;
    }
    if (label === 'Année académique') {
      blocks.push({ id: 'year', type: 'year-banner', template: 'Année académique {year}', variant: 'plain', style: st(p) });
      continue;
    }
    if (label && isGeneric(p.text)) {
      blocks.push({ id: `heading-${blocks.length + 1}`, type: 'heading', text: p.text, style: st(p) });
      continue;
    }
    if (/^en vue de l.obtention/i.test(fold(p.text)) || /^stage effectue/i.test(fold(p.text))) {
      blocks.push({ id: `text-${blocks.length + 1}`, type: 'text', template: /^stage/i.test(fold(p.text)) ? 'Stage effectué {period}[ en vue de l’obtention du {degree}]' : 'En vue de l’obtention du {degree}', style: st(p) });
      report.guessed.push('Garde : phrase de période ou de diplôme reconstituée avec les champs de l’étudiant');
      continue;
    }
    if (afterAuthor) {
      afterAuthor = false;
      continue; // the student's name
    }
    dropped += 1;
  }
  if (supervisorLabel && !blocks.some((b) => b.type === 'supervisors')) {
    blocks.push({ id: 'supervisors', type: 'supervisors', layout: 'columns', label: supervisorLabel, academicLabel: 'Encadreur académique', corporateLabel: 'Encadreur professionnel', authorLabel: '', matriculeLabel: '', specialtyLabel: '', style: { align: 'left', size: 11, bold: false, italic: false, uppercase: false, underline: false, color: null } });
  }
  if (dropped) report.missing.push(`${dropped} ligne(s) de la garde propres au rapport n’ont pas été reprises`);
  if (rowImages.length) report.missing.push('Images des logos non reprises depuis le PDF : à importer séparément');
  return blocks;
};

// ── Entry point ─────────────────────────────────────────────────────────────

export const importPdfTemplate = async (data: Buffer, options: { useVision: boolean } = { useVision: false }): Promise<ImportedTemplate & { report: PdfImportReport }> => {
  if (data.length > MAX_FILE_BYTES) throw new TemplateImportError('Fichier trop volumineux (20 Mo maximum).', 413);
  if (detectFileType(data)?.extension !== 'pdf') throw new TemplateImportError('Ce fichier n’est pas un PDF.', 415);
  const read = await readPdf(data);
  const report: PdfImportReport = { sure: [], guessed: [], missing: [], confidence: {} };
  const style = presetStyle('classique');
  const note = (key: string, confidence: number, text: string) => {
    report.confidence[key] = Math.round(confidence * 100) / 100;
    (confidence >= 0.6 ? report.sure : report.guessed).push(`${text} (confiance ${String(report.confidence[key]).replace('.', ',')})`);
  };

  const bodyItems = read.items.filter((i) => i.page > 1);
  const body = bodySize(bodyItems.length ? bodyItems : read.items);
  style.typography.bodySize = body.value;
  note('typography.bodySize', body.confidence, `Taille du texte : ${body.value} pt`);

  const fontCount = new Map<string, number>();
  for (const item of bodyItems.filter((i) => Math.abs(i.size - body.value) < 0.6)) fontCount.set(item.font, (fontCount.get(item.font) ?? 0) + item.str.length);
  const mainFont = [...fontCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (mainFont) {
    const { font, exact } = nearestFont(mainFont);
    style.typography.bodyFont = font;
    style.typography.headingFont = font;
    note('typography.bodyFont', exact ? 0.9 : 0.4, `Police du texte : ${font}${exact ? '' : ` (lue « ${mainFont} »)`}`);
  }

  const lines = linesOf(read.items);
  const bodyLines = lines.filter((l) => l.page > 1);
  const minX = Math.min(...bodyLines.filter((l) => Math.abs(l.size - body.value) < 0.6).map((l) => l.x));
  if (Number.isFinite(minX)) {
    const cm = minX / PT_PER_CM;
    style.page.margins = cm < 2 ? 'narrow' : cm < 2.75 ? 'normal' : 'wide';
    note('page.margins', 0.7, `Marges : environ ${cm.toFixed(1).replace('.', ',')} cm`);
  }

  // Running header: coloured band, or repeated text.
  const band = headerBand(read.rects, read.pages);
  const hf = style.headerFooter;
  if (band) {
    hf.headerStyle = 'band';
    style.page.bandColor = band.value;
    hf.headerTextColor = textOnBand(band.value);
    hf.headerLeft = 'none';
    hf.headerRight = 'none';
    note('headerFooter.headerStyle', band.confidence, `En-tête : bandeau ${band.value} avec le titre`);
  } else {
    hf.headerStyle = 'plain';
    const header = runningLines(bodyLines, read.pages, 'top');
    hf.headerLeft = 'none';
    hf.headerRight = header.length ? 'chapter' : 'none';
    if (header.length) note('headerFooter.headerRight', 0.4, 'En-tête : texte répété (supposé le chapitre)');
  }

  // Footer: author label, page number position and format, frame, rule.
  const footer = runningLines(lines.filter((l) => l.page > 1), read.pages, 'bottom');
  const authorLine = footer.find((l) => genericLabel(l.text) && /présenté par/i.test(genericLabel(l.text) as string));
  hf.footerLeft = 'none';
  hf.footerCenter = 'none';
  hf.footerRight = 'none';
  if (authorLine) {
    hf.authorLabel = `${genericLabel(authorLine.text)} :`;
    hf.footerLeft = 'author';
    note('headerFooter.authorLabel', 0.9, `Pied : « ${hf.authorLabel} » et le nom de l’étudiant`);
  }
  const numberItems = read.items.filter((i) => i.page > 1 && i.y < 60 && /^(\d+|[ivxlc]+)$/.test(i.str.trim()));
  if (numberItems.length) {
    const page = read.pages[1] ?? read.pages[0];
    const centre = numberItems[0].x + numberItems[0].w / 2;
    const slot = Math.abs(centre - page.width / 2) < page.width * 0.08 ? 'center' : centre > page.width / 2 ? 'right' : 'left';
    if (slot === 'left') hf.footerLeft = 'page';
    else if (slot === 'center') hf.footerCenter = 'page';
    else hf.footerRight = 'page';
    const withPage = footer.some((l) => /\bpage\s+\d+/i.test(l.text));
    const ofTotal = footer.some((l) => /\b\d+\s*\/\s*\d+\b/.test(l.text));
    hf.numberFormat = withPage ? 'page-n' : ofTotal ? 'n-of-total' : 'n';
    const numbering = pageNumbering(footer);
    note('headerFooter.page', 0.8, `Numéro de page en pied, ${slot === 'right' ? 'à droite' : slot === 'center' ? 'au centre' : 'à gauche'}${numbering.romanThenArabic ? ' ; i, ii… puis 1, 2…' : ''}`);
    const framed = read.rects.filter((r) => r.stroke && r.page > 1 && r.y < 60 && r.w < 50 && r.h < 25 && numberItems.some((n) => n.page === r.page && n.x >= r.x - 2 && n.x <= r.x + r.w));
    if (framed.length >= 3) {
      hf.pageNumberFrame = 'box';
      note('headerFooter.pageNumberFrame', 0.8, 'Numéro de page encadré');
    }
  } else {
    report.missing.push('Numéro de page');
  }
  const rules = read.rects.filter((r) => r.stroke && r.page > 1 && r.y < 70 && r.y > 20 && r.h < 2 && r.w > (read.pages[0]?.width ?? 600) * 0.5);
  if (new Set(rules.map((r) => r.page)).size >= 3) {
    hf.footerRule = true;
    note('headerFooter.footerRule', 0.7, 'Filet au-dessus du pied');
  }

  // Headings numbering, captions, bullets.
  const big = bodyLines.filter((l) => l.size > body.value + 0.5);
  if (big.some((l) => /^SECTION\s+\d+\s*:/i.test(l.text))) style.headings.numbering = 'chapter-section-roman';
  else if (big.some((l) => /^\d+\.\d+\s/.test(l.text))) style.headings.numbering = 'decimal';
  else if (big.some((l) => /^[A-H]\.\s/.test(l.text))) style.headings.numbering = 'roman-alpha';
  if (big.length) note('headings.numbering', 0.7, `Numérotation des titres : ${style.headings.numbering}`);
  const scope = captionScope(bodyLines);
  if (scope) {
    style.captions.scope = scope.value;
    note('captions.scope', scope.confidence, `Légendes numérotées ${scope.value === 'document' ? 'sur tout le document' : 'par chapitre'}`);
  }
  if (bodyLines.some((l) => l.text.startsWith('❖'))) {
    style.lists.bullet = 'diamond';
    note('lists.bullet', 0.8, 'Puces en losange ❖');
  }

  // Outline: section titles (the largest body lines) matched to usual sections.
  const titleSize = Math.max(0, ...bodyLines.map((l) => l.size));
  const outline: { title: string }[] = [];
  for (const l of bodyLines.filter((x) => x.size >= titleSize - 0.5)) {
    const chapter = /^chapitre\s+(\d+|[ivxlc]+)\b/.test(fold(l.text));
    const known = OUTLINE.find((t) => fold(l.text).startsWith(fold(t)));
    const title = chapter ? `Chapitre ${outline.filter((o) => o.title.startsWith('Chapitre')).length + 1}` : known;
    if (title && !outline.some((o) => o.title === title)) outline.push({ title });
  }
  if (outline.length) note('outline', 0.7, `Plan : ${outline.map((o) => o.title).join(', ')}`);
  else report.missing.push('Plan des sections');

  style.cover.blocks = readCover(read, report, style);
  if (!style.cover.blocks.length) style.cover.blocks = null;
  if (options.useVision) report.missing.push('IA de vision non branchée dans cette version : garde reconstituée sans elle');

  return { style: resolveStyle(style), outline, logos: [], report };
};

