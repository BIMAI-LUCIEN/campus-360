import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { chunkPages, normalizeText, CHUNK_MAX_CHARS } = await loadTs('lib/chunking.ts');

const sentence = (i) => `Phrase numéro ${i} du rapport de stage chez l'entreprise Alpha. `;
const longText = Array.from({ length: 400 }, (_, i) => sentence(i)).join('') + '\n\nConclusion finale.';

test('aucun chunk ne dépasse 3 200 caractères', () => {
  const chunks = chunkPages([{ page: 1, text: longText }]);
  assert.ok(chunks.length > 5);
  for (const c of chunks) assert.ok(c.content.length <= CHUNK_MAX_CHARS, `chunk de ${c.content.length}`);
});

test('les chunks couvrent tout le texte source', () => {
  const text = normalizeText(longText);
  const chunks = chunkPages([{ page: 1, text: longText }]);
  for (let i = 0; i < 400; i += 1) {
    const marker = `Phrase numéro ${i} du`;
    assert.ok(chunks.some((c) => c.content.includes(marker)), `phrase ${i} absente`);
  }
  assert.ok(chunks.at(-1).content.endsWith('Conclusion finale.'));
  assert.ok(text.startsWith(chunks[0].content.slice(0, 50)));
});

test('les chunks consécutifs se recouvrent', () => {
  const chunks = chunkPages([{ page: 1, text: longText }]);
  const tail = chunks[0].content.slice(-100);
  assert.ok(chunks[1].content.includes(tail.slice(-40)));
});

test('un chunk ne mélange jamais deux pages et les positions se suivent', () => {
  const chunks = chunkPages([
    { page: 1, text: 'Page un.' },
    { page: 2, text: '   ' },
    { page: 3, text: 'Page trois.' },
  ]);
  assert.deepEqual(chunks.map((c) => [c.page, c.position, c.content]), [
    [1, 0, 'Page un.'],
    [3, 1, 'Page trois.'],
  ]);
});

test('un mot géant sans espace est quand même découpé', () => {
  const chunks = chunkPages([{ page: 1, text: 'x'.repeat(10000) }]);
  assert.equal(chunks.map((c) => c.content).join('').length >= 10000, true);
  for (const c of chunks) assert.ok(c.content.length <= CHUNK_MAX_CHARS);
});
