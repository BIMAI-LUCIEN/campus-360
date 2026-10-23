import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const { coverHtml } = await loadTsWithPackages('lib/document-render.ts', ['lib/document-style.ts', 'lib/document-cover.ts']);
const { fillTemplate, coverBlocksHtml } = await loadTsWithPackages('lib/document-cover.ts', ['lib/document-style.ts']);
const { presetStyle, resolveStyle, applyStylePatch } = await loadTs('lib/document-style.ts');

// Fixtures written from the cover code before Module 24 (fictitious data only).
const fixture = (name) => fs.readFileSync(path.resolve(`tests/fixtures/${name}`), 'utf8').trim();
const data = JSON.parse(fixture('cover-data.json'));
const logos = { school: 'data:image/png;base64,AAAA', company: 'data:image/png;base64,BBBB' };
const flatten = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const PRESET_OF = { classic: 'classique', modern: 'moderne', minimal: 'sobre', institutional: 'institutionnel' };

test('non-régression : les 4 gardes prêtes gardent le même texte, dans le même ordre', () => {
  for (const [template, preset] of Object.entries(PRESET_OF)) {
    assert.equal(flatten(coverHtml(data, presetStyle(preset), logos)), fixture(`cover-${template}.txt`), template);
    const sparse = { kindLabel: 'Mémoire de fin d’études', title: 'Titre seul', studentName: 'Awa Test', nationalHeader: false };
    assert.equal(flatten(coverHtml(sparse, presetStyle(preset), {})), fixture(`cover-${template}-sparse.txt`), `${template} (peu rempli)`);
  }
  assert.equal(flatten(coverHtml({ ...data, nationalHeader: false }, presetStyle('classique'), {})), fixture('cover-classic-no-national.txt'));
});

test('les logos restent présents dans les gardes prêtes', () => {
  const html = coverHtml(data, presetStyle('classique'), logos);
  assert.match(html, /src="data:image\/png;base64,AAAA"/);
  assert.match(html, /src="data:image\/png;base64,BBBB"/);
});

const REFERENCE_LIKE = [
  { id: 'header', type: 'bilingual-header', left: ['Université Exemple', 'Institut Exemple'], right: ['Example University', 'Example Institute'], center: null, style: {} },
  { id: 'logos', type: 'logos', left: 'department', center: 'school', right: 'company', height: 60, centerText: '', rule: false, style: {} },
  { id: 'kind', type: 'heading', text: 'RAPPORT DE STAGE ACADÉMIQUE', style: { bold: true } },
  { id: 'title', type: 'title-banner', prefix: 'THÈME :', variant: 'band', style: { bold: true, uppercase: true } },
  { id: 'period', type: 'text', template: 'Stage effectué du {period} en vue de l’obtention du {degree}', style: {} },
  { id: 'author', type: 'author', label: 'Rédigé et présenté par :', matriculeLabel: 'Matricule :', style: {} },
  { id: 'tutors', type: 'supervisors', layout: 'columns', label: 'Sous l’encadrement de :', academicLabel: 'Encadreur académique', corporateLabel: 'Encadreur professionnel', authorLabel: '', matriculeLabel: '', specialtyLabel: '', style: {} },
  { id: 'year', type: 'year-banner', template: 'Année académique {year}', variant: 'band', style: {} },
];

test('garde décrite en blocs : tout rempli, puis presque vide', () => {
  const style = resolveStyle({ cover: { blocks: REFERENCE_LIKE } });
  assert.equal(style.cover.blocks.length, REFERENCE_LIKE.length);
  const full = flatten(coverHtml(data, style, { ...logos, department: 'data:image/png;base64,CCCC' }));
  assert.match(full, /THÈME : Titre du rapport exemple/);
  assert.match(full, /Rédigé et présenté par : Awa Test/);
  assert.match(full, /Sous l’encadrement de :/);
  assert.match(full, /Stage effectué du du 1er juin au 31 août en vue de l’obtention du Diplôme Exemple/);
  const sparse = flatten(coverHtml({ kindLabel: 'Rapport de stage', title: 'Titre seul', studentName: 'Awa Test' }, style, {}));
  assert.match(sparse, /THÈME : Titre seul/);
  assert.match(sparse, /Awa Test/);
  for (const absent of ['Stage effectué', 'Matricule', 'Année académique', 'Encadreur académique', 'Encadreur professionnel', 'Sous l’encadrement']) {
    assert.ok(!sparse.includes(absent), `« ${absent} » ne doit pas apparaître sans valeur`);
  }
});

test('toute valeur est échappée', () => {
  const html = coverHtml({ ...data, studentName: '<script>x</script>', title: '"><img src=x onerror=alert(1)>' }, presetStyle('classique'), {});
  assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
});

test('fillTemplate : champ vide, partie optionnelle, gras', () => {
  assert.equal(fillTemplate('du {period} au', { kindLabel: 'Rapport de stage', title: '', period: '' }), null);
  assert.equal(fillTemplate('{company}[ — {period}]', { kindLabel: 'Rapport de stage', title: '', company: 'Exemple SA' }), 'Exemple SA');
  assert.equal(fillTemplate('**Nom :** {studentName}', { kindLabel: 'x', title: '', studentName: 'A&B' }), '<strong>Nom :</strong> A&amp;B');
  assert.equal(fillTemplate('{inconnu} reste', { kindLabel: 'x', title: '' }), '{inconnu} reste');
});

test('blocs invalides retirés, bornes appliquées', () => {
  const style = resolveStyle({
    cover: {
      blocks: [
        { type: 'video', id: 'v' },
        { type: 'spacer', id: 'Bad Id!', height: 500 },
        { type: 'heading', id: 'h', text: 'x'.repeat(400), style: { size: 99, color: 'red' } },
        { type: 'heading', id: 'h', text: 'Doublon' },
      ],
    },
  });
  assert.deepEqual(style.cover.blocks.map((b) => b.type), ['spacer', 'heading', 'heading']);
  assert.equal(style.cover.blocks[0].height, 60);
  assert.match(style.cover.blocks[0].id, /^[a-z0-9-]+$/);
  assert.equal(style.cover.blocks[1].text.length, 160);
  assert.equal(style.cover.blocks[1].style.size, 28);
  assert.equal(style.cover.blocks[1].style.color, null);
  assert.notEqual(style.cover.blocks[2].id, style.cover.blocks[1].id);
  assert.equal(resolveStyle({ cover: { blocks: Array.from({ length: 40 }, () => ({ type: 'extra-lines' })) } }).cover.blocks.length, 30);
  assert.equal(presetStyle('classique').cover.blocks, null);
});

test('changer de style garde les blocs et le logo du département', () => {
  const logo = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
  const current = applyStylePatch(presetStyle('classique'), { cover: { blocks: REFERENCE_LIKE, departmentLogoFileId: logo } });
  const next = applyStylePatch(current, { preset: 'moderne' });
  assert.equal(next.cover.departmentLogoFileId, logo);
  assert.equal(next.cover.blocks.length, REFERENCE_LIKE.length);
});

test('schéma des blocs : type inconnu, clé inconnue ou bornes refusés', async () => {
  const { documentStylePatchSchema } = await loadTsWithPackages('lib/document-style-schema.ts', ['lib/document-style.ts']);
  const ok = (body) => documentStylePatchSchema.safeParse(body).success;
  const blocks = resolveStyle({ cover: { blocks: REFERENCE_LIKE } }).cover.blocks;
  assert.equal(ok({ cover: { blocks } }), true);
  assert.equal(ok({ cover: { blocks: null } }), true);
  assert.equal(ok({ cover: { blocks: [{ ...blocks[0], type: 'video' }] } }), false);
  assert.equal(ok({ cover: { blocks: [{ ...blocks[2], extra: 1 }] } }), false);
  assert.equal(ok({ cover: { blocks: [{ ...blocks[2], text: 'x'.repeat(161) }] } }), false);
  assert.equal(ok({ cover: { blocks: Array.from({ length: 31 }, () => blocks[2]) } }), false);
});

test('coverBlocksHtml : un bloc sans contenu ne produit rien', () => {
  const blocks = resolveStyle({ cover: { blocks: [{ type: 'author', id: 'a', label: 'Par :', matriculeLabel: 'Mat :' }] } }).cover.blocks;
  assert.equal(coverBlocksHtml(blocks, { kindLabel: 'x', title: 't' }, presetStyle('classique'), {}), '');
});
