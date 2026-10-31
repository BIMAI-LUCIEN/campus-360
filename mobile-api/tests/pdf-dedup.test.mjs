import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { sha256, normalizeText, textFingerprint, minhashSignature, similarity, classifyDuplicate } =
  await loadTs('lib/pdf-dedup.ts');

const sentences = Array.from(
  { length: 12 },
  (_, i) => `Exercice ${i + 1} : étudier la fonction numéro ${i + 1} sur l'intervalle donné et tracer sa courbe représentative.`,
);
const courseA = sentences.join('\n');
const otherCourse = Array.from(
  { length: 12 },
  (_, i) => `Chapitre ${i + 1} de biologie cellulaire : la membrane plasmique et les échanges ioniques, partie ${i + 1}.`,
).join('\n');

const describe = (text, extra = {}) => {
  const normalized = normalizeText(text);
  return {
    sha256: sha256(Buffer.from(text)),
    fingerprint: textFingerprint(normalized),
    minhash: minhashSignature(normalized),
    ...extra,
  };
};

test('mêmes octets → exact', () => {
  const doc = { ref: 'pdf_a', kind: 'document', ...describe(courseA) };
  assert.equal(classifyDuplicate(describe(courseA), [doc]).verdict, 'exact');
});

test('même texte, accents, casse et espaces changés → text_duplicate', () => {
  const doc = { ref: 'pdf_a', kind: 'document', ...describe(courseA) };
  const reexported = courseA.toUpperCase().replace(/é/g, 'e').replace(/É/g, 'E').replace(/ /g, '   ');
  const result = classifyDuplicate(describe(reexported), [doc]);
  assert.equal(result.verdict, 'text_duplicate');
  assert.equal(result.match, 'pdf_a');
});

test('une phrase sur douze remplacée → probable', () => {
  const doc = { ref: 'pdf_a', kind: 'document', ...describe(courseA) };
  const edited = [...sentences];
  edited[5] = 'Cette question a été remplacée par un tout autre énoncé portant sur les suites géométriques.';
  const result = classifyDuplicate(describe(edited.join('\n')), [doc]);
  assert.equal(result.verdict, 'probable', `score ${result.score}`);
  assert.ok(result.score >= 0.7 && result.score <= 0.9);
});

test('deux cours différents → unique', () => {
  const doc = { ref: 'pdf_a', kind: 'document', ...describe(courseA) };
  assert.equal(classifyDuplicate(describe(otherCourse), [doc]).verdict, 'unique');
});

test('même concours, année et matière, textes différents → probable', () => {
  const meta = { school: 'Concours ENSP', year: '2023', subject: 'Mathématiques' };
  const doc = { ref: 'pdf_a', kind: 'document', ...describe(courseA, { meta }) };
  const result = classifyDuplicate(
    describe(otherCourse, { meta: { school: 'concours ensp', year: '2023', subject: 'mathematiques' } }),
    [doc],
  );
  assert.equal(result.verdict, 'probable');
  assert.equal(result.match, 'pdf_a');
});

test('texte trop court → empreintes nulles, verdict unique sans erreur', () => {
  const short = describe('Un texte de cinquante caractères à peine, voilà.');
  assert.equal(short.fingerprint, null);
  assert.equal(short.minhash, null);
  const doc = { ref: 'pdf_a', kind: 'document', ...describe(courseA) };
  assert.equal(classifyDuplicate(short, [doc]).verdict, 'unique');
});

test('deux fichiers identiques dans un même lot → le second est exact', () => {
  const first = { ref: 'upload_1', kind: 'upload', ...describe(courseA) };
  const result = classifyDuplicate(describe(courseA), [first]);
  assert.deepEqual([result.verdict, result.match], ['exact', 'upload_1']);
});

test('signature déterministe et dans la plage int32', () => {
  const normalized = normalizeText(courseA);
  const a = minhashSignature(normalized);
  assert.deepEqual(a, minhashSignature(normalized));
  assert.equal(a.length, 128);
  assert.ok(a.every((v) => Number.isInteger(v) && v >= -2147483648 && v <= 2147483647));
  assert.equal(similarity(a, a), 1);
});

test('en-têtes répétés et numéros de page retirés', () => {
  const pages = ['ENSP 2023\nPremière page de contenu\n1', 'ENSP 2023\nDeuxième page\n2', 'ENSP 2023\nTroisième page\n3'];
  assert.equal(normalizeText(pages), 'premiere page de contenu deuxieme page troisieme page');
});
