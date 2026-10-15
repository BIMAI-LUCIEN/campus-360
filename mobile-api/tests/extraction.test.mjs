import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const { extractSource, zipUncompressedTotal, ExtractionError } = await loadTsWithPackages('lib/source-extraction.ts');
const fixture = (name) => fs.readFileSync(path.resolve('tests/fixtures', name));

test('PDF de 3 pages : chaque mot-clé sur la bonne page', async () => {
  const result = await extractSource(fixture('source-3-pages.pdf'), 'application/pdf');
  assert.equal(result.pageCount, 3);
  assert.equal(result.paginated, true);
  assert.match(result.pages[0].text, /Introduction du rapport/);
  assert.match(result.pages[1].text, /42 milliards/);
  assert.equal(result.pages[1].page, 2);
  assert.match(result.pages[2].text, /Conclusion/);
});

test('DOCX : texte extrait, sans pagination', async () => {
  const data = fixture('source.docx');
  assert.ok(zipUncompressedTotal(data) > 0);
  const result = await extractSource(data, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(result.paginated, false);
  assert.match(result.pages[0].text, /120 camions frigorifiques/);
});

test('TXT : texte lu tel quel', async () => {
  const result = await extractSource(fixture('source.txt'), 'text/plain');
  assert.match(result.pages[0].text, /Madame Ngono/);
});

test('PDF endommagé et DOCX non-ZIP sont refusés proprement', async () => {
  await assert.rejects(extractSource(Buffer.from('%PDF-1.4 garbage'), 'application/pdf'), (e) => e instanceof ExtractionError);
  await assert.rejects(
    extractSource(Buffer.from('PK\u0003\u0004 pas un zip'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    (e) => e instanceof ExtractionError,
  );
  await assert.rejects(extractSource(Buffer.from('   '), 'text/plain'), (e) => e instanceof ExtractionError);
});
