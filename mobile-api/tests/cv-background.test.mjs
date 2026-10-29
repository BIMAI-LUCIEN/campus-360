import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const m = await loadTsWithPackages('lib/cv-background.ts');

test('parseCvImport : JSON entouré de texte, listes nettoyées, lignes vides retirées', () => {
  const raw = `Voici :\n{"profil":"Étudiant en réseaux","experiences":[{"poste":"Stagiaire","entreprise":"Orange","ville":"Douala","periode":"2025","missions":["Support client", 3]},{"poste":"","entreprise":""}],"formations":[{"diplome":"BTS","etablissement":"IUT","ville":"","periode":""}],"competences":["Cisco"],"langues":[{"langue":"Anglais","niveau":"B2"},{"langue":""}],"loisirs":"lecture"}`;
  const b = m.parseCvImport(raw);
  assert.equal(b.experiences.length, 1);
  assert.deepEqual(b.experiences[0].missions, ['Support client']);
  assert.equal(b.langues.length, 1);
  assert.deepEqual(b.loisirs, []);
  assert.deepEqual(b.logiciels, []);
});

test('parseCvImport : réponse vide, invalide ou sans contenu → null', () => {
  assert.equal(m.parseCvImport(null), null);
  assert.equal(m.parseCvImport('pas de json'), null);
  assert.equal(m.parseCvImport('{"profil":"","experiences":[],"formations":[],"competences":[]}'), null);
});

test('cvBackgroundToText : chaque partie remplie apparaît, les vides non', () => {
  const b = m.cvBackgroundSchema.parse({
    experiences: [{ poste: 'Stagiaire', entreprise: 'MTN', missions: ['Installation de routeurs'] }],
    langues: [{ langue: 'Anglais', niveau: '' }],
  });
  const t = m.cvBackgroundToText(b);
  assert.match(t, /Expérience : Stagiaire, MTN/);
  assert.match(t, /- Installation de routeurs/);
  assert.match(t, /Langues : Anglais/);
  assert.doesNotMatch(t, /Formation|Loisirs/);
  assert.equal(m.cvBackgroundToText(null), '');
});

test('cvBackgroundSchema : refuse un champ trop long', () => {
  assert.equal(m.cvBackgroundSchema.safeParse({ profil: 'x'.repeat(701) }).success, false);
});
