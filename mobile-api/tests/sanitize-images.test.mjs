import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { sanitizeHtml } = await loadTs('lib/sanitize-html.ts');

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
