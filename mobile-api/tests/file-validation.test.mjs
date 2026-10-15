import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { validateUpload, detectFileType, MAX_SOURCE_BYTES } = await loadTs('lib/file-validation.ts');

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)]);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('....word/document.xml....')]);
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('....other.xml....')]);

test('un vrai PDF est accepté comme source', () => {
  assert.equal(validateUpload(PDF, 'source', 'application/pdf').mime, 'application/pdf');
});

test('un PNG renommé en .pdf est refusé', () => {
  assert.throws(() => validateUpload(PNG, 'source', 'application/pdf'), /Format non pris en charge/);
});

test('un PDF annoncé comme image est refusé', () => {
  assert.throws(() => validateUpload(PDF, 'image', 'image/png'), /Format non pris en charge/);
});

test('un type annoncé incohérent est refusé', () => {
  assert.throws(() => validateUpload(JPEG, 'image', 'image/png'), /ne correspond pas/);
});

test('un fichier de 21 Mo est refusé', () => {
  const big = Buffer.concat([PDF, Buffer.alloc(MAX_SOURCE_BYTES + 1 - PDF.length + 1024 * 1024)]);
  assert.throws(() => validateUpload(big, 'source', 'application/pdf'), (e) => e.status === 413);
});

test('DOCX, ZIP quelconque, texte et binaire', () => {
  assert.equal(detectFileType(DOCX)?.extension, 'docx');
  assert.equal(detectFileType(ZIP), null);
  assert.equal(detectFileType(Buffer.from('Rapport de stage, chapitre 1.'))?.extension, 'txt');
  assert.equal(detectFileType(Buffer.from([0x00, 0x01, 0x02, 0x03])), null);
  assert.equal(validateUpload(JPEG, 'image', 'image/jpg').extension, 'jpg');
  assert.equal(validateUpload(JPEG, 'image', 'application/octet-stream').mime, 'image/jpeg');
});

test('un fichier vide est refusé', () => {
  assert.throws(() => validateUpload(Buffer.alloc(0), 'image'), (e) => e.status === 400);
});
