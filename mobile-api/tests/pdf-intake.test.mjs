import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const { analyzePdf, AI_PAGES, detectLocalFlags } = await loadTsWithPackages('lib/pdf-intake.ts', [
  'lib/pdf-dedup.ts',
  'lib/file-validation.ts',
]);
const { sha256 } = await loadTsWithPackages('lib/pdf-dedup.ts');

const pdfBytes = fs.readFileSync(path.resolve('tests/fixtures/source-3-pages.pdf'));
const longPage = (n) =>
  `Concours d'entrée ENSP 2023, épreuve de mathématiques, page ${n}. Exercice : étudier la fonction f définie sur R, ` +
  `calculer sa dérivée, dresser son tableau de variations et tracer sa courbe. Question ${n} bis : résoudre l'équation différentielle.`;
const pages = (count) => Array.from({ length: count }, (_, i) => ({ page: i + 1, text: longPage(i + 1) }));

const validSheet = {
  title: 'Concours ENSP 2023 : mathématiques',
  subject: 'Mathématiques',
  school: 'ENSP Yaoundé',
  year: '2023',
  level: 'Bac',
  kind: 'ancien_sujet',
  summary: "Sujet du concours d'entrée.",
  keywords: ['analyse', 'fonctions', 'concours'],
  is_academic: true,
  copyright_flag: false,
  personal_data_flag: false,
};

const makeDeps = (overrides = {}) => {
  const calls = { llm: 0, quota: 0, messages: [] };
  const deps = {
    extract: async () => ({ pages: pages(3), pageCount: 3 }),
    findDuplicates: async () => [],
    reserveQuota: async () => {
      calls.quota += 1;
    },
    callLlm: async (messages) => {
      calls.llm += 1;
      calls.messages.push(messages);
      return JSON.stringify(validSheet);
    },
    ...overrides,
  };
  return { deps, calls };
};

test('fichier .pdf sans signature → refusé', async () => {
  const { deps, calls } = makeDeps();
  const result = await analyzePdf({ buffer: Buffer.from('ceci est un texte nommé hello.pdf'), declaredMime: 'application/pdf' }, deps);
  assert.equal(result.status, 'rejected');
  assert.equal(result.reason, "Ce fichier n'est pas un vrai PDF.");
  assert.equal(calls.llm, 0);
});

test('20 Mo + 1 octet → 413', async () => {
  const { deps } = makeDeps();
  const big = Buffer.alloc(20 * 1024 * 1024 + 1, 0x20);
  big.write('%PDF-1.4\n');
  await assert.rejects(analyzePdf({ buffer: big }, deps), (error) => error.status === 413);
});

test('PDF blanc → refusé « vide »', async () => {
  const { deps, calls } = makeDeps({ extract: async () => ({ pages: [{ page: 1, text: '  \n ' }], pageCount: 1 }) });
  const result = await analyzePdf({ buffer: pdfBytes }, deps);
  assert.equal(result.reason, 'PDF vide ou illisible.');
  assert.equal(calls.quota, 0);
});

test('PDF scanné → refus clair, sans IA', async () => {
  const { deps, calls } = makeDeps({
    extract: async () => {
      throw new Error('Aucun texte trouvé dans ce PDF (document scanné ?). Ajoutez une version texte.');
    },
  });
  const result = await analyzePdf({ buffer: pdfBytes }, deps);
  assert.equal(result.reason, 'PDF scanné sans texte : ajoutez une version texte.');
  assert.equal(calls.llm, 0);
});

test('doublon exact en base → duplicate, ni quota ni IA', async () => {
  const existing = { ref: 'pdf_abc', kind: 'document', sha256: sha256(pdfBytes), fingerprint: null, minhash: null };
  const { deps, calls } = makeDeps({ findDuplicates: async () => [existing] });
  const result = await analyzePdf({ buffer: pdfBytes }, deps);
  assert.equal(result.status, 'duplicate');
  assert.equal(result.duplicateOf.ref, 'pdf_abc');
  assert.deepEqual([calls.llm, calls.quota], [0, 0]);
});

test('doublon exact dans le même lot → duplicate', async () => {
  const sibling = { ref: 'upload_1', kind: 'upload', sha256: sha256(pdfBytes), fingerprint: null, minhash: null };
  const { deps, calls } = makeDeps();
  const result = await analyzePdf({ buffer: pdfBytes, batchSiblings: [sibling] }, deps);
  assert.deepEqual([result.status, result.duplicateOf.kind, calls.llm], ['duplicate', 'upload', 0]);
});

test('JSON invalide deux fois → analyzing', async () => {
  const { deps, calls } = makeDeps({
    callLlm: async () => {
      calls.llm += 1;
      return 'pas du json';
    },
  });
  const result = await analyzePdf({ buffer: pdfBytes }, deps);
  assert.equal(result.status, 'analyzing');
  assert.equal(calls.llm, 2);
});

test('IA indisponible (null) → analyzing avec aiFailed', async () => {
  const { deps } = makeDeps({ callLlm: async () => null });
  const result = await analyzePdf({ buffer: pdfBytes }, deps);
  assert.deepEqual([result.status, result.aiFailed], ['analyzing', true]);
});

test('fiche valide → ready, quota réservé une fois', async () => {
  const { deps, calls } = makeDeps();
  const result = await analyzePdf({ buffer: pdfBytes }, deps);
  assert.equal(result.status, 'ready');
  assert.equal(result.sheet.title, validSheet.title);
  assert.equal(calls.quota, 1);
  assert.ok(result.minhash && result.fingerprint);
});

test('document non académique → refusé', async () => {
  const { deps } = makeDeps({ callLlm: async () => JSON.stringify({ ...validSheet, is_academic: false }) });
  assert.equal((await analyzePdf({ buffer: pdfBytes }, deps)).reason, 'Ce document ne semble pas académique.');
});

test('ISBN dans le texte → copyright_flag', async () => {
  const { deps } = makeDeps({
    extract: async () => ({ pages: [...pages(2), { page: 3, text: 'Éditions Clé, ISBN 978-2-07-036822-8' }], pageCount: 3 }),
  });
  const result = await analyzePdf({ buffer: pdfBytes }, deps);
  assert.equal(result.copyrightFlag, true);
  assert.equal(detectLocalFlags('Matricule : 20U1234').personalData, true);
});

test("l'IA ne reçoit que les 5 premières pages", async () => {
  const { deps, calls } = makeDeps({ extract: async () => ({ pages: pages(8), pageCount: 8 }) });
  await analyzePdf({ buffer: pdfBytes }, deps);
  const prompt = calls.messages[0][1].content;
  assert.ok(prompt.includes(`--- Page ${AI_PAGES} ---`));
  assert.ok(!prompt.includes(`--- Page ${AI_PAGES + 1} ---`));
});

test('même concours, année et matière en base → probable_duplicate', async () => {
  const other = {
    ref: 'pdf_meta',
    kind: 'document',
    sha256: 'x',
    fingerprint: 'y',
    minhash: null,
    meta: { school: 'ENSP Yaoundé', year: '2023', subject: 'Mathématiques' },
  };
  const { deps } = makeDeps({ findDuplicates: async (query) => (query.meta ? [other] : []) });
  const result = await analyzePdf({ buffer: pdfBytes }, deps);
  assert.deepEqual([result.status, result.duplicateOf.ref], ['probable_duplicate', 'pdf_meta']);
});
