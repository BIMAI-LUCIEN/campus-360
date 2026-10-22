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

export type DocumentStyle = {
  version: 1;
  preset: StylePreset;
  typography: {
    headingFont: StyleFont;
    bodyFont: StyleFont;
    bodySize: number; // points, 10 to 14
    lineSpacing: number; // 1 to 2.5
  };
  headings: {
    numbering: HeadingNumbering;
    uppercaseChapters: boolean;
    color: string; // #RRGGBB
    rule: boolean; // line under chapter titles
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
  };
  tables: {
    style: TableStyle;
    headerColor: string; // #RRGGBB
  };
  captions: {
    scope: CaptionScope; // chapter = "Figure 2.1", document = "Figure 4" counted over the whole document
    style: CaptionStyle;
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
    typography: { headingFont: 'Times New Roman', bodyFont: 'Times New Roman', bodySize: 12, lineSpacing: 1.5 },
    headings: { numbering: 'decimal', uppercaseChapters: true, color: '#000000', rule: false },
    page: { margins: 'normal', border: 'none', accentColor: '#1F2937', bandColor: '#1F2937' },
    headerFooter: {
      headerLeft: 'none', headerRight: 'chapter', footerLeft: 'none', footerCenter: 'page', footerRight: 'none',
      numberFormat: 'n', logoInHeader: false, headerRule: true,
      headerStyle: 'plain', headerTextColor: '#FFFFFF', authorLabel: '', footerRule: false, pageNumberFrame: 'none',
    },
    cover: { template: 'classic', schoolLogoFileId: null, companyLogoFileId: null, extraLines: [] },
    tables: { style: 'grid', headerColor: '#F2F2F2' },
    captions: { scope: 'chapter', style: 'italic-center' },
    lists: { bullet: 'disc' },
    dedication: { frame: false },
  },
  moderne: {
    version: 1,
    preset: 'moderne',
    typography: { headingFont: 'Calibri', bodyFont: 'Georgia', bodySize: 11.5, lineSpacing: 1.5 },
    headings: { numbering: 'decimal', uppercaseChapters: false, color: '#1E3A8A', rule: true },
    page: { margins: 'normal', border: 'none', accentColor: '#1E3A8A', bandColor: '#1E3A8A' },
    headerFooter: {
      headerLeft: 'title', headerRight: 'author', footerLeft: 'none', footerCenter: 'none', footerRight: 'page',
      numberFormat: 'page-n', logoInHeader: false, headerRule: true,
      headerStyle: 'plain', headerTextColor: '#FFFFFF', authorLabel: '', footerRule: false, pageNumberFrame: 'none',
    },
    cover: { template: 'modern', schoolLogoFileId: null, companyLogoFileId: null, extraLines: [] },
    tables: { style: 'striped', headerColor: '#DBEAFE' },
    captions: { scope: 'chapter', style: 'italic-center' },
    lists: { bullet: 'disc' },
    dedication: { frame: false },
  },
  sobre: {
    version: 1,
    preset: 'sobre',
    typography: { headingFont: 'Arial', bodyFont: 'Arial', bodySize: 11, lineSpacing: 1.5 },
    headings: { numbering: 'decimal', uppercaseChapters: false, color: '#111827', rule: false },
    page: { margins: 'wide', border: 'none', accentColor: '#111827', bandColor: '#111827' },
    headerFooter: {
      headerLeft: 'none', headerRight: 'none', footerLeft: 'none', footerCenter: 'page', footerRight: 'none',
      numberFormat: 'n', logoInHeader: false, headerRule: false,
      headerStyle: 'plain', headerTextColor: '#FFFFFF', authorLabel: '', footerRule: false, pageNumberFrame: 'none',
    },
    cover: { template: 'minimal', schoolLogoFileId: null, companyLogoFileId: null, extraLines: [] },
    tables: { style: 'minimal', headerColor: '#FFFFFF' },
    captions: { scope: 'chapter', style: 'italic-center' },
    lists: { bullet: 'disc' },
    dedication: { frame: false },
  },
  institutionnel: {
    version: 1,
    preset: 'institutionnel',
    typography: { headingFont: 'Cambria', bodyFont: 'Cambria', bodySize: 12, lineSpacing: 1.5 },
    headings: { numbering: 'roman-alpha', uppercaseChapters: true, color: '#0F3D56', rule: true },
    page: { margins: 'normal', border: 'cover-only', accentColor: '#0F3D56', bandColor: '#0F3D56' },
    headerFooter: {
      headerLeft: 'school', headerRight: 'chapter', footerLeft: 'none', footerCenter: 'page', footerRight: 'none',
      numberFormat: 'n-of-total', logoInHeader: true, headerRule: true,
      headerStyle: 'plain', headerTextColor: '#FFFFFF', authorLabel: '', footerRule: false, pageNumberFrame: 'none',
    },
    cover: { template: 'institutional', schoolLogoFileId: null, companyLogoFileId: null, extraLines: [] },
    tables: { style: 'grid', headerColor: '#E0EAF1' },
    captions: { scope: 'chapter', style: 'italic-center' },
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
    },
    headings: {
      numbering: pick(h.numbering, ['none', 'decimal', 'roman-alpha', 'chapter-section-roman'] as const, base.headings.numbering),
      uppercaseChapters: bool(h.uppercaseChapters, base.headings.uppercaseChapters),
      color: color(h.color, base.headings.color),
      rule: bool(h.rule, base.headings.rule),
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
    },
    tables: {
      style: pick(tb.style, ['grid', 'striped', 'minimal'] as const, base.tables.style),
      headerColor: color(tb.headerColor, base.tables.headerColor),
    },
    captions: {
      scope: pick(cp.scope, ['chapter', 'document'] as const, base.captions.scope),
      style: pick(cp.style, ['italic-center', 'bold-left'] as const, base.captions.style),
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
