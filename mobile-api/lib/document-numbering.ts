import { chapterLabel, chapterNumberOf, classifySection, escapeHtml, normalizeHeadings, type SectionKind } from './document-render';
import type { DocumentStyle } from './document-style';

// Numbers headings and captions as text for the exports (PDF and Word) and lists
// them for the table of contents and the lists of figures and tables. Optionally
// adds an invisible marker to each entry so the PDF renderer can find its page.

export type NumberedSection = {
  id: string;
  title: string;
  kind: SectionKind;
  preliminary: boolean;
  chapter: number | null;
  chapterLabel: string | null;
  html: string;
  // Marker of the section title (its table of contents entry); empty for the cover.
  sectionMarker: string;
};

export type TocEntry = { marker: string; level: 0 | 1 | 2; label: string; text: string };
export type CaptionEntry = { marker: string; kind: 'figure' | 'table'; label: string; text: string };

export type NumberedDocument = {
  sections: NumberedSection[];
  toc: TocEntry[];
  figures: CaptionEntry[];
  tables: CaptionEntry[];
};

const stripTags = (html: string) =>
  html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

// Older captions carry their own number ("Figure 1 : Organigramme").
const LEGACY_LABEL = /^(figure|fig\.?|tableau|tab\.?)\s*[\dIVXivx.]*\s*[:.\-–]?\s*/i;
export const captionText = (html: string) => stripTags(html).replace(LEGACY_LABEL, '').trim();

export const markerToken = (n: number) => `MKR${n}Q`;
const markerSpan = (token: string) => `<span class="mk">${token}</span>`;

export const numberDocument = (
  sections: { id: string; title: string; content_html: string }[],
  style: DocumentStyle,
  options: { markers: boolean },
): NumberedDocument => {
  let markerCount = 0;
  const nextMarker = () => markerToken((markerCount += 1));
  const toc: TocEntry[] = [];
  const figures: CaptionEntry[] = [];
  const tables: CaptionEntry[] = [];
  let looseFigure = 0;
  let looseTable = 0;
  const scheme = style.headings.numbering;

  const numbered = sections.map((section) => {
    const { kind, preliminary } = classifySection(section.title);
    const chapter = kind === 'body' ? chapterNumberOf(section.title) : null;
    const label = chapter ? chapterLabel(chapter, style) : null;
    let html = normalizeHeadings(section.content_html || '');

    if (kind !== 'cover') {
      toc.push({ marker: nextMarker(), level: 0, label: '', text: section.title });
    }
    const sectionMarker = kind !== 'cover' ? toc[toc.length - 1].marker : '';

    // Headings: numbered inside chapters only (introduction and conclusion stay plain).
    let h1 = 0;
    let h2 = 0;
    html = html.replace(/<(h[1-3])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_m, tag: string, attrs = '', inner: string) => {
      const level = Number(tag[1]);
      const text = stripTags(inner);
      if (!text) return `<${tag}${attrs}>${inner}</${tag}>`;
      let prefix = '';
      if (chapter && scheme !== 'none' && level <= 2) {
        if (level === 1) {
          h1 += 1;
          h2 = 0;
          prefix = scheme === 'decimal' ? `${label}.${h1}` : `${String.fromCharCode(64 + Math.min(h1, 26))}.`;
        } else {
          h2 += 1;
          prefix = scheme === 'decimal' ? `${label}.${h1 || 1}.${h2}` : `${h2}.`;
        }
      }
      let marker = '';
      if (level <= 2 && kind === 'body') {
        marker = nextMarker();
        toc.push({ marker, level: level === 1 ? 1 : 2, label: prefix, text });
      }
      const mk = options.markers && marker ? markerSpan(marker) : '';
      const num = prefix ? `<span class="hn">${escapeHtml(prefix)}</span> ` : '';
      return `<${tag}${attrs}>${mk}${num}${inner}</${tag}>`;
    });

    // Figure captions.
    let fig = 0;
    html = html.replace(/<figcaption(\s[^>]*)?>([\s\S]*?)<\/figcaption>/gi, (_m, attrs = '', inner: string) => {
      const text = captionText(inner);
      const n = chapter ? `${label}.${(fig += 1)}` : String((looseFigure += 1));
      const entryLabel = `Figure ${n}`;
      const marker = nextMarker();
      figures.push({ marker, kind: 'figure', label: entryLabel, text });
      const mk = options.markers ? markerSpan(marker) : '';
      return `<figcaption${attrs}>${mk}<span class="cap-label">${escapeHtml(entryLabel)} :</span> ${escapeHtml(text)}</figcaption>`;
    });

    // Table captions (paragraphs inserted from the editor's table bar).
    let tab = 0;
    html = html.replace(/<p(\s[^>]*class="[^"]*doc-table-caption[^"]*"[^>]*)>([\s\S]*?)<\/p>/gi, (_m, attrs: string, inner: string) => {
      const text = captionText(inner);
      const n = chapter ? `${label}.${(tab += 1)}` : String((looseTable += 1));
      const entryLabel = `Tableau ${n}`;
      const marker = nextMarker();
      tables.push({ marker, kind: 'table', label: entryLabel, text });
      const mk = options.markers ? markerSpan(marker) : '';
      return `<p${attrs}>${mk}<span class="cap-label">${escapeHtml(entryLabel)} :</span> ${escapeHtml(text)}</p>`;
    });

    const result: NumberedSection = {
      id: section.id,
      title: section.title,
      kind,
      preliminary,
      chapter,
      chapterLabel: label,
      html,
      sectionMarker,
    };
    return result;
  });

  return { sections: numbered, toc, figures, tables };
};
