import { authorLine, coverCss, coverDataFrom, coverHtml, escapeHtml, MARGINS_CM, showsHeaderBand, styleToCss, toRoman } from './document-render';
import { numberDocument, type CaptionEntry, type NumberedDocument, type TocEntry } from './document-numbering';
import type { DocumentStyle, HeaderFooterSlot } from './document-style';
import { findMarkerPages, stampPdf, type PageStamp } from './pdf-pagination';
import { renderHtmlToPdf } from './pdf-render';

// Academic PDF (rapport de stage, mémoire): cover, preliminary pages numbered
// i, ii, iii, body numbered from 1, headers and footers from the document style,
// a table of contents and lists of figures/tables with real page numbers.
// No database access: everything comes in through `PdfDocumentInput`.

export type LoadedLogo = { data: Buffer; mime: string } | null;

export type PdfDocumentInput = {
  document: { title: string; template_type: string; cover_data: Record<string, unknown> | null };
  // Content already cleaned and with images inlined as data URIs.
  sections: { id: string; title: string; content_html: string }[];
  style: DocumentStyle;
  logos?: { school?: LoadedLogo; company?: LoadedLogo; department?: LoadedLogo };
  watermark?: string | null;
};

const PT_PER_CM = 28.3465;
const dataUri = (logo: LoadedLogo | undefined) => (logo ? `data:${logo.mime};base64,${logo.data.toString('base64')}` : null);

type EntryPages = Map<string, string>; // marker → page label

const tocHtml = (entries: TocEntry[], pages: EntryPages | null) =>
  `<div class="toc">${entries
    .map(
      (e) => `<div class="toc-line toc-l${e.level}${e.chapter ? ' toc-chapter' : ''}"><span class="toc-text">${e.label ? `${escapeHtml(e.label)} ` : ''}${escapeHtml(e.text)}</span><span class="toc-dots"></span><span class="toc-page">${escapeHtml(pages?.get(e.marker) ?? '')}</span></div>`,
    )
    .join('')}</div>`;

const captionListHtml = (title: string, entries: CaptionEntry[], pages: EntryPages | null, empty: string) => `
  <h3 class="list-title">${escapeHtml(title)}</h3>
  ${entries.length === 0 ? `<p class="list-empty">${escapeHtml(empty)}</p>` : `<div class="toc">${entries
    .map(
      (e) => `<div class="toc-line toc-l1"><span class="toc-text"><strong>${escapeHtml(e.label)}</strong> : ${escapeHtml(e.text)}</span><span class="toc-dots"></span><span class="toc-page">${escapeHtml(pages?.get(e.marker) ?? '')}</span></div>`,
    )
    .join('')}</div>`}`;

const PRINT_CSS = `
  html, body { margin: 0; padding: 0; background: #FFFFFF; }
  .doc-section { position: relative; break-before: page; page-break-before: always; }
  .doc-section:first-child { break-before: auto; page-break-before: auto; }
  .doc-section-title, .doc-body h1, .doc-body h2, .doc-body h3, .doc-body figcaption, .doc-body .doc-table-caption { position: relative; }
  .mk { position: absolute; left: 0; top: 0; font-size: 1px; line-height: 1px; color: #FFFFFF; white-space: nowrap; letter-spacing: 0; text-transform: none; font-style: normal; }
  .hn { margin-right: 0.3em; }
  .cap-label { font-weight: 700; font-style: normal; }
  .toc { margin-top: 0.4em; }
  .toc-line { display: flex; align-items: baseline; gap: 4pt; margin: 0 0 0.35em; line-height: 1.35; }
  .toc-text { flex: 0 1 auto; }
  .toc-dots { flex: 1 1 auto; border-bottom: 1pt dotted #8A8F98; transform: translateY(-3pt); min-width: 12pt; }
  .toc-page { flex: 0 0 auto; min-width: 2.6em; text-align: right; }
  .toc-l0 { font-weight: 700; margin-top: 0.6em; }
  .toc-chapter { font-weight: 700; padding-left: 0; }
  .toc-l1 { padding-left: 1.2em; }
  .toc-l2 { padding-left: 2.4em; font-size: 0.95em; }
  .list-title { font-size: 1.05em; margin: 1em 0 0.4em; }
  .list-empty { color: #6B7280; font-style: italic; text-indent: 0 !important; }
  .doc-section[data-kind="dedication"] .doc-body { margin-top: 110mm; }
  .watermark { position: fixed; top: 46%; left: 8%; width: 84%; transform: rotate(-32deg); color: rgba(15, 23, 42, 0.12); font-size: 34pt; font-weight: 800; text-align: center; z-index: 9999; }
`;

export const buildPdfHtml = (
  input: PdfDocumentInput,
  numbered: NumberedDocument,
  options: { markers: boolean; pages: EntryPages | null },
): string => {
  const { style } = input;
  const marginCm = MARGINS_CM[style.page.margins];
  const coverHeight = `${297 - 2 * marginCm * 10 - 3}mm`;
  const cover = coverDataFrom(input.document.cover_data, input.document, style);
  const logos = { school: dataUri(input.logos?.school), company: dataUri(input.logos?.company), department: dataUri(input.logos?.department) };
  const mk = (marker: string) => (options.markers && marker ? `<span class="mk">${marker}</span>` : '');
  const tocEntries = numbered.toc.filter((e) => {
    const owner = numbered.sections.find((s) => s.sectionMarker === e.marker);
    return !owner || owner.kind !== 'toc';
  });

  const body = numbered.sections
    .map((section) => {
      if (section.kind === 'cover') {
        return `<section class="doc-section" data-kind="cover">${coverHtml(cover, style, logos)}</section>`;
      }
      let content = section.html;
      if (section.kind === 'toc') content = tocHtml(tocEntries, options.pages);
      if (section.kind === 'lists') {
        const t = section.title.toLowerCase();
        const wantsFigures = /figure|illustration/.test(t) || !/tableau/.test(t);
        const wantsTables = /tableau/.test(t);
        content = [
          wantsFigures ? captionListHtml('Liste des figures', numbered.figures, options.pages, 'Aucune figure dans le document.') : '',
          wantsTables ? captionListHtml('Liste des tableaux', numbered.tables, options.pages, 'Aucun tableau dans le document.') : '',
        ].join('');
      }
      const chapter = section.chapterLabel ? ` data-chapter="${escapeHtml(section.chapterLabel)}"` : '';
      return `<section class="doc-section" data-kind="${section.kind}"${chapter}>
        <h2 class="doc-section-title">${mk(section.sectionMarker)}${escapeHtml(section.title)}</h2>
        <div class="doc-body">${content}</div>
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(cover.title)}</title>
<style>
  @page { size: A4; margin: ${marginCm}cm; }
  ${PRINT_CSS}
  ${styleToCss(style, { cssNumbering: false })}
  ${coverCss(style, coverHeight, false)}
</style>
</head>
<body>
${input.watermark ? `<div class="watermark">${escapeHtml(input.watermark)}</div>` : ''}
${body}
</body>
</html>`;
};

type Layout = {
  pageCount: number;
  labels: (string | null)[]; // printed page number per page (null: none)
  kinds: ('cover' | 'prelim' | 'body')[];
  sectionAt: (string | null)[]; // title of the section running on each page
  totalBody: number;
};

export const computeLayout = (numbered: NumberedDocument, markerPages: Map<string, number>, pageCount: number): Layout => {
  const starts = numbered.sections
    .map((s) => ({ section: s, page: s.kind === 'cover' ? 0 : markerPages.get(s.sectionMarker) }))
    .filter((s): s is { section: (typeof numbered.sections)[number]; page: number } => typeof s.page === 'number')
    .sort((a, b) => a.page - b.page);
  const firstOf = (test: (s: (typeof numbered.sections)[number]) => boolean) => {
    const found = starts.find((s) => test(s.section));
    return found ? found.page : null;
  };
  const firstContent = firstOf((s) => s.kind !== 'cover') ?? pageCount;
  const firstBody = firstOf((s) => s.kind === 'body') ?? pageCount;
  const firstPrelim = Math.min(firstOf((s) => s.preliminary) ?? firstBody, firstBody);

  const kinds: Layout['kinds'] = [];
  const labels: Layout['labels'] = [];
  const sectionAt: Layout['sectionAt'] = [];
  for (let page = 0; page < pageCount; page += 1) {
    const kind = page < Math.min(firstContent, firstPrelim) ? 'cover' : page < firstBody ? 'prelim' : 'body';
    kinds.push(kind);
    labels.push(kind === 'cover' ? null : kind === 'prelim' ? toRoman(page - firstPrelim + 1).toLowerCase() : String(page - firstBody + 1));
    const running = starts.filter((s) => s.page <= page).pop();
    sectionAt.push(running && running.section.kind !== 'cover' ? running.section.title : null);
  }
  return { pageCount, labels, kinds, sectionAt, totalBody: Math.max(0, pageCount - firstBody) };
};

const entryPageLabels = (numbered: NumberedDocument, markerPages: Map<string, number>, layout: Layout): EntryPages => {
  const map: EntryPages = new Map();
  for (const entry of [...numbered.toc, ...numbered.figures, ...numbered.tables]) {
    const page = markerPages.get(entry.marker);
    if (page !== undefined) map.set(entry.marker, layout.labels[page] ?? '');
  }
  return map;
};

const slotText = (
  slot: HeaderFooterSlot,
  context: { title: string; author: string; school: string; section: string | null; page: string },
) => {
  switch (slot) {
    case 'title':
      return context.title;
    case 'chapter':
      return context.section || '';
    case 'author':
      return context.author;
    case 'school':
      return context.school;
    case 'page':
      return context.page;
    default:
      return '';
  }
};

export const buildStamps = (input: PdfDocumentInput, layout: Layout): PageStamp[] => {
  const { style } = input;
  const hf = style.headerFooter;
  const cover = coverDataFrom(input.document.cover_data, input.document, style);
  const pageBorder = style.page.border === 'single' || style.page.border === 'double' ? style.page.border : 'none';

  return layout.kinds.map((kind, page) => {
    if (kind === 'cover') {
      return { border: style.page.border === 'cover-only' ? 'double' : pageBorder };
    }
    const label = layout.labels[page] || '';
    const pageText =
      kind === 'prelim'
        ? hf.numberFormat === 'page-n' ? `Page ${label}` : label
        : hf.numberFormat === 'page-n' ? `Page ${label}` : hf.numberFormat === 'n-of-total' ? `${label} / ${layout.totalBody}` : label;
    const context = {
      title: cover.title,
      author: authorLine(style, cover.studentName),
      school: cover.school || cover.university || '',
      section: layout.sectionAt[page],
      page: pageText,
    };
    // Preliminary pages carry their number, and the author when the style has an
    // author label (Module 24); the other header texts start with the body.
    const labelled = Boolean(hf.authorLabel.trim());
    const only = (slot: HeaderFooterSlot) =>
      kind === 'prelim' ? (slot === 'page' ? pageText : slot === 'author' && labelled ? context.author : '') : slotText(slot, context);
    const band = showsHeaderBand(kind === 'prelim' ? 'foreword' : 'body', style);
    const footer = { left: only(hf.footerLeft), center: only(hf.footerCenter), right: only(hf.footerRight) };
    const numberSlot = hf.footerRight === 'page' ? 'right' : hf.footerCenter === 'page' ? 'center' : hf.footerLeft === 'page' ? 'left' : undefined;
    return {
      border: pageBorder,
      header: { left: only(hf.headerLeft), right: only(hf.headerRight) },
      footer,
      headerRule: kind === 'body' && hf.headerRule,
      logo: kind === 'body' && !band && hf.logoInHeader && Boolean(input.logos?.school),
      band: band ? { color: style.page.bandColor, textColor: hf.headerTextColor, text: cover.title } : undefined,
      footerRule: hf.footerRule,
      numberFrame: hf.pageNumberFrame === 'box',
      numberSlot,
      wideFooterLeft: hf.footerLeft === 'author' && labelled && !footer.center,
    };
  });
};

const SERIF_FONTS = new Set(['Times New Roman', 'Georgia', 'Garamond', 'Cambria']);

export const renderDocumentPdf = async (input: PdfDocumentInput): Promise<Buffer> => {
  const marked = numberDocument(input.sections, input.style, { markers: true });

  // Pass 1: find where every title, heading and caption lands.
  const first = await renderHtmlToPdf(buildPdfHtml(input, marked, { markers: true, pages: null }));
  const firstMap = await findMarkerPages(first);
  let layout = computeLayout(marked, firstMap.pages, firstMap.pageCount);
  const pages = entryPageLabels(marked, firstMap.pages, layout);

  // Pass 2: same document with real page numbers in the table of contents and lists.
  const plain = numberDocument(input.sections, input.style, { markers: false });
  let final = await renderHtmlToPdf(buildPdfHtml(input, plain, { markers: false, pages }));
  const finalCount = (await findMarkerPages(final)).pageCount;
  if (finalCount !== firstMap.pageCount) {
    // The filled table of contents moved pages: measure again on this layout.
    final = await renderHtmlToPdf(buildPdfHtml(input, marked, { markers: true, pages }));
    const again = await findMarkerPages(final);
    layout = computeLayout(marked, again.pages, again.pageCount);
  }

  return stampPdf(final, buildStamps(input, layout), {
    marginPt: MARGINS_CM[input.style.page.margins] * PT_PER_CM,
    serif: SERIF_FONTS.has(input.style.typography.bodyFont),
    accentColor: input.style.page.accentColor,
    logo: input.logos?.school ?? null,
  });
};
