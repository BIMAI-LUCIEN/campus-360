import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const LOCAL = ['lib/document-style.ts', 'lib/document-render.ts', 'lib/document-numbering.ts', 'lib/pdf-pagination.ts', 'lib/pdf-render.ts'];
const { renderDocumentPdf } = await loadTsWithPackages('lib/document-pdf.ts', LOCAL);
const { presetStyle, applyStylePatch } = await loadTs('lib/document-style.ts');

const para = (n, words = 90) => `<p>${Array.from({ length: words }, (_, i) => `mot${n}x${i}`).join(' ')}.</p>`;
const many = (n, count) => Array.from({ length: count }, (_, i) => para(`${n}${i}`)).join('');

const sections = [
  { id: 's0', title: 'Page de garde', content_html: '' },
  { id: 's1', title: 'Dédicace', content_html: '<p>À ma famille.</p>' },
  { id: 's2', title: 'Remerciements', content_html: '<p>Merci à mon tuteur.</p>' },
  { id: 's3', title: 'Sommaire', content_html: '' },
  { id: 's4', title: 'Liste des Figures et Tableaux', content_html: '<p>Texte inventé qui doit disparaître.</p>' },
  { id: 's5', title: 'Introduction Générale', content_html: many('intro', 6) },
  {
    id: 's6',
    title: 'Chapitre 1 : Présentation de l’entreprise',
    content_html: `<h1>Historique</h1>${many('a', 4)}<h2>Organisation</h2>${many('b', 3)}
      <figure class="academic-figure"><img alt="x"><figcaption><strong>Figure 1 : Organigramme</strong></figcaption></figure>
      <p class="doc-table-caption">Effectifs par service</p><table><tr><th>Service</th><th>Effectif</th></tr><tr><td>Qualité</td><td>18</td></tr></table>`,
  },
  { id: 's7', title: 'Chapitre 2 : Missions réalisées', content_html: `<h1>Analyse</h1>${many('c', 9)}<figure><img alt="y"><figcaption>Schéma du processus</figcaption></figure>` },
  { id: 's8', title: 'Conclusion Générale', content_html: many('fin', 2) },
];

const input = (style) => ({
  document: {
    title: 'Rapport de stage',
    template_type: 'stage',
    cover_data: { title: 'Mise en place d’un tableau de bord qualité', studentName: 'Awa Test', school: 'Université de Douala', company: 'Alpha Telecom', year: '2025-2026' },
  },
  sections,
  style,
  logos: {},
});

const pageTexts = async (pdf) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), isEvalSupported: false, verbosity: 0 }).promise;
  const out = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    out.push(content.items.map((i) => ('str' in i ? i.str : '')).join(' ').replace(/\s+/g, ' '));
  }
  await doc.destroy();
  return out;
};

const lastToken = (text) => text.trim().split(' ').pop();

test('style classique : numérotation académique, sommaire réel, légendes numérotées', { timeout: 120_000 }, async () => {
  const pdf = await renderDocumentPdf(input(presetStyle('classique')));
  fs.writeFileSync(path.join(os.tmpdir(), 'campus360-test-classique.pdf'), pdf);
  const pages = await pageTexts(pdf);

  // Cover: student data, nothing invented, no page number.
  assert.match(pages[0], /Awa Test/);
  assert.match(pages[0], /Alpha Telecom/);
  assert.doesNotMatch(pages[0], /Lucien|Yaoundé|Campus 360 Inc|22GL049/);

  // Preliminary pages in roman numerals, body from 1.
  const dedication = pages.findIndex((t) => /À ma famille/.test(t));
  assert.equal(lastToken(pages[dedication]), 'i');
  const intro = pages.findIndex((t) => /INTRODUCTION GÉNÉRALE/i.test(t) && /motintro/.test(t));
  assert.equal(lastToken(pages[intro]), '1');
  assert.ok(pages.slice(intro).every((t, i) => lastToken(t) === String(i + 1)), 'pagination arabe continue');

  // Headings numbered inside chapters.
  assert.match(pages.join(' '), /1\.1 Historique/);
  assert.match(pages.join(' '), /1\.1\.1 Organisation/);
  assert.match(pages.join(' '), /2\.1 Analyse/);

  // Captions numbered per chapter, legacy number removed.
  assert.match(pages.join(' '), /Figure 1\.1 : Organigramme/);
  assert.match(pages.join(' '), /Tableau 1\.1 : Effectifs par service/);
  assert.match(pages.join(' '), /Figure 2\.1 : Schéma du processus/);

  // Lists are generated, invented text removed.
  assert.doesNotMatch(pages.join(' '), /Texte inventé/);

  // Table of contents: each entry points at the page where the title really is.
  const tocPage = pages.find((t) => /SOMMAIRE/.test(t) && /Missions réalisées/.test(t));
  const chapter2Line = tocPage.match(/Chapitre 2 : Missions réalisées[ .]*?(\d+)/);
  assert.ok(chapter2Line, 'entrée du chapitre 2 dans le sommaire');
  const chapter2Page = pages.findIndex((t) => /CHAPITRE 2 : MISSIONS RÉALISÉES/i.test(t) && /motc/.test(t));
  assert.equal(chapter2Line[1], lastToken(pages[chapter2Page]));

  // Header shows the running chapter on body pages (classique: chapter on the right).
  assert.match(pages[chapter2Page], /Chapitre 2 : Missions réalisées/);
});

test('style moderne : « Page n » en pied, titre et auteur en en-tête', { timeout: 120_000 }, async () => {
  const pdf = await renderDocumentPdf(input(presetStyle('moderne')));
  const pages = await pageTexts(pdf);
  const intro = pages.findIndex((t) => /motintro/.test(t));
  assert.match(pages[intro], /Page 1/);
  assert.match(pages[intro], /Mise en place d’un tableau de bord qualité/);
  assert.match(pages[intro], /Awa Test/);
});

test('style institutionnel : numéros « n / total », titres I. / A.', { timeout: 120_000 }, async () => {
  const pdf = await renderDocumentPdf(input(presetStyle('institutionnel')));
  const pages = await pageTexts(pdf);
  const intro = pages.findIndex((t) => /motintro/.test(t));
  const total = pages.length - intro;
  assert.match(pages[intro], new RegExp(`1 / ${total}`));
  assert.match(pages.join(' '), /A\. Historique/);
  assert.match(pages.join(' '), /Figure I\.1 : Organigramme/);
});

test('sans numéro de page : aucun numéro imprimé', { timeout: 120_000 }, async () => {
  const style = applyStylePatch(presetStyle('sobre'), { headerFooter: { footerCenter: 'none' } });
  const pages = await pageTexts(await renderDocumentPdf(input(style)));
  const intro = pages.findIndex((t) => /motintro/.test(t));
  assert.notEqual(lastToken(pages[intro]), '1');
});
