import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const p = await loadTsWithPackages('lib/cv-precisions.ts');
const fill = await loadTsWithPackages('lib/cv-fill.ts');

const reference = 'Stage chez Boulangerie Le Palmier (juin 2025 - août 2025) : saisie des factures fournisseurs, tenue de la caisse.\nLangues : anglais';
const offer = { title: 'Stage assistant comptable', company: 'Afriland', requirements: ['Sage', 'Excel'], description: 'Stage de 3 mois à Douala.' };

test('questions : appuyées sur le CV ou l’offre, doublons et inventions retirés, 8 au plus', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ cible: 'experience', question: `Combien de factures fournisseurs saisissais-tu par mois (${i}) ?`, appui: 'saisie des factures fournisseurs' }));
  const raw = JSON.stringify([
    { cible: 'experience', question: 'Combien de factures saisissais-tu par mois au Palmier ?', appui: 'saisie des factures fournisseurs' },
    { cible: 'experience', question: 'Combien de factures saisissais-tu par mois au Palmier ?', appui: 'saisie des factures fournisseurs' },
    { cible: 'experience', question: 'Combien de clients suivais-tu chez Orange ?', appui: 'stage chez Orange' },
    { cible: 'langue', question: 'Quel est ton niveau en anglais (B1, B2…) ?', appui: 'anglais' },
    { cible: 'disponibilite', question: 'Quand peux-tu commencer, et pour combien de temps ?', appui: '' },
    { cible: 'experience', question: 'Une question sans appui sur une expérience ?', appui: '' },
    { cible: 'inconnue', question: 'Cible inconnue, rejetée ?', appui: 'anglais' },
    ...many,
  ]);
  const out = p.parsePrecisionQuestions(`Voici : ${raw}`, reference, offer);
  assert.equal(out.length, 8);
  assert.equal(out.filter((q) => /au Palmier/.test(q.question)).length, 1, 'doublon retiré');
  assert.ok(!out.some((q) => /Orange/.test(q.question)), 'appui absent du CV et de l’offre retiré');
  assert.ok(!out.some((q) => /sans appui/.test(q.question)), 'expérience sans appui retirée');
  assert.ok(out.some((q) => q.cible === 'disponibilite'), 'disponibilité sans appui gardée');
  assert.ok(!out.some((q) => /Cible inconnue/.test(q.question)));
  assert.deepEqual(p.parsePrecisionQuestions('pas du json', reference, offer), []);
  assert.deepEqual(p.parsePrecisionQuestions(null, reference, offer), []);
});

test('réponse IA illisible : liste fixe de repli, non mise en cache', async () => {
  p.clearPrecisionCache();
  let calls = 0;
  const deps = { beforeAiCall: async () => {}, callModel: async () => { calls += 1; return 'désolé'; } };
  const first = await p.askPrecisions(reference, offer, deps);
  assert.equal(first.fallback, true);
  assert.deepEqual(first.questions.map((q) => q.cible), ['experience', 'experience', 'disponibilite', 'langue', 'ville', 'lien']);
  await p.askPrecisions(reference, offer, deps);
  assert.equal(calls, 2, 'le repli ne se met pas en cache');
});

test('second appel identique : servi par le cache, sans appel IA ni quota', async () => {
  p.clearPrecisionCache();
  let calls = 0;
  let quota = 0;
  const deps = {
    beforeAiCall: async () => { quota += 1; },
    callModel: async () => { calls += 1; return JSON.stringify([{ cible: 'langue', question: 'Quel est ton niveau en anglais ?', appui: 'anglais' }]); },
  };
  const first = await p.askPrecisions(reference, offer, deps);
  const second = await p.askPrecisions(`  ${reference.toUpperCase()} `, offer, deps);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.deepEqual(second.questions, first.questions);
  assert.equal(calls, 1);
  assert.equal(quota, 1);
  const other = await p.askPrecisions(reference, { ...offer, title: 'Stage caissier' }, deps);
  assert.equal(other.cached, false, 'autre offre : nouvel appel');
});

test('un chiffre donné en précision passe dans la mission, un chiffre non donné non', () => {
  const precisions = 'Précisions données par l’étudiant :\nCombien de factures par mois ? — environ 120 factures par mois';
  const input = fill.cvFillRequestSchema.parse({
    jobId: 'external', job: { title: 'Stage comptable' }, student: {},
    notes: `${reference}\n\n${precisions}`,
  });
  const cv = fill.parseCvFill(JSON.stringify({
    experiences: [{ poste: 'Stagiaire', entreprise: 'Boulangerie Le Palmier', missions: ['Saisi 120 factures fournisseurs par mois', 'Tenu la caisse de 300 clients par jour'] }],
    langues: [{ langue: 'Anglais', niveau: 'B2' }],
  }), input);
  assert.deepEqual(cv.experiences[0].missions, ['Saisi 120 factures fournisseurs par mois']);
  assert.equal(cv.langues[0].niveau, '', 'niveau non donné : vide');
});

test('garde de source : session avant lecture, gratuit, quota seulement sur appel IA, précisions bornées dans cv-fill', () => {
  const route = fs.readFileSync('app/api/mobile/documents/cv-precisions/route.ts', 'utf8');
  assert.ok(route.indexOf('requireMobileUser(request)') < route.indexOf('requestSchema.safeParse'));
  assert.match(route, /MobileApiError\('Données invalides\.', 400\)/);
  assert.match(route, /beforeAiCall: \(\) => enforceAiQuota\(request, \{ userId, route: 'cv-precisions' \}\)/);
  assert.ok(!/aiCost|ia_credits/.test(route), 'gratuit : aucun débit');
  const fillRoute = fs.readFileSync('app/api/mobile/documents/cv-fill/route.ts', 'utf8');
  assert.match(fillRoute, /precisions: z\.array\(z\.object\(\{ question: z\.string\(\)\.trim\(\)\.max\(300\), reponse: z\.string\(\)\.trim\(\)\.max\(600\) \}\)\)\.max\(10\)/);
  assert.match(fillRoute, /Précisions données par l’étudiant/);
  const rules = fs.readFileSync('lib/ai-quota-rules.ts', 'utf8');
  assert.match(rules, /'cv-precisions': \{ max: 20/);
});
