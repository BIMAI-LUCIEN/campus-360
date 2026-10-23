import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const { rejectDtd, textOf, elements, children, attr } = await loadTs('lib/ooxml.ts');
const { importDocxTemplate } = await loadTsWithPackages('lib/template-import-docx.ts', [
  'lib/document-style.ts', 'lib/file-validation.ts', 'lib/ooxml.ts', 'lib/source-extraction.ts',
]);
const { buildDocumentDocx } = await loadTsWithPackages('lib/document-docx.ts', [
  'lib/document-style.ts', 'lib/document-cover.ts', 'lib/document-render.ts', 'lib/document-numbering.ts', 'lib/html-to-docx.ts',
]);
const { presetStyle, applyStylePatch } = await loadTs('lib/document-style.ts');

test('ooxml : DTD refusée, texte décodé, éléments imbriqués', () => {
  assert.throws(() => rejectDtd('<!DOCTYPE x [<!ENTITY a "b">]><w:t/>'));
  assert.equal(textOf('<w:r><w:t>A&amp;B</w:t></w:r>'), 'A&B');
  const tables = elements('<w:tbl><w:tr><w:tc><w:tbl><w:tc/></w:tbl></w:tc></w:tr></w:tbl><w:p/>', 'w:tbl');
  assert.equal(tables.length, 1);
  assert.deepEqual(children('<w:p><w:r/></w:p><w:tbl><w:p/></w:tbl><w:p/>', ['w:p', 'w:tbl']).map((c) => c.tag), ['w:p', 'w:tbl', 'w:p']);
  assert.equal(attr('<w:pgMar w:left="1417" w:right="1417"/>', 'w:left'), '1417');
});

// Fictitious data only.
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const logo = { data: PNG_1PX, mime: 'image/png', width: 1, height: 1 };
const sections = [
  { id: '0', title: 'Page de garde', content_html: '' },
  { id: '1', title: 'Dédicace', content_html: '<p>À ma famille.</p>' },
  { id: '2', title: 'Sommaire', content_html: '' },
  { id: '3', title: 'Introduction générale', content_html: '<p>Introduction.</p>' },
  { id: '4', title: 'Chapitre 1 : Présentation', content_html: '<h1>Historique</h1><h2>Création</h2><ul><li>Point</li></ul><figure><img alt="x"><figcaption>Organigramme</figcaption></figure>' },
  { id: '5', title: 'Chapitre 2 : Travail', content_html: '<h1>Analyse</h1><figure><img alt="y"><figcaption>Architecture</figcaption></figure>' },
  { id: '6', title: 'Conclusion générale', content_html: '<p>Fin.</p>' },
];
const docxOf = (style, logos = {}) =>
  buildDocumentDocx({
    document: { title: 'Rapport', template_type: 'stage', cover_data: { title: 'Sujet fictif', studentName: 'Awa Test', matricule: 'MAT-0001', tutorAcademic: 'Dr Exemple', tutorCorporate: 'M. Exemple', year: '2025-2026', degree: 'Diplôme Exemple' } },
    sections,
    style,
    images: new Map(),
    logos,
  });

test('aller-retour : un export du style classique se relit à l’identique', async () => {
  const original = presetStyle('classique');
  const { style, outline, report } = await importDocxTemplate(await docxOf(original));
  assert.deepEqual(style.typography, original.typography);
  assert.equal(style.headings.numbering, original.headings.numbering);
  assert.equal(style.page.margins, original.page.margins);
  assert.equal(style.headerFooter.numberFormat, original.headerFooter.numberFormat);
  assert.deepEqual(outline.map((o) => o.title), ['Dédicace', 'Sommaire', 'Introduction générale', 'Chapitre 1', 'Chapitre 2', 'Conclusion générale']);
  assert.ok(report.sure.length > 3);
});

const REFERENCE = applyStylePatch(presetStyle('classique'), {
  headings: { numbering: 'chapter-section-roman' },
  page: { margins: 'wide', bandColor: '#0F3D56' },
  headerFooter: { headerStyle: 'band', authorLabel: 'Rédigé et présenté par :', footerRule: true, pageNumberFrame: 'box', footerLeft: 'author', footerCenter: 'none', footerRight: 'page' },
  captions: { scope: 'document' },
  lists: { bullet: 'diamond' },
  cover: {
    blocks: [
      { id: 'header', type: 'bilingual-header', left: ['**RÉPUBLIQUE DU CAMEROUN**', 'Université Exemple'], right: ['**REPUBLIC OF CAMEROON**', 'Example University'], center: null, style: { size: 9 } },
      { id: 'logos', type: 'logos', left: 'department', center: 'school', right: 'company', height: 50, centerText: '', rule: false, style: {} },
      { id: 'kind', type: 'heading', text: 'RAPPORT DE STAGE ACADÉMIQUE', style: { bold: true, size: 14 } },
      { id: 'title', type: 'title-banner', prefix: 'THÈME :', variant: 'band', style: { bold: true } },
      { id: 'author', type: 'author', label: 'Rédigé et présenté par :', matriculeLabel: 'Matricule :', style: {} },
      { id: 'tutors', type: 'supervisors', layout: 'columns', label: 'Sous l’encadrement de :', academicLabel: 'Encadreur académique', corporateLabel: 'Encadreur professionnel', style: {} },
      { id: 'year', type: 'year-banner', template: 'Année académique {year}', variant: 'band', style: { bold: true } },
    ],
  },
});

test('aller-retour : modèle type référence (bandeau, auteur, numéro encadré, puces, garde)', async () => {
  const { style, logos, report } = await importDocxTemplate(await docxOf(REFERENCE, { school: logo, company: logo, department: logo }));
  assert.equal(style.headerFooter.headerStyle, 'band');
  assert.equal(style.page.bandColor, '#0F3D56');
  assert.equal(style.headerFooter.authorLabel, 'Rédigé et présenté par :');
  assert.equal(style.headerFooter.footerLeft, 'author');
  assert.equal(style.headerFooter.footerRight, 'page');
  assert.equal(style.headerFooter.pageNumberFrame, 'box');
  assert.equal(style.headerFooter.footerRule, true);
  assert.equal(style.lists.bullet, 'diamond');
  assert.equal(style.headings.numbering, 'chapter-section-roman');
  assert.equal(style.captions.scope, 'document');
  assert.equal(style.page.margins, 'wide');

  const types = style.cover.blocks.map((b) => b.type);
  const order = ['bilingual-header', 'logos', 'heading', 'title-banner', 'author', 'supervisors', 'year-banner'];
  assert.deepEqual(types.filter((t) => order.includes(t)), order, types.join(', '));
  assert.equal(logos.length, 3);
  assert.equal(style.cover.blocks.find((b) => b.type === 'title-banner').prefix, 'THÈME :');
  assert.equal(style.cover.blocks.find((b) => b.type === 'author').label, 'Rédigé et présenté par :');
  const header = style.cover.blocks.find((b) => b.type === 'bilingual-header');
  assert.deepEqual(header.left, ['**RÉPUBLIQUE DU CAMEROUN**', '{university}']);
  const all = JSON.stringify(style.cover.blocks);
  for (const own of ['Awa Test', 'Sujet fictif', 'SUJET FICTIF', 'MAT-0001', 'Dr Exemple', 'Université Exemple']) {
    assert.ok(!all.includes(own), `« ${own} » ne doit pas être recopié dans le modèle`);
  }
  assert.ok(report.sure.length > 5);
});

test('refus : pas un .docx, fichier trop lourd', async () => {
  await assert.rejects(importDocxTemplate(Buffer.from('%PDF-1.7\n%fake')), /n’est pas un document Word/);
  await assert.rejects(importDocxTemplate(Buffer.alloc(21 * 1024 * 1024)), /trop volumineux/);
});
