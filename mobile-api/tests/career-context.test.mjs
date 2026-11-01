import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const m = await loadTsWithPackages('lib/career-context.ts', ['lib/cv-background.ts']);
const llm = await loadTsWithPackages('lib/llm.ts');

test('CV_MODELS : Claude Haiku en premier', () => {
  assert.equal(llm.CV_MODELS[0], 'anthropic/claude-haiku-5.5');
});

test('modelRequestOptions : raisonnement coupé pour Claude seulement', () => {
  assert.deepEqual(llm.modelRequestOptions('anthropic/claude-haiku-5.5'), { reasoning: { enabled: false } });
  assert.deepEqual(llm.modelRequestOptions('openai/gpt-4o-mini'), {});
});

test('careerContextText : parcours et offre visée, rien quand tout est vide', () => {
  assert.equal(m.careerContextText(null, null), '');
  const offer = m.careerOfferSchema.parse({ title: 'Stagiaire réseaux', company: 'Orange', requirements: ['Cisco'] });
  const text = m.careerContextText(
    { profil: 'Étudiant en réseaux', experiences: [], formations: [], competences: ['Linux'], logiciels: [], qualites: [], langues: [], loisirs: [] },
    offer,
  );
  assert.match(text, /PARCOURS DE L'ÉTUDIANT/);
  assert.match(text, /Compétences : Linux/);
  assert.match(text, /OFFRE VISÉE :\nPoste : Stagiaire réseaux \(stage\)/);
  assert.match(text, /Exigences : Cisco/);
});

test('careerOfferToText : une offre sans titre est ignorée', () => {
  assert.equal(m.careerOfferToText(m.careerOfferSchema.parse({ company: 'Orange' })), '');
});

test('careerContextSchema : refuse une offre trop longue', () => {
  assert.equal(m.careerContextSchema.safeParse({ offer: { title: 'x'.repeat(201) } }).success, false);
  assert.equal(m.careerContextSchema.safeParse({ offer: null, background: null }).success, true);
});
