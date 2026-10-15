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

import { coverDataFrom, MARGINS_CM, type CoverData } from './document-render';
import { numberDocument, type NumberedSection } from './document-numbering';
import type { DocumentStyle, HeaderFooterSlot } from './document-style';
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
  logos?: { school?: DocxImage | null; company?: DocxImage | null };
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
  value ? new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `${label} `, bold: true }), new TextRun({ text: value })] }) : null;

const coverBlocks = (d: CoverData, style: DocumentStyle, logos: DocxDocumentInput['logos']): DocxBlock[] => {
  const accent = hex(style.page.accentColor);
  const out: DocxBlock[] = [];
  const schoolLogo = logoRun(logos?.school, 70);
  const companyLogo = logoRun(logos?.company, 55);
  const institution = [d.university, d.school, d.faculty].filter((v): v is string => Boolean(v));

  if (d.nationalHeader && (style.cover.template === 'classic' || style.cover.template === 'institutional')) {
    const column = (lines: string[]) => lines.map((text, i) => centered(text, { size: 17, bold: i === 0, italics: i === 1, after: 20 }));
    out.push(twoColumns(
      column(['RÉPUBLIQUE DU CAMEROUN', 'Paix – Travail – Patrie', ...institution]),
      column(['REPUBLIC OF CAMEROON', 'Peace – Work – Fatherland', ...institution]),
    ));
    if (schoolLogo) out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [schoolLogo] }));
  } else {
    if (schoolLogo) out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [schoolLogo] }));
    institution.forEach((text) => out.push(centered(text, { bold: true, size: 22, after: 40, caps: style.cover.template !== 'minimal' })));
  }

  out.push(new Paragraph({ spacing: { after: 1200 } }));
  out.push(centered(d.kindLabel, { bold: true, size: 24, color: accent, caps: true, after: 120 }));
  if (d.degree) out.push(centered(`En vue de l’obtention du ${d.degree}`, { italics: true, size: 22, after: 200 }));
  if (style.cover.template === 'classic' || style.cover.template === 'institutional') out.push(centered('Thème', { bold: true, size: 18, color: '555555', caps: true, after: 80 }));
  out.push(centered(d.title || 'Titre du document', { bold: true, size: 40, color: hex(style.headings.color), after: 160 }));
  if (d.subtitle) out.push(centered(d.subtitle, { italics: true, size: 24, after: 160 }));
  if (d.company) {
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({ text: d.kindLabel === 'Rapport de stage' ? 'Stage effectué à ' : 'Réalisé au sein de ' }),
        new TextRun({ text: d.company, bold: true }),
        ...(d.period ? [new TextRun({ text: ` — ${d.period}` })] : []),
      ],
    }));
  }
  if (companyLogo) out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [companyLogo] }));
  out.push(new Paragraph({ spacing: { after: 1000 } }));

  const left = [
    d.studentName ? new Paragraph({ children: [new TextRun({ text: 'Présenté par', bold: true, allCaps: true, size: 18, color: '555555' })] }) : null,
    d.studentName ? new Paragraph({ children: [new TextRun({ text: d.studentName, bold: true, size: 24 })] }) : null,
    labelled('Matricule :', d.matricule),
    labelled('Filière :', d.specialty),
  ].filter((p): p is Paragraph => p !== null);
  const right = [
    d.tutorCorporate || d.tutorAcademic ? new Paragraph({ children: [new TextRun({ text: 'Sous la direction de', bold: true, allCaps: true, size: 18, color: '555555' })] }) : null,
    labelled('Encadreur professionnel :', d.tutorCorporate),
    labelled('Encadreur académique :', d.tutorAcademic),
  ].filter((p): p is Paragraph => p !== null);
  if (left.length || right.length) out.push(twoColumns(left, right));
  (d.extraLines || []).forEach((l) => {
    const p = labelled(l.label ? `${l.label} :` : '', l.value);
    if (p) out.push(p);
  });
  if (d.year) out.push(new Paragraph({ spacing: { before: 400 } }), centered(`Année académique ${d.year}`, { bold: true, size: 22 }));
  return out;
};

// One header/footer line with left, centre and right parts (tab stops).
const slotLine = (
  parts: { left?: HeaderFooterSlot; center?: HeaderFooterSlot; right?: HeaderFooterSlot },
  context: { title: string; author: string; school: string; pageChildren: (string | (typeof PageNumber)[keyof typeof PageNumber])[] },
  contentWidth: number,
  options: { logo?: ImageRun | null; rule?: boolean; accent: string; pagesOnly?: boolean },
): Paragraph => {
  const runs = (slot: HeaderFooterSlot | undefined): (TextRun | SimpleField)[] => {
    if (!slot || slot === 'none') return [];
    if (slot === 'page') return [new TextRun({ children: context.pageChildren, size: 18, color: '555555' })];
    if (options.pagesOnly) return [];
    if (slot === 'chapter') return [new SimpleField('STYLEREF "heading 1"')];
    const text = slot === 'title' ? context.title : slot === 'author' ? context.author : context.school;
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
    border: options.rule ? { bottom: { style: BorderStyle.SINGLE, size: 4, color: options.accent, space: 4 } } : undefined,
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
  };
  const listInstance = { next: 1 };
  const page = { margin: { top: marginTwips, right: marginTwips, bottom: marginTwips, left: marginTwips, header: Math.round(marginTwips / 2), footer: Math.round(marginTwips / 2) } };
  const allBorders = style.page.border === 'single' || style.page.border === 'double' ? pageBorders(style.page.border, accent) : undefined;
  const context = { title: cover.title, author: cover.studentName || '', school: cover.school || cover.university || '' };
  const hf = style.headerFooter;

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
      // Dedication: italic, right-aligned, low on the page.
      const html = section.html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, '<p style="text-align: right;"><em>$2</em></p>');
      return [new Paragraph({ spacing: { before: 4000 } }), ...htmlToDocxBlocks(html, input.images, listInstance, renderOptions)];
    }
    return htmlToDocxBlocks(section.html, input.images, listInstance, renderOptions);
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
      headers: { default: new Header({ children: [new Paragraph('')] }) },
      footers: {
        default: new Footer({
          children: [slotLine({ left: hf.footerLeft, center: hf.footerCenter, right: hf.footerRight }, { ...context, pageChildren: pageChildren(hf.numberFormat, false) }, contentWidth, { accent, pagesOnly: true })],
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
        children: [slotLine({ left: hf.headerLeft, right: hf.headerRight }, { ...context, pageChildren: pageChildren(hf.numberFormat, true) }, contentWidth, {
          accent,
          rule: hf.headerRule,
          logo: hf.logoInHeader ? logoRun(input.logos?.school, 20) : null,
        })],
      }),
    },
    footers: isCareer ? undefined : {
      default: new Footer({
        children: [slotLine({ left: hf.footerLeft, center: hf.footerCenter, right: hf.footerRight }, { ...context, pageChildren: pageChildren(hf.numberFormat, true) }, contentWidth, { accent })],
      }),
    },
    children: bodySections.flatMap((s, i) => [
      ...(isCareer ? [] : [sectionTitle(s.title, true, i > 0)]),
      ...contentOf(s),
    ]),
  });

  const bodySize = Math.round(style.typography.bodySize * 2);
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
          ...heading(Math.round(style.typography.bodySize * 3), { allCaps: style.headings.uppercaseChapters }),
          paragraph: {
            spacing: { before: 0, after: 360 },
            keepNext: true,
            border: style.headings.rule ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: accent, space: 4 } } : undefined,
          },
        },
        heading2: heading(Math.round(style.typography.bodySize * 2.5)),
        heading3: heading(Math.round(style.typography.bodySize * 2.2)),
        heading4: heading(bodySize, { italics: true }),
        heading5: heading(bodySize, { italics: true }),
      },
      paragraphStyles: [
        {
          id: FIGURE_CAPTION,
          name: 'Légende figure',
          basedOn: 'Normal',
          run: { italics: true, size: Math.max(18, bodySize - 2) },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 200 } },
        },
        {
          id: TABLE_CAPTION,
          name: 'Légende tableau',
          basedOn: 'Normal',
          run: { size: Math.max(18, bodySize - 2) },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 160, after: 80 } },
        },
        {
          id: 'TitreHorsSommaire',
          name: 'Titre hors sommaire',
          basedOn: 'Normal',
          run: { font: style.typography.headingFont, size: Math.round(style.typography.bodySize * 3), bold: true, color: hex(style.headings.color), allCaps: style.headings.uppercaseChapters },
          paragraph: { spacing: { after: 360 } },
        },
      ],
    },
    sections,
  });
  return Packer.toBuffer(doc);
};
