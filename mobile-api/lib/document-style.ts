// Document style (Module 20): one object read by the editor, the preview and both
// exports. This file has no imports and exists twice, byte for byte:
//   mobile-api/lib/document-style.ts  and  src/features/documents/documentStyle.ts
// A test fails if the two copies differ — edit both together.

export const STYLE_FONTS = ['Times New Roman', 'Georgia', 'Arial', 'Calibri', 'Garamond', 'Cambria'] as const;
export type StyleFont = (typeof STYLE_FONTS)[number];

export const STYLE_PRESETS = ['classique', 'moderne', 'sobre', 'institutionnel'] as const;
export type StylePreset = (typeof STYLE_PRESETS)[number];

export type HeadingNumbering = 'none' | 'decimal' | 'roman-alpha' | 'chapter-section-roman';
export type PageMargins = 'narrow' | 'normal' | 'wide';
export type PageBorder = 'none' | 'single' | 'double' | 'cover-only';
export type HeaderFooterSlot = 'none' | 'title' | 'chapter' | 'author' | 'school' | 'page';
export type PageNumberFormat = 'n' | 'page-n' | 'n-of-total';
export type HeaderStyle = 'plain' | 'band';
export type PageNumberFrame = 'none' | 'box';
export type TableStyle = 'grid' | 'striped' | 'minimal';
export type CaptionScope = 'chapter' | 'document';
export type CaptionStyle = 'italic-center' | 'bold-left';
export type ListBullet = 'disc' | 'diamond';
export type CoverTemplate = 'classic' | 'modern' | 'minimal' | 'institutional';
export type CoverLine = { label: string; value: string };

// Cover built from blocks (Module 24). A block's text may hold fields such as
// {studentName}; a line whose field is empty disappears. `[ … ]` marks an optional
// part, `**bold**` and `*italic*` are allowed. Rendering: document-cover.ts.
export type CoverAlign = 'left' | 'center' | 'right';
export type CoverTextStyle = {
  align: CoverAlign;
  size: number; // points, 8 to 28
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  underline: boolean;
  color: string | null; // #RRGGBB, null = the cover's default colour
};
export type CoverLogoSlot = 'school' | 'company' | 'department';
export type CoverBlock = { id: string; style: CoverTextStyle } & (
  | { type: 'bilingual-header'; left: string[]; right: string[]; center: CoverLogoSlot | null }
  | { type: 'logos'; left: CoverLogoSlot | null; center: CoverLogoSlot | null; right: CoverLogoSlot | null; height: number /* pt, 20-120 */; centerText: string; rule: boolean }
  | { type: 'title-banner'; prefix: string; variant: 'band' | 'frame' | 'plain'; fill?: string | null }
  | { type: 'heading'; text: string }
  | { type: 'text'; template: string }
  | { type: 'author'; label: string; matriculeLabel: string }
  | {
      type: 'supervisors';
      // columns: label, then academic and corporate side by side;
      // author-left: author on the left, supervisors on the right.
      layout: 'columns' | 'author-left';
      label: string;
      academicLabel: string;
      corporateLabel: string;
      authorLabel: string;
      matriculeLabel: string;
      specialtyLabel: string;
    }
  | { type: 'year-banner'; template: string; variant: 'band' | 'rule' | 'plain'; fill?: string | null }
  | { type: 'spacer'; height: number /* mm, 2-60 */; grow: boolean }
  | { type: 'extra-lines' }
);
export type CoverBlockType = CoverBlock['type'];
export const COVER_BLOCK_TYPES: readonly CoverBlockType[] = [
  'bilingual-header', 'logos', 'title-banner', 'heading', 'text', 'author', 'supervisors', 'year-banner', 'spacer', 'extra-lines',
];
export const COVER_MAX_BLOCKS = 30;

export type DocumentStyle = {
  version: 1;
  preset: StylePreset;
  typography: {
    headingFont: StyleFont;
    bodyFont: StyleFont;
    bodySize: number; // points, 10 to 14
    lineSpacing: number; // 1 to 2.5
    paragraphIndent: boolean; // first-line indent of paragraphs
    paragraphSpacing: 'compact' | 'airy'; // airy = a blank line between paragraphs
  };
  headings: {
    numbering: HeadingNumbering;
    uppercaseChapters: boolean;
    color: string; // #RRGGBB
    rule: boolean; // line under chapter titles
    titleAlign: 'left' | 'center'; // section titles (Dédicace, Chapitre 1 : …)
    uppercaseSections: boolean; // headings inside chapters (SECTION 1 : …, I. …)
    titleSize: 'large' | 'normal'; // normal = titles at the size of the text, as in many school reports
  };
  page: {
    margins: PageMargins;
    border: PageBorder;
    accentColor: string; // #RRGGBB
    bandColor: string; // #RRGGBB, background of the header band
  };
  headerFooter: {
    headerLeft: HeaderFooterSlot;
    headerRight: HeaderFooterSlot;
    footerLeft: HeaderFooterSlot;
    footerCenter: HeaderFooterSlot;
    footerRight: HeaderFooterSlot;
    numberFormat: PageNumberFormat;
    logoInHeader: boolean;
    headerRule: boolean;
    headerStyle: HeaderStyle; // band = coloured strip across the top of each page
    headerTextColor: string; // #RRGGBB, text on the band
    authorLabel: string; // printed before the author's name, e.g. "Rédigé et présenté par :" (max 60)
    footerRule: boolean; // line above the footer
    pageNumberFrame: PageNumberFrame;
  };
  cover: {
    template: CoverTemplate;
    schoolLogoFileId: string | null;
    companyLogoFileId: string | null;
    extraLines: CoverLine[]; // e.g. jury, date of defence (max 6)
    departmentLogoFileId: string | null;
    blocks: CoverBlock[] | null; // null = the blocks of `template`
  };
  tables: {
    style: TableStyle;
    headerColor: string; // #RRGGBB
  };
  captions: {
    scope: CaptionScope; // chapter = "Figure 2.1", document = "Figure 4" counted over the whole document
    style: CaptionStyle;
    boldLabel: boolean; // "Figure 1 :" in bold
  };
  lists: {
    bullet: ListBullet; // diamond = ❖ at the first level
  };
  dedication: {
    frame: boolean;
  };
};

export const STYLE_PRESET_LABELS: Record<StylePreset, string> = {
  classique: 'Classique universitaire',
  moderne: 'Moderne',
  sobre: 'Sobre',
  institutionnel: 'Institutionnel',
};

const PRESETS: Record<StylePreset, DocumentStyle> = {
  classique: {
    version: 1,
    preset: 'classique',
    typography: { headingFont: 'Times New Roman', bodyFont: 'Times New Roman', bodySize: 12, lineSpacing: 1.5, paragraphIndent: true, paragraphSpacing: 'compact' },
    headings: { numbering: 'decimal', uppercaseChapters: true, color: '#000000', rule: false, titleAlign: 'left', uppercaseSections: false, titleSize: 'large' },
    page: { margins: 'normal', border: 'none', accentColor: '#1F2937', bandColor: '#1F2937' },
    headerFooter: {
      headerLeft: 'none', headerRight: 'chapter', footerLeft: 'none', footerCenter: 'page', footerRight: 'none',
      numberFormat: 'n', logoInHeader: false, headerRule: true,
      headerStyle: 'plain', headerTextColor: '#FFFFFF', authorLabel: '', footerRule: false, pageNumberFrame: 'none',
    },
    cover: { template: 'classic', schoolLogoFileId: null, companyLogoFileId: null, extraLines: [], departmentLogoFileId: null, blocks: null },
    tables: { style: 'grid', headerColor: '#F2F2F2' },
    captions: { scope: 'chapter', style: 'italic-center', boldLabel: true },
    lists: { bullet: 'disc' },
    dedication: { frame: false },
  },
  moderne: {
    version: 1,
    preset: 'moderne',
    typography: { headingFont: 'Calibri', bodyFont: 'Georgia', bodySize: 11.5, lineSpacing: 1.5, paragraphIndent: true, paragraphSpacing: 'compact' },
    headings: { numbering: 'decimal', uppercaseChapters: false, color: '#1E3A8A', rule: true, titleAlign: 'left', uppercaseSections: false, titleSize: 'large' },
    page: { margins: 'normal', border: 'none', accentColor: '#1E3A8A', bandColor: '#1E3A8A' },
    headerFooter: {
      headerLeft: 'title', headerRight: 'author', footerLeft: 'none', footerCenter: 'none', footerRight: 'page',
      numberFormat: 'page-n', logoInHeader: false, headerRule: true,
      headerStyle: 'plain', headerTextColor: '#FFFFFF', authorLabel: '', footerRule: false, pageNumberFrame: 'none',
    },
    cover: { template: 'modern', schoolLogoFileId: null, companyLogoFileId: null, extraLines: [], departmentLogoFileId: null, blocks: null },
    tables: { style: 'striped', headerColor: '#DBEAFE' },
    captions: { scope: 'chapter', style: 'italic-center', boldLabel: true },
    lists: { bullet: 'disc' },
    dedication: { frame: false },
  },
  sobre: {
    version: 1,
    preset: 'sobre',
    typography: { headingFont: 'Arial', bodyFont: 'Arial', bodySize: 11, lineSpacing: 1.5, paragraphIndent: true, paragraphSpacing: 'compact' },
    headings: { numbering: 'decimal', uppercaseChapters: false, color: '#111827', rule: false, titleAlign: 'left', uppercaseSections: false, titleSize: 'large' },
    page: { margins: 'wide', border: 'none', accentColor: '#111827', bandColor: '#111827' },
    headerFooter: {
      headerLeft: 'none', headerRight: 'none', footerLeft: 'none', footerCenter: 'page', footerRight: 'none',
      numberFormat: 'n', logoInHeader: false, headerRule: false,
      headerStyle: 'plain', headerTextColor: '#FFFFFF', authorLabel: '', footerRule: false, pageNumberFrame: 'none',
    },
    cover: { template: 'minimal', schoolLogoFileId: null, companyLogoFileId: null, extraLines: [], departmentLogoFileId: null, blocks: null },
    tables: { style: 'minimal', headerColor: '#FFFFFF' },
    captions: { scope: 'chapter', style: 'italic-center', boldLabel: true },
    lists: { bullet: 'disc' },
    dedication: { frame: false },
  },
  institutionnel: {
    version: 1,
    preset: 'institutionnel',
    typography: { headingFont: 'Cambria', bodyFont: 'Cambria', bodySize: 12, lineSpacing: 1.5, paragraphIndent: true, paragraphSpacing: 'compact' },
    headings: { numbering: 'roman-alpha', uppercaseChapters: true, color: '#0F3D56', rule: true, titleAlign: 'left', uppercaseSections: false, titleSize: 'large' },
    page: { margins: 'normal', border: 'cover-only', accentColor: '#0F3D56', bandColor: '#0F3D56' },
    headerFooter: {
      headerLeft: 'school', headerRight: 'chapter', footerLeft: 'none', footerCenter: 'page', footerRight: 'none',
      numberFormat: 'n-of-total', logoInHeader: true, headerRule: true,
      headerStyle: 'plain', headerTextColor: '#FFFFFF', authorLabel: '', footerRule: false, pageNumberFrame: 'none',
    },
    cover: { template: 'institutional', schoolLogoFileId: null, companyLogoFileId: null, extraLines: [], departmentLogoFileId: null, blocks: null },
    tables: { style: 'grid', headerColor: '#E0EAF1' },
    captions: { scope: 'chapter', style: 'italic-center', boldLabel: true },
    lists: { bullet: 'disc' },
    dedication: { frame: false },
  },
};

export const DEFAULT_PRESET: StylePreset = 'classique';

// Colours offered in the style panel (titles, accent, header band) and for table headers.
// White is last: it is meant for the text on a coloured header band.
export const STYLE_COLOR_PALETTE = ['#000000', '#111827', '#1F2937', '#1E3A8A', '#0F3D56', '#065F46', '#7C2D12', '#7C3AED', '#B91C1C', '#FFFFFF'] as const;
export const TABLE_HEADER_PALETTE = ['#FFFFFF', '#F2F2F2', '#E0EAF1', '#DBEAFE', '#DCFCE7', '#FEF3C7', '#EDE9FE', '#1E3A8A', '#0F3D56'] as const;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const presetStyle = (preset: StylePreset): DocumentStyle => clone(PRESETS[preset] ?? PRESETS[DEFAULT_PRESET]);

const HEX = /^#[0-9A-Fa-f]{6}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
const color = (value: unknown, fallback: string) => (typeof value === 'string' && HEX.test(value) ? value.toUpperCase() : fallback);
const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
const range = (value: unknown, min: number, max: number, step: number, fallback: number) => {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.round(Math.min(max, Math.max(min, n)) / step) * step;
};
const text = (value: unknown, max: number, fallback: string) => (typeof value === 'string' ? value.trim().slice(0, max) : fallback);
const fileId = (value: unknown) => (typeof value === 'string' && UUID.test(value) ? value.toLowerCase() : null);
const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const BLOCK_ID = /^[a-z0-9-]{1,40}$/;
const LOGO_SLOTS = ['school', 'company', 'department'] as const;
const slotOrNull = (value: unknown): CoverLogoSlot | null =>
  typeof value === 'string' && (LOGO_SLOTS as readonly string[]).includes(value) ? (value as CoverLogoSlot) : null;
const lineList = (value: unknown, max: number) =>
  (Array.isArray(value) ? value : []).filter((v): v is string => typeof v === 'string').slice(0, max).map((v) => v.trim().slice(0, 120));

export const DEFAULT_COVER_TEXT_STYLE: CoverTextStyle = { align: 'center', size: 11, bold: false, italic: false, uppercase: false, underline: false, color: null };

const coverTextStyle = (value: unknown): CoverTextStyle => {
  const s = obj(value);
  const d = DEFAULT_COVER_TEXT_STYLE;
  return {
    align: pick(s.align, ['left', 'center', 'right'] as const, d.align),
    size: range(s.size, 8, 28, 0.5, d.size),
    bold: bool(s.bold, d.bold),
    italic: bool(s.italic, d.italic),
    uppercase: bool(s.uppercase, d.uppercase),
    underline: bool(s.underline, d.underline),
    color: s.color === null || s.color === undefined ? null : typeof s.color === 'string' && HEX.test(s.color) ? s.color.toUpperCase() : null,
  };
};

// One block from any input; null when its type is unknown (the block is dropped).
const coverBlock = (value: unknown, index: number): CoverBlock | null => {
  const b = obj(value);
  const type = pick(b.type, COVER_BLOCK_TYPES, '' as CoverBlockType);
  if (!type) return null;
  const id = typeof b.id === 'string' && BLOCK_ID.test(b.id) ? b.id : `b${index + 1}`;
  const base = { id, style: coverTextStyle(b.style) };
  switch (type) {
    case 'bilingual-header':
      return { ...base, type, left: lineList(b.left, 12), right: lineList(b.right, 12), center: slotOrNull(b.center) };
    case 'logos':
      return {
        ...base, type, left: slotOrNull(b.left), center: slotOrNull(b.center), right: slotOrNull(b.right),
        height: range(b.height, 20, 120, 1, 70), centerText: text(b.centerText, 300, ''), rule: bool(b.rule, false),
      };
    case 'title-banner':
      return { ...base, type, prefix: text(b.prefix, 60, ''), variant: pick(b.variant, ['band', 'frame', 'plain'] as const, 'plain'), fill: color(b.fill, '') || null };
    case 'heading':
      return { ...base, type, text: text(b.text, 160, '') };
    case 'text':
      return { ...base, type, template: text(b.template, 300, '') };
    case 'author':
      return { ...base, type, label: text(b.label, 60, ''), matriculeLabel: text(b.matriculeLabel, 60, '') };
    case 'supervisors':
      return {
        ...base, type, layout: pick(b.layout, ['columns', 'author-left'] as const, 'columns'),
        label: text(b.label, 60, ''), academicLabel: text(b.academicLabel, 60, ''), corporateLabel: text(b.corporateLabel, 60, ''),
        authorLabel: text(b.authorLabel, 60, ''), matriculeLabel: text(b.matriculeLabel, 60, ''), specialtyLabel: text(b.specialtyLabel, 60, ''),
      };
    case 'year-banner':
      return { ...base, type, template: text(b.template, 160, ''), variant: pick(b.variant, ['band', 'rule', 'plain'] as const, 'plain'), fill: color(b.fill, '') || null };
    case 'spacer':
      return { ...base, type, height: range(b.height, 2, 60, 1, 10), grow: bool(b.grow, false) };
    case 'extra-lines':
      return { ...base, type };
    default:
      return null;
  }
};

// null = use the template's blocks. Unknown blocks are dropped, ids made unique.
export const resolveCoverBlocks = (value: unknown): CoverBlock[] | null => {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  return value
    .slice(0, COVER_MAX_BLOCKS)
    .map(coverBlock)
    .filter((block): block is CoverBlock => block !== null)
    .map((block, index) => {
      const id = seen.has(block.id) ? `${block.id.slice(0, 34)}-${index + 1}` : block.id;
      seen.add(id);
      return { ...block, id };
    });
};

const SLOTS: readonly HeaderFooterSlot[] = ['none', 'title', 'chapter', 'author', 'school', 'page'];

// Builds a complete, valid style from any partial input: unknown or invalid values
// fall back to the preset's value, so a stored style can never break rendering.
export const resolveStyle = (input: unknown): DocumentStyle => {
  const raw = obj(input);
  const base = presetStyle(pick(raw.preset, STYLE_PRESETS, DEFAULT_PRESET));
  const t = obj(raw.typography);
  const h = obj(raw.headings);
  const p = obj(raw.page);
  const hf = obj(raw.headerFooter);
  const c = obj(raw.cover);
  const tb = obj(raw.tables);
  const cp = obj(raw.captions);
  const ls = obj(raw.lists);
  const dd = obj(raw.dedication);
  const lines = Array.isArray(c.extraLines) ? c.extraLines : base.cover.extraLines;
  return {
    version: 1,
    preset: base.preset,
    typography: {
      headingFont: pick(t.headingFont, STYLE_FONTS, base.typography.headingFont),
      bodyFont: pick(t.bodyFont, STYLE_FONTS, base.typography.bodyFont),
      bodySize: range(t.bodySize, 10, 14, 0.5, base.typography.bodySize),
      lineSpacing: range(t.lineSpacing, 1, 2.5, 0.05, base.typography.lineSpacing),
      paragraphIndent: bool(t.paragraphIndent, base.typography.paragraphIndent),
      paragraphSpacing: pick(t.paragraphSpacing, ['compact', 'airy'] as const, base.typography.paragraphSpacing),
    },
    headings: {
      numbering: pick(h.numbering, ['none', 'decimal', 'roman-alpha', 'chapter-section-roman'] as const, base.headings.numbering),
      uppercaseChapters: bool(h.uppercaseChapters, base.headings.uppercaseChapters),
      color: color(h.color, base.headings.color),
      rule: bool(h.rule, base.headings.rule),
      titleAlign: pick(h.titleAlign, ['left', 'center'] as const, base.headings.titleAlign),
      uppercaseSections: bool(h.uppercaseSections, base.headings.uppercaseSections),
      titleSize: pick(h.titleSize, ['large', 'normal'] as const, base.headings.titleSize),
    },
    page: {
      margins: pick(p.margins, ['narrow', 'normal', 'wide'] as const, base.page.margins),
      border: pick(p.border, ['none', 'single', 'double', 'cover-only'] as const, base.page.border),
      accentColor: color(p.accentColor, base.page.accentColor),
      bandColor: color(p.bandColor, base.page.bandColor),
    },
    headerFooter: {
      headerLeft: pick(hf.headerLeft, SLOTS, base.headerFooter.headerLeft),
      headerRight: pick(hf.headerRight, SLOTS, base.headerFooter.headerRight),
      footerLeft: pick(hf.footerLeft, SLOTS, base.headerFooter.footerLeft),
      footerCenter: pick(hf.footerCenter, SLOTS, base.headerFooter.footerCenter),
      footerRight: pick(hf.footerRight, SLOTS, base.headerFooter.footerRight),
      numberFormat: pick(hf.numberFormat, ['n', 'page-n', 'n-of-total'] as const, base.headerFooter.numberFormat),
      logoInHeader: bool(hf.logoInHeader, base.headerFooter.logoInHeader),
      headerRule: bool(hf.headerRule, base.headerFooter.headerRule),
      headerStyle: pick(hf.headerStyle, ['plain', 'band'] as const, base.headerFooter.headerStyle),
      headerTextColor: color(hf.headerTextColor, base.headerFooter.headerTextColor),
      authorLabel: text(hf.authorLabel, 60, base.headerFooter.authorLabel),
      footerRule: bool(hf.footerRule, base.headerFooter.footerRule),
      pageNumberFrame: pick(hf.pageNumberFrame, ['none', 'box'] as const, base.headerFooter.pageNumberFrame),
    },
    cover: {
      template: pick(c.template, ['classic', 'modern', 'minimal', 'institutional'] as const, base.cover.template),
      schoolLogoFileId: c.schoolLogoFileId === undefined ? base.cover.schoolLogoFileId : fileId(c.schoolLogoFileId),
      companyLogoFileId: c.companyLogoFileId === undefined ? base.cover.companyLogoFileId : fileId(c.companyLogoFileId),
      extraLines: lines
        .map((line) => obj(line))
        .filter((line) => typeof line.label === 'string' && typeof line.value === 'string')
        .slice(0, 6)
        .map((line) => ({ label: String(line.label).trim().slice(0, 60), value: String(line.value).trim().slice(0, 160) }))
        .filter((line) => line.label || line.value),
      departmentLogoFileId: c.departmentLogoFileId === undefined ? base.cover.departmentLogoFileId : fileId(c.departmentLogoFileId),
      blocks: c.blocks === undefined ? base.cover.blocks : resolveCoverBlocks(c.blocks),
    },
    tables: {
      style: pick(tb.style, ['grid', 'striped', 'minimal'] as const, base.tables.style),
      headerColor: color(tb.headerColor, base.tables.headerColor),
    },
    captions: {
      scope: pick(cp.scope, ['chapter', 'document'] as const, base.captions.scope),
      style: pick(cp.style, ['italic-center', 'bold-left'] as const, base.captions.style),
      boldLabel: bool(cp.boldLabel, base.captions.boldLabel),
    },
    lists: {
      bullet: pick(ls.bullet, ['disc', 'diamond'] as const, base.lists.bullet),
    },
    dedication: {
      frame: bool(dd.frame, base.dedication.frame),
    },
  };
};

type Patch<T> = { [K in keyof T]?: T[K] extends object ? Patch<T[K]> | T[K] : T[K] };
export type DocumentStylePatch = Patch<Omit<DocumentStyle, 'version'>>;

// Applies a partial change. Choosing a preset resets every value to that preset;
// other keys are merged one level deep, then the result is resolved (validated).
export const applyStylePatch = (current: unknown, patch: DocumentStylePatch): DocumentStyle => {
  const base = resolveStyle(current);
  if (patch.preset && patch.preset !== base.preset) {
    const fresh = presetStyle(patch.preset);
    // Logos, cover lines and the author label belong to the student, not to the preset: keep them.
    fresh.cover.schoolLogoFileId = base.cover.schoolLogoFileId;
    fresh.cover.companyLogoFileId = base.cover.companyLogoFileId;
    fresh.cover.extraLines = base.cover.extraLines;
    fresh.cover.departmentLogoFileId = base.cover.departmentLogoFileId;
    fresh.cover.blocks = base.cover.blocks;
    fresh.headerFooter.authorLabel = base.headerFooter.authorLabel;
    return resolveStyle(fresh);
  }
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const existing = (base as unknown as Record<string, unknown>)[key];
    merged[key] = value && typeof value === 'object' && !Array.isArray(value) && existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>), ...(value as Record<string, unknown>) }
      : value;
  }
  return resolveStyle(merged);
};

// Columns kept in sync for older code paths (exports and screens not yet on the style).
export const legacyColumnsFromStyle = (style: DocumentStyle) => ({
  font_family: style.typography.bodyFont,
  line_spacing: style.typography.lineSpacing,
  margins: style.page.margins,
  cover_template: style.cover.template === 'minimal' ? 'minimalist' : style.cover.template === 'modern' ? 'tech' : 'classic',
});
