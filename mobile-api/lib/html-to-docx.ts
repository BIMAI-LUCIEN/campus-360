import {
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ImageRun,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IRunOptions,
} from 'docx';

// Converts the editor's (sanitized) HTML into Word paragraphs and tables, keeping
// headings, bold/italic/underline, lists, tables, alignment, callouts, page
// breaks and figures. Self-contained (only the `docx` package) so it is unit-tested.

export type DocxImage = { data: Buffer; mime: string; width?: number; height?: number };
export type DocxBlock = Paragraph | Table;

// Rendering choices coming from the document style (all optional).
export type DocxRenderOptions = {
  tableStyle?: 'grid' | 'striped' | 'minimal';
  tableHeaderColor?: string; // RRGGBB or #RRGGBB
  accentColor?: string;
  // Word styles applied to captions, so Word can list figures and tables.
  figureCaptionStyle?: string;
  tableCaptionStyle?: string;
};

// Numbering definition referenced by ordered lists (one `instance` per list restarts at 1).
export const ORDERED_LIST_REFERENCE = 'campus360-ordered';
export const docxNumberingConfig = {
  config: [
    {
      reference: ORDERED_LIST_REFERENCE,
      levels: [0, 1, 2, 3].map((level) => ({
        level,
        format: (['decimal', 'lowerLetter', 'lowerRoman', 'decimal'] as const)[level],
        text: `%${level + 1}.`,
        alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
      })),
    },
  ],
};

type HtmlNode = { tag: string; attrs: Record<string, string>; children: HtmlNode[] } | { text: string };
const isText = (node: HtmlNode): node is { text: string } => 'text' in node;

const VOID_TAGS = new Set(['br', 'img', 'hr', 'meta', 'link', 'input']);
const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'blockquote', 'figure', 'figcaption', 'section', 'pre', 'hr']);

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', eacute: 'é', egrave: 'è', ecirc: 'ê',
  agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', ucirc: 'û', ugrave: 'ù', icirc: 'î', iuml: 'ï',
  laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', ndash: '–', mdash: '—',
  oelig: 'œ', Eacute: 'É', Agrave: 'À', Ccedil: 'Ç', euro: '€',
};

export const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }
    return NAMED_ENTITIES[entity] ?? match;
  });

const parseAttrs = (raw: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
};

// Tolerant tag-stack parser: unclosed tags are closed by their parent, stray closers ignored.
export const parseHtml = (html: string): HtmlNode[] => {
  const root: { tag: string; attrs: Record<string, string>; children: HtmlNode[] } = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[4] !== undefined) {
      stack[stack.length - 1].children.push({ text: m[4] });
      continue;
    }
    if (!m[2]) continue;
    const tag = m[2].toLowerCase();
    if (m[1]) {
      const index = stack.map((n) => n.tag).lastIndexOf(tag);
      if (index > 0) stack.length = index;
      continue;
    }
    const node = { tag, attrs: parseAttrs(m[3] || ''), children: [] as HtmlNode[] };
    stack[stack.length - 1].children.push(node);
    if (!VOID_TAGS.has(tag) && !/\/\s*$/.test(m[3] || '')) stack.push(node);
  }
  return root.children;
};

type RunFormat = { bold?: boolean; italics?: boolean; underline?: boolean; superScript?: boolean; subScript?: boolean };

const alignmentOf = (attrs: Record<string, string>) => {
  const match = (attrs.style || '').match(/text-align\s*:\s*(left|center|right|justify)/i);
  switch (match?.[1]?.toLowerCase()) {
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    case 'left':
      return AlignmentType.LEFT;
    default:
      return undefined;
  }
};

const isBlock = (node: HtmlNode) => !isText(node) && BLOCK_TAGS.has(node.tag);

// Inline content → text runs (whitespace collapsed like a browser does).
const toRuns = (nodes: HtmlNode[], format: RunFormat = {}): TextRun[] => {
  const runs: TextRun[] = [];
  for (const node of nodes) {
    if (isText(node)) {
      const text = decodeEntities(node.text.replace(/\s+/g, ' '));
      if (text) runs.push(new TextRun({ text, ...format, underline: format.underline ? {} : undefined } as IRunOptions));
      continue;
    }
    switch (node.tag) {
      case 'b':
      case 'strong':
        runs.push(...toRuns(node.children, { ...format, bold: true }));
        break;
      case 'i':
      case 'em':
      case 'cite':
        runs.push(...toRuns(node.children, { ...format, italics: true }));
        break;
      case 'u':
        runs.push(...toRuns(node.children, { ...format, underline: true }));
        break;
      case 'sup':
        runs.push(...toRuns(node.children, { ...format, superScript: true }));
        break;
      case 'sub':
        runs.push(...toRuns(node.children, { ...format, subScript: true }));
        break;
      case 'br':
        runs.push(new TextRun({ text: '', break: 1 }));
        break;
      case 'img':
        break;
      case 'span':
        runs.push(...toRuns(node.children, (node.attrs.class || '').includes('cap-label') ? { ...format, bold: true } : format));
        break;
      default:
        runs.push(...toRuns(node.children, format));
    }
  }
  return runs;
};

// Removes the leading/trailing space a paragraph would otherwise start or end with.
const trimRuns = (nodes: HtmlNode[]): HtmlNode[] => {
  const copy = nodes.slice();
  const first = copy[0];
  if (first && isText(first)) copy[0] = { text: first.text.replace(/^\s+/, '') };
  const lastIndex = copy.length - 1;
  const last = copy[lastIndex];
  if (last && isText(last)) copy[lastIndex] = { text: last.text.replace(/\s+$/, '') };
  return copy;
};

const MAX_IMAGE_WIDTH_PX = 600;
const FIGURE_WIDTHS: Record<string, number> = { 'fig-full': 600, 'fig-half': 300, 'fig-small': 180 };

const imageParagraph = (node: HtmlNode | undefined, images: Map<string, DocxImage>, maxWidth = MAX_IMAGE_WIDTH_PX): Paragraph | null => {
  if (!node || isText(node)) return null;
  const fileId = (node.attrs['data-file-id'] || '').toLowerCase();
  const image = fileId ? images.get(fileId) : undefined;
  if (!image) return null;
  const type = image.mime === 'image/png' ? 'png' : image.mime === 'image/jpeg' ? 'jpg' : null;
  if (!type) {
    return new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[Image WEBP non prise en charge par Word]', italics: true })] });
  }
  const width = image.width || MAX_IMAGE_WIDTH_PX;
  const height = image.height || Math.round(MAX_IMAGE_WIDTH_PX * 0.6);
  const scale = Math.min(1, maxWidth / Math.max(1, width));
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 80 },
    children: [new ImageRun({ type, data: image.data, transformation: { width: Math.round(width * scale), height: Math.round(height * scale) } })],
  });
};

const findFirst = (nodes: HtmlNode[], tag: string): HtmlNode | undefined => {
  for (const node of nodes) {
    if (isText(node)) continue;
    if (node.tag === tag) return node;
    const inner = findFirst(node.children, tag);
    if (inner) return inner;
  }
  return undefined;
};

type Context = { images: Map<string, DocxImage>; listInstance: { next: number }; options: DocxRenderOptions };

// The section title is Heading 1; content headings start one level below.
const HEADINGS: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  h1: HeadingLevel.HEADING_2,
  h2: HeadingLevel.HEADING_3,
  h3: HeadingLevel.HEADING_4,
  h4: HeadingLevel.HEADING_5,
  h5: HeadingLevel.HEADING_6,
  h6: HeadingLevel.HEADING_6,
};

const hexColor = (value: string | undefined, fallback: string) => (value ? value.replace('#', '').toUpperCase() : fallback);
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const cellBorders = (style: DocxRenderOptions['tableStyle'], header: boolean) => {
  const thin = { style: BorderStyle.SINGLE, size: 4, color: 'BFC5CC' };
  if (style === 'striped') return { top: NO_BORDER, left: NO_BORDER, right: NO_BORDER, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D5DAE0' } };
  if (style === 'minimal') {
    return header
      ? { top: NO_BORDER, left: NO_BORDER, right: NO_BORDER, bottom: { style: BorderStyle.SINGLE, size: 10, color: '111111' } }
      : { top: NO_BORDER, left: NO_BORDER, right: NO_BORDER, bottom: { style: BorderStyle.SINGLE, size: 2, color: 'DDDDDD' } };
  }
  return { top: thin, bottom: thin, left: thin, right: thin };
};

const tableBlock = (node: { children: HtmlNode[] }, ctx: Context): Table | null => {
  const rows: HtmlNode[] = [];
  const collectRows = (nodes: HtmlNode[]) => {
    for (const child of nodes) {
      if (isText(child)) continue;
      if (child.tag === 'tr') rows.push(child);
      else if (['thead', 'tbody', 'tfoot'].includes(child.tag)) collectRows(child.children);
    }
  };
  collectRows(node.children);
  if (rows.length === 0) return null;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row, rowIndex) => {
      const cells = (isText(row) ? [] : row.children).filter((c) => !isText(c) && (c.tag === 'td' || c.tag === 'th'));
      const headerFill = hexColor(ctx.options.tableHeaderColor, 'F1F5F9');
      const striped = ctx.options.tableStyle === 'striped' && rowIndex % 2 === 0 && rowIndex > 0;
      return new TableRow({
        tableHeader: cells.every((c) => !isText(c) && c.tag === 'th'),
        children: (cells.length ? cells : [{ tag: 'td', attrs: {}, children: [] } as HtmlNode]).map((cell) => {
          const c = cell as { tag: string; attrs: Record<string, string>; children: HtmlNode[] };
          const header = c.tag === 'th';
          const blocks = blocksOf(c.children, ctx, header ? { bold: true } : {}).filter((b): b is Paragraph => b instanceof Paragraph);
          return new TableCell({
            columnSpan: Number(c.attrs.colspan) > 1 ? Number(c.attrs.colspan) : undefined,
            rowSpan: Number(c.attrs.rowspan) > 1 ? Number(c.attrs.rowspan) : undefined,
            borders: cellBorders(ctx.options.tableStyle, header),
            shading: header
              ? { type: ShadingType.CLEAR, color: 'auto', fill: headerFill }
              : striped ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F4F6F9' } : undefined,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: blocks.length ? blocks : [new Paragraph('')],
          });
        }),
      });
    }),
  });
};

const listBlocks = (node: { tag: string; children: HtmlNode[] }, ctx: Context, level: number): DocxBlock[] => {
  const ordered = node.tag === 'ol';
  const instance = ordered ? ctx.listInstance.next++ : 0;
  const out: DocxBlock[] = [];
  for (const item of node.children) {
    if (isText(item) || item.tag !== 'li') continue;
    // Paragraph wrappers inside an item (<li><p>…</p></li>) are unwrapped in place.
    const flatten = (nodes: HtmlNode[]): HtmlNode[] =>
      nodes.flatMap((c) => (isText(c) ? [c] : ['ul', 'ol'].includes(c.tag) ? [] : isBlock(c) ? flatten(c.children) : [c]));
    out.push(
      new Paragraph({
        children: toRuns(trimRuns(flatten(item.children))),
        ...(ordered
          ? { numbering: { reference: ORDERED_LIST_REFERENCE, level: Math.min(level, 3), instance } }
          : { bullet: { level: Math.min(level, 3) } }),
        spacing: { after: 60 },
      }),
    );
    for (const nested of item.children) {
      if (!isText(nested) && (nested.tag === 'ul' || nested.tag === 'ol')) out.push(...listBlocks(nested, ctx, level + 1));
    }
  }
  return out;
};

// Block-level conversion. Runs of inline content between blocks become paragraphs.
const blocksOf = (nodes: HtmlNode[], ctx: Context, inheritedFormat: RunFormat = {}): DocxBlock[] => {
  const out: DocxBlock[] = [];
  let inlineBuffer: HtmlNode[] = [];
  const flushInline = () => {
    const runs = toRuns(trimRuns(inlineBuffer), inheritedFormat);
    if (runs.length && inlineBuffer.some((n) => !isText(n) || n.text.trim())) out.push(new Paragraph({ children: runs }));
    inlineBuffer = [];
  };

  for (const node of nodes) {
    if (isText(node) || !isBlock(node)) {
      if (!isText(node) && node.tag === 'img') {
        flushInline();
        const image = imageParagraph(node, ctx.images);
        if (image) out.push(image);
        continue;
      }
      inlineBuffer.push(node);
      continue;
    }
    flushInline();
    const alignment = alignmentOf(node.attrs);
    switch (node.tag) {
      case 'p':
      case 'pre':
        if ((node.attrs.class || '').includes('doc-table-caption')) {
          out.push(new Paragraph({
            style: ctx.options.tableCaptionStyle,
            alignment: AlignmentType.CENTER,
            keepNext: true,
            spacing: { before: 160, after: 80 },
            children: toRuns(trimRuns(node.children)),
          }));
          break;
        }
        out.push(new Paragraph({ children: toRuns(trimRuns(node.children), inheritedFormat), alignment, spacing: { after: 160 } }));
        break;
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        out.push(new Paragraph({ heading: HEADINGS[node.tag], alignment, children: toRuns(trimRuns(node.children)), spacing: { before: 240, after: 120 } }));
        break;
      case 'ul':
      case 'ol':
        out.push(...listBlocks(node, ctx, 0));
        break;
      case 'table': {
        const table = tableBlock(node, ctx);
        if (table) out.push(table, new Paragraph(''));
        break;
      }
      case 'blockquote': {
        // Word has no quote box: each paragraph becomes indented italic text with a left rule.
        const paragraphs = node.children.filter((c) => !isText(c) && c.tag === 'p');
        const parts = paragraphs.length ? paragraphs.map((c) => (isText(c) ? [] : c.children)) : [node.children];
        for (const part of parts) {
          out.push(
            new Paragraph({
              children: toRuns(trimRuns(part), { ...inheritedFormat, italics: true }),
              indent: { left: 567 },
              border: { left: { style: BorderStyle.SINGLE, size: 12, color: hexColor(ctx.options.accentColor, '7C3AED'), space: 8 } },
              spacing: { before: 120, after: 160 },
            }),
          );
        }
        break;
      }
      case 'figure': {
        const widthClass = Object.keys(FIGURE_WIDTHS).find((cls) => (node.attrs.class || '').split(/\s+/).includes(cls));
        const image = imageParagraph(findFirst(node.children, 'img'), ctx.images, widthClass ? FIGURE_WIDTHS[widthClass] : MAX_IMAGE_WIDTH_PX);
        if (image) out.push(image);
        const caption = findFirst(node.children, 'figcaption');
        if (caption && !isText(caption)) {
          out.push(new Paragraph({ style: ctx.options.figureCaptionStyle, alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: toRuns(trimRuns(caption.children), { italics: true }) }));
        }
        break;
      }
      case 'figcaption':
        out.push(new Paragraph({ style: ctx.options.figureCaptionStyle, alignment: AlignmentType.CENTER, children: toRuns(trimRuns(node.children), { italics: true }) }));
        break;
      case 'hr':
        out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1', space: 4 } } }));
        break;
      case 'div':
      case 'section':
        if ((node.attrs.class || '').includes('academic-page-break')) {
          out.push(new Paragraph({ children: [new PageBreak()] }));
        } else {
          out.push(...blocksOf(node.children, ctx, inheritedFormat));
        }
        break;
      default:
        out.push(...blocksOf(node.children, ctx, inheritedFormat));
    }
  }
  flushInline();
  return out;
};

export const htmlToDocxBlocks = (
  html: string,
  images: Map<string, DocxImage> = new Map(),
  listInstance: { next: number } = { next: 1 },
  options: DocxRenderOptions = {},
): DocxBlock[] => blocksOf(parseHtml(html || ''), { images, listInstance, options });
