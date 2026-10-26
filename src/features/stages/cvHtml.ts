import type { OfficialCvData } from '../../types';

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

const list = <T,>(items: T[], render: (item: T) => string, empty = `<div class="item-sub-title">${TO_COMPLETE}</div>`): string =>
  items.length ? items.map(render).join('') : empty;

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
      <div class="student-meta">Email : ${d.studentEmail} ${d.studentPhone ? '| WhatsApp : ' + data.studentPhone : ''}</div>
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

// Layouts the student can pick for the official CV. "classic" is the 2-column
// template; "modern" and "elegant" are the sidebar layouts (see generateSidebarCvHtml).
export const CV_TEMPLATES = [
  { id: 'classic', label: 'Classique', description: 'Deux colonnes, sobre' },
  { id: 'modern', label: 'Moderne', description: 'Colonne bleue, photo ronde' },
  { id: 'elegant', label: 'Élégant', description: 'Photo carrée, bandeau clair' },
] as const;
export type CvTemplateId = (typeof CV_TEMPLATES)[number]['id'];

/**
 * Génère le code HTML du CV Officiel. Le gabarit "classic" est le 2 colonnes d'origine.
 */
export function generateOfficialCvHtml(cv: OfficialCvData, template: CvTemplateId = 'classic'): string {
  if (template !== 'classic') return generateSidebarCvHtml(cv, template);
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
    <tr>
      <td class="col-left"><span class="label">Nationalité :</span> ${todo(p.nationalite)}</td>
      <td class="col-right"><span class="label">Adresse :</span> ${todo(p.adresse)}</td>
    </tr>
    <tr>
      <td class="col-left"><span class="label">Âge :</span> ${todo(p.age)}</td>
      <td class="col-right"></td>
    </tr>
  </table>

  <!-- 2. Expérience professionnelle -->
  <div class="section-heading">Expérience professionnelle</div>
  ${list(c.experiences, exp => `
    <div class="exp-item">
      <div class="item-main-title">${exp.poste}</div>
      <div class="item-top-row">
        <span class="item-sub-title">${exp.entreprise}, ${exp.ville}</span>
        <span class="item-date-right">${exp.periode}</span>
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
        <span class="item-date-right">${form.periode}</span>
      </div>
      <div class="item-sub-title">${form.etablissement}, ${form.ville}</div>
    </div>
  `)}

  <!-- 4. Compétences -->
  <div class="section-heading">Compétences</div>
  <div class="competences-subheading">Compétences professionnelles</div>
  <ul class="cv-bullet-list">
    ${list(c.competences.professionnelles, comp => `<li>${comp}</li>`, `<li>${TO_COMPLETE}</li>`)}
  </ul>

  <div class="skills-inline-text">
    <span class="label">Habilités personnelles et relationnelles :</span> ${todo(c.competences.habilitesRelationnelles.join(', '))}
  </div>

  <div class="competences-subheading">Maîtrise des logiciels</div>
  <ul class="cv-bullet-list">
    ${list(c.competences.logiciels, log => `<li>${log.categorie ? `<strong>${log.categorie} :</strong> ` : ''}${log.items.join(', ')}</li>`, `<li>${TO_COMPLETE}</li>`)}
  </ul>

  <!-- 5. Langues -->
  <div class="section-heading">Langues</div>
  <div style="font-size: 9.5pt; color: #374151; margin-bottom: 6px;">
    ${list(c.langues, lang => `<div>${lang.langue}: ${lang.niveau}</div>`)}
  </div>

  <!-- 6. Autres informations importantes -->
  <div class="section-heading">Autres informations importantes</div>
  <div style="font-size: 9.5pt; color: #374151; margin-bottom: 12px;">
    <span class="label">Loisirs :</span> ${todo(c.loisirs.join(', '))}
  </div>

  <div class="page-footer-num">1</div>
</body>
</html>`;
}

// Colours of the sidebar layouts. Kept here (not in the RN components) because
// they only exist in the printed HTML.
const SIDEBAR_THEMES = {
  modern: { navy: '#0B2545', light: '#FFFFFF', photoRadius: '50%' },
  elegant: { navy: '#13315C', light: '#F1F5F9', photoRadius: '0' },
} as const;

/**
 * Gabarits "modern" (photo ronde dans une colonne bleue) et "elegant"
 * (photo carrée en bandeau, colonne bleue en bas). Même contenu que le classique.
 */
function generateSidebarCvHtml(cv: OfficialCvData, template: Exclude<CvTemplateId, 'classic'>): string {
  const c = escapeDeep(cv);
  const p = c.detailsPersonnels;
  const theme = SIDEBAR_THEMES[template];
  const nom = (p.nom || '').toUpperCase();
  const prenom = p.prenom || '';
  const fullName = `${nom} ${prenom}`.trim() || TO_COMPLETE;
  const photo = safeImageUrl(cv.photoUrl);
  const photoClass = template === 'modern' ? 'photo round' : 'photo square';
  const photoBlock = photo
    ? `<img src="${escapeHtml(photo)}" alt="" class="${photoClass}" />`
    : `<div class="${photoClass} photo-initials">${nom.slice(0, 1)}${prenom.slice(0, 1)}</div>`;

  const contact = `
    <div class="side-title">Contact</div>
    <div class="side-line">${todo(p.telephone)}</div>
    <div class="side-line">${todo(p.email)}</div>
    <div class="side-line">${todo(p.adresse)}</div>
    <div class="side-line">Nationalité : ${todo(p.nationalite)}</div>
    <div class="side-line">Âge : ${todo(p.age)}</div>`;
  const skills = `
    <div class="side-title">Compétences</div>
    <ul class="side-list">
      ${list(c.competences.professionnelles, comp => `<li>${comp}</li>`, `<li>${TO_COMPLETE}</li>`)}
      ${c.competences.habilitesRelationnelles.map(h => `<li>${h}</li>`).join('')}
    </ul>
    ${c.competences.logiciels.length ? `<div class="side-subtitle">Logiciels</div><ul class="side-list">${c.competences.logiciels.map(log => `<li>${log.categorie ? `${log.categorie} : ` : ''}${log.items.join(', ')}</li>`).join('')}</ul>` : ''}`;
  const langues = `
    <div class="side-title">Langues</div>
    ${list(c.langues, lang => `<div class="side-line">${lang.langue} : ${lang.niveau}</div>`, `<div class="side-line">${TO_COMPLETE}</div>`)}`;
  const loisirs = `
    <div class="side-title">Centres d'intérêt</div>
    <div class="side-line">${todo(c.loisirs.join(', '))}</div>`;
  const experiences = `
    <div class="main-title">Expérience professionnelle</div>
    ${list(c.experiences, exp => `
      <div class="exp-item">
        <div class="item-main-title">${exp.poste}</div>
        <div class="item-top-row">
          <span class="item-sub-title">${exp.entreprise}, ${exp.ville}</span>
          <span class="item-date-right">${exp.periode}</span>
        </div>
        <ul class="cv-bullet-list">${exp.missions.map(m => `<li>${m}</li>`).join('')}</ul>
      </div>`)}`;
  const formations = `
    <div class="main-title">Formation</div>
    ${list(c.formations, form => `
      <div class="form-item">
        <div class="item-top-row">
          <span class="item-main-title">${form.diplome}</span>
          <span class="item-date-right">${form.periode}</span>
        </div>
        <div class="item-sub-title">${form.etablissement}, ${form.ville}</div>
      </div>`)}`;
  const heading = `
    <h1 class="cv-name">${fullName}</h1>
    <div class="cv-job-title">${todo(c.titrePoste)}</div>`;

  // modern: photo and contact in the blue column, name on the right.
  // elegant: photo and name in a header band, the blue column below.
  const body = template === 'modern'
    ? `<div class="page">
         <aside class="side">${photoBlock}${contact}${skills}${langues}${loisirs}</aside>
         <main class="main">${heading}${experiences}${formations}</main>
       </div>`
    : `<header class="top">${photoBlock}<div class="top-text">${heading}</div></header>
       <div class="page">
         <aside class="side">${contact}${skills}${langues}${loisirs}</aside>
         <main class="main">${experiences}${formations}</main>
       </div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Curriculum Vitae — ${fullName}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827; line-height: 1.45; font-size: 10pt; margin: 0; background: #FFFFFF;
    }
    .page { display: flex; min-height: 297mm; }
    .side { width: 34%; flex: 0 0 34%; background: ${theme.navy}; color: #FFFFFF; padding: 12mm 8mm; }
    .main { flex: 1; padding: 12mm 12mm; }
    .top { display: flex; align-items: center; gap: 8mm; padding: 12mm 12mm 8mm; background: ${theme.light}; }
    .top-text { flex: 1; }
    .photo { object-fit: cover; display: block; border: 2px solid #FFFFFF; background: #E2E8F0; }
    .photo.round { width: 38mm; height: 38mm; border-radius: ${theme.photoRadius}; margin: 0 auto 6mm; }
    .photo.square { width: 34mm; height: 42mm; border-radius: 0; flex: 0 0 34mm; border: 0; }
    .photo-initials { display: flex; align-items: center; justify-content: center; font-size: 20pt; font-weight: 700; color: ${theme.navy}; }
    .cv-name { font-size: 22pt; font-weight: 800; margin: 0; color: ${template === 'modern' ? theme.navy : '#111827'}; letter-spacing: -0.3px; }
    .cv-job-title { font-size: 12pt; color: #374151; margin-top: 2mm; }
    .side-title { font-size: 10.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6mm; padding-bottom: 1.5mm; border-bottom: 1px solid rgba(255,255,255,0.5); }
    .side-subtitle { font-weight: 700; margin-top: 2mm; }
    .side-line { font-size: 9.5pt; margin-top: 1.5mm; word-break: break-word; }
    ul.side-list { list-style: none; margin: 2mm 0 0 0; padding: 0; }
    ul.side-list li { font-size: 9.5pt; margin-bottom: 1.2mm; }
    .main-title { font-size: 11pt; font-weight: 700; color: ${theme.navy}; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1.5px solid ${theme.navy}; padding-bottom: 1.5mm; margin: 6mm 0 3mm; }
    .exp-item, .form-item { margin-bottom: 4mm; }
    .item-top-row { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
    .item-main-title { font-weight: 700; font-size: 10pt; }
    .item-sub-title { font-style: italic; color: #4B5563; font-size: 9.5pt; }
    .item-date-right { color: #6B7280; font-size: 9pt; text-align: right; white-space: nowrap; }
    ul.cv-bullet-list { margin: 2mm 0 0 18px; padding: 0; }
    ul.cv-bullet-list li { font-size: 9.5pt; color: #374151; margin-bottom: 1mm; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}
