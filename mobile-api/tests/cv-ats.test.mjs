import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const ats = await loadTsWithPackages('lib/cv-ats.ts', ['lib/cv-schema.ts']);
const schema = await loadTsWithPackages('lib/cv-schema.ts');

const cv = (patch = {}) => schema.officialCvSchema.parse({
  titrePoste: 'Stagiaire assistant comptable',
  detailsPersonnels: { nom: 'Ndi', prenom: 'Awa', email: 'awa@example.test', telephone: '+237600000000', adresse: 'Douala' },
  experiences: [{ poste: 'Stagiaire', entreprise: 'Boulangerie Le Palmier', ville: 'Douala', periode: '', debut: '2025-06', fin: '2025-08', missions: ['Saisie des factures', 'Rapprochements bancaires mensuels'] }],
  formations: [{ diplome: 'Licence en comptabilité', etablissement: 'Université de Douala', ville: '', periode: '', debut: '2023-10', fin: 'present' }],
  competences: { professionnelles: ['Microsoft Excel', 'Sage'], habilitesRelationnelles: [], logiciels: [] },
  langues: [{ langue: 'English', niveau: 'B2' }],
  loisirs: [],
  ...patch,
});

test('couverture : exact, autre forme stricte, absent', () => {
  const r = ats.evaluateAts(cv(), { template: 'ats', requirements: ['Sage', 'Excel', 'Anglais', 'Power BI'] });
  const state = Object.fromEntries(r.motsCles.map((k) => [k.motCle, k.etat]));
  assert.equal(state.Sage, 'exact');
  assert.equal(state.Excel, 'exact'); // "Microsoft Excel" contient le mot exact
  assert.equal(state.Anglais, 'autre_forme'); // "English"
  assert.equal(state['Power BI'], 'absent');
  assert.equal(r.couverture, 75);
});

test('une compétence voisine ne compte pas comme le mot-clé', () => {
  const r = ats.evaluateAts(cv(), { template: 'ats', requirements: ['Communication'] });
  assert.equal(r.motsCles[0].etat, 'absent');
  assert.equal(r.verdict, 'FILTRÉ');
  assert.ok(r.note <= 4, 'couverture < 70 % = bloquant, note plafonnée à 4');
});

test('exigence longue retrouvée par ses mots', () => {
  const r = ats.evaluateAts(cv(), { template: 'ats', requirements: ['Licence comptabilité'] });
  assert.notEqual(r.motsCles[0].etat, 'absent');
});

test('CV sans offre : pas de couverture, note sur la forme', () => {
  const r = ats.evaluateAts(cv(), { template: 'ats' });
  assert.equal(r.couverture, null);
  assert.deepEqual(r.motsCles, []);
  assert.equal(r.verdict, 'PASSE LE FILTRE');
});

test('modèle sur deux colonnes signalé, modèle ATS non', () => {
  const twoCols = ats.evaluateAts(cv(), { template: 'prestige' });
  assert.ok(twoCols.problemes.some((p) => p.gravite === 'majeur' && /deux colonnes/.test(p.message)));
  const plain = ats.evaluateAts(cv(), { template: 'ats' });
  assert.ok(!plain.problemes.some((p) => /colonnes|tableau/.test(p.message)));
});

test('contact absent = bloquant ; « à compléter » compté', () => {
  const r = ats.evaluateAts(cv({ detailsPersonnels: { nom: 'Ndi', prenom: 'Awa', email: '', telephone: '' }, titrePoste: '[à compléter]' }), { template: 'ats' });
  assert.equal(r.verdict, 'FILTRÉ');
  assert.ok(r.problemes.some((p) => p.gravite === 'bloquant' && /contacter/.test(p.message)));
  assert.ok(r.problemes.some((p) => /à compléter/.test(p.message)));
});

test('cvToText garde l’ordre de lecture et les rubriques', () => {
  const text = schema.cvToText(cv({ rubriques: [{ id: 'a', kind: 'certificats', titre: 'Certificats', items: ['PIX'] }] }));
  assert.ok(text.indexOf('Expérience professionnelle') < text.indexOf('Formation'));
  assert.match(text, /juin 2025 – août 2025/);
  assert.match(text, /Certificats\n- PIX/);
});
