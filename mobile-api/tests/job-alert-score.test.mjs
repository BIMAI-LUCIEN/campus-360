import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { scoreJobForStudent, fieldMatches, STRONG_MATCH } = await loadTs('lib/job-alert-score.ts');

const devJob = {
  title: 'Stagiaire Développeur Web',
  description: 'Rejoins notre équipe produit à Douala.',
  requirements: ['React', 'Node.js', 'Git'],
  industry: 'Informatique',
};

test('compétences et filière qui collent : correspondance forte', () => {
  const score = scoreJobForStudent({ skills: ['React', 'Node.js', 'Git', 'SQL'], faculty: 'Informatique & Génie Logiciel' }, devJob);
  assert.equal(score, 100);
  assert.ok(score >= STRONG_MATCH);
});

test('filière seule, sans compétences enregistrées : correspondance forte', () => {
  assert.equal(scoreJobForStudent({ skills: [], faculty: 'Ingénierie Logicielle, Web & Cloud' }, devJob), 70);
});

test('autre domaine : pas d’alerte', () => {
  const score = scoreJobForStudent({ skills: ['Comptabilité', 'Excel'], faculty: 'Finance & Audit' }, devJob);
  assert.ok(score < STRONG_MATCH, String(score));
  assert.equal(scoreJobForStudent({ skills: [], faculty: null }, devJob), 0);
});

test('offre sans exigences : compétences cherchées dans le texte', () => {
  const job = { title: 'Stage assistant comptable', description: 'Maîtrise de Sage et Excel souhaitée.', requirements: [], industry: 'Finance' };
  const score = scoreJobForStudent({ skills: ['Sage', 'Excel'], faculty: 'Comptabilité et Finance' }, job);
  assert.ok(score >= STRONG_MATCH, String(score));
});

test('filière : réseaux et télécoms reconnus dans une offre système', () => {
  assert.equal(fieldMatches('Génie Réseaux et Télécommunications', { title: 'Technicien réseau', requirements: [] }), true);
  assert.equal(fieldMatches('Réseaux & Télécommunications', { title: 'Assistant juridique', requirements: [] }), false);
});

test('pièges relevés sur les vraies offres : pas de faux positif', () => {
  const telecom = 'Génie Réseaux et Télécommunications';
  assert.equal(fieldMatches(telecom, { title: 'BÉNÉVOLE / STAGIAIRE EN COMMUNICATION', requirements: [] }), false);
  assert.equal(fieldMatches(telecom, { title: 'Stage Marketing Digital', requirements: ['Réseaux sociaux'] }), false);
  assert.equal(fieldMatches('Informatique & Génie Logiciel', { title: 'Assistant Comptable', requirements: ['Outil informatique'] }), false);
  assert.equal(fieldMatches('Informatique & Génie Logiciel', { title: 'Data Collectors and Education Workers', requirements: [] }), false);
  assert.equal(fieldMatches('UI/UX Design & Conception Produit', { title: 'Stagiaire en suivi et évaluation', requirements: [] }), false);
});
