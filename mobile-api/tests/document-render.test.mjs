import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const { normalizeHeadings } = await loadTs('lib/document-render.ts');
const { numberDocument } = await loadTsWithPackages('lib/document-numbering.ts', ['lib/document-render.ts', 'lib/document-style.ts']);
const { presetStyle } = await loadTs('lib/document-style.ts');

test('normalizeHeadings remonte h2/h3 en h1/h2 quand le contenu n’a pas de h1', () => {
  const html = '<h2>1.1 Contexte</h2><p>Texte</p><h3>1.1.1 Historique</h3><h2>1.2 Problématique</h2>';
  assert.equal(normalizeHeadings(html), '<h1>Contexte</h1><p>Texte</p><h2>Historique</h2><h1>Problématique</h1>');
});

test('normalizeHeadings garde les niveaux quand un h1 existe et retire les numéros tapés', () => {
  const html = '<h1>A. Présentation</h1><h2><strong>2) Missions</strong></h2>';
  assert.equal(normalizeHeadings(html), '<h1>Présentation</h1><h2><strong>Missions</strong></h2>');
});

test('normalizeHeadings ne touche ni aux années ni aux paragraphes', () => {
  const html = '<h1>2009 : création de l’entreprise</h1><p>1.1 reste dans le texte</p>';
  assert.equal(normalizeHeadings(html), html);
});

test('numberDocument numérote 1.1 un contenu IA en h2 avec numéros tapés', () => {
  const doc = numberDocument(
    [{ id: 'c1', title: 'Chapitre 1 : Contexte', content_html: '<h2>1.1 Présentation</h2><p>x</p><h3>1.1.1 Historique</h3>' }],
    presetStyle('classique'),
    { markers: false },
  );
  const html = doc.sections[0].html;
  assert.match(html, /<h1><span class="hn">1\.1<\/span> Présentation<\/h1>/);
  assert.match(html, /<h2><span class="hn">1\.1\.1<\/span> Historique<\/h2>/);
});
