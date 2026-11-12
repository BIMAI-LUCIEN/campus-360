import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const m = await loadTsWithPackages('lib/career-context.ts', ['lib/cv-background.ts']);
const llm = await loadTsWithPackages('lib/llm.ts');

test('CV_MODELS : Claude Haiku en premier', () => {
  assert.equal(llm.CV_MODELS[0], 'anthropic/claude-haiku-5.5');
});

test('modelRequestOptions : effort high pour Claude seulement, réglable par env', () => {
  const saved = process.env.OPENROUTER_REASONING_EFFORT;
  try {
    delete process.env.OPENROUTER_REASONING_EFFORT;
    assert.deepEqual(llm.modelRequestOptions('anthropic/claude-haiku-5.5'), { reasoning: { effort: 'high' } });
    assert.deepEqual(llm.modelRequestOptions('openai/gpt-4o-mini'), {});
    process.env.OPENROUTER_REASONING_EFFORT = 'MAX';
    assert.deepEqual(llm.modelRequestOptions('anthropic/claude-haiku-5.5'), { reasoning: { effort: 'max' } });
    process.env.OPENROUTER_REASONING_EFFORT = 'n-importe-quoi';
    assert.deepEqual(llm.modelRequestOptions('anthropic/claude-haiku-5.5'), { reasoning: { effort: 'high' } });
  } finally {
    if (saved === undefined) delete process.env.OPENROUTER_REASONING_EFFORT;
    else process.env.OPENROUTER_REASONING_EFFORT = saved;
  }
});

test('outputTokensFor : marge de réflexion pour Claude, rien pour les autres', () => {
  const saved = process.env.OPENROUTER_REASONING_EFFORT;
  try {
    delete process.env.OPENROUTER_REASONING_EFFORT;
    assert.equal(llm.outputTokensFor('anthropic/claude-haiku-5.5', 1500), 7500);
    assert.equal(llm.outputTokensFor('openai/gpt-4o-mini', 1500), 1500);
  } finally {
    if (saved !== undefined) process.env.OPENROUTER_REASONING_EFFORT = saved;
  }
});

test('modèles : Haiku en tête partout', () => {
  assert.equal(llm.DRAFTING_MODELS[0], 'anthropic/claude-haiku-5.5');
  assert.equal(llm.VISION_MODELS[0], 'anthropic/claude-haiku-5.5');
  assert.ok(!llm.DRAFTING_MODELS.some((model) => model.endsWith(':free')));
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
