export type CvTemplateCategory = 'classique' | 'moderne' | 'ats' | 'creatif' | 'tech' | 'academique';

export type CvLayoutFamily =
  | 'classic'
  | 'sidebar-left'
  | 'sidebar-right'
  | 'banner-top'
  | 'timeline'
  | 'ats-clean'
  | 'executive-split'
  | 'minimal-swiss'
  | 'editorial'
  | 'compact-grid';

export type CvTemplateThemeConfig = {
  accent?: string;
  headerBg?: string;
  headerText?: string;
  sidebarBg?: string;
  fontFamily?: 'sans' | 'serif' | 'mono-accent';
  density?: 'compact' | 'normal' | 'aere';
  showPhoto?: boolean;
};

export type CvTemplateRecord = {
  id: string;
  label: string;
  description: string;
  category: CvTemplateCategory;
  layoutFamily: CvLayoutFamily;
  themeConfig: CvTemplateThemeConfig;
  customCss: string;
  thumbnailUrl: string | null;
  sortOrder: number;
};

export const VALID_CATEGORIES = new Set<CvTemplateCategory>([
  'classique',
  'moderne',
  'ats',
  'creatif',
  'tech',
  'academique',
]);

export const VALID_LAYOUT_FAMILIES = new Set<CvLayoutFamily>([
  'classic',
  'sidebar-left',
  'sidebar-right',
  'banner-top',
  'timeline',
  'ats-clean',
  'executive-split',
  'minimal-swiss',
  'editorial',
  'compact-grid',
]);

export const CV_TEMPLATE_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
const MAX_CUSTOM_CSS_BYTES = 4096;
const HEX_COLOR_RE = /^#[0-9a-f]{3,8}$/i;

const FORBIDDEN_CSS_PATTERNS = [
  /<\/?style/i,
  /<script/i,
  /[<>]/,
  /@import/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /behavior\s*:/i,
  /-moz-binding/i,
  /url\s*\(\s*['"]?\s*data\s*:\s*text\/html/i,
];

/** Returns the CSS if safe and bounded, or '' when it contains any disallowed construct. */
export const sanitizeCustomCss = (raw: unknown): string => {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_CUSTOM_CSS_BYTES) return '';
  for (const pattern of FORBIDDEN_CSS_PATTERNS) {
    if (pattern.test(trimmed)) return '';
  }
  return trimmed;
};

const safeHex = (value: unknown): string | undefined =>
  typeof value === 'string' && HEX_COLOR_RE.test(value.trim()) ? value.trim() : undefined;

const sanitizeThemeConfig = (raw: unknown): CvTemplateThemeConfig => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: CvTemplateThemeConfig = {};
  const accent = safeHex(obj.accent);
  const headerBg = safeHex(obj.headerBg);
  const headerText = safeHex(obj.headerText);
  const sidebarBg = safeHex(obj.sidebarBg);
  if (accent) out.accent = accent;
  if (headerBg) out.headerBg = headerBg;
  if (headerText) out.headerText = headerText;
  if (sidebarBg) out.sidebarBg = sidebarBg;
  if (obj.fontFamily === 'sans' || obj.fontFamily === 'serif' || obj.fontFamily === 'mono-accent') {
    out.fontFamily = obj.fontFamily;
  }
  if (obj.density === 'compact' || obj.density === 'normal' || obj.density === 'aere') {
    out.density = obj.density;
  }
  if (typeof obj.showPhoto === 'boolean') out.showPhoto = obj.showPhoto;
  return out;
};

const safeThumbnailUrl = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return v.length <= 500 && /^https:\/\/[^\s"'<>]+$/i.test(v) ? v : null;
};

/** Built-in 15 designs matching sql/0035_cv_templates.sql (used as fallback when DB is unavailable). */
export const FALLBACK_CV_TEMPLATES: readonly CvTemplateRecord[] = [
  {
    id: 'classic',
    label: 'Officiel',
    description: 'Le gabarit Campus 360, sobre',
    category: 'classique',
    layoutFamily: 'classic',
    themeConfig: { accent: '#0F172A', headerBg: '#FFFFFF', headerText: '#0F172A', sidebarBg: '#F8FAFC', fontFamily: 'sans', density: 'normal', showPhoto: false },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 10,
  },
  {
    id: 'prestige',
    label: 'Prestige',
    description: 'Photo carrée, colonne marine',
    category: 'moderne',
    layoutFamily: 'sidebar-left',
    themeConfig: { accent: '#1E3A5F', headerBg: '#FFFFFF', headerText: '#0F172A', sidebarBg: '#0F2537', fontFamily: 'sans', density: 'normal', showPhoto: true },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 20,
  },
  {
    id: 'ingenieur',
    label: 'Ingénieur',
    description: 'Frise chronologique, profil technique',
    category: 'tech',
    layoutFamily: 'timeline',
    themeConfig: { accent: '#1D4ED8', headerBg: '#111827', headerText: '#FFFFFF', sidebarBg: '#F1F5F9', fontFamily: 'sans', density: 'normal', showPhoto: true },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 30,
  },
  {
    id: 'etudiant',
    label: 'Étudiant',
    description: 'Minimaliste, bandeau arrondi',
    category: 'moderne',
    layoutFamily: 'banner-top',
    themeConfig: { accent: '#334155', headerBg: '#F1F5F9', headerText: '#0F172A', sidebarBg: '#FFFFFF', fontFamily: 'sans', density: 'normal', showPhoto: true },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 40,
  },
  {
    id: 'ats',
    label: 'ATS',
    description: 'Une colonne, lu par les logiciels de tri',
    category: 'ats',
    layoutFamily: 'ats-clean',
    themeConfig: { accent: '#111827', headerBg: '#FFFFFF', headerText: '#111827', sidebarBg: '#FFFFFF', fontFamily: 'sans', density: 'compact', showPhoto: false },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 50,
  },
  {
    id: 'executif',
    label: 'Exécutif',
    description: 'En-tête affirmé, profil cadre & direction',
    category: 'classique',
    layoutFamily: 'executive-split',
    themeConfig: { accent: '#1E293B', headerBg: '#0F172A', headerText: '#FFFFFF', sidebarBg: '#F8FAFC', fontFamily: 'serif', density: 'normal', showPhoto: false },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 60,
  },
  {
    id: 'suisse',
    label: 'Suisse Minimal',
    description: 'Typographie épurée, grille géométrique',
    category: 'moderne',
    layoutFamily: 'minimal-swiss',
    themeConfig: { accent: '#DC2626', headerBg: '#FFFFFF', headerText: '#111827', sidebarBg: '#FAFAFA', fontFamily: 'sans', density: 'normal', showPhoto: false },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 70,
  },
  {
    id: 'royal',
    label: 'Bandeau Royal',
    description: 'En-tête violet royal, moderne et lisible',
    category: 'moderne',
    layoutFamily: 'banner-top',
    themeConfig: { accent: '#7C3AED', headerBg: '#5B21B6', headerText: '#FFFFFF', sidebarBg: '#F5F3FF', fontFamily: 'sans', density: 'normal', showPhoto: true },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 80,
  },
  {
    id: 'colonne-droite',
    label: 'Colonne Droite',
    description: 'Expériences à gauche, atouts à droite',
    category: 'classique',
    layoutFamily: 'sidebar-right',
    themeConfig: { accent: '#0F766E', headerBg: '#FFFFFF', headerText: '#0F172A', sidebarBg: '#F0FDFA', fontFamily: 'sans', density: 'normal', showPhoto: true },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 90,
  },
  {
    id: 'creatif',
    label: 'Créatif Studio',
    description: 'Accent dynamique pour marketing & design',
    category: 'creatif',
    layoutFamily: 'editorial',
    themeConfig: { accent: '#C2410C', headerBg: '#FFF7ED', headerText: '#7C2D12', sidebarBg: '#FFF7ED', fontFamily: 'sans', density: 'normal', showPhoto: true },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 100,
  },
  {
    id: 'finance',
    label: 'Finance Sobre',
    description: 'Serif structuré, banque, audit et gestion',
    category: 'ats',
    layoutFamily: 'ats-clean',
    themeConfig: { accent: '#1E3A8A', headerBg: '#FFFFFF', headerText: '#0F172A', sidebarBg: '#FFFFFF', fontFamily: 'serif', density: 'compact', showPhoto: false },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 110,
  },
  {
    id: 'tech',
    label: 'Tech Dark-Header',
    description: 'En-tête sombre, idéal dev, cloud & data',
    category: 'tech',
    layoutFamily: 'timeline',
    themeConfig: { accent: '#0284C7', headerBg: '#0B1120', headerText: '#F8FAFC', sidebarBg: '#F8FAFC', fontFamily: 'mono-accent', density: 'compact', showPhoto: false },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 120,
  },
  {
    id: 'academique',
    label: 'Académique',
    description: 'Focus diplômes, recherche et projets',
    category: 'academique',
    layoutFamily: 'editorial',
    themeConfig: { accent: '#4338CA', headerBg: '#FFFFFF', headerText: '#1E1B4B', sidebarBg: '#EEF2FF', fontFamily: 'serif', density: 'normal', showPhoto: false },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 130,
  },
  {
    id: 'compact',
    label: 'Compact 1-Page',
    description: 'Densité maîtrisée pour tout tenir sur 1 page',
    category: 'ats',
    layoutFamily: 'compact-grid',
    themeConfig: { accent: '#334155', headerBg: '#F8FAFC', headerText: '#0F172A', sidebarBg: '#F8FAFC', fontFamily: 'sans', density: 'compact', showPhoto: false },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 140,
  },
  {
    id: 'emeraude',
    label: 'Moderne Émeraude',
    description: 'Colonne vert émeraude, frais et contrasté',
    category: 'creatif',
    layoutFamily: 'sidebar-left',
    themeConfig: { accent: '#047857', headerBg: '#FFFFFF', headerText: '#0F172A', sidebarBg: '#064E3B', fontFamily: 'sans', density: 'normal', showPhoto: true },
    customCss: '',
    thumbnailUrl: null,
    sortOrder: 150,
  },
];

export type CvTemplateDbRow = {
  id: string;
  label: string;
  description: string;
  category: string;
  layout_family: string;
  theme_config: unknown;
  custom_css: string | null;
  thumbnail_url: string | null;
  sort_order: number;
};

export const normalizeCvTemplateRow = (row: CvTemplateDbRow): CvTemplateRecord | null => {
  const id = String(row.id ?? '').trim().toLowerCase();
  if (!CV_TEMPLATE_SLUG_RE.test(id)) return null;
  const label = String(row.label ?? '').trim();
  const description = String(row.description ?? '').trim();
  if (label.length < 2 || description.length < 4) return null;
  if (!VALID_CATEGORIES.has(row.category as CvTemplateCategory)) return null;
  if (!VALID_LAYOUT_FAMILIES.has(row.layout_family as CvLayoutFamily)) return null;
  return {
    id,
    label: label.slice(0, 60),
    description: description.slice(0, 180),
    category: row.category as CvTemplateCategory,
    layoutFamily: row.layout_family as CvLayoutFamily,
    themeConfig: sanitizeThemeConfig(row.theme_config),
    customCss: sanitizeCustomCss(row.custom_css ?? ''),
    thumbnailUrl: safeThumbnailUrl(row.thumbnail_url),
    sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 100,
  };
};

export type CvTemplateQueryable = {
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
};

export async function listCvTemplatesOn(
  db: CvTemplateQueryable,
): Promise<{ templates: CvTemplateRecord[]; source: 'db' | 'fallback' }> {
  try {
    const { rows } = await db.query<CvTemplateDbRow>(
      `select id, label, description, category, layout_family, theme_config, custom_css, thumbnail_url, sort_order
         from public.cv_templates
        where is_active = true
        order by sort_order asc, id asc`,
    );
    const valid = rows
      .map(normalizeCvTemplateRow)
      .filter((item): item is CvTemplateRecord => item !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    if (valid.length > 0) return { templates: valid, source: 'db' };
  } catch (error) {
    console.warn('[cv-templates] fallback to built-in catalog:', error instanceof Error ? error.message : 'unavailable');
  }
  return {
    templates: FALLBACK_CV_TEMPLATES.map((t) => ({ ...t, themeConfig: { ...t.themeConfig } })),
    source: 'fallback',
  };
}
