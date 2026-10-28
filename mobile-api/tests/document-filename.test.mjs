import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { documentDownloadName, attachmentDisposition } = await loadTs('lib/document-filename.ts');

test('le nom téléchargé garde le titre réel avec espaces et accents', () => {
  assert.equal(documentDownloadName('Rapport de stage Été 2026', 'pdf'), 'Rapport de stage Été 2026.pdf');
  assert.equal(documentDownloadName('Lettre de motivation', 'docx'), 'Lettre de motivation.docx');
});

test('seuls les caractères interdits par les systèmes de fichiers sont retirés', () => {
  assert.equal(documentDownloadName('Plan: "A" / B?', 'pdf'), 'Plan A B.pdf');
  assert.equal(documentDownloadName('  Titre   avec   espaces  ', 'pdf'), 'Titre avec espaces.pdf');
  assert.equal(documentDownloadName('Fin du titre...', 'pdf'), 'Fin du titre.pdf');
});

test('un titre vide ou invalide retombe sur le nom de repli', () => {
  assert.equal(documentDownloadName('', 'pdf'), 'Document.pdf');
  assert.equal(documentDownloadName(null, 'docx', 'CV'), 'CV.docx');
  assert.equal(documentDownloadName('///', 'pdf'), 'Document.pdf');
});

test('le titre est tronqué à 120 caractères', () => {
  const name = documentDownloadName('a'.repeat(300), 'pdf');
  assert.equal(name, `${'a'.repeat(120)}.pdf`);
});

test('Content-Disposition porte le nom réel en UTF-8 et une version ASCII de repli', () => {
  const header = attachmentDisposition('Rapport de stage Été œuvre.pdf');
  assert.equal(
    header,
    `attachment; filename="Rapport de stage Ete _uvre.pdf"; filename*=UTF-8''Rapport%20de%20stage%20%C3%89t%C3%A9%20%C5%93uvre.pdf`,
  );
  // Un en-tête doit rester en ASCII imprimable pour être accepté par Node/Next.
  assert.match(header, /^[\x20-\x7e]+$/);
});
