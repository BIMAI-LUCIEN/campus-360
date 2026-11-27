import type { CvRubriqueKind, OfficialCvData } from '../../types';

// HTML of the application PDF and of the official CV. Every value coming from
// the student or the model is escaped; an empty field prints "[à compléter]"
// instead of an invented value. No React Native import: tested with node
// (mobile-api/tests/cv-html.test.mjs).

export const TO_COMPLETE = '[à compléter]';

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Only https images or inline png/jpeg/webp data: anything else (javascript:, attribute injection) is dropped.
export const safeImageUrl = (url?: string | null): string | null => {
  const value = (url || '').trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(value)) return value;
  if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  return null;
};

type Escaped<T> = T extends string ? string : T extends Array<infer U> ? Escaped<U>[] : T extends object ? { [K in keyof T]: Escaped<T[K]> } : T;

const escapeDeep = <T,>(value: T): Escaped<T> => {
  if (typeof value === 'string') return escapeHtml(value) as Escaped<T>;
  if (Array.isArray(value)) return value.map((item) => escapeDeep(item)) as Escaped<T>;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = escapeDeep(item);
    return out as Escaped<T>;
  }
  return value as Escaped<T>;
};

const MAX_LINKS = 3;

/** https links only, no space or quote: anything else (javascript:, http:) is dropped. */
export const safeLink = (url?: string | null): string | null => {
  const value = (url || '').trim();
  return value.length <= 200 && /^https:\/\/[^\s"'<>]+\.[^\s"'<>]+$/i.test(value) ? value : null;
};

/** "https://www.linkedin.com/in/awa/" → "linkedin.com/in/awa": what the reader sees on paper. */
export const printedLink = (url: string): string => url.replace(/^https:\/\/(www\.)?/i, '').replace(/\/+$/, '');

/**
 * The CV with its contact block in the current shape: the older `adresse` is
 * moved into `ville`, and only safe https links are kept.
 */
export const normalizeCv = (cv: OfficialCvData): OfficialCvData => {
  const { adresse, ...details } = cv.detailsPersonnels ?? ({} as OfficialCvData['detailsPersonnels']);
  const ville = (details.ville || adresse || '').trim();
  const liens = (details.liens ?? []).map((l) => (typeof l === 'string' ? l.trim() : '')).filter((l) => safeLink(l)).slice(0, MAX_LINKS);
  const disponibilite = (details.disponibilite || '').trim();
  const out: OfficialCvData['detailsPersonnels'] = { ...details };
  delete out.ville;
  delete out.liens;
  delete out.disponibilite;
  if (ville) out.ville = ville;
  if (liens.length) out.liens = liens;
  if (disponibilite) out.disponibilite = disponibilite;
  return { ...cv, detailsPersonnels: out };
};

const todo = (value?: string | null): string => (value && value.trim() ? value : TO_COMPLETE);

// "Anglais : courant", or just "Anglais" when the student gave no level.
const langueLine = (l: { langue: string; niveau: string }, sep = ' : '): string =>
  l.niveau && l.niveau.trim() ? `${l.langue}${sep}${l.niveau}` : l.langue;

const list = <T,>(items: T[], render: (item: T) => string, empty = `<div class="item-sub-title">${TO_COMPLETE}</div>`): string =>
  items.length ? items.map(render).join('') : empty;

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** "2024-03" → "mars 2024"; anything else → "". */
export const formatCvMonth = (value?: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec((value || '').trim());
  const month = match ? Number(match[2]) : 0;
  return match && month >= 1 && month <= 12 ? `${MONTHS[month - 1]} ${match[1]}` : '';
};

/** Printed period: the structured dates when the student set them, else the free text. */
export const cvPeriode = (item: { periode?: string; debut?: string; fin?: string }): string => {
  const start = formatCvMonth(item.debut);
  const end = item.fin === 'present' ? 'aujourd’hui' : formatCvMonth(item.fin);
  if (start || end) return [start, end].filter(Boolean).join(' – ');
  return (item.periode || '').trim();
};

export const RUBRIQUE_TITRES: Record<CvRubriqueKind, string> = {
  activites: 'Activités extra-professionnelles',
  certificats: 'Certificats',
  realisations: 'Réalisations',
  personnalisee: 'Autre rubrique',
};

/** Extra sections worth printing, in the student's order. */
const printedRubriques = <R extends { titre: string; items: string[] }>(rubriques: R[] | undefined): R[] =>
  (rubriques ?? []).filter((r) => r.titre.trim() && r.items.some((item) => item.trim()));

// Fields that must exist before a CV can be exported or sent.
export const missingCvFields = (cv: OfficialCvData): string[] => {
  const p = cv.detailsPersonnels;
  const missing: string[] = [];
  if (!p.nom?.trim()) missing.push('Nom');
  if (!p.prenom?.trim()) missing.push('Prénom');
  if (!p.email?.trim() && !p.telephone?.trim()) missing.push('E-mail ou téléphone');
  return missing;
};

export interface DocumentExportData {
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  major: string;
  educationLevel: string;
  jobTitle: string;
  companyName: string;
  letterText: string;
  cvText: string;
  officialCv?: OfficialCvData;
  /** Layout of the official CV chosen by the student (default "classic"). */
  cvTemplate?: CvTemplateId;
}

/**
 * Génère le code HTML propre et stylé aux standards RH pour l'impression ou le téléchargement PDF
 */
export function buildApplicationHtml(data: DocumentExportData): string {
  const d = escapeDeep(data);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Candidature - ${d.studentName} - ${d.jobTitle}</title>
  <style>
    @page { margin: 20mm; size: A4 portrait; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      line-height: 1.5;
      font-size: 11pt;
      margin: 0;
      padding: 24px;
    }
    .header {
      border-bottom: 2px solid #7C3AED;
      padding-bottom: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .student-name {
      font-size: 20pt;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
    }
    .student-meta {
      font-size: 10pt;
      color: #64748B;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      background: #F3E8FF;
      color: #7C3AED;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 9pt;
      font-weight: 700;
    }
    .section-title {
      font-size: 13pt;
      font-weight: 700;
      color: #7C3AED;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
      margin-top: 24px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .content-box {
      white-space: pre-line;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      font-size: 10.5pt;
    }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #E2E8F0;
      padding-top: 10px;
      font-size: 9pt;
      color: #94A3B8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="student-name">${todo(d.studentName)}</h1>
      <div class="student-meta">${d.educationLevel} en ${d.major}</div>
      <div class="student-meta">Email : ${d.studentEmail} ${d.studentPhone ? '| WhatsApp : ' + d.studentPhone : ''}</div>
    </div>
  </div>

  <div class="section-title">Lettre de Motivation Ciblée — ${d.jobTitle}</div>
  <div class="content-box">
${d.letterText}
  </div>

  <div class="section-title">Curriculum Vitae Synthétique</div>
  <div class="content-box">
${d.cvText}
  </div>

  <div class="footer">
    Document préparé avec Campus 360
  </div>
</body>
</html>`;
}

/**
 * Lettre de motivation seule (pièce jointe séparée du CV dans l'e-mail de candidature)
 */
export function buildCoverLetterHtml(data: DocumentExportData): string {
  const d = escapeDeep(data);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Lettre de motivation - ${d.studentName} - ${d.jobTitle}</title>
  <style>
    @page { margin: 20mm; size: A4 portrait; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      line-height: 1.6;
      font-size: 11pt;
      margin: 0;
      padding: 24px;
    }
    .header { border-bottom: 2px solid #7C3AED; padding-bottom: 12px; margin-bottom: 24px; }
    .student-name { font-size: 18pt; font-weight: 800; color: #0F172A; margin: 0; }
    .student-meta { font-size: 10pt; color: #64748B; margin-top: 4px; }
    .subject { font-weight: 700; margin-bottom: 18px; }
    .letter { white-space: pre-line; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="student-name">${todo(d.studentName)}</h1>
    <div class="student-meta">Email : ${d.studentEmail} ${d.studentPhone ? '| Tél : ' + d.studentPhone : ''}</div>
  </div>
  <div class="subject">Objet : candidature au poste de ${d.jobTitle} — ${d.companyName}</div>
  <div class="letter">${todo(d.letterText)}</div>
</body>
</html>`;
}

// Layouts the student can pick for the CV. Built-in 15 designs mirror
// mobile-api/sql/0035_cv_templates.sql; additional designs added in PostgreSQL
// can be registered at runtime via registerCvTemplates() without an app release.

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

export type CvTemplateDefinition = {
  id: string;
  label: string;
  description: string;
  category: CvTemplateCategory;
  layoutFamily: CvLayoutFamily;
  themeConfig: CvTemplateThemeConfig;
  customCss?: string;
  thumbnailUrl?: string | null;
  sortOrder?: number;
};

export const CV_TEMPLATE_CATEGORIES: readonly { id: 'tous' | CvTemplateCategory; label: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'moderne', label: 'Moderne' },
  { id: 'classique', label: 'Classique' },
  { id: 'ats', label: 'ATS' },
  { id: 'tech', label: 'Tech' },
  { id: 'creatif', label: 'Créatif' },
  { id: 'academique', label: 'Académique' },
];

export const CV_TEMPLATES: readonly CvTemplateDefinition[] = [
  {
    id: 'classic',
    label: 'Officiel',
    description: 'Le gabarit Campus 360, sobre',
    category: 'classique',
    layoutFamily: 'classic',
    themeConfig: { accent: '#0F172A', headerBg: '#FFFFFF', headerText: '#0F172A', sidebarBg: '#F8FAFC', fontFamily: 'sans', density: 'normal', showPhoto: false },
    sortOrder: 10,
  },
  {
    id: 'prestige',
    label: 'Prestige',
    description: 'Photo carrée, colonne marine',
    category: 'moderne',
    layoutFamily: 'sidebar-left',
    themeConfig: { accent: '#1E3A5F', headerBg: '#FFFFFF', headerText: '#0F172A', sidebarBg: '#0F2537', fontFamily: 'sans', density: 'normal', showPhoto: true },
    sortOrder: 20,
  },
  {
    id: 'ingenieur',
    label: 'Ingénieur',
    description: 'Frise chronologique, profil technique',
    category: 'tech',
    layoutFamily: 'timeline',
    themeConfig: { accent: '#1D4ED8', headerBg: '#111827', headerText: '#FFFFFF', sidebarBg: '#F1F5F9', fontFamily: 'sans', density: 'normal', showPhoto: true },
    sortOrder: 30,
  },
  {
    id: 'etudiant',
    label: 'Étudiant',
    description: 'Minimaliste, bandeau arrondi',
    category: 'moderne',
    layoutFamily: 'banner-top',
    themeConfig: { accent: '#334155', headerBg: '#F1F5F9', headerText: '#0F172A', sidebarBg: '#FFFFFF', fontFamily: 'sans', density: 'normal', showPhoto: true },
    sortOrder: 40,
  },
  {
    id: 'ats',
    label: 'ATS',
    description: 'Une colonne, lu par les logiciels de tri',
    category: 'ats',
    layoutFamily: 'ats-clean',
    themeConfig: { accent: '#111827', headerBg: '#FFFFFF', headerText: '#111827', sidebarBg: '#FFFFFF', fontFamily: 'sans', density: 'compact', showPhoto: false },
    sortOrder: 50,
  },
  {
    id: 'executif',
    label: 'Exécutif',
    description: 'En-tête affirmé, profil cadre & direction',
    category: 'classique',
    layoutFamily: 'executive-split',
    themeConfig: { accent: '#1E293B', headerBg: '#0F172A', headerText: '#FFFFFF', sidebarBg: '#F8FAFC', fontFamily: 'serif', density: 'normal', showPhoto: false },
    sortOrder: 60,
  },
  {
    id: 'suisse',
    label: 'Suisse Minimal',
    description: 'Typographie épurée, grille géométrique',
    category: 'moderne',
    layoutFamily: 'minimal-swiss',
    themeConfig: { accent: '#DC2626', headerBg: '#FFFFFF', headerText: '#111827', sidebarBg: '#FAFAFA', fontFamily: 'sans', density: 'normal', showPhoto: false },
    sortOrder: 70,
  },
  {
    id: 'royal',
    label: 'Bandeau Royal',
    description: 'En-tête violet royal, moderne et lisible',
    category: 'moderne',
    layoutFamily: 'banner-top',
    themeConfig: { accent: '#7C3AED', headerBg: '#5B21B6', headerText: '#FFFFFF', sidebarBg: '#F5F3FF', fontFamily: 'sans', density: 'normal', showPhoto: true },
    sortOrder: 80,
  },
  {
    id: 'colonne-droite',
    label: 'Colonne Droite',
    description: 'Expériences à gauche, atouts à droite',
    category: 'classique',
    layoutFamily: 'sidebar-right',
    themeConfig: { accent: '#0F766E', headerBg: '#FFFFFF', headerText: '#0F172A', sidebarBg: '#F0FDFA', fontFamily: 'sans', density: 'normal', showPhoto: true },
    sortOrder: 90,
  },
  {
    id: 'creatif',
    label: 'Créatif Studio',
    description: 'Accent dynamique pour marketing & design',
    category: 'creatif',
    layoutFamily: 'editorial',
    themeConfig: { accent: '#C2410C', headerBg: '#FFF7ED', headerText: '#7C2D12', sidebarBg: '#FFF7ED', fontFamily: 'sans', density: 'normal', showPhoto: true },
    sortOrder: 100,
  },
  {
    id: 'finance',
    label: 'Finance Sobre',
    description: 'Serif structuré, banque, audit et gestion',
    category: 'ats',
    layoutFamily: 'ats-clean',
    themeConfig: { accent: '#1E3A8A', headerBg: '#FFFFFF', headerText: '#0F172A', sidebarBg: '#FFFFFF', fontFamily: 'serif', density: 'compact', showPhoto: false },
    sortOrder: 110,
  },
  {
    id: 'tech',
    label: 'Tech Dark-Header',
    description: 'En-tête sombre, idéal dev, cloud & data',
    category: 'tech',
    layoutFamily: 'timeline',
    themeConfig: { accent: '#0284C7', headerBg: '#0B1120', headerText: '#F8FAFC', sidebarBg: '#F8FAFC', fontFamily: 'mono-accent', density: 'compact', showPhoto: false },
    sortOrder: 120,
  },
  {
    id: 'academique',
    label: 'Académique',
    description: 'Focus diplômes, recherche et projets',
    category: 'academique',
    layoutFamily: 'editorial',
    themeConfig: { accent: '#4338CA', headerBg: '#FFFFFF', headerText: '#1E1B4B', sidebarBg: '#EEF2FF', fontFamily: 'serif', density: 'normal', showPhoto: false },
    sortOrder: 130,
  },
  {
    id: 'compact',
    label: 'Compact 1-Page',
    description: 'Densité maîtrisée pour tout tenir sur 1 page',
    category: 'ats',
    layoutFamily: 'compact-grid',
    themeConfig: { accent: '#334155', headerBg: '#F8FAFC', headerText: '#0F172A', sidebarBg: '#F8FAFC', fontFamily: 'sans', density: 'compact', showPhoto: false },
    sortOrder: 140,
  },
  {
    id: 'emeraude',
    label: 'Moderne Émeraude',
    description: 'Colonne vert émeraude, frais et contrasté',
    category: 'creatif',
    layoutFamily: 'sidebar-left',
    themeConfig: { accent: '#047857', headerBg: '#FFFFFF', headerText: '#0F172A', sidebarBg: '#064E3B', fontFamily: 'sans', density: 'normal', showPhoto: true },
    sortOrder: 150,
  },
];

export type CvTemplateId = string;

const dynamicTemplates = new Map<string, CvTemplateDefinition>();

const HEX_COLOR_RE = /^#[0-9a-f]{3,8}$/i;
const FORBIDDEN_CUSTOM_CSS = [
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

export const sanitizeCvTemplateCss = (raw?: string | null): string => {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 4096) return '';
  for (const re of FORBIDDEN_CUSTOM_CSS) {
    if (re.test(trimmed)) return '';
  }
  return trimmed;
};

const safeHexColor = (value: string | undefined, fallback: string): string =>
  value && HEX_COLOR_RE.test(value.trim()) ? value.trim() : fallback;

/** Registers templates fetched from PostgreSQL so generateOfficialCvHtml can render them dynamically. */
export const registerCvTemplates = (list: readonly CvTemplateDefinition[]): void => {
  dynamicTemplates.clear();
  for (const item of list) {
    if (!item || typeof item.id !== 'string' || !/^[a-z0-9][a-z0-9-]{1,40}$/.test(item.id)) continue;
    dynamicTemplates.set(item.id, {
      ...item,
      customCss: sanitizeCvTemplateCss(item.customCss),
    });
  }
};

export const getRegisteredCvTemplates = (): CvTemplateDefinition[] =>
  dynamicTemplates.size > 0
    ? [...dynamicTemplates.values()].sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.id.localeCompare(b.id))
    : [...CV_TEMPLATES];

export const findCvTemplate = (id?: string | null): CvTemplateDefinition => {
  const key = (id || 'classic').trim();
  return dynamicTemplates.get(key) ?? CV_TEMPLATES.find((t) => t.id === key) ?? CV_TEMPLATES[0];
};

export const isCvTemplateId = (value: unknown): value is CvTemplateId =>
  typeof value === 'string' && (dynamicTemplates.has(value) || CV_TEMPLATES.some((t) => t.id === value));

/**
 * Merges what the AI wrote into the CV built from the profile. Identity,
 * contact and photo always come from the profile; a section the AI left empty
 * keeps the profile's version.
 */
const foldKey = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9|]+/g, '');

// The AI rewrites an experience without the month/year pickers the student set:
// the same experience (same title and organisation) keeps them.
const keepDates = <T extends { debut?: string; fin?: string }>(items: T[], base: T[], key: (item: T) => string): T[] =>
  items.map((item) => {
    if (item.debut || item.fin) return item;
    const same = base.find((b) => foldKey(key(b)) === foldKey(key(item)));
    return same && (same.debut || same.fin) ? { ...item, debut: same.debut, fin: same.fin } : item;
  });

export function mergeAiCv(rawBase: OfficialCvData, ai: Partial<OfficialCvData> | null | undefined): OfficialCvData {
  if (!ai) return rawBase;
  const base = normalizeCv(rawBase);
  const pick = <T,>(value: T[] | undefined, fallback: T[]): T[] => (value && value.length ? value : fallback);
  const competences = ai.competences;
  return {
    ...base,
    titrePoste: ai.titrePoste?.trim() || base.titrePoste,
    profil: ai.profil?.trim() || base.profil,
    experiences: keepDates(pick(ai.experiences, base.experiences), base.experiences, (e) => `${e.poste}|${e.entreprise}`),
    formations: keepDates(pick(ai.formations, base.formations), base.formations, (f) => `${f.diplome}|${f.etablissement}`),
    competences: {
      professionnelles: pick(competences?.professionnelles, base.competences.professionnelles),
      habilitesRelationnelles: pick(competences?.habilitesRelationnelles, base.competences.habilitesRelationnelles),
      logiciels: pick(competences?.logiciels, base.competences.logiciels),
    },
    langues: pick(ai.langues, base.langues),
    loisirs: pick(ai.loisirs, base.loisirs),
    formationEnPremier: typeof ai.formationEnPremier === 'boolean' ? ai.formationEnPremier : base.formationEnPremier,
  };
}

// ---------------------------------------------------------------------------
// Preview settings (accent colour, font, line spacing), kept with the CV in the
// library and applied to the preview and to the PDF. Print-only colours.
// ---------------------------------------------------------------------------

export const CV_ACCENTS = [
  { id: 'modele', label: 'Du modèle', color: null },
  { id: 'violet', label: 'Violet', color: '#6D28D9' },
  { id: 'emeraude', label: 'Émeraude', color: '#047857' },
  { id: 'bordeaux', label: 'Bordeaux', color: '#9F1239' },
  { id: 'bleu', label: 'Bleu', color: '#1D4ED8' },
  { id: 'anthracite', label: 'Anthracite', color: '#1F2937' },
] as const;
export const CV_FONTS = [
  { id: 'modele', label: 'Du modèle', css: null },
  { id: 'sans', label: 'Sans empattement', css: 'Arial, Helvetica, sans-serif' },
  { id: 'serif', label: 'Avec empattement', css: 'Georgia, "Times New Roman", serif' },
] as const;
export const CV_SPACINGS = [
  { id: 'compact', label: 'Serré', value: 1.25 },
  { id: 'normal', label: 'Normal', value: null },
  { id: 'aere', label: 'Aéré', value: 1.65 },
] as const;

export type CvStyle = {
  accent?: (typeof CV_ACCENTS)[number]['id'];
  police?: (typeof CV_FONTS)[number]['id'];
  interligne?: (typeof CV_SPACINGS)[number]['id'];
};

// Where each template prints its accent colour.
const ACCENT_CSS: Record<string, (a: string) => string> = {
  classic: (a) => `.section-heading { color: ${a} !important; border-bottom-color: ${a} !important; } .blue-divider { background-color: ${a} !important; }`,
  prestige: (a) => `.navy { background: ${a} !important; } .name { color: ${a} !important; }`,
  ingenieur: (a) => `.badge, .rule i { background: ${a} !important; } .job, .tl-date, .tl-org, .contact .ic, .name span { color: ${a} !important; } .heading h2 { border-bottom-color: ${a} !important; } .photo { box-shadow: 0 0 0 0.6mm ${a} !important; }`,
  etudiant: (a) => `.pill { background: ${a} !important; } .name, h2, .job { color: ${a} !important; }`,
  ats: (a) => `h1, h2 { color: ${a} !important; } h2 { border-bottom-color: ${a} !important; }`,
};

const PARAMETRIC_ACCENT_CSS = (a: string) =>
  `.p-accent-text, .p-sec-title, h2 { color: ${a} !important; } .p-sec-title, h2 { border-bottom-color: ${a} !important; } .p-accent-bg, .p-badge, .p-dot { background-color: ${a} !important; } .p-accent-border { border-color: ${a} !important; }`;

/** Adds the student's settings to a rendered CV; no settings → the HTML unchanged. */
export const applyCvStyle = (html: string, template: CvTemplateId, style?: CvStyle | null): string => {
  if (!style) return html;
  const accent = CV_ACCENTS.find((a) => a.id === style.accent)?.color;
  const font = CV_FONTS.find((f) => f.id === style.police)?.css;
  const spacing = CV_SPACINGS.find((s) => s.id === style.interligne)?.value;
  const accentRule = accent ? (ACCENT_CSS[template] ?? PARAMETRIC_ACCENT_CSS)(accent) : '';
  const rules = [
    accentRule,
    font ? `body, body * { font-family: ${font} !important; }` : '',
    spacing ? `body, body * { line-height: ${spacing} !important; }` : '',
  ].filter(Boolean).join('\n');
  if (!rules) return html;
  const tag = `<style data-cv-style>${rules}</style>`;
  return html.includes('</body>') ? html.replace('</body>', `${tag}\n</body>`) : `${html}${tag}`;
};

/**
 * Génère le code HTML du CV. "classic" est le gabarit officiel, "ats" la version
 * une colonne pour les logiciels de tri, et tous les designs DB/paramétriques
 * sont rendus via leur famille de mise en page + themeConfig + customCss assaini.
 */
export function generateOfficialCvHtml(cv: OfficialCvData, template: CvTemplateId = 'classic', style?: CvStyle | null): string {
  return applyCvStyle(renderCvHtml(normalizeCv(cv), template), template, style);
}

function renderCvHtml(cv: OfficialCvData, template: CvTemplateId): string {
  if (template === 'ats') return atsCvHtml(cv);
  if (template === 'prestige' || template === 'ingenieur' || template === 'etudiant') {
    return generateDesignCvHtml(cv, template);
  }
  if (template !== 'classic' && isCvTemplateId(template)) {
    return generateParametricCvHtml(cv, findCvTemplate(template));
  }
  const c = escapeDeep(cv);
  const p = c.detailsPersonnels;
  const nom = (p.nom || '').toUpperCase();
  const prenom = p.prenom || '';
  const fullName = `${nom} ${prenom}`.trim() || TO_COMPLETE;
  // A student with no experience related to the offer leads with the education (cv-fill).
  const experienceBlock = `
  <!-- 2. Expérience professionnelle -->
  <div class="section-heading">Expérience professionnelle</div>
  ${list(c.experiences, exp => `
    <div class="exp-item">
      <div class="item-main-title">${exp.poste}</div>
      <div class="item-top-row">
        <span class="item-sub-title">${joinParts([exp.entreprise, exp.ville])}</span>
        <span class="item-date-right">${cvPeriode(exp)}</span>
      </div>
      <ul class="cv-bullet-list">
        ${exp.missions.map(m => `<li>${m}</li>`).join('')}
      </ul>
    </div>
  `)}
`;
  const formationBlock = `
  <!-- 3. Formation -->
  <div class="section-heading">Formation</div>
  ${list(c.formations, form => `
    <div class="form-item">
      <div class="item-top-row">
        <span class="item-main-title">${form.diplome}</span>
        <span class="item-date-right">${cvPeriode(form)}</span>
      </div>
      <div class="item-sub-title">${joinParts([form.etablissement, form.ville])}</div>
    </div>
  `)}
`;
  const photo = safeImageUrl(cv.photoUrl);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Curriculum Vitae — ${fullName}</title>
  <style>
    @page {
      margin: 15mm 20mm;
      size: A4 portrait;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      line-height: 1.45;
      font-size: 10pt;
      margin: 0;
      padding: 0;
      background: #FFFFFF;
    }
    .cv-header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .header-titles {
      flex: 1;
      padding-top: 6px;
    }
    .cv-name {
      font-size: 20pt;
      font-weight: 800;
      color: #111827;
      margin: 0 0 4px 0;
      letter-spacing: -0.3px;
    }
    .cv-job-title {
      font-size: 13pt;
      font-weight: 500;
      color: #374151;
      margin: 0;
    }
    .photo-frame {
      width: 95px;
      height: 115px;
      border: 1px solid #CBD5E1;
      background: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin-left: 16px;
    }
    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-placeholder-initials {
      font-size: 18pt;
      font-weight: 700;
      color: #94A3B8;
    }
    .blue-divider {
      height: 2px;
      background-color: #005691;
      margin-top: 12px;
      margin-bottom: 14px;
    }
    .section-heading {
      color: #005691;
      font-size: 11pt;
      font-weight: 700;
      border-bottom: 1.5px solid #005691;
      padding-bottom: 2px;
      margin-top: 12px;
      margin-bottom: 8px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    .details-table td {
      padding: 2px 0;
      font-size: 9.5pt;
      vertical-align: top;
    }
    .col-left {
      width: 48%;
      padding-right: 12px;
    }
    .col-right {
      width: 52%;
    }
    .label {
      font-weight: 600;
      color: #111827;
    }
    .exp-item, .form-item {
      margin-bottom: 8px;
    }
    .item-top-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .item-main-title {
      font-weight: 700;
      font-size: 10pt;
      color: #111827;
    }
    .item-sub-title {
      font-style: italic;
      color: #4B5563;
      font-size: 9.5pt;
    }
    .item-date-right {
      color: #6B7280;
      font-size: 9pt;
      text-align: right;
    }
    ul.cv-bullet-list {
      margin: 3px 0 6px 18px;
      padding: 0;
    }
    ul.cv-bullet-list li {
      margin-bottom: 2px;
      font-size: 9.5pt;
      color: #374151;
    }
    .competences-subheading {
      font-weight: 700;
      font-size: 9.5pt;
      color: #111827;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    .skills-inline-text {
      font-size: 9.5pt;
      color: #374151;
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .page-footer-num {
      text-align: center;
      margin-top: 24px;
      font-size: 9pt;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="cv-header-container">
    <div class="header-titles">
      <h1 class="cv-name">${fullName}</h1>
      <div class="cv-job-title">${todo(c.titrePoste)}</div>
    </div>
    <div class="photo-frame">
      ${photo
        ? `<img src="${escapeHtml(photo)}" alt="" class="photo-img" />`
        : `<div class="photo-placeholder-initials">${nom.slice(0, 1)}${prenom.slice(0, 1)}</div>`
      }
    </div>
  </div>

  <div class="blue-divider"></div>

  ${c.profil ? `<div class="section-heading">Profil</div>
  <div class="skills-inline-text">${c.profil}</div>` : ''}

  <!-- 1. Détails personnels -->
  <div class="section-heading">Détails personnels</div>
  <table class="details-table">
    <tr>
      <td class="col-left"><span class="label">Nom :</span> ${todo(p.nom)}</td>
      <td class="col-right"><span class="label">Adresse e-mail :</span> ${todo(p.email)}</td>
    </tr>
    <tr>
      <td class="col-left"><span class="label">Prénom :</span> ${todo(p.prenom)}</td>
      <td class="col-right"><span class="label">Numéro de téléphone :</span> ${todo(p.telephone)}</td>
    </tr>
    ${p.nationalite || p.ville ? `<tr>
      <td class="col-left">${p.nationalite ? `<span class="label">Nationalité :</span> ${p.nationalite}` : ''}</td>
      <td class="col-right">${p.ville ? `<span class="label">Ville :</span> ${p.ville}` : ''}</td>
    </tr>` : ''}
    ${p.liens?.length || p.disponibilite ? `<tr>
      <td class="col-left">${p.disponibilite ? `<span class="label">Disponibilité :</span> ${p.disponibilite}` : ''}</td>
      <td class="col-right">${p.liens?.length ? `<span class="label">Liens :</span> ${p.liens.map(printedLink).join(', ')}` : ''}</td>
    </tr>` : ''}
    ${p.age ? `<tr>
      <td class="col-left"><span class="label">Âge :</span> ${p.age}</td>
      <td class="col-right"></td>
    </tr>` : ''}
  </table>

  ${cv.formationEnPremier ? `${formationBlock}${experienceBlock}` : `${experienceBlock}${formationBlock}`}
  <!-- 4. Compétences -->
  <div class="section-heading">Compétences</div>
  <div class="competences-subheading">Compétences professionnelles</div>
  <ul class="cv-bullet-list">
    ${list(c.competences.professionnelles, comp => `<li>${comp}</li>`, `<li>${TO_COMPLETE}</li>`)}
  </ul>

  ${c.competences.habilitesRelationnelles.length ? `<div class="skills-inline-text">
    <span class="label">Habilités personnelles et relationnelles :</span> ${c.competences.habilitesRelationnelles.join(', ')}
  </div>` : ''}

  ${c.competences.logiciels.length ? `<div class="competences-subheading">Maîtrise des logiciels</div>
  <ul class="cv-bullet-list">
    ${list(c.competences.logiciels, log => `<li>${log.categorie ? `<strong>${log.categorie} :</strong> ` : ''}${log.items.join(', ')}</li>`)}
  </ul>` : ''}

  <!-- 5. Langues -->
  <div class="section-heading">Langues</div>
  <div style="font-size: 9.5pt; color: #374151; margin-bottom: 6px;">
    ${list(c.langues, lang => `<div>${langueLine(lang, ': ')}</div>`)}
  </div>

  ${printedRubriques(c.rubriques).map((r) => `<div class="section-heading">${r.titre}</div>
  <ul class="cv-bullet-list">${r.items.filter((item) => item.trim()).map((item) => `<li>${item}</li>`).join('')}</ul>`).join('')}

  <!-- 6. Autres informations importantes -->
  ${c.loisirs.length ? `<div class="section-heading">Autres informations importantes</div>
  <div style="font-size: 9.5pt; color: #374151; margin-bottom: 12px;">
    <span class="label">Loisirs :</span> ${c.loisirs.join(', ')}
  </div>` : ''}

  <div class="page-footer-num">1</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Design templates (public/cv/ references). Print-only colours live here, not
// in the RN theme. Every value is escaped by escapeDeep before it is used.
// ---------------------------------------------------------------------------

type DesignTemplateId = 'prestige' | 'ingenieur' | 'etudiant';
type EscapedCv = Escaped<OfficialCvData>;

// 24px stroke icons (Lucide shapes), drawn with currentColor.
const ICON_PATHS = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
} as const;

const icon = (name: keyof typeof ICON_PATHS, size = 12): string =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`;

// "a, b" without the separator when a part is empty.
const joinParts = (parts: (string | undefined)[], sep = ', '): string => parts.filter((p) => p && p.trim()).join(sep);

const contactLines = (p: EscapedCv['detailsPersonnels']) => [
  { icon: 'phone' as const, text: todo(p.telephone) },
  { icon: 'mail' as const, text: todo(p.email) },
  ...(p.ville ? [{ icon: 'pin' as const, text: p.ville }] : []),
  ...(p.liens ?? []).map((l) => ({ icon: 'link' as const, text: printedLink(l) })),
  ...(p.disponibilite ? [{ icon: 'briefcase' as const, text: p.disponibilite }] : []),
  ...(p.nationalite ? [{ icon: 'flag' as const, text: p.nationalite }] : []),
  ...(p.age ? [{ icon: 'user' as const, text: p.age }] : []),
];

const skillItems = (c: EscapedCv): string[] => [
  ...c.competences.professionnelles,
  ...c.competences.habilitesRelationnelles,
];

const softwareLines = (c: EscapedCv): string[] =>
  c.competences.logiciels.map((log) => `${log.categorie ? `${log.categorie} : ` : ''}${log.items.join(', ')}`);

const photoOrInitials = (cv: OfficialCvData, nom: string, prenom: string, cls: string): string => {
  const photo = safeImageUrl(cv.photoUrl);
  return photo
    ? `<img src="${escapeHtml(photo)}" alt="" class="${cls}" />`
    : `<div class="${cls} initials">${nom.slice(0, 1)}${prenom.slice(0, 1)}</div>`;
};

const BASE_CSS = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #FFFFFF; }
  body { width: 210mm; min-height: 297mm; font-family: "Montserrat", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1F2937; font-size: 9.5pt; line-height: 1.45; }
  .ic { flex: 0 0 auto; display: inline-block; vertical-align: middle; }
  img { display: block; }
  .initials { display: flex; align-items: center; justify-content: center; font-weight: 700; }
  ul { margin: 0; padding: 0; }
  .missions { margin: 1.5mm 0 0 4.5mm; }
  .missions li { margin-bottom: 0.8mm; }
  .todo { color: #9CA3AF; }
`;

/** Prestige — square photo, name and summary box on the right, navy column. */
function prestigeCv(cv: OfficialCvData, c: EscapedCv, nom: string, prenom: string): string {
  const navy = '#10304F';
  const p = c.detailsPersonnels;
  const sideList = (items: string[]) => list(items, (item) => `<li>${item}</li>`, `<li>${TO_COMPLETE}</li>`);
  return `
  <style>
    ${BASE_CSS}
    .page { display: grid; grid-template-columns: 74mm 1fr; min-height: 297mm; }
    .left { padding: 0 0 12mm 10mm; display: flex; flex-direction: column; }
    .photo { width: 64mm; height: 64mm; object-fit: cover; background: #E5E7EB; color: ${navy}; font-size: 30pt; }
    .contact { padding: 7mm 0 7mm 2mm; }
    .contact div { display: flex; align-items: center; gap: 3mm; margin-bottom: 2.6mm; word-break: break-word; }
    .contact .ic { color: #111827; }
    .navy { background: ${navy}; color: #FFFFFF; padding: 4mm 8mm 10mm; width: 64mm; flex: 1; }
    .navy h3 { font-weight: 400; font-size: 12pt; letter-spacing: 0.6px; text-transform: uppercase; margin: 6mm 0 3mm; }
    .navy ul { list-style: none; }
    .navy li { position: relative; padding-left: 5mm; margin-bottom: 2.2mm; }
    .navy li::before { content: ""; position: absolute; left: 0; top: 1.9mm; width: 1.4mm; height: 1.4mm; border-radius: 50%; background: #FFFFFF; }
    .right { padding: 12mm 12mm 12mm 6mm; }
    .name { font-size: 27pt; font-weight: 500; color: ${navy}; margin: 2mm 0 1mm; line-height: 1.1; }
    .job { font-size: 12.5pt; color: #6B7280; margin-bottom: 6mm; }
    .summary { background: #EFEFEF; padding: 4mm 5mm; text-align: justify; margin: 0 0 8mm -14mm; }
    .right h2 { font-weight: 400; font-size: 13.5pt; color: #6B7280; letter-spacing: 0.5px; text-transform: uppercase; margin: 6mm 0 3mm; }
    .item { margin-bottom: 4.5mm; }
    .item-title { font-weight: 700; font-size: 10.5pt; color: #111827; }
    .item-sub { text-transform: uppercase; color: #111827; margin-top: 0.6mm; }
    .item-sub .date { color: #9CA3AF; text-transform: none; }
  </style>
  <div class="page">
    <aside class="left">
      ${photoOrInitials(cv, nom, prenom, 'photo')}
      <div class="contact">
        ${contactLines(p).map((line) => `<div>${icon(line.icon, 13)}<span>${line.text}</span></div>`).join('')}
      </div>
      <div class="navy">
        <h3>Compétences</h3>
        <ul>${sideList(skillItems(c))}</ul>
        ${c.competences.logiciels.length ? `<h3>Logiciels</h3><ul>${softwareLines(c).map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
        <h3>Langues</h3>
        <ul>${list(c.langues, (l) => `<li>${langueLine(l)}</li>`, `<li>${TO_COMPLETE}</li>`)}</ul>
        <h3>Centres d'intérêt</h3>
        <ul>${sideList(c.loisirs)}</ul>
      </div>
    </aside>
    <main class="right">
      <div class="name">${joinParts([prenom, nom], ' ') || TO_COMPLETE}</div>
      <div class="job">${todo(c.titrePoste)}</div>
      ${c.profil ? `<div class="summary">${c.profil}</div>` : ''}
      <h2>Expériences professionnelles</h2>
      ${list(c.experiences, (exp) => `
        <div class="item">
          <div class="item-title">${exp.poste}</div>
          <div class="item-sub">${joinParts([exp.entreprise, exp.ville])}${cvPeriode(exp) ? ` <span class="date">| ${cvPeriode(exp)}</span>` : ''}</div>
          ${exp.missions.length ? `<ul class="missions">${exp.missions.map((m) => `<li>${m}</li>`).join('')}</ul>` : ''}
        </div>`, `<div class="todo">${TO_COMPLETE}</div>`)}
      <h2>Formation</h2>
      ${list(c.formations, (form) => `
        <div class="item">
          <div class="item-title">${form.diplome}</div>
          <div class="item-sub">${joinParts([form.etablissement, form.ville])}${cvPeriode(form) ? ` <span class="date">| ${cvPeriode(form)}</span>` : ''}</div>
        </div>`, `<div class="todo">${TO_COMPLETE}</div>`)}
      ${printedRubriques(c.rubriques).map((r) => `<h2>${r.titre}</h2><ul class="missions">${r.items.filter((i) => i.trim()).map((i) => `<li>${i}</li>`).join('')}</ul>`).join('')}
    </main>
  </div>`;
}

/** Ingénieur — round photo, contact column, icon headings, dated timeline, skills table. */
function ingenieurCv(cv: OfficialCvData, c: EscapedCv, nom: string, prenom: string): string {
  const blue = '#1D4E9E';
  const p = c.detailsPersonnels;
  const heading = (name: keyof typeof ICON_PATHS, title: string) =>
    `<div class="heading"><span class="badge">${icon(name, 14)}</span><h2>${title}</h2></div>`;
  const timeline = <T,>(items: T[], date: (item: T) => string, body: (item: T) => string) =>
    list(items, (item) => `
      <div class="tl-row">
        <div class="tl-date">${date(item)}</div>
        <div class="tl-dot"></div>
        <div class="tl-body">${body(item)}</div>
      </div>`, `<div class="todo tl-empty">${TO_COMPLETE}</div>`);
  const skillRows = [
    { label: 'Compétences', value: c.competences.professionnelles.join(', ') },
    ...c.competences.logiciels.map((log) => ({ label: log.categorie || 'Logiciels', value: log.items.join(', ') })),
    { label: 'Savoir-être', value: c.competences.habilitesRelationnelles.join(', ') },
    { label: 'Langues', value: c.langues.map((l) => (l.niveau ? `${l.langue} (${l.niveau})` : l.langue)).join(', ') },
    { label: 'Loisirs', value: c.loisirs.join(', ') },
  ].filter((row, i) => i === 0 || row.value);
  return `
  <style>
    ${BASE_CSS}
    body { font-family: "Source Sans Pro", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .wrap { padding: 12mm 13mm; }
    .top { display: flex; align-items: center; gap: 6mm; }
    .photo { width: 34mm; height: 34mm; border-radius: 50%; object-fit: cover; border: 1.2mm solid #FFFFFF; box-shadow: 0 0 0 0.6mm ${blue}; background: #E5E7EB; color: ${blue}; font-size: 22pt; flex: 0 0 34mm; }
    .who { flex: 1; }
    .name { font-size: 26pt; font-weight: 700; color: #111827; line-height: 1.05; }
    .name span { color: ${blue}; font-weight: 600; }
    .job { color: ${blue}; font-size: 12pt; margin-top: 2mm; }
    .contact { border-left: 0.4mm solid ${blue}; padding-left: 5mm; font-size: 8.8pt; max-width: 62mm; }
    .contact div { display: flex; align-items: center; gap: 2.5mm; margin: 1.6mm 0; word-break: break-word; }
    .contact .ic { color: ${blue}; }
    .rule { display: flex; gap: 2mm; margin: 6mm 0 2mm; }
    .rule i { height: 1.4mm; background: ${blue}; flex: 1; transform: skewX(-30deg); }
    .rule i:first-child { flex: 2.2; }
    .heading { display: flex; align-items: center; gap: 4mm; margin: 6mm 0 3mm; }
    .badge { width: 8.5mm; height: 8.5mm; border-radius: 50%; background: ${blue}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; flex: 0 0 8.5mm; }
    .heading h2 { flex: 1; margin: 0; font-size: 13pt; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; color: #111827; border-bottom: 0.3mm solid ${blue}; padding-bottom: 1.2mm; }
    .profile { padding-left: 12.5mm; text-align: justify; }
    .tl-row { display: grid; grid-template-columns: 23mm 6mm 1fr; position: relative; }
    .tl-row:not(:last-child) .tl-dot::after { content: ""; position: absolute; left: 50%; top: 4.2mm; bottom: 0; border-left: 0.3mm solid #93A9D4; }
    .tl-date { color: ${blue}; font-weight: 700; font-size: 9pt; padding-top: 0.3mm; }
    .tl-dot { position: relative; }
    .tl-dot::before { content: ""; position: absolute; left: 50%; top: 1.4mm; width: 2mm; height: 2mm; margin-left: -1.3mm; border-radius: 50%; border: 0.3mm solid ${blue}; background: #FFFFFF; }
    .tl-body { padding-bottom: 4mm; }
    .tl-title { font-weight: 700; color: #111827; font-size: 10pt; }
    .tl-org { color: ${blue}; font-style: italic; font-size: 8.8pt; }
    .tl-empty { padding-left: 12.5mm; }
    table.skills { border-collapse: collapse; margin-left: 12.5mm; width: calc(100% - 12.5mm); }
    table.skills td { padding: 1.4mm 0; vertical-align: top; }
    table.skills td.label { width: 34mm; color: ${blue}; font-weight: 700; text-transform: uppercase; font-size: 8.8pt; border-right: 0.3mm solid #93A9D4; }
    table.skills td.value { padding-left: 5mm; }
  </style>
  <div class="wrap">
    <div class="top">
      ${photoOrInitials(cv, nom, prenom, 'photo')}
      <div class="who">
        <div class="name">${prenom || ''} <span>${nom || (prenom ? '' : TO_COMPLETE)}</span></div>
        <div class="job">${todo(c.titrePoste)}</div>
      </div>
      <div class="contact">
        ${contactLines(p).map((line) => `<div>${icon(line.icon, 12)}<span>${line.text}</span></div>`).join('')}
      </div>
    </div>
    <div class="rule"><i></i><i></i></div>
    ${c.profil ? `${heading('user', 'Profil')}<div class="profile">${c.profil}</div>` : ''}
    ${heading('briefcase', 'Expérience professionnelle')}
    ${timeline(c.experiences, (exp) => cvPeriode(exp), (exp) => `
      <div><span class="tl-title">${exp.poste}</span>${joinParts([exp.entreprise, exp.ville]) ? ` • <span class="tl-org">${joinParts([exp.entreprise, exp.ville])}</span>` : ''}</div>
      ${exp.missions.length ? `<ul class="missions">${exp.missions.map((m) => `<li>${m}</li>`).join('')}</ul>` : ''}`)}
    ${heading('cap', 'Formation')}
    ${timeline(c.formations, (form) => cvPeriode(form), (form) => `
      <div class="tl-title">${form.diplome}</div>
      <div class="tl-org">${joinParts([form.etablissement, form.ville])}</div>`)}
    ${printedRubriques(c.rubriques).map((r) => `${heading('user', r.titre)}<ul class="missions profile">${r.items.filter((i) => i.trim()).map((i) => `<li>${i}</li>`).join('')}</ul>`).join('')}
    ${heading('gear', 'Compétences')}
    <table class="skills">
      ${skillRows.map((row) => `<tr><td class="label">${row.label}</td><td class="value">${todo(row.value)}</td></tr>`).join('')}
    </table>
  </div>`;
}

/** Étudiant — grey rounded header band, contact pills, two light columns. */
function etudiantCv(cv: OfficialCvData, c: EscapedCv, nom: string, prenom: string): string {
  const navy = '#1B2559';
  const p = c.detailsPersonnels;
  const pills = [
    { icon: 'mail' as const, text: p.email },
    { icon: 'phone' as const, text: p.telephone },
    { icon: 'pin' as const, text: p.ville },
    ...(p.liens ?? []).map((l) => ({ icon: 'link' as const, text: printedLink(l) })),
    { icon: 'briefcase' as const, text: p.disponibilite },
  ].filter((pill) => pill.text && pill.text.trim());
  const plain = (items: string[]) => list(items, (item) => `<div class="line">${item}</div>`, `<div class="line todo">${TO_COMPLETE}</div>`);
  return `
  <style>
    ${BASE_CSS}
    body { font-family: "Raleway", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: ${navy}; padding-top: 10mm; }
    .band { margin: 0 0 0 8mm; background: #EEEEEF; border-radius: 30mm 0 0 30mm; padding: 6mm 12mm 6mm 8mm; display: flex; align-items: center; gap: 9mm; min-height: 50mm; }
    .photo { width: 42mm; height: 42mm; border-radius: 50%; object-fit: cover; background: #D1D5DB; color: ${navy}; font-size: 24pt; flex: 0 0 42mm; }
    .name { font-size: 24pt; letter-spacing: 1px; text-transform: uppercase; font-weight: 300; line-height: 1.1; }
    .name b { font-weight: 700; }
    .job { font-weight: 600; font-size: 10.5pt; margin: 1.5mm 0 2.5mm; }
    .summary { text-align: justify; font-size: 9.3pt; }
    .pills { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 3mm; margin: -4mm 12mm 0 0; position: relative; }
    .pill { background: ${navy}; color: #FFFFFF; border-radius: 4mm; padding: 1.6mm 4.5mm; font-size: 8.5pt; display: flex; align-items: center; gap: 2mm; }
    .cols { display: grid; grid-template-columns: 76mm 1fr; gap: 8mm; padding: 10mm 12mm 12mm 12mm; }
    h2 { font-size: 12pt; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; text-decoration: underline; text-underline-offset: 1.2mm; text-decoration-thickness: 0.3mm; margin: 0 0 3.5mm; }
    section { margin-bottom: 9mm; }
    .line { margin-bottom: 1.4mm; letter-spacing: 0.2px; }
    .item { margin-bottom: 5mm; }
    .item-title { font-weight: 700; text-transform: uppercase; font-size: 9.5pt; }
    .item-sub { color: #4B5280; margin-top: 0.6mm; }
    .missions li { margin-bottom: 0.8mm; }
  </style>
  <div class="band">
    ${photoOrInitials(cv, nom, prenom, 'photo')}
    <div>
      <div class="name">${prenom || ''} <b>${nom || (prenom ? '' : TO_COMPLETE)}</b></div>
      <div class="job">${todo(c.titrePoste)}</div>
      ${c.profil ? `<div class="summary">${c.profil}</div>` : ''}
    </div>
  </div>
  <div class="pills">
    ${pills.length ? pills.map((pill) => `<span class="pill">${icon(pill.icon, 11)}${pill.text}</span>`).join('') : `<span class="pill">${TO_COMPLETE}</span>`}
  </div>
  <div class="cols">
    <div>
      <section><h2>Langues</h2>${list(c.langues, (l) => `<div class="line">${langueLine(l)}</div>`, `<div class="line todo">${TO_COMPLETE}</div>`)}</section>
      <section><h2>Compétences</h2>${plain(skillItems(c))}</section>
      ${c.competences.logiciels.length ? `<section><h2>Logiciels</h2>${plain(softwareLines(c))}</section>` : ''}
      <section><h2>Centres d'intérêt</h2>${plain(c.loisirs)}</section>
    </div>
    <div>
      <section><h2>Formation</h2>
        ${list(c.formations, (form) => `
          <div class="item">
            <div class="item-title">${form.diplome}</div>
            <div class="item-sub">${joinParts([joinParts([form.etablissement, form.ville]), cvPeriode(form)], ' | ')}</div>
          </div>`, `<div class="line todo">${TO_COMPLETE}</div>`)}
      </section>
      <section><h2>Expérience</h2>
        ${list(c.experiences, (exp) => `
          <div class="item">
            <div class="item-title">${exp.poste}</div>
            <div class="item-sub">${joinParts([joinParts([exp.entreprise, exp.ville]), cvPeriode(exp)], ' | ')}</div>
            ${exp.missions.length ? `<ul class="missions">${exp.missions.map((m) => `<li>${m}</li>`).join('')}</ul>` : ''}
          </div>`, `<div class="line todo">${TO_COMPLETE}</div>`)}
      </section>
      ${printedRubriques(c.rubriques).map((r) => `<section><h2>${r.titre}</h2><ul class="missions">${r.items.filter((i) => i.trim()).map((i) => `<li>${i}</li>`).join('')}</ul></section>`).join('')}
    </div>
  </div>`;
}

const DESIGN_RENDERERS: Record<DesignTemplateId, typeof prestigeCv> = {
  prestige: prestigeCv,
  ingenieur: ingenieurCv,
  etudiant: etudiantCv,
};

/** Templates "prestige", "ingenieur" and "etudiant": same content as the official one, other layout. */
function generateDesignCvHtml(cv: OfficialCvData, template: DesignTemplateId): string {
  const c = escapeDeep(cv);
  const nom = (c.detailsPersonnels.nom || '').toUpperCase();
  const prenom = c.detailsPersonnels.prenom || '';
  const fullName = `${nom} ${prenom}`.trim() || TO_COMPLETE;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Curriculum Vitae — ${fullName}</title>
</head>
<body>
  ${DESIGN_RENDERERS[template](cv, c, nom, prenom)}
</body>
</html>`;
}

/**
 * "ATS" — one column, standard headings, no table, icon, photo or text box:
 * parsers read it in order. Same content as the other templates.
 */
function atsCvHtml(cv: OfficialCvData): string {
  const c = escapeDeep(cv);
  const p = c.detailsPersonnels;
  const fullName = joinParts([p.prenom, (p.nom || '').toUpperCase()], ' ') || TO_COMPLETE;
  const contact = joinParts([todo(p.email), todo(p.telephone), p.ville, ...(p.liens ?? []).map(printedLink), p.nationalite, p.age], ' | ');
  const bullets = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '');
  const skills = [...c.competences.professionnelles, ...c.competences.habilitesRelationnelles];
  const experienceBlock = `
  <h2>Expérience professionnelle</h2>
  ${list(c.experiences, (exp) => `
    <h3>${joinParts([exp.poste, exp.entreprise], ' — ')}</h3>
    <div class="meta">${joinParts([exp.ville, cvPeriode(exp)], ' | ')}</div>
    ${bullets(exp.missions)}`, `<p>${TO_COMPLETE}</p>`)}`;
  const formationBlock = `
  <h2>Formation</h2>
  ${list(c.formations, (form) => `
    <h3>${form.diplome}</h3>
    <div class="meta">${joinParts([joinParts([form.etablissement, form.ville]), cvPeriode(form)], ' | ')}</div>`, `<p>${TO_COMPLETE}</p>`)}`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Curriculum Vitae — ${fullName}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm 17mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #FFFFFF; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 10pt; line-height: 1.4; }
    h1 { font-size: 18pt; margin: 0; color: #111827; }
    .title { font-size: 11.5pt; font-weight: 700; margin: 1mm 0; }
    .contact { margin: 0 0 3mm; }
    h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 0.4px; margin: 4.5mm 0 1.5mm; padding-bottom: 0.8mm; border-bottom: 0.3mm solid #111827; color: #111827; }
    h3 { font-size: 10pt; margin: 2.2mm 0 0.3mm; }
    .meta { color: #374151; }
    ul { margin: 0.8mm 0 0 5mm; padding: 0; }
    li { margin-bottom: 0.5mm; }
    p { margin: 0.6mm 0; }
  </style>
</head>
<body>
  <h1>${fullName}</h1>
  <div class="title">${todo(c.titrePoste)}</div>
  <div class="contact">${contact}</div>
  ${p.disponibilite ? `<p><strong>Disponibilité :</strong> ${p.disponibilite}</p>` : ''}
  ${c.profil ? `<h2>Profil</h2><p>${c.profil}</p>` : ''}
  ${cv.formationEnPremier ? `${formationBlock}${experienceBlock}` : `${experienceBlock}${formationBlock}`}
  <h2>Compétences</h2>
  ${skills.length ? bullets(skills) : `<p>${TO_COMPLETE}</p>`}
  ${c.competences.logiciels.length ? `<h2>Logiciels</h2>${bullets(softwareLines(c))}` : ''}
  <h2>Langues</h2>
  ${c.langues.length ? bullets(c.langues.map((l) => langueLine(l))) : `<p>${TO_COMPLETE}</p>`}
  ${printedRubriques(c.rubriques).map((r) => `<h2>${r.titre}</h2>${bullets(r.items.filter((i) => i.trim()))}`).join('')}
  ${c.loisirs.length ? `<h2>Centres d'intérêt</h2><p>${c.loisirs.join(', ')}</p>` : ''}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Parametric CV engine (Module 39 — 15 built-in + DB-registered designs).
// Renders any layoutFamily with themeConfig + sanitized customCss while keeping
// strict HTML escaping via escapeDeep on every student field.
// ---------------------------------------------------------------------------

const FONT_STACK: Record<'sans' | 'serif' | 'mono-accent', string> = {
  sans: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  'mono-accent': '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const DENSITY_LH: Record<'compact' | 'normal' | 'aere', number> = {
  compact: 1.32,
  normal: 1.45,
  aere: 1.6,
};

function generateParametricCvHtml(cv: OfficialCvData, def: CvTemplateDefinition): string {
  const c = escapeDeep(cv);
  const p = c.detailsPersonnels;
  const nom = (p.nom || '').toUpperCase();
  const prenom = p.prenom || '';
  const fullName = joinParts([prenom, nom], ' ') || TO_COMPLETE;
  const cfg = def.themeConfig ?? {};
  const accent = safeHexColor(cfg.accent, '#1E293B');
  const headerBg = safeHexColor(cfg.headerBg, '#FFFFFF');
  const headerText = safeHexColor(cfg.headerText, '#0F172A');
  const sidebarBg = safeHexColor(cfg.sidebarBg, '#F8FAFC');
  const fontCss = FONT_STACK[cfg.fontFamily ?? 'sans'];
  const lineHeight = DENSITY_LH[cfg.density ?? 'normal'];
  const showPhoto = cfg.showPhoto === true;
  const safeCustom = sanitizeCvTemplateCss(def.customCss);
  const family = def.layoutFamily;
  const isMono = cfg.fontFamily === 'mono-accent';

  // ATS-clean family (e.g. Finance Sobre or DB-added ATS templates): single column, no tables/icons/photo.
  if (family === 'ats-clean') {
    const base = atsCvHtml(cv);
    const override = `<style data-cv-template="${escapeHtml(def.id)}">
      body { font-family: ${fontCss}; line-height: ${lineHeight}; }
      h1, h2 { color: ${accent}; }
      h2 { border-bottom-color: ${accent}; }
      ${safeCustom}
    </style>`;
    return base.replace('</head>', `${override}\n</head>`);
  }

  const contacts = contactLines(p);
  const skills = skillItems(c);
  const soft = softwareLines(c);
  const rubriques = printedRubriques(c.rubriques);
  const eduFirst = cv.formationEnPremier || def.category === 'academique';

  const renderExperiences = (timelineMode = false) =>
    list(
      c.experiences,
      (exp) =>
        timelineMode
          ? `<div class="p-tl-row">
              <div class="p-tl-date p-accent-text">${cvPeriode(exp) || '—'}</div>
              <div class="p-tl-line"><span class="p-dot p-accent-bg"></span></div>
              <div class="p-tl-body">
                <div class="p-item-title">${exp.poste}</div>
                <div class="p-item-sub">${joinParts([exp.entreprise, exp.ville])}</div>
                ${exp.missions.length ? `<ul class="missions">${exp.missions.map((m) => `<li>${m}</li>`).join('')}</ul>` : ''}
              </div>
            </div>`
          : `<div class="p-item">
              <div class="p-item-head">
                <span class="p-item-title">${exp.poste}</span>
                ${cvPeriode(exp) ? `<span class="p-item-date p-accent-text">${cvPeriode(exp)}</span>` : ''}
              </div>
              <div class="p-item-sub">${joinParts([exp.entreprise, exp.ville])}</div>
              ${exp.missions.length ? `<ul class="missions">${exp.missions.map((m) => `<li>${m}</li>`).join('')}</ul>` : ''}
            </div>`,
      `<div class="todo">${TO_COMPLETE}</div>`,
    );

  const renderFormations = (timelineMode = false) =>
    list(
      c.formations,
      (form) =>
        timelineMode
          ? `<div class="p-tl-row">
              <div class="p-tl-date p-accent-text">${cvPeriode(form) || '—'}</div>
              <div class="p-tl-line"><span class="p-dot p-accent-bg"></span></div>
              <div class="p-tl-body">
                <div class="p-item-title">${form.diplome}</div>
                <div class="p-item-sub">${joinParts([form.etablissement, form.ville])}</div>
              </div>
            </div>`
          : `<div class="p-item">
              <div class="p-item-head">
                <span class="p-item-title">${form.diplome}</span>
                ${cvPeriode(form) ? `<span class="p-item-date p-accent-text">${cvPeriode(form)}</span>` : ''}
              </div>
              <div class="p-item-sub">${joinParts([form.etablissement, form.ville])}</div>
            </div>`,
      `<div class="todo">${TO_COMPLETE}</div>`,
    );

  const mainBlocks = (timelineMode = false) => {
    const expSec = `<section class="p-sec"><h2 class="p-sec-title">Expériences professionnelles</h2>${renderExperiences(timelineMode)}</section>`;
    const eduSec = `<section class="p-sec"><h2 class="p-sec-title">Formation</h2>${renderFormations(timelineMode)}</section>`;
    const extraSecs = rubriques
      .map(
        (r) =>
          `<section class="p-sec"><h2 class="p-sec-title">${r.titre}</h2><ul class="missions">${r.items
            .filter((i) => i.trim())
            .map((i) => `<li>${i}</li>`)
            .join('')}</ul></section>`,
      )
      .join('');
    return `${eduFirst ? `${eduSec}${expSec}` : `${expSec}${eduSec}`}${extraSecs}`;
  };

  const sideBlocks = (darkText: boolean) => `
    <section class="p-side-sec">
      <h3 class="${darkText ? 'p-side-title-dark' : 'p-side-title-light'}">Compétences</h3>
      <ul class="p-side-list">${list(skills, (s) => `<li>${s}</li>`, `<li>${TO_COMPLETE}</li>`)}</ul>
    </section>
    ${soft.length ? `<section class="p-side-sec"><h3 class="${darkText ? 'p-side-title-dark' : 'p-side-title-light'}">Logiciels</h3><ul class="p-side-list">${soft.map((l) => `<li>${l}</li>`).join('')}</ul></section>` : ''}
    <section class="p-side-sec">
      <h3 class="${darkText ? 'p-side-title-dark' : 'p-side-title-light'}">Langues</h3>
      <ul class="p-side-list">${list(c.langues, (l) => `<li>${langueLine(l)}</li>`, `<li>${TO_COMPLETE}</li>`)}</ul>
    </section>
    ${c.loisirs.length ? `<section class="p-side-sec"><h3 class="${darkText ? 'p-side-title-dark' : 'p-side-title-light'}">Centres d'intérêt</h3><div class="p-side-inline">${c.loisirs.join(' · ')}</div></section>` : ''}
  `;

  const contactChips = contacts
    .map((line) => `<span class="p-chip">${icon(line.icon, 11)}<span>${line.text}</span></span>`)
    .join('');

  const contactList = contacts
    .map((line) => `<div class="p-contact-row">${icon(line.icon, 12)}<span>${line.text}</span></div>`)
    .join('');

  const isDarkSidebar = /^#(0|1|2|3)/i.test(sidebarBg);
  let bodyMarkup = '';
  let layoutCss = '';

  if (family === 'sidebar-left') {
    layoutCss = `
      .p-grid { display: grid; grid-template-columns: 70mm 1fr; min-height: 297mm; }
      .p-aside { background: ${sidebarBg}; color: ${isDarkSidebar ? '#F8FAFC' : '#1E293B'}; padding: 12mm 7mm; }
      .p-main { padding: 12mm 12mm 12mm 10mm; }
      .p-photo { width: 42mm; height: 42mm; border-radius: 8px; object-fit: cover; margin: 0 auto 6mm; background: rgba(255,255,255,0.16); color: ${isDarkSidebar ? '#FFFFFF' : accent}; font-size: 24pt; }
      .p-name { font-size: 24pt; font-weight: 800; color: ${accent}; line-height: 1.1; margin: 0 0 1.5mm; }
      .p-job { font-size: 11.5pt; color: #475569; font-weight: 600; margin-bottom: 5mm; }
      .p-summary { background: #F8FAFC; border-left: 3px solid ${accent}; padding: 3.5mm 4.5mm; margin-bottom: 6mm; font-size: 9.2pt; }
    `;
    bodyMarkup = `
      <div class="p-grid">
        <aside class="p-aside">
          ${showPhoto ? photoOrInitials(cv, nom, prenom, 'p-photo') : ''}
          <section class="p-side-sec"><h3 class="${isDarkSidebar ? 'p-side-title-light' : 'p-side-title-dark'}">Contact</h3>${contactList}</section>
          ${sideBlocks(!isDarkSidebar)}
        </aside>
        <main class="p-main">
          <div class="p-name">${fullName}</div>
          <div class="p-job">${todo(c.titrePoste)}</div>
          ${c.profil ? `<div class="p-summary">${c.profil}</div>` : ''}
          ${mainBlocks(false)}
        </main>
      </div>`;
  } else if (family === 'sidebar-right') {
    layoutCss = `
      .p-grid { display: grid; grid-template-columns: 1fr 68mm; min-height: 297mm; }
      .p-main { padding: 12mm 10mm 12mm 12mm; }
      .p-aside { background: ${sidebarBg}; color: ${isDarkSidebar ? '#F8FAFC' : '#1E293B'}; padding: 12mm 7mm; border-left: 2px solid ${accent}; }
      .p-photo { width: 38mm; height: 38mm; border-radius: 50%; object-fit: cover; margin: 0 auto 6mm; border: 2px solid ${accent}; background: #E2E8F0; color: ${accent}; font-size: 22pt; }
      .p-name { font-size: 24pt; font-weight: 800; color: #0F172A; line-height: 1.1; margin: 0 0 1.5mm; }
      .p-job { font-size: 11.5pt; color: ${accent}; font-weight: 700; margin-bottom: 5mm; }
      .p-summary { margin-bottom: 6mm; color: #334155; font-size: 9.3pt; }
    `;
    bodyMarkup = `
      <div class="p-grid">
        <main class="p-main">
          <div class="p-name">${fullName}</div>
          <div class="p-job">${todo(c.titrePoste)}</div>
          ${c.profil ? `<div class="p-summary">${c.profil}</div>` : ''}
          ${mainBlocks(false)}
        </main>
        <aside class="p-aside">
          ${showPhoto ? photoOrInitials(cv, nom, prenom, 'p-photo') : ''}
          <section class="p-side-sec"><h3 class="${isDarkSidebar ? 'p-side-title-light' : 'p-side-title-dark'}">Coordonnées</h3>${contactList}</section>
          ${sideBlocks(!isDarkSidebar)}
        </aside>
      </div>`;
  } else if (family === 'banner-top' || family === 'executive-split') {
    const isExec = family === 'executive-split';
    layoutCss = `
      .p-banner { background: ${headerBg}; color: ${headerText}; padding: ${isExec ? '11mm 14mm 9mm' : '10mm 13mm 8mm'}; display: flex; align-items: center; gap: 7mm; ${isExec ? `border-bottom: 3px solid ${accent};` : ''} }
      .p-photo { width: 30mm; height: 30mm; border-radius: ${isExec ? '6px' : '50%'}; object-fit: cover; border: 2px solid rgba(255,255,255,0.65); background: rgba(255,255,255,0.18); color: ${headerText}; font-size: 18pt; flex: 0 0 30mm; }
      .p-name { font-size: ${isExec ? '23pt' : '22pt'}; font-weight: 800; color: ${headerText}; letter-spacing: ${isExec ? '0.6px' : '0.2px'}; margin: 0 0 1mm; }
      .p-job { font-size: 11pt; opacity: 0.92; font-weight: 600; margin-bottom: 3mm; }
      .p-chips { display: flex; flex-wrap: wrap; gap: 2mm 4mm; font-size: 8.4pt; opacity: 0.95; }
      .p-chip { display: inline-flex; align-items: center; gap: 1.5mm; }
      .p-body { display: grid; grid-template-columns: ${isExec ? '1fr 64mm' : '64mm 1fr'}; gap: 8mm; padding: 9mm 13mm 12mm; }
      .p-aside-box { background: ${sidebarBg}; padding: 6mm; border-radius: 6px; }
      .p-summary { padding: 4mm 13mm 0; font-size: 9.3pt; color: #334155; }
    `;
    const aside = `<aside class="p-aside-box">${sideBlocks(true)}</aside>`;
    const main = `<main>${mainBlocks(false)}</main>`;
    bodyMarkup = `
      <header class="p-banner">
        ${showPhoto ? photoOrInitials(cv, nom, prenom, 'p-photo') : ''}
        <div style="flex:1">
          <div class="p-name">${fullName}</div>
          <div class="p-job">${todo(c.titrePoste)}</div>
          <div class="p-chips">${contactChips}</div>
        </div>
      </header>
      ${c.profil ? `<div class="p-summary">${c.profil}</div>` : ''}
      <div class="p-body">${isExec ? `${main}${aside}` : `${aside}${main}`}</div>`;
  } else if (family === 'timeline') {
    layoutCss = `
      .p-banner { background: ${headerBg}; color: ${headerText}; padding: 10mm 13mm; border-bottom: 3px solid ${accent}; }
      .p-name { font-size: 22pt; font-weight: 800; color: ${headerText}; margin: 0 0 1mm; }
      .p-job { font-size: 11pt; color: ${accent}; font-weight: 700; margin-bottom: 3mm; ${isMono ? 'font-family: "Consolas", "Courier New", monospace;' : ''} }
      .p-chips { display: flex; flex-wrap: wrap; gap: 2mm 4.5mm; font-size: 8.5pt; color: ${headerText}; opacity: 0.9; }
      .p-chip { display: inline-flex; align-items: center; gap: 1.5mm; }
      .p-wrap { padding: 8mm 13mm 12mm; }
      .p-summary { margin-bottom: 6mm; padding-left: 3.5mm; border-left: 3px solid ${accent}; color: #334155; }
      .p-tl-row { display: grid; grid-template-columns: 28mm 6mm 1fr; margin-bottom: 3.5mm; }
      .p-tl-date { font-size: 8.4pt; font-weight: 700; ${isMono ? 'font-family: "Consolas", "Courier New", monospace;' : ''} }
      .p-tl-line { position: relative; display: flex; justify-content: center; }
      .p-tl-line::after { content: ""; position: absolute; top: 3mm; bottom: -3.5mm; width: 1px; background: #CBD5E1; }
      .p-dot { width: 2.2mm; height: 2.2mm; border-radius: 50%; margin-top: 1.2mm; position: relative; z-index: 1; }
      .p-skills-bar { display: flex; flex-wrap: wrap; gap: 2mm; margin-top: 2mm; }
      .p-pill { background: ${sidebarBg}; border: 1px solid #CBD5E1; color: #0F172A; padding: 1mm 2.8mm; border-radius: 4px; font-size: 8.5pt; ${isMono ? 'font-family: "Consolas", "Courier New", monospace;' : ''} }
    `;
    bodyMarkup = `
      <header class="p-banner">
        <div class="p-name">${fullName}</div>
        <div class="p-job">${todo(c.titrePoste)}</div>
        <div class="p-chips">${contactChips}</div>
      </header>
      <div class="p-wrap">
        ${c.profil ? `<div class="p-summary">${c.profil}</div>` : ''}
        ${mainBlocks(true)}
        <section class="p-sec">
          <h2 class="p-sec-title">Compétences & Outils</h2>
          <div class="p-skills-bar">${[...skills, ...soft].map((s) => `<span class="p-pill">${s}</span>`).join('') || `<span class="todo">${TO_COMPLETE}</span>`}</div>
        </section>
        <section class="p-sec">
          <h2 class="p-sec-title">Langues${c.loisirs.length ? ' & Centres d’intérêt' : ''}</h2>
          <div>${list(c.langues, (l) => langueLine(l), TO_COMPLETE)}${c.loisirs.length ? ` — ${c.loisirs.join(', ')}` : ''}</div>
        </section>
      </div>`;
  } else if (family === 'minimal-swiss') {
    layoutCss = `
      .p-wrap { padding: 13mm 15mm; }
      .p-top { border-top: 4px solid ${accent}; padding-top: 5mm; margin-bottom: 7mm; display: grid; grid-template-columns: 1fr 62mm; gap: 6mm; align-items: start; }
      .p-name { font-size: 25pt; font-weight: 800; letter-spacing: -0.5px; color: #111827; line-height: 1.05; }
      .p-job { font-size: 11pt; font-weight: 600; color: ${accent}; margin-top: 1.5mm; text-transform: uppercase; letter-spacing: 0.8px; }
      .p-summary { margin: 0 0 7mm; font-size: 9.4pt; color: #374151; }
      .p-cols { display: grid; grid-template-columns: 56mm 1fr; gap: 9mm; }
    `;
    bodyMarkup = `
      <div class="p-wrap">
        <div class="p-top">
          <div>
            <div class="p-name">${fullName}</div>
            <div class="p-job">${todo(c.titrePoste)}</div>
          </div>
          <div>${contactList}</div>
        </div>
        ${c.profil ? `<div class="p-summary">${c.profil}</div>` : ''}
        <div class="p-cols">
          <aside>${sideBlocks(true)}</aside>
          <main>${mainBlocks(false)}</main>
        </div>
      </div>`;
  } else if (family === 'compact-grid') {
    layoutCss = `
      body { font-size: 8.8pt; }
      .p-wrap { padding: 10mm 12mm; }
      .p-top { background: ${headerBg}; border-bottom: 2px solid ${accent}; padding: 4mm 5mm; margin-bottom: 5mm; }
      .p-name { font-size: 18pt; font-weight: 800; color: ${headerText}; }
      .p-job { font-size: 10pt; font-weight: 600; color: ${accent}; margin-bottom: 2mm; }
      .p-chips { display: flex; flex-wrap: wrap; gap: 1.5mm 4mm; font-size: 8.2pt; color: #334155; }
      .p-chip { display: inline-flex; align-items: center; gap: 1.2mm; }
      .p-summary { margin-bottom: 4mm; font-size: 8.8pt; color: #334155; }
      .p-bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 4mm; padding-top: 3mm; border-top: 1px solid #E2E8F0; }
    `;
    bodyMarkup = `
      <div class="p-wrap">
        <div class="p-top">
          <div class="p-name">${fullName}</div>
          <div class="p-job">${todo(c.titrePoste)}</div>
          <div class="p-chips">${contactChips}</div>
        </div>
        ${c.profil ? `<div class="p-summary">${c.profil}</div>` : ''}
        ${mainBlocks(false)}
        <div class="p-bottom-grid">
          <div><h2 class="p-sec-title">Compétences</h2><div>${skills.join(' · ') || TO_COMPLETE}${soft.length ? ` — ${soft.join(' · ')}` : ''}</div></div>
          <div><h2 class="p-sec-title">Langues${c.loisirs.length ? ' & Loisirs' : ''}</h2><div>${c.langues.map((l) => langueLine(l)).join(' · ') || TO_COMPLETE}${c.loisirs.length ? ` | ${c.loisirs.join(', ')}` : ''}</div></div>
        </div>
      </div>`;
  } else {
    // 'editorial' (Créatif Studio, Académique) or fallback
    layoutCss = `
      .p-shell { border-left: 6mm solid ${accent}; min-height: 297mm; padding: 11mm 13mm 12mm 11mm; }
      .p-head { background: ${headerBg}; padding: 5mm 6mm; border-radius: 6px; margin-bottom: 6mm; display: flex; align-items: center; gap: 6mm; }
      .p-photo { width: 28mm; height: 28mm; border-radius: 8px; object-fit: cover; border: 2px solid ${accent}; background: #E2E8F0; color: ${accent}; font-size: 16pt; flex: 0 0 28mm; }
      .p-name { font-size: 22pt; font-weight: 800; color: ${headerText}; margin: 0 0 1mm; }
      .p-job { font-size: 11pt; color: ${accent}; font-weight: 700; margin-bottom: 2.5mm; }
      .p-chips { display: flex; flex-wrap: wrap; gap: 1.5mm 4mm; font-size: 8.5pt; color: #334155; }
      .p-chip { display: inline-flex; align-items: center; gap: 1.4mm; }
      .p-summary { margin-bottom: 6mm; color: #334155; font-style: italic; }
      .p-cols { display: grid; grid-template-columns: 1fr 60mm; gap: 8mm; }
      .p-aside-box { background: ${sidebarBg}; padding: 5mm; border-radius: 6px; }
    `;
    bodyMarkup = `
      <div class="p-shell">
        <header class="p-head">
          ${showPhoto ? photoOrInitials(cv, nom, prenom, 'p-photo') : ''}
          <div style="flex:1">
            <div class="p-name">${fullName}</div>
            <div class="p-job">${todo(c.titrePoste)}</div>
            <div class="p-chips">${contactChips}</div>
          </div>
        </header>
        ${c.profil ? `<div class="p-summary">${c.profil}</div>` : ''}
        <div class="p-cols">
          <main>${mainBlocks(false)}</main>
          <aside class="p-aside-box">${sideBlocks(true)}</aside>
        </div>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Curriculum Vitae — ${fullName}</title>
  <style>
    ${BASE_CSS}
    body { font-family: ${fontCss}; line-height: ${lineHeight}; color: #1E293B; }
    .p-sec { margin-bottom: 5.5mm; }
    .p-sec-title { font-size: 11pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: ${accent}; border-bottom: 1.2px solid ${accent}; padding-bottom: 1mm; margin: 0 0 3mm; }
    .p-item { margin-bottom: 3.8mm; }
    .p-item-head { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
    .p-item-title { font-weight: 700; font-size: 10pt; color: #0F172A; }
    .p-item-date { font-size: 8.6pt; font-weight: 600; white-space: nowrap; }
    .p-item-sub { font-size: 9pt; color: #475569; margin-top: 0.4mm; }
    .p-side-sec { margin-bottom: 5mm; }
    .p-side-title-light { font-size: 9.8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #FFFFFF; border-bottom: 1px solid rgba(255,255,255,0.28); padding-bottom: 1mm; margin: 0 0 2.5mm; }
    .p-side-title-dark { font-size: 9.8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${accent}; border-bottom: 1px solid #CBD5E1; padding-bottom: 1mm; margin: 0 0 2.5mm; }
    .p-side-list { list-style: none; }
    .p-side-list li { margin-bottom: 1.5mm; font-size: 8.8pt; }
    .p-side-inline { font-size: 8.8pt; }
    .p-contact-row { display: flex; align-items: center; gap: 2mm; margin-bottom: 1.8mm; font-size: 8.5pt; word-break: break-word; }
    .p-accent-text { color: ${accent}; }
    .p-accent-bg { background-color: ${accent}; }
    ${layoutCss}
    ${safeCustom}
  </style>
</head>
<body>
  ${bodyMarkup}
</body>
</html>`;
}
