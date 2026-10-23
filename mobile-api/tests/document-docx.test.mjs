import assert from 'node:assert/strict';
import test from 'node:test';

import JSZip from 'jszip';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const LOCAL = ['lib/document-style.ts', 'lib/document-cover.ts', 'lib/document-render.ts', 'lib/document-numbering.ts', 'lib/html-to-docx.ts'];
const { buildDocumentDocx } = await loadTsWithPackages('lib/document-docx.ts', LOCAL);
const { presetStyle, applyStylePatch } = await loadTs('lib/document-style.ts');

const sections = [
  { id: '0', title: 'Page de garde', content_html: '' },
  { id: '1', title: 'Dédicace', content_html: '<p>À ma famille.</p>' },
  { id: '2', title: 'Sommaire', content_html: '' },
  { id: '3', title: 'Liste des Figures et Tableaux', content_html: '<p>Texte inventé.</p>' },
  { id: '4', title: 'Introduction Générale', content_html: '<p>Introduction.</p>' },
  {
    id: '5',
    title: 'Chapitre 1 : Présentation',
    content_html: '<h1>Historique</h1><p>Texte.</p><figure class="fig-half"><img alt="x"><figcaption>Organigramme</figcaption></figure><p class="doc-table-caption">Effectifs</p><table><tr><th>A</th></tr><tr><td>1</td></tr></table>',
  },
];

const build = async (style) => {
  const buffer = await buildDocumentDocx({
    document: { title: 'Rapport', template_type: 'stage', cover_data: { title: 'Tableau de bord qualité', studentName: 'Awa Test', school: 'IUT de Douala', year: '2025-2026' } },
    sections,
    style,
    images: new Map(),
  });
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.keys(zip.files);
  const read = async (name) => (zip.file(name) ? zip.file(name).async('string') : '');
  return { files, xml: await read('word/document.xml'), settings: await read('word/settings.xml'), headers: await Promise.all(files.filter((f) => /word\/header\d*\.xml/.test(f)).map(read)), footers: await Promise.all(files.filter((f) => /word\/footer\d*\.xml/.test(f)).map(read)) };
};

test('trois sections : garde, préliminaires en romain, corps à partir de 1', async () => {
  const { xml } = await build(presetStyle('classique'));
  assert.equal((xml.match(/<w:sectPr/g) || []).length, 3);
  assert.match(xml, /w:fmt="lowerRoman"/);
  assert.match(xml, /w:fmt="decimal"/);
  assert.ok(xml.indexOf('lowerRoman') < xml.lastIndexOf('w:fmt="decimal"'), 'romain avant arabe');
});

test('sommaire et listes en champs Word, avec entrées pré-remplies', async () => {
  const { xml, settings } = await build(presetStyle('classique'));
  const fields = [...xml.matchAll(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/g)].map((m) => m[1].replace(/&quot;/g, '"'));
  assert.ok(fields.some((f) => /TOC .*\\o "1-3"/.test(f)), `sommaire des titres : ${fields.join(' | ')}`);
  assert.ok(fields.some((f) => /TOC .*\\t "Légende figure,1"/.test(f)), `liste des figures : ${fields.join(' | ')}`);
  assert.ok(fields.some((f) => /TOC .*\\t "Légende tableau,1"/.test(f)), 'liste des tableaux');
  assert.match(xml, /Légende figure/);
  assert.match(xml, /Figure 1\.1 : Organigramme/);
  assert.match(xml, /Tableau 1\.1 : Effectifs/);
  assert.match(xml, /1\.1 Historique/);
  assert.doesNotMatch(xml, /Texte inventé/);
  assert.match(settings, /updateFields/);
});

test('en-têtes et pieds selon le style', async () => {
  const classique = await build(presetStyle('classique'));
  assert.ok(classique.headers.some((h) => /STYLEREF/.test(h)), 'chapitre courant en en-tête');
  assert.ok(classique.footers.some((f) => /PAGE/.test(f)), 'numéro de page');

  const moderne = await build(presetStyle('moderne'));
  assert.ok(moderne.headers.some((h) => /Tableau de bord qualité/.test(h) && /Awa Test/.test(h)), 'titre et auteur');
  assert.ok(moderne.footers.some((f) => /Page /.test(f)), '« Page n »');

  const institutionnel = await build(presetStyle('institutionnel'));
  assert.ok(institutionnel.footers.some((f) => /SECTIONPAGES/.test(f)), '« n / total »');
});

test('bordures de page et couverture sans donnée inventée', async () => {
  const { xml } = await build(applyStylePatch(presetStyle('classique'), { page: { border: 'double' } }));
  assert.match(xml, /<w:pgBorders/);
  assert.match(xml, /w:val="double"/);
  assert.match(xml, /Awa Test/);
  assert.doesNotMatch(xml, /Lucien|Yaoundé|Campus 360 Inc|22GL049/);
});

test('dédicace en italique calée à droite, titres IA en h2 renumérotés', async () => {
  const { xml } = await build(presetStyle('classique'));
  const paragraph = [...xml.matchAll(/<w:p>[\s\S]*?<\/w:p>/g)].map((m) => m[0]).find((p) => /À ma famille/.test(p));
  assert.ok(paragraph, 'paragraphe de dédicace');
  assert.match(paragraph, /<w:jc w:val="right"\/>/);
  assert.match(paragraph, /<w:i\/>/);
  assert.doesNotMatch(xml, /1\.1 1\.1/);
});

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const logoImage = { data: PNG_1PX, mime: 'image/png', width: 1, height: 1 };
const textOf = (xml) => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');

test('module 24 : modèle type référence (bandeau, pied auteur encadré, garde par blocs, puces ❖)', async () => {
  const style = applyStylePatch(presetStyle('classique'), {
    headings: { numbering: 'chapter-section-roman' },
    headerFooter: { headerStyle: 'band', authorLabel: 'Rédigé et présenté par :', footerRule: true, pageNumberFrame: 'box', footerLeft: 'author', footerCenter: 'none', footerRight: 'page' },
    captions: { scope: 'document' },
    lists: { bullet: 'diamond' },
    dedication: { frame: true },
    cover: {
      blocks: [
        { id: 'header', type: 'bilingual-header', left: ['Université Exemple'], right: ['Example University'], center: null, style: {} },
        { id: 'logos', type: 'logos', left: 'department', center: 'school', right: 'company', height: 50, centerText: '', rule: false, style: {} },
        { id: 'title', type: 'title-banner', prefix: 'THÈME :', variant: 'band', style: { bold: true } },
        { id: 'author', type: 'author', label: 'Rédigé et présenté par :', matriculeLabel: 'Matricule :', style: {} },
        { id: 'year', type: 'year-banner', template: 'Année académique {year}', variant: 'band', style: {} },
      ],
    },
  });
  const twoChapters = [
    ...sections,
    { id: '6', title: 'Chapitre 2 : Travail', content_html: '<h1>Analyse</h1><ul><li>Point A</li></ul><figure><img alt="y"><figcaption>Architecture</figcaption></figure>' },
  ];
  const buffer = await buildDocumentDocx({
    document: { title: 'Rapport', template_type: 'stage', cover_data: { title: 'Gestion des stocks', studentName: 'Awa Test', year: '2025-2026' } },
    sections: twoChapters,
    style,
    images: new Map(),
    logos: { school: logoImage, company: logoImage, department: logoImage },
  });
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  fs.writeFileSync(path.join(os.tmpdir(), 'campus360-test-reference.docx'), buffer);
  const zip = await JSZip.loadAsync(buffer);
  const read = async (name) => zip.file(name).async('string');
  const names = Object.keys(zip.files);
  const headers = await Promise.all(names.filter((f) => /word\/header\d*\.xml/.test(f)).map(read));
  const footers = await Promise.all(names.filter((f) => /word\/footer\d*\.xml/.test(f)).map(read));
  const xml = await read('word/document.xml');
  const numbering = await read('word/numbering.xml');

  assert.ok(headers.some((h) => /<w:shd/.test(h) && /Gestion des stocks/.test(textOf(h)) && /<w:caps\/>/.test(h)), 'bandeau ombré avec le titre en majuscules');
  assert.ok(footers.some((f) => textOf(f).includes('Rédigé et présenté par : Awa Test')), 'pied auteur');
  assert.ok(footers.some((f) => /PAGE/.test(f) && /<w:bdr /.test(f)), 'numéro de page encadré');
  const text = textOf(xml);
  assert.ok(text.indexOf('Figure 1 : Organigramme') >= 0 && text.indexOf('Figure 2 : Architecture') > text.indexOf('Figure 1 : Organigramme'));
  assert.match(text, /THÈME : Gestion des stocks/);
  const cover = xml.slice(0, xml.indexOf('<w:sectPr'));
  assert.equal((cover.match(/<w:drawing/g) || []).length, 3, 'trois logos sur la garde');
  assert.match(numbering, /w:val="❖"/);
  assert.match(text, /SECTION 1 : Historique/);
});
