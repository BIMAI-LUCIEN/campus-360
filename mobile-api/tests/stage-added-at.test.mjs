import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { formatAddedAgo } = await loadTs('../src/features/stages/addedAt.ts');

// 13:05 UTC = 14 h 05 in Cameroon.
const NOW = new Date('2026-10-20T13:05:00Z');
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();
const S = 1000;
const MIN = 60 * S;
const H = 60 * MIN;
const D = 24 * H;

test('date d’ajout : moins d’une minute', () => {
  assert.equal(formatAddedAgo(ago(30 * S), NOW), "Ajouté à l'instant");
  assert.equal(formatAddedAgo(ago(59 * S), NOW), "Ajouté à l'instant");
  assert.equal(formatAddedAgo(ago(60 * S), NOW), 'Ajouté il y a 1 min');
});

test('date d’ajout : minutes et heures', () => {
  assert.equal(formatAddedAgo(ago(59 * MIN), NOW), 'Ajouté il y a 59 min');
  assert.equal(formatAddedAgo(ago(60 * MIN), NOW), 'Ajouté il y a 1 h');
  assert.equal(formatAddedAgo(ago(23 * H + 59 * MIN), NOW), 'Ajouté il y a 23 h');
});

test('date d’ajout : jours', () => {
  assert.equal(formatAddedAgo(ago(D), NOW), 'Ajouté il y a 1 j');
  assert.equal(formatAddedAgo(ago(6 * D + 23 * H), NOW), 'Ajouté il y a 6 j');
});

test('date d’ajout : au-delà de 7 jours, date en heure du Cameroun', () => {
  assert.equal(formatAddedAgo('2026-10-13T13:05:00Z', NOW), 'Ajouté le 13 oct. à 14 h 05');
  assert.equal(formatAddedAgo('2026-10-10T23:30:00Z', NOW), 'Ajouté le 11 oct. à 0 h 30');
  assert.equal(formatAddedAgo('2025-12-31T23:30:00Z', NOW), 'Ajouté le 1 janv. à 0 h 30');
  assert.equal(formatAddedAgo('2025-10-01T08:00:00Z', NOW), 'Ajouté le 1 oct. 2025 à 9 h 00');
});

test('date d’ajout : futur proche, valeurs invalides', () => {
  assert.equal(formatAddedAgo(new Date(NOW.getTime() + 2 * MIN).toISOString(), NOW), "Ajouté à l'instant");
  assert.equal(formatAddedAgo('pas une date', NOW), '');
  assert.equal(formatAddedAgo('', NOW), '');
});
