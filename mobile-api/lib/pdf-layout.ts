// Layout measures of a PDF (Module 24, import of a report as a template): pure
// functions over the text items and filled rectangles read by pdf.js, so they
// are tested without any PDF. Coordinates are PDF points, origin bottom-left.

export type PdfTextItem = { page: number; str: string; x: number; y: number; w: number; size: number; bold: boolean; italic: boolean; font: string };
export type PdfRect = { page: number; x: number; y: number; w: number; h: number; fill: string | null; stroke: boolean };
export type PdfPage = { page: number; width: number; height: number };
export type Measured<T> = { value: T; confidence: number; source: 'measured' | 'guessed' };

const measured = <T>(value: T, confidence: number): Measured<T> => ({ value, confidence: Math.round(confidence * 100) / 100, source: confidence >= 0.6 ? 'measured' : 'guessed' });

// Lines: items of a page sharing a baseline (±2 pt), left to right.
export type PdfLine = { page: number; y: number; x: number; end: number; text: string; size: number; bold: boolean; italic: boolean; font: string };
export const linesOf = (items: PdfTextItem[]): PdfLine[] => {
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const lines: { page: number; y: number; items: PdfTextItem[] }[] = [];
  for (const item of sorted) {
    const line = lines.find((l) => l.page === item.page && Math.abs(l.y - item.y) <= 2);
    if (line) line.items.push(item);
    else lines.push({ page: item.page, y: item.y, items: [item] });
  }
  return lines
    .map((l) => {
      const parts = l.items.sort((a, b) => a.x - b.x);
      const main = parts.reduce((best, p) => (p.str.length > best.str.length ? p : best), parts[0]);
      return {
        page: l.page,
        y: l.y,
        x: parts[0].x,
        end: Math.max(...parts.map((p) => p.x + p.w)),
        text: parts.map((p) => p.str).join(' ').replace(/\s+/g, ' ').trim(),
        size: main.size,
        bold: main.bold,
        italic: main.italic,
        font: main.font,
      };
    })
    .sort((a, b) => a.page - b.page || b.y - a.y);
};

// Body text size: the size carrying the most characters.
export const bodySize = (items: PdfTextItem[]): Measured<number> => {
  const weights = new Map<number, number>();
  let total = 0;
  for (const item of items) {
    const size = Math.round(item.size * 2) / 2;
    weights.set(size, (weights.get(size) ?? 0) + item.str.length);
    total += item.str.length;
  }
  if (!total) return measured(12, 0);
  const [size, weight] = [...weights.entries()].sort((a, b) => b[1] - a[1])[0];
  return measured(size, weight / total);
};

// Text repeated at the top or bottom of at least 3 pages (digits ignored).
const normalizeRepeat = (text: string) => text.replace(/\b[0-9]+\b|\b[ivxlc]+\b/gi, '#').trim();
export const runningLines = (lines: PdfLine[], pages: PdfPage[], where: 'top' | 'bottom', zone = 60) => {
  const inZone = lines.filter((l) => {
    const page = pages.find((p) => p.page === l.page);
    if (!page) return false;
    return where === 'top' ? l.y > page.height - zone : l.y < zone;
  });
  const counts = new Map<string, number>();
  for (const l of inZone) counts.set(normalizeRepeat(l.text), (counts.get(normalizeRepeat(l.text)) ?? 0) + 1);
  return inZone.filter((l) => (counts.get(normalizeRepeat(l.text)) ?? 0) >= 3);
};

// Page numbers printed at the bottom: roman first, then arabic?
export const pageNumbering = (footerLines: PdfLine[]) => {
  const numbers = footerLines
    .map((l) => ({ page: l.page, last: l.text.split(' ').pop() || '' }))
    .filter((n) => /^\d+$/.test(n.last) || /^[ivxlc]+$/.test(n.last));
  const roman = numbers.filter((n) => /^[ivxlc]+$/.test(n.last));
  const arabic = numbers.filter((n) => /^\d+$/.test(n.last));
  const romanThenArabic = roman.length > 0 && arabic.length > 0 && Math.max(...roman.map((n) => n.page)) < Math.min(...arabic.map((n) => n.page));
  return { romanThenArabic, found: numbers.length };
};

// Captions: "Figure 1" in chapter 1 then "Figure 2" in chapter 2 → numbered over the document.
export const captionScope = (lines: PdfLine[]): Measured<'chapter' | 'document'> | null => {
  const captions = lines.map((l) => l.text.match(/^(Figure|Tableau)\s+([\dIVX]+(?:\.\d+)?)\s*:/)).filter(Boolean) as RegExpMatchArray[];
  if (!captions.length) return null;
  const dotted = captions.filter((m) => m[2].includes('.')).length;
  return dotted > captions.length / 2 ? measured('chapter', dotted / captions.length) : measured('document', 1 - dotted / captions.length);
};

// Coloured bands across the top of the page on at least 3 pages.
export const headerBand = (rects: PdfRect[], pages: PdfPage[], zone = 60): Measured<string> | null => {
  const bands = rects.filter((r) => {
    const page = pages.find((p) => p.page === r.page);
    return page && r.fill && !r.stroke && r.y > page.height - zone - 20 && r.w > page.width * 0.5 && r.h >= 8 && r.h <= 40;
  });
  const byColor = new Map<string, Set<number>>();
  for (const b of bands) {
    if (!byColor.has(b.fill as string)) byColor.set(b.fill as string, new Set());
    byColor.get(b.fill as string)?.add(b.page);
  }
  const best = [...byColor.entries()].sort((a, b) => b[1].size - a[1].size)[0];
  if (!best || best[1].size < 3) return null;
  return measured(best[0], Math.min(1, best[1].size / Math.max(3, pages.length - 1)));
};

// Relative luminance check: white text on dark bands, dark text otherwise.
export const textOnBand = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#000000' : '#FFFFFF';
};
