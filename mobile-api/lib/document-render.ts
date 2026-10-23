// Shared rendering rules for academic documents (Module 20): section kinds, the
// CSS generated from a document style, and the cover (built from blocks). Pure code,
// no I/O. This file exists twice, identical except for the import path below:
//   mobile-api/lib/document-render.ts  and  src/features/documents/documentRender.ts
// A test fails if the two copies differ — edit both together.

import { coverBlocksCss, coverBlocksFor, coverBlocksHtml } from './document-cover';
import type { DocumentStyle, StyleFont } from './document-style';

export const escapeHtml = (text: unknown): string =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ── Sections ────────────────────────────────────────────────────────────────

export type SectionKind =
  | 'cover'
  | 'toc'
  | 'lists'
  | 'abbreviations'
  | 'dedication'
  | 'acknowledgements'
  | 'abstract'
  | 'identification'
  | 'foreword'
  | 'body';

const normalize = (title: string) =>
  title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// Preliminary sections are numbered i, ii, iii; the body starts again at 1.
export const classifySection = (title: string): { kind: SectionKind; preliminary: boolean } => {
  const t = normalize(title);
  if (t === 'page de garde') return { kind: 'cover', preliminary: false };
  if (t === 'sommaire' || t.startsWith('table des matieres')) return { kind: 'toc', preliminary: true };
  if (/^liste des (figures|tableaux|illustrations)/.test(t)) return { kind: 'lists', preliminary: true };
  if (/(abreviation|sigle|acronyme)/.test(t)) return { kind: 'abbreviations', preliminary: true };
  if (/remerciement/.test(t)) return { kind: 'acknowledgements', preliminary: true };
  if (/^dedicace/.test(t)) return { kind: 'dedication', preliminary: true };
  if (/(^resume|abstract|mots-cles)/.test(t)) return { kind: 'abstract', preliminary: true };
  if (/fiche d.identification/.test(t)) return { kind: 'identification', preliminary: true };
  if (/avant-propos/.test(t)) return { kind: 'foreword', preliminary: true };
  return { kind: 'body', preliminary: false };
};

const ROMAN: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export const toRoman = (value: number): string => {
  let n = Math.max(1, Math.floor(value));
  let out = '';
  for (const [v, s] of ROMAN) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
};

const romanToInt = (text: string): number => {
  const map: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 };
  let total = 0;
  const s = text.toLowerCase();
  for (let i = 0; i < s.length; i += 1) {
    const cur = map[s[i]] || 0;
    const next = map[s[i + 1]] || 0;
    total += cur < next ? -cur : cur;
  }
  return total;
};

// "Chapitre 2 : …" / "Chapitre II - …" → 2. Other sections are not chapters.
export const chapterNumberOf = (title: string): number | null => {
  const match = normalize(title).match(/^chapitre\s+(\d+|[ivxlc]+)\b/);
  if (!match) return null;
  const n = /^\d+$/.test(match[1]) ? Number(match[1]) : romanToInt(match[1]);
  return n > 0 ? n : null;
};

export const chapterLabel = (chapter: number, style: DocumentStyle): string =>
  style.headings.numbering === 'roman-alpha' ? toRoman(chapter) : String(chapter);

// Header band (Module 24): on every page except the cover, preliminary pages
// included. One rule for the screen, the PDF and Word.
export const showsHeaderBand = (kind: SectionKind, style: DocumentStyle): boolean =>
  style.headerFooter.headerStyle === 'band' && kind !== 'cover';

// Author as printed in the footer: "<label> <name>" when the style has a label.
export const authorLine = (style: DocumentStyle, name: string | null | undefined): string => {
  const n = (name || '').trim();
  if (!n) return '';
  const label = style.headerFooter.authorLabel.trim();
  return label ? `${label} ${n}` : n;
};

// The editor's first heading level is <h1> and numbering is automatic. Content
// written elsewhere (older AI prompts, paste) often starts at <h2> and carries
// typed numbers ("1.1 Contexte"): shift the levels up and drop the typed numbers
// so they are not printed twice.
const TYPED_NUMBER = /(<h[1-4](?:\s[^>]*)?>\s*(?:<(?:strong|b|em|i)>\s*)?)(?:\d+(?:\.\d+)+\.?|\d+[.)]|[IVX]{1,5}\.|[A-H][.)]|[a-h]\))\s+/gi;

export const normalizeHeadings = (html: string): string => {
  if (!html) return html;
  let out = html;
  if (!/<h1[\s>]/i.test(out) && /<h2[\s>]/i.test(out)) {
    out = out.replace(/<(\/?)h([2-4])(?=[\s>])/gi, (_m, slash: string, n: string) => `<${slash}h${Number(n) - 1}`);
  }
  return out.replace(TYPED_NUMBER, '$1');
};

// ── Fonts, colours, margins ─────────────────────────────────────────────────

export const FONT_STACKS: Record<StyleFont, string> = {
  'Times New Roman': "'Times New Roman', Times, 'Liberation Serif', serif",
  Georgia: "Georgia, 'Times New Roman', serif",
  Arial: "Arial, Helvetica, 'Liberation Sans', sans-serif",
  Calibri: "Calibri, Carlito, Arial, sans-serif",
  Garamond: "Garamond, 'EB Garamond', Georgia, serif",
  Cambria: "Cambria, Caladea, Georgia, serif",
};

export const MARGINS_CM: Record<DocumentStyle['page']['margins'], number> = { narrow: 1.5, normal: 2.5, wide: 3 };

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Readable text colour on a given background (dark text on light colours).
export const textColorOn = (hex: string): string => {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#111111' : '#FFFFFF';
};

// ── CSS generated from the style ────────────────────────────────────────────

export type StyleCssOptions = {
  // Editor and preview number headings and captions with CSS counters; the exports
  // write the labels as text instead (they also feed the table of contents).
  cssNumbering: boolean;
};

// Content styles, scoped to `.doc-section` / `.doc-body`. Sizes in points so the
// screen and the printed page share the same proportions.
export const styleToCss = (style: DocumentStyle, options: StyleCssOptions): string => {
  const { typography: ty, headings: h, page, tables, captions } = style;
  const body = FONT_STACKS[ty.bodyFont];
  const head = FONT_STACKS[ty.headingFont];
  const accent = page.accentColor;
  const headerText = textColorOn(tables.headerColor);
  const caps = h.uppercaseChapters ? 'uppercase' : 'none';
  const captionLook =
    captions.style === 'bold-left' ? 'font-style: normal; font-weight: 700; text-align: left;' : 'font-style: italic; text-align: center;';

  const tableRules =
    tables.style === 'grid'
      ? `.doc-body table th, .doc-body table td { border: 0.75pt solid #BFC5CC; }`
      : tables.style === 'striped'
        ? `.doc-body table th, .doc-body table td { border-bottom: 0.75pt solid #D5DAE0; }
           .doc-body table tbody tr:nth-child(even) td { background: #F4F6F9; }`
        : `.doc-body table th { border-bottom: 1.25pt solid #111111; }
           .doc-body table td { border-bottom: 0.5pt solid #DDDDDD; }`;

  let numbering = '';
  if (options.cssNumbering) {
    const decimal = h.numbering === 'decimal';
    const roman = h.numbering === 'roman-alpha';
    const sections = h.numbering === 'chapter-section-roman';
    // "document" scope: figure and table counters run over the whole page, not per section.
    const wholeDocument = captions.scope === 'document';
    numbering = `
      ${wholeDocument ? `body { counter-reset: dfig dtab; }
      .doc-section .doc-body { counter-reset: dh1 dh2 dh3; }` : `.doc-section .doc-body { counter-reset: dh1 dh2 dh3 dfig dtab; }`}
      .doc-body figure, .doc-body .academic-figure { counter-increment: dfig; }
      .doc-body .doc-table-caption { counter-increment: dtab; }
      ${wholeDocument ? `.doc-body figcaption::before { content: "Figure " counter(dfig) " : "; font-weight: 700; }
      .doc-body .doc-table-caption::before { content: "Tableau " counter(dtab) " : "; font-weight: 700; }` : `.doc-section[data-chapter] .doc-body figcaption::before { content: "Figure " var(--chapter) "." counter(dfig) " : "; font-weight: 700; }
      .doc-section:not([data-chapter]) .doc-body figcaption::before { content: "Figure " counter(dfig) " : "; font-weight: 700; }
      .doc-section[data-chapter] .doc-body .doc-table-caption::before { content: "Tableau " var(--chapter) "." counter(dtab) " : "; font-weight: 700; }
      .doc-section:not([data-chapter]) .doc-body .doc-table-caption::before { content: "Tableau " counter(dtab) " : "; font-weight: 700; }`}
      ${decimal || roman ? `.doc-section[data-chapter] .doc-body h1 { counter-increment: dh1; counter-reset: dh2; }
      .doc-section[data-chapter] .doc-body h2 { counter-increment: dh2; }` : ''}
      ${decimal ? `.doc-section[data-chapter] .doc-body h1::before { content: var(--chapter) "." counter(dh1) "  "; }
      .doc-section[data-chapter] .doc-body h2::before { content: var(--chapter) "." counter(dh1) "." counter(dh2) "  "; }` : ''}
      ${roman ? `.doc-section[data-chapter] .doc-body h1::before { content: counter(dh1, upper-alpha) ".  "; }
      .doc-section[data-chapter] .doc-body h2::before { content: counter(dh2) ".  "; }` : ''}
      ${sections ? `.doc-section[data-chapter] .doc-body h1 { counter-increment: dh1; counter-reset: dh2 dh3; }
      .doc-section[data-chapter] .doc-body h2 { counter-increment: dh2; counter-reset: dh3; }
      .doc-section[data-chapter] .doc-body h3 { counter-increment: dh3; }
      .doc-section[data-chapter] .doc-body h1::before { content: "SECTION " counter(dh1) " : "; }
      .doc-section[data-chapter] .doc-body h2::before { content: counter(dh2, upper-roman) ". "; }
      .doc-section[data-chapter] .doc-body h3::before { content: counter(dh3) ". "; }` : ''}`;
  }

  // ❖ at the first level, • below. Only in HTML (Chromium has the glyph; pdf-lib's fonts do not).
  const bullets =
    style.lists.bullet === 'diamond'
      ? `.doc-body ul > li::marker { content: "\\2756  "; }
  .doc-body ul ul > li::marker { content: "\\2022  "; }`
      : '';
  const dedicationFrame = style.dedication.frame
    ? `.doc-section[data-kind="dedication"] .doc-body { border: 1pt solid ${accent}; padding: 12pt 16pt; }`
    : '';

  return `
  .doc-body {
    font-family: ${body};
    font-size: ${ty.bodySize}pt;
    line-height: ${ty.lineSpacing};
    color: #111111;
    word-break: break-word;
    hyphens: auto;
    -webkit-hyphens: auto;
  }
  .doc-body p { margin: 0 0 ${ty.paragraphSpacing === 'airy' ? '1em' : '0.55em'}; text-align: justify; text-indent: ${ty.paragraphIndent ? '1.25em' : '0'}; }
  .doc-body p[style*="text-align"] { text-indent: 0; }
  .doc-section-title {
    font-family: ${head};
    font-size: ${(ty.bodySize * (h.titleSize === 'normal' ? 1.05 : 1.5)).toFixed(1)}pt;
    font-weight: 700;
    color: ${h.color};
    text-transform: ${caps};
    letter-spacing: ${h.uppercaseChapters ? '0.03em' : '0'};
    line-height: 1.25;
    margin: 0 0 1em;
    text-align: ${h.titleAlign};
    ${h.rule ? `padding-bottom: 0.3em; border-bottom: 1.5pt solid ${accent};` : ''}
  }
  .doc-body h1, .doc-body h2, .doc-body h3, .doc-body h4 {
    font-family: ${head};
    color: ${h.color};
    line-height: 1.3;
    text-indent: 0;
    text-align: left;
    page-break-after: avoid;
    break-after: avoid;
  }
  .doc-body h1 { font-size: ${(ty.bodySize * (h.titleSize === 'normal' ? 1 : 1.25)).toFixed(1)}pt; font-weight: 700; margin: 1.1em 0 0.5em; }
  .doc-body h2 { font-size: ${(ty.bodySize * (h.titleSize === 'normal' ? 1 : 1.1)).toFixed(1)}pt; font-weight: 700; margin: 1em 0 0.4em; }
  .doc-body h3 { font-size: ${ty.bodySize}pt; font-weight: 700; font-style: italic; margin: 0.9em 0 0.3em; }
  .doc-body h4 { font-size: ${ty.bodySize}pt; font-weight: 600; font-style: italic; margin: 0.8em 0 0.3em; }
  ${h.uppercaseSections ? '.doc-body h1, .doc-body h2 { text-transform: uppercase; }' : ''}
  .doc-body ul, .doc-body ol { margin: 0.3em 0 0.7em; padding-left: 1.6em; }
  .doc-body li { margin-bottom: 0.2em; }
  ${bullets}
  .doc-body li p, .doc-body td p, .doc-body th p, .doc-body blockquote p { text-indent: 0; margin: 0; }
  .doc-body blockquote {
    margin: 0.8em 0;
    padding: 0.4em 0.9em;
    border-left: 3pt solid ${accent};
    background: #F6F7F9;
    font-style: italic;
  }
  .doc-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.4em 0 0.9em;
    font-size: ${Math.max(9, ty.bodySize - 1)}pt;
    line-height: 1.35;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .doc-body th, .doc-body td { padding: 4pt 6pt; vertical-align: top; text-align: left; }
  .doc-body th { background: ${tables.headerColor}; color: ${headerText}; font-weight: 700; }
  ${tableRules}
  .doc-body .doc-table-caption { text-indent: 0; ${captionLook} font-size: ${Math.max(9, ty.bodySize - 1)}pt; margin: 0.8em 0 0.3em; }
  .doc-body figure, .doc-body .academic-figure { margin: 0.9em 0; text-align: center; page-break-inside: avoid; break-inside: avoid; }
  .doc-body figure img, .doc-body .academic-figure img { max-width: 85%; height: auto; }
  .doc-body figure.fig-full img { width: 100%; max-width: 100%; }
  .doc-body figure.fig-half img { width: 50%; }
  .doc-body figure.fig-small img { width: 30%; }
  .doc-body figcaption { font-size: ${Math.max(9, ty.bodySize - 1)}pt; ${captionLook} margin-top: 0.3em; }
  .doc-body figcaption strong { font-weight: 400; }
  .doc-section[data-kind="dedication"] .doc-body p,
  .doc-section[data-kind="dedication"] .doc-body { text-align: right; text-indent: 0; font-style: italic; }
  ${dedicationFrame}
  .doc-section[data-kind="abstract"] .doc-body p { text-indent: 0; }
  .doc-section[data-kind="abbreviations"] .doc-body p { text-indent: 0; text-align: left; }
  .doc-section[data-kind="abbreviations"] .doc-body table td:first-child { font-weight: 700; white-space: nowrap; }
  .doc-body .cap-label { font-weight: ${captions.boldLabel ? 700 : 'inherit'}; font-style: inherit; }
  ${numbering}
  ${captions.boldLabel ? '' : '.doc-body figcaption::before, .doc-body .doc-table-caption::before { font-weight: inherit !important; }'}
  `;
};

// ── Cover page ──────────────────────────────────────────────────────────────

export type CoverData = {
  university?: string;
  school?: string;
  faculty?: string;
  kindLabel: string; // e.g. "Rapport de stage"
  degree?: string;
  title: string;
  subtitle?: string;
  studentName?: string;
  matricule?: string;
  specialty?: string;
  company?: string;
  period?: string;
  tutorCorporate?: string;
  tutorAcademic?: string;
  year?: string;
  nationalHeader?: boolean;
  extraLines?: { label: string; value: string }[];
};

export type CoverLogos = { school?: string | null; company?: string | null; department?: string | null };

// Builds the cover data from the stored cover fields. Nothing is invented: an
// empty field simply does not appear on the page.
export const coverDataFrom = (
  coverData: Record<string, unknown> | null | undefined,
  document: { title?: string | null; template_type?: string | null },
  style: DocumentStyle,
): CoverData => {
  const c = coverData || {};
  const text = (key: string) => (typeof c[key] === 'string' ? (c[key] as string).trim() : '');
  const isMemoir = document.template_type === 'memoire';
  return {
    university: text('university'),
    school: text('school'),
    faculty: text('faculty'),
    kindLabel: isMemoir ? (text('memoirKind') === 'professional' ? 'Mémoire professionnel' : 'Mémoire de fin d’études') : 'Rapport de stage',
    degree: text('degree'),
    title: text('title') || String(document.title || '').trim(),
    subtitle: text('subtitle'),
    studentName: text('studentName'),
    matricule: text('matricule'),
    specialty: text('specialty'),
    company: text('company'),
    period: text('period'),
    tutorCorporate: text('tutorCorporate'),
    tutorAcademic: text('tutorAcademic'),
    year: text('year'),
    nationalHeader: c.nationalHeader !== false,
    extraLines: style.cover.extraLines,
  };
};

// The cover is a list of blocks (document-cover.ts): the style's own blocks, or
// those of its ready template.
export const coverHtml = (d: CoverData, style: DocumentStyle, logos: CoverLogos = {}): string => {
  const blocks = style.cover.blocks ?? coverBlocksFor(style.cover.template, Boolean(d.nationalHeader));
  return `<div class="cover cover-blocks cover-${style.cover.template}">${coverBlocksHtml(blocks, d, style, logos)}</div>`;
};

// Cover styles. `pageHeight` is the printable height (e.g. "247mm" for print,
// "auto" on screen). The PDF draws page borders itself, so print passes
// `withBorder: false` to avoid a second frame.
export const coverCss = (style: DocumentStyle, pageHeight: string, withBorder = true): string => {
  const head = FONT_STACKS[style.typography.headingFont];
  const body = FONT_STACKS[style.typography.bodyFont];
  const accent = style.page.accentColor;
  const border = !withBorder ? '' : style.page.border === 'double' || style.page.border === 'cover-only'
    ? `border: 3pt double ${accent}; padding: 14pt;`
    : style.page.border === 'single' ? `border: 1pt solid ${accent}; padding: 14pt;` : '';
  return `
  .cover { font-family: ${body}; color: #111111; min-height: ${pageHeight}; display: flex; flex-direction: column; justify-content: space-between; text-align: center; gap: 14pt; ${border} box-sizing: border-box; }
  .cover .cv-logo { max-height: 70pt; max-width: 120pt; object-fit: contain; }
  .cover .cv-national { display: flex; justify-content: space-between; align-items: flex-start; font-size: 8.5pt; line-height: 1.35; gap: 8pt; }
  .cover .cv-nat-col { flex: 1; }
  .cover .cv-nat-logo { width: 90pt; display: flex; justify-content: center; }
  .cover .cv-top { font-size: 10.5pt; line-height: 1.4; font-weight: 700; text-transform: uppercase; display: flex; flex-direction: column; align-items: center; gap: 4pt; }
  .cover .cv-kind { font-size: 11pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${accent}; }
  .cover .cv-degree { font-size: 10.5pt; font-style: italic; margin-top: 4pt; }
  .cover .cv-theme { font-size: 9.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 16pt; color: #555555; }
  .cover .cv-title { font-family: ${head}; font-size: 20pt; line-height: 1.25; margin: 6pt 0; color: ${style.headings.color}; }
  .cover .cv-subtitle { font-size: 12pt; font-style: italic; color: #333333; }
  .cover .cv-place { font-size: 10.5pt; margin-top: 10pt; }
  .cover .cv-company-logo { margin-top: 10pt; }
  .cover .cv-supervision { display: flex; justify-content: space-between; gap: 18pt; text-align: left; font-size: 10.5pt; }
  .cover .cv-sup-col { flex: 1; }
  .cover .cv-sup-head { font-weight: 700; text-transform: uppercase; font-size: 9pt; letter-spacing: 0.06em; color: #555555; margin-bottom: 4pt; }
  .cover .cv-name { font-weight: 700; font-size: 12pt; margin-bottom: 3pt; }
  .cover .cv-line { margin-bottom: 2pt; }
  .cover .cv-label { font-weight: 700; }
  .cover .cv-extra { font-size: 10.5pt; text-align: left; }
  .cover .cv-year { font-weight: 700; font-size: 11pt; border-top: 1pt solid ${accent}; padding-top: 6pt; }
  .cover-modern { text-align: left; }
  .cover-modern .cv-band { display: flex; align-items: center; gap: 12pt; border-bottom: 3pt solid ${accent}; padding-bottom: 10pt; font-size: 10pt; font-weight: 700; text-transform: uppercase; }
  .cover-modern .cv-band-text { flex: 1; }
  .cover-modern .cv-title { font-size: 24pt; color: ${accent}; }
  .cover-modern .cv-year { border-top: none; text-align: right; }
  .cover-minimal { justify-content: space-between; padding: 30pt 10pt; }
  .cover-minimal .cv-top { font-weight: 400; letter-spacing: 0.12em; font-size: 9.5pt; }
  .cover-minimal .cv-title { font-size: 22pt; color: #111111; }
  .cover-minimal .cv-kind { color: #555555; }
  .cover-minimal .cv-bottom { font-size: 10.5pt; line-height: 1.5; }
  .cover-minimal .cv-year { border-top: none; }
  .cover .cb-kind { letter-spacing: 0.08em; color: ${accent}; }
  .cover .cb-theme { letter-spacing: 0.1em; margin-top: 16pt; color: #555555; }
  .cover .cb-subtitle { color: #333333; }
  .cover .cb-place { margin-top: 10pt; }
  .cover-minimal .cb-institution { letter-spacing: 0.12em; }
  .cover-minimal .cb-kind { color: #555555; }
  ${coverBlocksCss(style)}
  `;
};
