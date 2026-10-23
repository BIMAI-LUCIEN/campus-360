import { coverCss, coverHtml, styleToCss, type CoverData } from './document-render';
import type { DocumentStyle } from './document-style';

// Preview of a report template (Module 24): its cover with fixed, obviously
// fictitious data, then a sample chapter page. Shown in a sandboxed iframe in
// the admin web, and rendered to a JPEG thumbnail when a template is published.

export const SAMPLE_COVER: CoverData = {
  university: 'Université Exemple',
  school: 'Institut Exemple',
  faculty: 'Département Exemple',
  kindLabel: 'Rapport de stage',
  degree: 'Diplôme Exemple',
  title: 'Titre du rapport',
  studentName: 'Prénom NOM',
  matricule: '00X000',
  specialty: 'Filière Exemple',
  company: 'Entreprise Exemple SA',
  period: 'du 1er juin au 31 août',
  tutorCorporate: 'M. Encadreur Professionnel',
  tutorAcademic: 'Dr Encadreur Académique',
  year: '2025-2026',
  nationalHeader: true,
  extraLines: [],
};

const placeholderLogo = (label: string) =>
  `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#E5E7EB" stroke="#9CA3AF"/><text x="60" y="45" font-size="12" text-anchor="middle" fill="#4B5563" font-family="Arial">${label}</text></svg>`,
  ).toString('base64')}`;

export const templatePreviewHtml = (
  style: DocumentStyle,
  outline: { title: string }[],
  logos: { school?: string | null; company?: string | null; department?: string | null } = {},
): string => {
  const shownLogos = {
    school: logos.school ?? placeholderLogo('Établissement'),
    company: logos.company ?? placeholderLogo('Entreprise'),
    department: logos.department ?? placeholderLogo('Département'),
  };
  const chapter = outline.find((o) => /^chapitre/i.test(o.title))?.title || 'Chapitre 1';
  const band =
    style.headerFooter.headerStyle === 'band'
      ? `<div style="background:${style.page.bandColor};color:${style.headerFooter.headerTextColor};font-weight:700;text-transform:uppercase;text-align:center;font-size:9pt;padding:4pt;margin-bottom:12pt">${SAMPLE_COVER.title}</div>`
      : '';
  const author = style.headerFooter.authorLabel ? `${style.headerFooter.authorLabel} ${SAMPLE_COVER.studentName}` : '';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; background: #E5E7EB; }
  .sheet { background: #FFFFFF; width: 210mm; min-height: 297mm; margin: 0 auto 12px; padding: 18mm; box-sizing: border-box; }
  ${styleToCss(style, { cssNumbering: true })}
  ${coverCss(style, '261mm', true)}
  .foot { display: flex; justify-content: space-between; font-size: 9pt; color: #555555; margin-top: 18pt; padding-top: 4pt; ${style.headerFooter.footerRule ? `border-top: 0.5pt solid ${style.page.accentColor};` : ''} }
  .num { ${style.headerFooter.pageNumberFrame === 'box' ? `border: 0.75pt solid ${style.page.accentColor}; padding: 0 4pt;` : ''} }
</style></head><body>
<div class="sheet">${coverHtml(SAMPLE_COVER, style, shownLogos)}</div>
<div class="sheet doc-section" data-kind="body" data-chapter="1" style="--chapter: '1'">
  ${band}
  <h1 class="doc-section-title">${chapter.replace(/[<>&]/g, '')} : Présentation de l’entreprise</h1>
  <div class="doc-body">
    <h1>Historique</h1>
    <p>Texte d’exemple du rapport, écrit pour montrer la police, la taille et l’interligne du modèle.</p>
    <h2>Organisation</h2>
    <ul><li>Premier point</li><li>Second point</li></ul>
    <p class="doc-table-caption">Effectifs par service</p>
    <table><thead><tr><th>Service</th><th>Effectif</th></tr></thead><tbody><tr><td>Production</td><td>12</td></tr></tbody></table>
  </div>
  <div class="foot"><span>${author}</span><span class="num">1</span></div>
</div>
</body></html>`;
};
