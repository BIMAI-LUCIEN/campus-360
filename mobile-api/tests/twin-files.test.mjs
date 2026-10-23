import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Files that exist twice (server and app) and must stay identical, except for the
// import paths, which follow each side's naming.
const PAIRS = [
  ['lib/document-render.ts', '../src/features/documents/documentRender.ts'],
  ['lib/document-cover.ts', '../src/features/documents/documentCover.ts'],
];

const IMPORTS = [
  ["'./documentStyle'", "'./document-style'"],
  ["'./documentCover'", "'./document-cover'"],
  ["'./documentRender'", "'./document-render'"],
];

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8').replace(/\r\n/g, '\n');

for (const [server, client] of PAIRS) {
  test(`${path.basename(client)} est identique à ${server}`, () => {
    let copy = read(client);
    for (const [from, to] of IMPORTS) copy = copy.split(from).join(to);
    assert.equal(copy, read(server), 'modifier les deux fichiers ensemble');
  });
}

test('l’éditeur, l’aperçu et la garde par blocs ne contiennent aucune couleur écrite en dur', () => {
  for (const file of ['../src/features/documents/editorTemplate.ts', '../src/features/documents/documentCover.ts']) {
    const hex = read(file).match(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/g);
    assert.equal(hex, null, `${file} : ${hex}`);
  }
});
