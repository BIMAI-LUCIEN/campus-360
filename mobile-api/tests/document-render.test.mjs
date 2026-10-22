import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const { normalizeHeadings, styleToCss } = await loadTs('lib/document-render.ts');
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

test('module 24 : numérotation CHAPITRE / SECTION / I. / 1.', () => {
  const style = presetStyle('classique');
  style.headings.numbering = 'chapter-section-roman';
  const doc = numberDocument(
    [{ id: 'c1', title: 'Chapitre 1 : Présentation', content_html: '<h1>Historique</h1><h2>Création</h2><h3>Fondateurs</h3><h2>Missions</h2><h1>Organisation</h1>' }],
    style,
    { markers: false },
  );
  const html = doc.sections[0].html;
  assert.match(html, /<h1><span class="hn">SECTION 1 :<\/span> Historique<\/h1>/);
  assert.match(html, /<h2><span class="hn">I\.<\/span> Création<\/h2>/);
  assert.match(html, /<h3><span class="hn">1\.<\/span> Fondateurs<\/h3>/);
  assert.match(html, /<h2><span class="hn">II\.<\/span> Missions<\/h2>/);
  assert.match(html, /<h1><span class="hn">SECTION 2 :<\/span> Organisation<\/h1>/);
  assert.deepEqual(doc.toc.map((e) => e.level), [0, 1, 2, 2, 1], 'le sommaire garde h1 et h2 seulement');
});

test('module 24 : légendes numérotées sur tout le document', () => {
  const style = presetStyle('classique');
  const sections = [
    { id: 'c1', title: 'Chapitre 1 : Contexte', content_html: '<figure><img src="a"><figcaption>Organigramme</figcaption></figure><p class="doc-table-caption">Effectifs</p>' },
    { id: 'c2', title: 'Chapitre 2 : Travail', content_html: '<figure><img src="b"><figcaption>Architecture</figcaption></figure><p class="doc-table-caption">Planning</p>' },
  ];
  style.captions.scope = 'document';
  const whole = numberDocument(sections, style, { markers: false });
  assert.deepEqual(whole.figures.map((f) => f.label), ['Figure 1', 'Figure 2']);
  assert.deepEqual(whole.tables.map((t) => t.label), ['Tableau 1', 'Tableau 2']);
  assert.match(whole.sections[1].html, /Figure 2 :<\/span> Architecture/);
  style.captions.scope = 'chapter';
  const byChapter = numberDocument(sections, style, { markers: false });
  assert.deepEqual(byChapter.figures.map((f) => f.label), ['Figure 1.1', 'Figure 2.1']);
});

test('module 24 : CSS des légendes, puces losange et dédicace encadrée', () => {
  const style = presetStyle('classique');
  const plain = styleToCss(style, { cssNumbering: true });
  assert.doesNotMatch(plain, /2756/);
  assert.doesNotMatch(plain, /data-kind="dedication"\] \.doc-body \{ border/);
  style.lists.bullet = 'diamond';
  style.dedication.frame = true;
  style.captions = { scope: 'document', style: 'bold-left' };
  style.headings.numbering = 'chapter-section-roman';
  const css = styleToCss(style, { cssNumbering: true });
  assert.match(css, /ul > li::marker \{ content: "\\2756  "; \}/);
  assert.match(css, /data-kind="dedication"\] \.doc-body \{ border: 1pt solid #1F2937;/);
  assert.match(css, /body \{ counter-reset: dfig dtab; \}/);
  assert.match(css, /figcaption::before \{ content: "Figure " counter\(dfig\) " : "/);
  assert.match(css, /h1::before \{ content: "SECTION " counter\(dh1\) " : "; \}/);
  assert.match(css, /figcaption \{[^}]*font-weight: 700; text-align: left;/);
});
