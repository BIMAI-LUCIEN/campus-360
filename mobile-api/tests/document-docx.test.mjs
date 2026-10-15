import assert from 'node:assert/strict';
import test from 'node:test';

import JSZip from 'jszip';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const LOCAL = ['lib/document-style.ts', 'lib/document-render.ts', 'lib/document-numbering.ts', 'lib/html-to-docx.ts'];
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
