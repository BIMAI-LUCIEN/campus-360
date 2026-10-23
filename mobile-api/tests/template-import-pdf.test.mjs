import assert from 'node:assert/strict';
import test from 'node:test';

import { PDFDocument } from 'pdf-lib';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const { bodySize, linesOf, runningLines, captionScope } = await loadTs('lib/pdf-layout.ts');
const { importPdfTemplate } = await loadTsWithPackages('lib/template-import-pdf.ts', [
  'lib/document-style.ts', 'lib/file-validation.ts', 'lib/pdf-layout.ts', 'lib/ooxml.ts', 'lib/source-extraction.ts', 'lib/template-import-docx.ts',
]);
const { renderDocumentPdf } = await loadTsWithPackages('lib/document-pdf.ts', [
  'lib/document-style.ts', 'lib/document-cover.ts', 'lib/document-render.ts', 'lib/document-numbering.ts', 'lib/pdf-pagination.ts', 'lib/pdf-render.ts',
]);
const { presetStyle, applyStylePatch } = await loadTs('lib/document-style.ts');

const item = (page, str, y, size = 12, extra = {}) => ({ page, str, x: 72, y, w: str.length * size * 0.5, size, bold: false, italic: false, font: 'TimesNewRomanPSMT', ...extra });

test('mesures : corps 12 pt, titre 16 pt gras, pied répété, légendes sur le document', () => {
  const items = [item(2, 'x'.repeat(200), 700), item(2, 'Titre'.repeat(4), 760, 16, { bold: true })];
  const size = bodySize(items);
  assert.equal(size.value, 12);
  assert.ok(size.confidence > 0.8);
  const lines = linesOf(items);
  assert.equal(lines.find((l) => l.size === 16).bold, true);

  const pages = [1, 2, 3, 4, 5].map((page) => ({ page, width: 595, height: 842 }));
  const footer = linesOf([2, 3, 4, 5].map((p) => item(p, `Page ${p}`, 30, 9)));
  assert.equal(runningLines(footer, pages, 'bottom').length, 4);

  const captions = linesOf([item(2, 'Figure 1 : Organigramme', 400), item(4, 'Figure 2 : Architecture', 400)]);
  assert.equal(captionScope(captions).value, 'document');
  assert.equal(captionScope(linesOf([item(2, 'Figure 1.1 : A', 400), item(4, 'Figure 2.1 : B', 400)])).value, 'chapter');
});

const para = (n) => `<p>${Array.from({ length: 90 }, (_, i) => `mot${n}x${i}`).join(' ')}.</p>`;
const sections = [
  { id: 's0', title: 'Page de garde', content_html: '' },
  { id: 's1', title: 'Dédicace', content_html: '<p>À ma famille.</p>' },
  { id: 's2', title: 'Sommaire', content_html: '' },
  { id: 's3', title: 'Introduction générale', content_html: para('i1') + para('i2') },
  { id: 's4', title: 'Chapitre 1 : Présentation', content_html: `<h1>Historique</h1>${para('a')}<h2>Organisation</h2>${para('b')}<figure><img alt="x"><figcaption>Organigramme</figcaption></figure>` },
  { id: 's5', title: 'Chapitre 2 : Travail', content_html: `<h1>Analyse</h1>${para('c')}${para('d')}<figure><img alt="y"><figcaption>Architecture</figcaption></figure>` },
  { id: 's6', title: 'Conclusion générale', content_html: para('f') },
];

test('PDF de notre export (style type référence) : les réglages sont retrouvés', { timeout: 180_000 }, async () => {
  const style = applyStylePatch(presetStyle('classique'), {
    headings: { numbering: 'chapter-section-roman' },
    page: { bandColor: '#0F3D56' },
    headerFooter: { headerStyle: 'band', authorLabel: 'Rédigé et présenté par :', footerRule: true, pageNumberFrame: 'box', footerLeft: 'author', footerCenter: 'none', footerRight: 'page' },
    captions: { scope: 'document' },
    cover: {
      blocks: [
        { id: 'kind', type: 'heading', text: 'RAPPORT DE STAGE ACADÉMIQUE', style: { bold: true, size: 14 } },
        { id: 'title', type: 'title-banner', prefix: 'THÈME :', variant: 'band', style: { bold: true } },
        { id: 'author', type: 'author', label: 'Rédigé et présenté par :', matriculeLabel: 'Matricule :', style: {} },
        { id: 'year', type: 'year-banner', template: 'Année académique {year}', variant: 'band', style: { bold: true } },
      ],
    },
  });
  const pdf = await renderDocumentPdf({
    document: { title: 'Rapport', template_type: 'stage', cover_data: { title: 'Sujet fictif', studentName: 'Awa Test', year: '2025-2026' } },
    sections,
    style,
    logos: {},
  });
  const { style: found, outline, report } = await importPdfTemplate(pdf, { useVision: false });
  assert.equal(found.typography.bodySize, 12);
  assert.ok(report.confidence['typography.bodySize'] >= 0.8, JSON.stringify(report.confidence));
  assert.equal(found.typography.bodyFont, 'Times New Roman');
  assert.equal(found.headerFooter.headerStyle, 'band');
  assert.equal(found.page.bandColor, '#0F3D56');
  assert.equal(found.headerFooter.headerTextColor, '#FFFFFF');
  assert.equal(found.headerFooter.authorLabel, 'Rédigé et présenté par :');
  assert.equal(found.headerFooter.footerRight, 'page');
  assert.equal(found.headerFooter.pageNumberFrame, 'box');
  assert.equal(found.captions.scope, 'document');
  assert.equal(found.headings.numbering, 'chapter-section-roman');
  assert.ok(report.sure.some((s) => s.includes('i, ii… puis 1, 2…')), report.sure.join(' | '));
  assert.ok(outline.some((o) => o.title === 'Chapitre 2'), JSON.stringify(outline));
  const blocks = found.cover.blocks ?? [];
  assert.ok(blocks.some((b) => b.type === 'title-banner' && b.prefix === 'THÈME :' && b.variant === 'band'), JSON.stringify(blocks.map((b) => b.type)));
  assert.ok(blocks.some((b) => b.type === 'author'));
  const all = JSON.stringify(blocks);
  for (const own of ['Awa Test', 'Sujet fictif', 'SUJET FICTIF']) assert.ok(!all.includes(own), own);
});

test('refus : pas un PDF, trop de pages', async () => {
  await assert.rejects(importPdfTemplate(Buffer.from('PK\u0003\u0004 pas un pdf')), /n’est pas un PDF/);
  const doc = await PDFDocument.create();
  for (let i = 0; i < 61; i += 1) doc.addPage();
  await assert.rejects(importPdfTemplate(Buffer.from(await doc.save())), /trop de pages/);
});
