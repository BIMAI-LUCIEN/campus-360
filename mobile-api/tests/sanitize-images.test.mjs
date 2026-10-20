import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { sanitizeHtml, stripCodeFence } = await loadTs('lib/sanitize-html.ts');

const FILE = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';

test('une image uploadée garde son identifiant et perd son lien signé', () => {
  const html = `<figure class="academic-figure"><img data-file-id="${FILE}" src="https://files.campus360b.site/api/files/${FILE}?exp=1&sig=abc" alt="Figure 1"><figcaption>Figure 1</figcaption></figure>`;
  const clean = sanitizeHtml(html);
  assert.match(clean, new RegExp(`data-file-id="${FILE}"`));
  assert.doesNotMatch(clean, /sig=|src=/);
  assert.match(clean, /alt="Figure 1"/);
});

test('un data-file-id invalide est retiré et l’image classique garde son src', () => {
  const clean = sanitizeHtml('<img data-file-id="../../x" src="https://example.com/a.png" onerror="alert(1)">');
  assert.doesNotMatch(clean, /data-file-id|onerror/);
  assert.match(clean, /src="https:\/\/example\.com\/a\.png"/);
});

test('stripCodeFence : retire le bloc de code markdown et les balises racine', () => {
  assert.equal(stripCodeFence('```html\n<p>a</p>\n```'), '<p>a</p>');
  assert.equal(stripCodeFence('```\n<div>b</div>\n```'), '<div>b</div>');
  assert.equal(stripCodeFence('<html><head><title>t</title></head><body><p>corps</p></body></html>'), '<title>t</title><p>corps</p>');
});

test('sanitizeHtml : neutralise les gestionnaires d’événements inline', () => {
  const clean = sanitizeHtml('<p onclick="alert(1)">x</p>');
  assert.ok(clean.includes('<p>x</p>'));
  assert.doesNotMatch(clean, /onclick/i);
});

test('sanitizeHtml : refuse les protocoles javascript dans img et a', () => {
  const cleanImg = sanitizeHtml('<img src="javascript:alert(1)">');
  assert.doesNotMatch(cleanImg, /javascript:/i);

  const cleanA = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
  assert.doesNotMatch(cleanA, /javascript:/i);
  assert.doesNotMatch(cleanA, /href=/i);
  assert.ok(cleanA.includes('<a>x</a>'));
});

test('sanitizeHtml : supprime totalement les balises script et leur contenu', () => {
  const clean = sanitizeHtml('<script>alert(1)</script><p>ok</p>');
  assert.equal(clean.trim(), '<p>ok</p>');
});

test('sanitizeHtml : refuse les styles dangereux (url, position)', () => {
  const clean = sanitizeHtml('<p style="position:fixed;background:url(x)">t</p>');
  assert.doesNotMatch(clean, /url\(/i);
  assert.doesNotMatch(clean, /position/i);
  assert.equal(clean.trim(), '<p>t</p>');
});
