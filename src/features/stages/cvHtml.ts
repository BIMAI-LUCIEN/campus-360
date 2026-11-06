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

// Layouts the student can pick for the CV. "classic" is the official 2-column
// template; the three others reproduce the references in public/cv/
// (see generateDesignCvHtml). Thumbnails: assets/cv-templates/<id>.png,
// rebuilt by scripts/render-cv-thumbnails.mjs.
export const CV_TEMPLATES = [
  { id: 'classic', label: 'Officiel', description: 'Le gabarit Campus 360, sobre' },
  { id: 'prestige', label: 'Prestige', description: 'Photo carrée, colonne marine' },
  { id: 'ingenieur', label: 'Ingénieur', description: 'Frise chronologique, profil technique' },
  { id: 'etudiant', label: 'Étudiant', description: 'Minimaliste, bandeau arrondi' },
  { id: 'ats', label: 'ATS', description: 'Une colonne, lu par les logiciels de tri' },
] as const;
export type CvTemplateId = (typeof CV_TEMPLATES)[number]['id'];

export const isCvTemplateId = (value: unknown): value is CvTemplateId =>
  CV_TEMPLATES.some((t) => t.id === value);

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

export function mergeAiCv(base: OfficialCvData, ai: Partial<OfficialCvData> | null | undefined): OfficialCvData {
  if (!ai) return base;
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
const ACCENT_CSS: Record<CvTemplateId, (a: string) => string> = {
  classic: (a) => `.section-heading { color: ${a} !important; border-bottom-color: ${a} !important; } .blue-divider { background-color: ${a} !important; }`,
  prestige: (a) => `.navy { background: ${a} !important; } .name { color: ${a} !important; }`,
  ingenieur: (a) => `.badge, .rule i { background: ${a} !important; } .job, .tl-date, .tl-org, .contact .ic, .name span { color: ${a} !important; } .heading h2 { border-bottom-color: ${a} !important; } .photo { box-shadow: 0 0 0 0.6mm ${a} !important; }`,
  etudiant: (a) => `.pill { background: ${a} !important; } .name, h2, .job { color: ${a} !important; }`,
  ats: (a) => `h1, h2 { color: ${a} !important; } h2 { border-bottom-color: ${a} !important; }`,
};

/** Adds the student's settings to a rendered CV; no settings → the HTML unchanged. */
export const applyCvStyle = (html: string, template: CvTemplateId, style?: CvStyle | null): string => {
  if (!style) return html;
  const accent = CV_ACCENTS.find((a) => a.id === style.accent)?.color;
  const font = CV_FONTS.find((f) => f.id === style.police)?.css;
  const spacing = CV_SPACINGS.find((s) => s.id === style.interligne)?.value;
  const rules = [
    accent ? ACCENT_CSS[template](accent) : '',
    font ? `body, body * { font-family: ${font} !important; }` : '',
    spacing ? `body, body * { line-height: ${spacing} !important; }` : '',
  ].filter(Boolean).join('\n');
  if (!rules) return html;
  const tag = `<style data-cv-style>${rules}</style>`;
  return html.includes('</body>') ? html.replace('</body>', `${tag}\n</body>`) : `${html}${tag}`;
};

/**
 * Génère le code HTML du CV. "classic" est le gabarit officiel, "ats" la version
 * une colonne pour les logiciels de tri ; `style` applique les réglages d'aperçu.
 */
export function generateOfficialCvHtml(cv: OfficialCvData, template: CvTemplateId = 'classic', style?: CvStyle | null): string {
  return applyCvStyle(renderCvHtml(cv, template), template, style);
}

function renderCvHtml(cv: OfficialCvData, template: CvTemplateId): string {
  if (template === 'ats') return atsCvHtml(cv);
  if (template !== 'classic' && isCvTemplateId(template)) return generateDesignCvHtml(cv, template);
  const c = escapeDeep(cv);
  const p = c.detailsPersonnels;
  const nom = (p.nom || '').toUpperCase();
  const prenom = p.prenom || '';
  const fullName = `${nom} ${prenom}`.trim() || TO_COMPLETE;
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
    ${p.nationalite || p.adresse ? `<tr>
      <td class="col-left">${p.nationalite ? `<span class="label">Nationalité :</span> ${p.nationalite}` : ''}</td>
      <td class="col-right">${p.adresse ? `<span class="label">Adresse :</span> ${p.adresse}` : ''}</td>
    </tr>` : ''}
    ${p.age ? `<tr>
      <td class="col-left"><span class="label">Âge :</span> ${p.age}</td>
      <td class="col-right"></td>
    </tr>` : ''}
  </table>

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

type DesignTemplateId = Exclude<CvTemplateId, 'classic' | 'ats'>;
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
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
} as const;

const icon = (name: keyof typeof ICON_PATHS, size = 12): string =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`;

// "a, b" without the separator when a part is empty.
const joinParts = (parts: (string | undefined)[], sep = ', '): string => parts.filter((p) => p && p.trim()).join(sep);

const contactLines = (p: EscapedCv['detailsPersonnels']) => [
  { icon: 'phone' as const, text: todo(p.telephone) },
  { icon: 'mail' as const, text: todo(p.email) },
  ...(p.adresse ? [{ icon: 'pin' as const, text: p.adresse }] : []),
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
    { icon: 'pin' as const, text: p.adresse },
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
  const contact = joinParts([todo(p.email), todo(p.telephone), p.adresse, p.nationalite, p.age], ' | ');
  const bullets = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '');
  const skills = [...c.competences.professionnelles, ...c.competences.habilitesRelationnelles];
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
  ${c.profil ? `<h2>Profil</h2><p>${c.profil}</p>` : ''}
  <h2>Expérience professionnelle</h2>
  ${list(c.experiences, (exp) => `
    <h3>${joinParts([exp.poste, exp.entreprise], ' — ')}</h3>
    <div class="meta">${joinParts([exp.ville, cvPeriode(exp)], ' | ')}</div>
    ${bullets(exp.missions)}`, `<p>${TO_COMPLETE}</p>`)}
  <h2>Formation</h2>
  ${list(c.formations, (form) => `
    <h3>${form.diplome}</h3>
    <div class="meta">${joinParts([joinParts([form.etablissement, form.ville]), cvPeriode(form)], ' | ')}</div>`, `<p>${TO_COMPLETE}</p>`)}
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
