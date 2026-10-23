import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

// The "IUT de Douala — Rapport de stage" template (mobile-api/templates/) is a
// valid template and renders the expected layout. Fictitious data only.

const json = JSON.parse(fs.readFileSync(path.resolve('templates/iut-douala-rapport-de-stage.json'), 'utf8'));
const { templateInputSchema } = await loadTsWithPackages('lib/template-schema.ts', ['lib/document-style.ts', 'lib/document-style-schema.ts']);
const { renderDocumentPdf } = await loadTsWithPackages('lib/document-pdf.ts', [
  'lib/document-style.ts', 'lib/document-cover.ts', 'lib/document-render.ts', 'lib/document-numbering.ts', 'lib/pdf-pagination.ts', 'lib/pdf-render.ts',
]);
const { buildDocumentDocx } = await loadTsWithPackages('lib/document-docx.ts', [
  'lib/document-style.ts', 'lib/document-cover.ts', 'lib/document-render.ts', 'lib/document-numbering.ts', 'lib/html-to-docx.ts',
]);
const { sectionsForNewDocument, styleFromTemplate } = await loadTsWithPackages('lib/template-apply.ts', ['lib/document-style.ts']);

const parsed = templateInputSchema.parse(json);

test('modèle IUT : valide, aucun nom propre, plan dans l’ordre de la référence', () => {
  assert.equal(parsed.documentStyle.cover.blocks.length, json.documentStyle.cover.blocks.length, 'aucun bloc retiré par la validation');
  assert.equal(parsed.documentStyle.headings.titleAlign, 'center');
  assert.equal(parsed.documentStyle.headings.uppercaseSections, true);
  assert.equal(parsed.documentStyle.tables.headerColor, '#D9D9D9');
  assert.deepEqual(parsed.outline.slice(0, 3).map((o) => o.title), ['Dédicace', 'Remerciements', 'Sommaire']);
  assert.equal(parsed.outline.at(-1).title, 'Table des matières');
  for (const id of ['schoolLogoFileId', 'companyLogoFileId', 'departmentLogoFileId']) assert.equal(parsed.documentStyle.cover[id], null);
});

const para = (n) => `<p>${Array.from({ length: 80 }, (_, i) => `mot${n}x${i}`).join(' ')}.</p>`;
const content = {
  Dédicace: '<p>À ma famille.</p>',
  Remerciements: '<p>Merci à toute l’équipe d’accueil.</p>',
  Résumé: para('r'),
  Abstract: para('a'),
  'Liste des abréviations': '<table><tr><th>Sigle</th><th>Signification</th></tr><tr><td>DUT</td><td>Diplôme universitaire de technologie</td></tr></table>',
  'Introduction générale': para('i'),
  'Chapitre 1 : Présentation de la structure d’accueil': `<h1>Historique</h1>${para('c1')}<h2>Création</h2><ul><li>Premier point</li><li>Second point</li></ul><figure><img alt="x"><figcaption>Organigramme</figcaption></figure>`,
  'Chapitre 2 : Déroulement du stage': `<h1>Accueil</h1>${para('c2')}<p class="doc-table-caption">Planning</p><table><tr><th>Semaine</th><th>Activité</th></tr><tr><td>1</td><td>Accueil</td></tr></table>`,
  'Chapitre 3 : Travail réalisé': `<h1>Analyse</h1>${para('c3')}<figure><img alt="y"><figcaption>Architecture</figcaption></figure>`,
  'Conclusion générale': para('f'),
};
const sections = sectionsForNewDocument(parsed.outline).map((title, i) => ({ id: `s${i}`, title, content_html: content[title] ?? '' }));
const document = {
  title: 'Rapport',
  template_type: 'stage',
  cover_data: {
    university: 'Université Exemple', school: 'Institut Exemple', degree: 'Diplôme Exemple', title: 'Sujet fictif de test',
    studentName: 'Awa Test', matricule: '00X000', period: 'du 3 juin au 30 août 2026', tutorAcademic: 'Dr Exemple', tutorCorporate: 'M. Exemple', year: '2025-2026',
  },
};

const pageTexts = async (pdf) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), isEvalSupported: false, verbosity: 0 }).promise;
  const out = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    out.push((await page.getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ').replace(/\s+/g, ' '));
  }
  await doc.destroy();
  return out;
};

test('modèle IUT : PDF fidèle à la description de la référence', { timeout: 180_000 }, async () => {
  const style = styleFromTemplate(parsed.documentStyle);
  const pdf = await renderDocumentPdf({ document, sections, style, logos: {} });
  fs.writeFileSync(path.join(os.tmpdir(), 'campus360-modele-iut.pdf'), pdf);
  const pages = await pageTexts(pdf);
  const cover = pages[0];
  for (const text of ['REPUBLIQUE DU CAMEROUN', 'REPUBLIC OF CAMEROON', 'MINISTRY OF HIGHER EDUCATION', 'PO-BOX : 8698 DOUALA', 'RAPPORT DE STAGE ACADÉMIQUE', 'THÈME : SUJET FICTIF DE TEST', 'Stage effectué du 3 juin au 30 août 2026 en vue de l’obtention du Diplôme Exemple.', 'Rédigé et présenté par :', 'Awa Test', 'Matricule : 00X000', 'Sous l’encadrement de :', 'Encadreur académique :', 'ANNÉE ACADÉMIQUE : 2025-2026']) {
    assert.ok(cover.includes(text), `garde : « ${text} »`);
  }
  for (const text of pages.slice(1)) {
    assert.match(text, /SUJET FICTIF DE TEST/, 'bandeau sur chaque page');
    assert.match(text, /Rédigé et présenté par : Awa Test/, 'pied auteur sur chaque page');
  }
  const all = pages.join(' ');
  assert.match(all, /SECTION 1 : HISTORIQUE/);
  assert.match(all, /I\. CRÉATION/);
  assert.match(all, /Figure 1 : Organigramme/);
  assert.match(all, /Figure 2 : Architecture/);
  assert.match(all, /Tableau 1 : Planning/);
  const dedication = pages.findIndex((t) => /À ma famille/.test(t));
  assert.equal(all.length > 0 && pages[dedication].trim().split(' ').pop(), 'i');
});

test('modèle IUT : Word produit (à ouvrir pour contrôle visuel)', async () => {
  const style = styleFromTemplate(parsed.documentStyle);
  const buffer = await buildDocumentDocx({ document, sections, style, images: new Map() });
  fs.writeFileSync(path.join(os.tmpdir(), 'campus360-modele-iut.docx'), buffer);
  assert.ok(buffer.length > 5000);
});
