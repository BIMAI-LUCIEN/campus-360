import {
  AlignmentType,
  BorderStyle,
  Document as DocxDocument,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  NumberFormat,
  Packer,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageNumber,
  Paragraph,
  ShadingType,
  SimpleField,
  StyleLevel,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
  type ISectionOptions,
} from 'docx';

import { coverBlocksFor, fillTemplate } from './document-cover';
import { authorLine, coverDataFrom, MARGINS_CM, type CoverData } from './document-render';
import { numberDocument, type NumberedSection } from './document-numbering';
import type { CoverLogoSlot, DocumentStyle, HeaderFooterSlot } from './document-style';
import { docxNumberingConfig, htmlToDocxBlocks, type DocxBlock, type DocxImage } from './html-to-docx';

// Word export of an academic document (rapport de stage, mémoire): cover page,
// preliminary pages numbered i, ii, iii, body numbered from 1, headers and
// footers from the document style, native table of contents and lists.

export type DocxDocumentInput = {
  document: { title: string; template_type: string; cover_data: Record<string, unknown> | null };
  // Cleaned section HTML (images referenced by data-file-id).
  sections: { id: string; title: string; content_html: string }[];
  style: DocumentStyle;
  images: Map<string, DocxImage>;
  logos?: { school?: DocxImage | null; company?: DocxImage | null; department?: DocxImage | null };
};

const FIGURE_CAPTION = 'LegendeFigure';
const TABLE_CAPTION = 'LegendeTableau';
const TWIPS_PER_CM = 567;
const A4_WIDTH_TWIPS = 11906;
const hex = (value: string) => value.replace('#', '').toUpperCase();

const logoRun = (logo: DocxImage | null | undefined, height: number): ImageRun | null => {
  if (!logo) return null;
  const type = logo.mime === 'image/png' ? 'png' : logo.mime === 'image/jpeg' ? 'jpg' : null;
  if (!type) return null;
  const ratio = logo.width && logo.height ? logo.width / logo.height : 1.5;
  return new ImageRun({ type, data: logo.data, transformation: { width: Math.round(height * ratio), height } });
};

const centered = (text: string, options: { size?: number; bold?: boolean; italics?: boolean; after?: number; color?: string; caps?: boolean } = {}) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: options.after ?? 100 },
    children: [new TextRun({ text, size: options.size, bold: options.bold, italics: options.italics, color: options.color, allCaps: options.caps })],
  });

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const twoColumns = (left: Paragraph[], right: Paragraph[]) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [left, right].map(
          (children) => new TableCell({ borders: NO_BORDERS, width: { size: 50, type: WidthType.PERCENTAGE }, children: children.length ? children : [new Paragraph('')] }),
        ),
      }),
    ],
  });

const labelled = (label: string, value?: string) =>
  value ? new Paragraph({ spacing: { after: 40 }, children: [...(label ? [new TextRun({ text: `${label} `, bold: true })] : []), new TextRun({ text: value })] }) : null;

const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT } as const;
const MM_TWIPS = 56.7;

const unescape = (text: string) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// Turns a filled cover line (escaped text with <strong>/<em>) into runs.
const filledRuns = (html: string, base: { size: number; bold: boolean; italics: boolean; caps: boolean; underline: boolean; color?: string }) => {
  const runs: TextRun[] = [];
  let bold = false;
  let italics = false;
  for (const part of html.split(/(<\/?(?:strong|em)>)/)) {
    if (part === '<strong>' || part === '</strong>') bold = part === '<strong>';
    else if (part === '<em>' || part === '</em>') italics = part === '<em>';
    else if (part) {
      runs.push(new TextRun({
        text: unescape(part),
        size: base.size,
        bold: base.bold || bold,
        italics: base.italics || italics,
        allCaps: base.caps,
        underline: base.underline ? {} : undefined,
        color: base.color,
      }));
    }
  }
  return runs;
};

const columns = (cells: (Paragraph | Table)[][]) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: cells.map(
          (children) => new TableCell({ borders: NO_BORDERS, width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE }, children: children.length ? children : [new Paragraph('')] }),
        ),
      }),
    ],
  });

// Cover from blocks (Module 24): the same blocks as the screen and the PDF.
// Word cannot stretch spaces to fill the page, so a growing spacer is a fixed gap.
const coverBlocks = (d: CoverData, style: DocumentStyle, logos: DocxDocumentInput['logos']): DocxBlock[] => {
  const accent = hex(style.page.accentColor);
  const blocks = style.cover.blocks ?? coverBlocksFor(style.cover.template, Boolean(d.nationalHeader));
  const out: DocxBlock[] = [];
  // Colours of the ready covers that the HTML gets from its CSS.
  const legacyColor = (id: string) => (id === 'kind' ? (style.cover.template === 'minimal' ? '555555' : accent) : id === 'theme' ? '555555' : undefined);

  for (const block of blocks) {
    const b = block.style;
    const color = b.color ? hex(b.color) : legacyColor(block.id);
    const base = { size: Math.round(b.size * 2), bold: b.bold, italics: b.italic, caps: b.uppercase, underline: b.underline, color };
    const para = (html: string, extra: Record<string, unknown> = {}) =>
      new Paragraph({ alignment: ALIGN[b.align], spacing: { after: 60 }, children: filledRuns(html, base), ...extra });
    const fill = (template: string) => fillTemplate(template, d);
    const logo = (slot: CoverLogoSlot | null, height: number) => {
      const run = slot ? logoRun(logos?.[slot], height) : null;
      return run ? new Paragraph({ alignment: AlignmentType.CENTER, children: [run] }) : null;
    };

    switch (block.type) {
      case 'bilingual-header': {
        const col = (lines: string[]) =>
          lines.map(fill).filter((l): l is string => l !== null).map((l) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: filledRuns(l, base) }));
        const middle = logo(block.center, 60);
        out.push(columns(middle ? [col(block.left), [middle], col(block.right)] : [col(block.left), col(block.right)]));
        break;
      }
      case 'logos': {
        const left = logo(block.left, Math.round(block.height));
        const right = logo(block.right, Math.round(block.height));
        const mid: Paragraph[] = block.center
          ? [logo(block.center, Math.round(block.height))].filter((p): p is Paragraph => p !== null)
          : block.centerText.split('\n').map(fill).filter((l): l is string => l !== null).map((l) => para(l));
        if (!left && !right && !mid.length) break;
        if (!block.left && !block.right) out.push(...mid);
        else out.push(columns([left ? [left] : [], mid, right ? [right] : []]));
        if (block.rule) out.push(new Paragraph({ spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: accent, space: 4 } } }));
        break;
      }
      case 'title-banner': {
        const text = `${block.prefix ? `${block.prefix} ` : ''}${d.title || 'Titre du document'}`;
        const runs = filledRuns(text.replace(/&/g, '&amp;').replace(/</g, '&lt;'), {
          ...base,
          color: b.color ? hex(b.color) : block.variant === 'band' ? hex(style.headerFooter.headerTextColor) : color ?? (style.cover.template === 'modern' ? accent : hex(style.headings.color)),
        });
        out.push(new Paragraph({
          alignment: ALIGN[b.align],
          spacing: { before: 120, after: 160 },
          shading: block.variant === 'band' ? { type: ShadingType.CLEAR, color: 'auto', fill: hex(block.fill || style.page.bandColor) } : undefined,
          border: block.variant === 'frame'
            ? { top: { style: BorderStyle.SINGLE, size: 12, color: accent, space: 6 }, bottom: { style: BorderStyle.SINGLE, size: 12, color: accent, space: 6 } }
            : undefined,
          children: runs,
        }));
        break;
      }
      case 'heading': {
        const text = fill(block.text);
        if (text) out.push(para(text));
        break;
      }
      case 'text':
        block.template.split('\n').map(fill).forEach((l) => l && out.push(para(l)));
        break;
      case 'author': {
        if (!d.studentName && !d.matricule) break;
        if (block.label) out.push(new Paragraph({ alignment: ALIGN[b.align], children: [new TextRun({ text: block.label, bold: b.bold, underline: {}, size: base.size })] }));
        if (d.studentName) out.push(new Paragraph({ alignment: ALIGN[b.align], children: [new TextRun({ text: d.studentName, bold: true, size: base.size + 2 })] }));
        const m = labelled(block.matriculeLabel, d.matricule);
        if (m) out.push(m);
        break;
      }
      case 'supervisors': {
        const head = (text: string) =>
          text ? new Paragraph({ children: [new TextRun({ text, bold: block.layout === 'author-left' || b.bold, allCaps: block.layout === 'author-left', underline: block.layout === 'columns' ? {} : undefined, size: block.layout === 'columns' ? base.size : 18, color: block.layout === 'author-left' ? '555555' : undefined })] }) : null;
        if (block.layout === 'author-left') {
          const left = [
            d.studentName ? head(block.authorLabel) : null,
            d.studentName ? new Paragraph({ children: [new TextRun({ text: d.studentName, bold: true, size: 24 })] }) : null,
            labelled(block.matriculeLabel, d.matricule),
            labelled(block.specialtyLabel, d.specialty),
          ].filter((p): p is Paragraph => p !== null);
          const right = [
            d.tutorCorporate || d.tutorAcademic ? head(block.label) : null,
            labelled(block.corporateLabel, d.tutorCorporate),
            labelled(block.academicLabel, d.tutorAcademic),
          ].filter((p): p is Paragraph => p !== null);
          if (left.length || right.length) out.push(columns([left, right]));
        } else {
          const col = (label: string, value?: string) =>
            value ? [head(label), new Paragraph({ children: [new TextRun({ text: value, bold: b.bold, size: base.size })] })].filter((p): p is Paragraph => p !== null) : [];
          const cells = [col(block.academicLabel, d.tutorAcademic), col(block.corporateLabel, d.tutorCorporate)];
          if (!cells.some((c) => c.length)) break;
          const label = head(block.label);
          if (label) out.push(label);
          out.push(columns(cells));
        }
        break;
      }
      case 'year-banner': {
        const text = fill(block.template);
        if (!text) break;
        const band = block.variant === 'band';
        out.push(new Paragraph({
          alignment: ALIGN[b.align],
          spacing: { before: 200 },
          shading: band ? { type: ShadingType.CLEAR, color: 'auto', fill: hex(block.fill || style.page.bandColor) } : undefined,
          border: block.variant === 'rule' ? { top: { style: BorderStyle.SINGLE, size: 8, color: accent, space: 6 } } : undefined,
          children: filledRuns(text, { ...base, color: b.color ? hex(b.color) : band ? hex(style.headerFooter.headerTextColor) : color }),
        }));
        break;
      }
      case 'spacer':
        out.push(new Paragraph({ spacing: { after: block.grow ? 900 : Math.round(block.height * MM_TWIPS) } }));
        break;
      case 'extra-lines':
        (d.extraLines || []).forEach((l) => {
          const p = labelled(l.label ? `${l.label} :` : '', l.value);
          if (p) out.push(p);
        });
        break;
      default:
        break;
    }
  }
  return out;
};

// One header/footer line with left, centre and right parts (tab stops).
const slotLine = (
  parts: { left?: HeaderFooterSlot; center?: HeaderFooterSlot; right?: HeaderFooterSlot },
  context: { title: string; author: string; school: string; pageChildren: (string | (typeof PageNumber)[keyof typeof PageNumber])[] },
  contentWidth: number,
  options: {
    logo?: ImageRun | null;
    rule?: boolean;
    accent: string;
    pagesOnly?: boolean;
    // Module 24: author kept on preliminary pages, line above, framed number.
    keepAuthor?: boolean;
    topRule?: boolean;
    numberFrame?: boolean;
    authorLabel?: string; // printed in bold before the author's name
  },
): Paragraph => {
  const runs = (slot: HeaderFooterSlot | undefined): (TextRun | SimpleField)[] => {
    if (!slot || slot === 'none') return [];
    if (slot === 'page') {
      return [new TextRun({
        children: context.pageChildren,
        size: 18,
        color: '555555',
        border: options.numberFrame ? { style: BorderStyle.SINGLE, size: 6, color: options.accent, space: 2 } : undefined,
      })];
    }
    if (options.pagesOnly && !(slot === 'author' && options.keepAuthor)) return [];
    if (slot === 'chapter') return [new SimpleField('STYLEREF "heading 1"')];
    const text = slot === 'title' ? context.title : slot === 'author' ? context.author : context.school;
    if (slot === 'author' && options.authorLabel && text.startsWith(options.authorLabel)) {
      return [
        new TextRun({ text: options.authorLabel, bold: true, size: 18, color: '555555' }),
        new TextRun({ text: text.slice(options.authorLabel.length), size: 18, color: '555555' }),
      ];
    }
    return text ? [new TextRun({ text, size: 18, color: '555555' })] : [];
  };
  const left = runs(parts.left);
  const center = runs(parts.center);
  const right = runs(parts.right);
  return new Paragraph({
    tabStops: [
      { type: TabStopType.CENTER, position: Math.round(contentWidth / 2) },
      { type: TabStopType.RIGHT, position: contentWidth },
    ],
    border: options.rule || options.topRule
      ? {
          ...(options.rule ? { bottom: { style: BorderStyle.SINGLE, size: 4, color: options.accent, space: 4 } } : {}),
          ...(options.topRule ? { top: { style: BorderStyle.SINGLE, size: 4, color: options.accent, space: 4 } } : {}),
        }
      : undefined,
    children: [
      ...(options.logo ? [options.logo, new TextRun({ text: '  ' })] : []),
      ...left,
      new TextRun({ text: '\t' }),
      ...center,
      new TextRun({ text: '\t' }),
      ...right,
    ],
  });
};

// Header band (Module 24): the document title on a coloured strip.
const bandLine = (title: string, style: DocumentStyle) => {
  const side = { style: BorderStyle.SINGLE, size: 6, color: hex(style.page.accentColor), space: 4 };
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: hex(style.page.bandColor) },
    border: { top: side, bottom: side, left: side, right: side },
    children: [new TextRun({ text: title, bold: true, allCaps: true, size: 15, color: hex(style.headerFooter.headerTextColor) })],
  });
};

const pageChildren = (format: DocumentStyle['headerFooter']['numberFormat'], body: boolean) => {
  if (format === 'page-n') return ['Page ', PageNumber.CURRENT];
  if (format === 'n-of-total' && body) return [PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES_IN_SECTION];
  return [PageNumber.CURRENT];
};

const pageBorders = (kind: 'single' | 'double', accent: string) => {
  const side = { style: kind === 'double' ? BorderStyle.DOUBLE : BorderStyle.SINGLE, size: kind === 'double' ? 12 : 6, color: accent, space: 24 };
  return {
    pageBorders: { display: PageBorderDisplay.ALL_PAGES, offsetFrom: PageBorderOffsetFrom.PAGE },
    pageBorderTop: side,
    pageBorderRight: side,
    pageBorderBottom: side,
    pageBorderLeft: side,
  };
};

const sectionTitle = (title: string, inToc: boolean, pageBreak: boolean) =>
  inToc
    ? new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak })
    : new Paragraph({ style: 'TitreHorsSommaire', pageBreakBefore: pageBreak, children: [new TextRun({ text: title })] });

export const buildDocumentDocx = async (input: DocxDocumentInput): Promise<Buffer> => {
  const { style } = input;
  const numbered = numberDocument(input.sections, style, { markers: false });
  const cover = coverDataFrom(input.document.cover_data, input.document, style);
  const accent = hex(style.page.accentColor);
  const marginTwips = Math.round(MARGINS_CM[style.page.margins] * TWIPS_PER_CM);
  const contentWidth = A4_WIDTH_TWIPS - 2 * marginTwips;
  const renderOptions = {
    tableStyle: style.tables.style,
    tableHeaderColor: style.tables.headerColor,
    accentColor: style.page.accentColor,
    figureCaptionStyle: FIGURE_CAPTION,
    tableCaptionStyle: TABLE_CAPTION,
    bullet: style.lists.bullet,
    captionLook: style.captions.style,
    paragraphIndent: style.typography.paragraphIndent,
    paragraphAfter: style.typography.paragraphSpacing === 'airy' ? 240 : 160,
  };
  // A caption label not in bold: the converter only bolds the class "cap-label".
  const captionLabels = (html: string) => (style.captions.boldLabel ? html : html.replace(/class="cap-label"/g, 'class="cap-label-plain"'));
  const listInstance = { next: 1 };
  const page = { margin: { top: marginTwips, right: marginTwips, bottom: marginTwips, left: marginTwips, header: Math.round(marginTwips / 2), footer: Math.round(marginTwips / 2) } };
  const allBorders = style.page.border === 'single' || style.page.border === 'double' ? pageBorders(style.page.border, accent) : undefined;
  const context = { title: cover.title, author: authorLine(style, cover.studentName), school: cover.school || cover.university || '' };
  const hf = style.headerFooter;
  const band = hf.headerStyle === 'band';
  const footerOptions = { accent, topRule: hf.footerRule, numberFrame: hf.pageNumberFrame === 'box', authorLabel: hf.authorLabel.trim() || undefined };

  const tocEntries = numbered.toc
    .filter((e) => !numbered.sections.some((s) => s.sectionMarker === e.marker && s.kind === 'toc'))
    .map((e) => ({ title: e.label ? `${e.label} ${e.text}` : e.text, level: e.level + 1 }));

  const contentOf = (section: NumberedSection): DocxBlock[] => {
    if (section.kind === 'toc') {
      return [new TableOfContents('Sommaire', { hyperlink: true, headingStyleRange: '1-3', cachedEntries: tocEntries })];
    }
    if (section.kind === 'lists') {
      const t = section.title.toLowerCase();
      const blocks: DocxBlock[] = [];
      if (/figure|illustration/.test(t) || !/tableau/.test(t)) {
        blocks.push(
          new Paragraph({ heading: HeadingLevel.HEADING_3, text: 'Liste des figures' }),
          new TableOfContents('Liste des figures', {
            stylesWithLevels: [new StyleLevel('Légende figure', 1)],
            cachedEntries: numbered.figures.map((f) => ({ title: `${f.label} : ${f.text}`, level: 1 })),
          }),
        );
      }
      if (/tableau/.test(t)) {
        blocks.push(
          new Paragraph({ heading: HeadingLevel.HEADING_3, text: 'Liste des tableaux' }),
          new TableOfContents('Liste des tableaux', {
            stylesWithLevels: [new StyleLevel('Légende tableau', 1)],
            cachedEntries: numbered.tables.map((f) => ({ title: `${f.label} : ${f.text}`, level: 1 })),
          }),
        );
      }
      return blocks;
    }
    if (section.kind === 'dedication') {
      // Dedication: italic, right-aligned, low on the page (framed when the style asks).
      const html = section.html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, '<p style="text-align: right;"><em>$2</em></p>');
      const blocks = htmlToDocxBlocks(html, input.images, listInstance, { ...renderOptions, framed: style.dedication.frame });
      return [new Paragraph({ spacing: { before: 4000 } }), ...blocks];
    }
    return htmlToDocxBlocks(captionLabels(section.html), input.images, listInstance, renderOptions);
  };

  const prelim = numbered.sections.filter((s) => s.kind !== 'cover' && s.preliminary);
  const body = numbered.sections.filter((s) => s.kind === 'body');
  const isCareer = input.document.template_type === 'cv' || input.document.template_type === 'lettre_motivation';

  const sections: ISectionOptions[] = [];
  if (!isCareer) {
    sections.push({
      properties: { page: { ...page, borders: style.page.border === 'cover-only' ? pageBorders('double', accent) : allBorders } },
      children: coverBlocks(cover, style, input.logos),
    });
  }
  if (prelim.length > 0 && !isCareer) {
    sections.push({
      properties: { page: { ...page, borders: allBorders, pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } } },
      headers: { default: new Header({ children: [band ? bandLine(context.title, style) : new Paragraph('')] }) },
      footers: {
        default: new Footer({
          children: [slotLine({ left: hf.footerLeft, center: hf.footerCenter, right: hf.footerRight }, { ...context, pageChildren: pageChildren(hf.numberFormat, false) }, contentWidth, {
            ...footerOptions,
            pagesOnly: true,
            keepAuthor: Boolean(hf.authorLabel.trim()),
          })],
        }),
      },
      children: prelim.flatMap((s, i) => [sectionTitle(s.title, s.kind !== 'toc', i > 0), ...contentOf(s)]),
    });
  }
  const bodySections = isCareer ? numbered.sections.filter((s) => s.kind !== 'cover') : body;
  sections.push({
    properties: { page: { ...page, borders: isCareer ? undefined : allBorders, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
    headers: isCareer ? undefined : {
      default: new Header({
        children: [band ? bandLine(context.title, style) : slotLine({ left: hf.headerLeft, right: hf.headerRight }, { ...context, pageChildren: pageChildren(hf.numberFormat, true) }, contentWidth, {
          accent,
          rule: hf.headerRule,
          logo: hf.logoInHeader ? logoRun(input.logos?.school, 20) : null,
        })],
      }),
    },
    footers: isCareer ? undefined : {
      default: new Footer({
        children: [slotLine({ left: hf.footerLeft, center: hf.footerCenter, right: hf.footerRight }, { ...context, pageChildren: pageChildren(hf.numberFormat, true) }, contentWidth, footerOptions)],
      }),
    },
    children: bodySections.flatMap((s, i) => [
      ...(isCareer ? [] : [sectionTitle(s.title, true, i > 0)]),
      ...contentOf(s),
    ]),
  });

  const bodySize = Math.round(style.typography.bodySize * 2);
  const normalTitles = style.headings.titleSize === 'normal';
  const boldCaption = style.captions.style === 'bold-left';
  const captionAlign = boldCaption ? AlignmentType.LEFT : AlignmentType.CENTER;
  const heading = (size: number, extra: { allCaps?: boolean; italics?: boolean } = {}) => ({
    run: { font: style.typography.headingFont, size, bold: true, color: hex(style.headings.color), ...extra },
    paragraph: { spacing: { before: 240, after: 120 }, keepNext: true },
  });

  const doc = new DocxDocument({
    creator: 'Campus 360',
    title: cover.title || 'Document',
    features: { updateFields: true },
    numbering: docxNumberingConfig,
    styles: {
      default: {
        document: {
          run: { font: style.typography.bodyFont, size: bodySize },
          paragraph: { spacing: { line: Math.round(240 * style.typography.lineSpacing) }, alignment: AlignmentType.JUSTIFIED },
        },
        heading1: {
          ...heading(Math.round(style.typography.bodySize * (normalTitles ? 2.1 : 3)), { allCaps: style.headings.uppercaseChapters }),
          paragraph: {
            spacing: { before: 0, after: 360 },
            keepNext: true,
            alignment: style.headings.titleAlign === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
            border: style.headings.rule ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: accent, space: 4 } } : undefined,
          },
        },
        heading2: heading(Math.round(style.typography.bodySize * (normalTitles ? 2 : 2.5)), { allCaps: style.headings.uppercaseSections }),
        heading3: heading(Math.round(style.typography.bodySize * (normalTitles ? 2 : 2.2)), { allCaps: style.headings.uppercaseSections }),
        heading4: heading(bodySize, { italics: true }),
        heading5: heading(bodySize, { italics: true }),
      },
      paragraphStyles: [
        {
          id: FIGURE_CAPTION,
          name: 'Légende figure',
          basedOn: 'Normal',
          run: { italics: !boldCaption, bold: boldCaption, size: Math.max(18, bodySize - 2) },
          paragraph: { alignment: captionAlign, spacing: { after: 200 } },
        },
        {
          id: TABLE_CAPTION,
          name: 'Légende tableau',
          basedOn: 'Normal',
          run: { italics: !boldCaption, bold: boldCaption, size: Math.max(18, bodySize - 2) },
          paragraph: { alignment: captionAlign, spacing: { before: 160, after: 80 } },
        },
        {
          id: 'TitreHorsSommaire',
          name: 'Titre hors sommaire',
          basedOn: 'Normal',
          run: { font: style.typography.headingFont, size: Math.round(style.typography.bodySize * (normalTitles ? 2.1 : 3)), bold: true, color: hex(style.headings.color), allCaps: style.headings.uppercaseChapters },
          paragraph: { spacing: { after: 360 }, alignment: style.headings.titleAlign === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT },
        },
      ],
    },
    sections,
  });
  return Packer.toBuffer(doc);
};
