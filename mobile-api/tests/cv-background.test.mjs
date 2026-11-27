import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

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

test('fusion : saisies conservées, postes distincts, doublons et plafonds', () => {
  const saved = m.cvBackgroundSchema.parse({
    profil: 'Profil saisi',
    experiences: [{ poste: 'Stagiaire', entreprise: 'MTN', periode: '2025', missions: ['Support client'] }],
    competences: ['Excel'],
    langues: [{ langue: 'Anglais', niveau: 'B2' }],
  });
  const incoming = m.cvBackgroundSchema.parse({
    profil: 'Profil importé',
    experiences: [
      { poste: 'stagiaire', entreprise: 'MTN', periode: '2025', ville: 'Douala', missions: ['support client', 'Accueil'] },
      { poste: 'Stagiaire', entreprise: 'MTN', periode: '2026' },
    ],
    competences: ['excel', ...Array.from({ length: 29 }, (_, i) => 'Compétence ' + i)],
    langues: [{ langue: 'anglais', niveau: 'A2' }, { langue: 'Français' }],
  });
  const merged = m.mergeCvBackground(saved, incoming);
  assert.equal(merged.profil, saved.profil);
  assert.equal(merged.experiences.length, 2);
  assert.equal(merged.experiences[0].ville, 'Douala');
  assert.deepEqual(merged.experiences[0].missions, ['Support client', 'Accueil']);
  assert.equal(merged.langues[0].niveau, 'B2');
  assert.equal(merged.competences.length, 30);
  assert.equal(merged.competences[0], 'Excel');
  assert.deepEqual(m.mergeCvBackground(merged, incoming), merged);
  assert.ok(m.cvBackgroundSchema.safeParse(merged).success);
});

test('fusion : même implémentation sur le serveur et dans l’application', () => {
  const implementation = (name) => fs.readFileSync(name, 'utf8').replaceAll('\r\n', '\n')
    .match(/const normalizedEntry = [\s\S]+?loisirs: mergeStrings\(current.loisirs, imported.loisirs, 10\),\n\}\);/)[0];
  assert.equal(implementation('lib/cv-background.ts'), implementation('../src/features/profile/cvBackgroundApi.ts'));
});

test('mergeBackgroundIntoCv : conserve le brouillon édité et fusionne un 2e CV sans doublon', () => {
  const source = fs.readFileSync('../src/features/profile/cvBackgroundApi.ts', 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  const deps = {
    'react-native': { Platform: { OS: 'web' } },
    'expo-document-picker': {},
    'expo-file-system/legacy': {},
    '../auth/betterAuth': { authFetch: async () => ({}) },
  };
  runInNewContext(outputText, { exports, require: (name) => deps[name] });

  const draft = {
    titrePoste: 'Assistant comptable',
    detailsPersonnels: { nom: 'TEST', prenom: 'Awa', email: 'awa@example.test', telephone: '+237600000000' },
    profil: 'Profil modifié à la main',
    experiences: [{ poste: 'Stagiaire', entreprise: 'MTN', ville: 'Douala', periode: '2025', missions: ['Saisie manuelle'] }],
    formations: [{ diplome: 'BTS Comptabilité', etablissement: 'IUT', ville: 'Douala', periode: '2024' }],
    competences: {
      professionnelles: ['Excel'],
      habilitesRelationnelles: ['Rigueur'],
      logiciels: [{ categorie: 'Bureautique', items: ['Word'] }],
    },
    langues: [{ langue: 'Anglais', niveau: 'B2' }],
    loisirs: ['Lecture'],
  };
  const secondCv = {
    profil: 'Profil importé ignoré',
    experiences: [
      { poste: 'stagiaire', entreprise: 'MTN', ville: 'Yaoundé', periode: '2025', missions: ['Saisie manuelle', 'Classement'] },
      { poste: 'Caissier', entreprise: 'Boulangerie', ville: 'Douala', periode: '2024', missions: ['Encaissement'] },
    ],
    formations: [{ diplome: 'BTS Comptabilité', etablissement: 'IUT', ville: '', periode: '2024' }],
    competences: ['excel', 'Facturation'],
    logiciels: ['word', 'Sage 100'],
    qualites: ['rigueur', 'Autonomie'],
    langues: [{ langue: 'anglais', niveau: 'A2' }, { langue: 'Français', niveau: 'Natif' }],
    loisirs: ['lecture', 'Football'],
  };

  const next = JSON.parse(JSON.stringify(exports.mergeBackgroundIntoCv(draft, secondCv)));
  assert.equal(next.profil, 'Profil modifié à la main');
  assert.equal(next.experiences.length, 2);
  assert.equal(next.experiences[0].ville, 'Douala');
  assert.deepEqual(next.experiences[0].missions, ['Saisie manuelle', 'Classement']);
  assert.equal(next.experiences[1].poste, 'Caissier');
  assert.equal(next.formations.length, 1);
  assert.deepEqual(next.competences.professionnelles, ['Excel', 'Facturation']);
  assert.deepEqual(next.competences.habilitesRelationnelles, ['Rigueur', 'Autonomie']);
  assert.deepEqual(next.competences.logiciels, [{ categorie: 'Bureautique', items: ['Word'] }, { items: ['Sage 100'] }]);
  assert.deepEqual(next.langues, [{ langue: 'Anglais', niveau: 'B2' }, { langue: 'Français', niveau: 'Natif' }]);
  assert.deepEqual(next.loisirs, ['Lecture', 'Football']);
});
