import assert from 'node:assert/strict';
import test from 'node:test';

import { Document, Packer } from 'docx';
import JSZip from 'jszip';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const { htmlToDocxBlocks, docxNumberingConfig, parseHtml } = await loadTsWithPackages('lib/html-to-docx.ts');

const FILE = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]),
  Buffer.from([0, 0, 0, 3, 0, 0, 0, 2, 8, 2, 0, 0, 0]),
]);

const html = `
<h1>Présentation</h1>
<p style="text-align: justify;">Alpha <strong>Telecom</strong> est <em>leader</em> &amp; <u>innovant</u>.</p>
<h3>Missions</h3>
<ul><li>Analyse</li><li><p>Développement</p><ul><li>API</li></ul></li></ul>
<ol><li>Premier</li><li>Second</li></ol>
<ol><li>Recommence</li></ol>
<table><thead><tr><th>Indicateur</th><th>Valeur</th></tr></thead><tbody><tr><td>CA</td><td>42 Md</td></tr></tbody></table>
<blockquote><b>Remarque :</b> observation de stage.</blockquote>
<div class="academic-page-break" contenteditable="false"><span class="break-tag">Saut</span></div>
<figure class="academic-figure"><img data-file-id="${FILE}" alt="Figure 1"><figcaption><strong>Figure 1 : Organigramme</strong></figcaption></figure>
<p style="text-align: center;">Fin centrée</p>`;

const documentXml = async (blocks) => {
  const buffer = await Packer.toBuffer(new Document({ numbering: docxNumberingConfig, sections: [{ children: blocks }] }));
  const zip = await JSZip.loadAsync(buffer);
  return { xml: await zip.file('word/document.xml').async('string'), files: Object.keys(zip.files) };
};

test('analyseur tolérant : balises non fermées et commentaires', () => {
  const nodes = parseHtml('<p>Un <b>deux</p><!-- x --><p>trois</p></i>');
  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].tag, 'p');
});

test('la mise en forme Word est conservée', async () => {
  const blocks = htmlToDocxBlocks(html, new Map([[FILE, { data: PNG, mime: 'image/png', width: 3, height: 2 }]]));
  const { xml, files } = await documentXml(blocks);

  assert.match(xml, /w:pStyle w:val="Heading2"/, 'titre');
  assert.match(xml, /w:pStyle w:val="Heading4"/, 'sous-titre (h3 → Titre 4, le titre de section étant le Titre 1)');
  assert.match(xml, /<w:b\/>[\s\S]{0,200}Telecom/, 'gras');
  assert.match(xml, /<w:i\/>[\s\S]{0,200}leader/, 'italique');
  assert.match(xml, /<w:u w:val="single"\/>[\s\S]{0,200}innovant/, 'souligné');
  assert.match(xml, /leader<\/w:t>[\s\S]*&amp;/, 'entité décodée');
  assert.match(xml, /<w:jc w:val="both"\/>/, 'justifié');
  assert.match(xml, /<w:jc w:val="center"\/>[\s\S]{0,400}Fin centrée/, 'centré');
  assert.match(xml, /<w:numPr>/, 'listes');
  assert.match(xml, /<w:ilvl w:val="1"\/>/, 'liste imbriquée');
  assert.match(xml, /Développement/, 'li avec <p>');
  assert.match(xml, /<w:tbl>[\s\S]*Indicateur[\s\S]*42 Md[\s\S]*<\/w:tbl>/, 'tableau');
  assert.match(xml, /<w:tblHeader\/>/, 'ligne d’en-tête');
  assert.match(xml, /<w:ind w:left="567"\/>[\s\S]{0,600}observation de stage/, 'encadré indenté');
  assert.match(xml, /<w:br w:type="page"\/>/, 'saut de page');
  assert.doesNotMatch(xml, /Saut<\/w:t>/, 'le libellé du saut n’est pas exporté');
  assert.match(xml, /Figure 1 : Organigramme/, 'légende');
  assert.ok(files.some((f) => f.startsWith('word/media/')), 'image embarquée');
});

test('chaque liste numérotée repart à 1 (instances distinctes)', async () => {
  const { xml } = await documentXml(htmlToDocxBlocks('<ol><li>a</li></ol><ol><li>b</li></ol>'));
  const numIds = [...xml.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map((m) => m[1]);
  assert.equal(new Set(numIds).size, 2);
});

test('HTML vide ou texte nu', async () => {
  assert.equal(htmlToDocxBlocks('').length, 0);
  const { xml } = await documentXml(htmlToDocxBlocks('Texte simple sans balise'));
  assert.match(xml, /Texte simple sans balise/);
});
