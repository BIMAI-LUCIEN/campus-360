import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const { STUDY_FIELDS, outlineFor, fieldFromProfile } = await loadTs('lib/document-outlines.ts');
const { classifySection } = await loadTsWithPackages('lib/document-render.ts', ['lib/document-style.ts', 'lib/document-cover.ts']);

test('chaque filière a un plan complet pour le rapport et le mémoire', () => {
  for (const kind of ['stage', 'memoire']) {
    for (const field of STUDY_FIELDS) {
      const outline = outlineFor(kind, field);
      const kinds = outline.map((title) => classifySection(title).kind);
      const where = `${kind}/${field}`;
      assert.equal(outline[0], 'Page de garde', where);
      for (const expected of ['dedication', 'acknowledgements', 'toc', 'abbreviations', 'lists']) {
        assert.ok(kinds.includes(expected), `${where} : ${expected} manquant`);
      }
      assert.ok(outline.includes('Introduction générale'), where);
      assert.ok(outline.filter((t) => /^Chapitre \d+ : /.test(t)).length >= 4, `${where} : chapitres`);
      assert.deepEqual(outline.slice(-3), ['Conclusion générale', 'Bibliographie', 'Annexes'], where);
      assert.equal(new Set(outline).size, outline.length, `${where} : doublon`);
    }
  }
  assert.ok(outlineFor('memoire', 'gestion').includes('Abstract'));
  assert.ok(outlineFor('stage', 'btp').some((t) => classifySection(t).kind === 'identification'));
});

test('les plans diffèrent selon la filière', () => {
  const chapters = (field) => outlineFor('stage', field).filter((t) => t.startsWith('Chapitre')).join('|');
  assert.notEqual(chapters('informatique'), chapters('gestion'));
  assert.notEqual(chapters('btp'), chapters('marketing'));
});

test('fieldFromProfile devine la filière depuis le profil', () => {
  assert.equal(fieldFromProfile('Faculté des Sciences', 'Licence 3 Informatique'), 'informatique');
  assert.equal(fieldFromProfile('Sciences Économiques et de Gestion', 'Master 1'), 'gestion');
  assert.equal(fieldFromProfile('ESSEC', 'BTS Marketing-Commerce-Vente'), 'marketing');
  assert.equal(fieldFromProfile('École Nationale Supérieure Polytechnique', 'Génie civil'), 'btp');
  assert.equal(fieldFromProfile('Faculté des Sciences Juridiques et Politiques'), 'droit');
  assert.equal(fieldFromProfile('', null, undefined), null);
});

test('la copie de l’app est identique aux plans du serveur', () => {
  const server = fs.readFileSync(path.resolve('lib/document-outlines.ts'), 'utf8');
  const client = fs.readFileSync(path.resolve('../src/features/documents/documentOutlines.ts'), 'utf8');
  assert.equal(client, server, 'modifier les deux fichiers ensemble');
});
