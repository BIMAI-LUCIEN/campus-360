import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const m = await loadTs('lib/free-launch.ts');
const PROD = { NODE_ENV: 'production' };

test('production : le mode gratuit doit être explicite', () => {
  assert.throws(() => m.resolveFreeLaunch(PROD), /FREE_LAUNCH_MODE/);
  assert.deepEqual(m.resolveFreeLaunch({ ...PROD, FREE_LAUNCH_MODE: 'false' }), { active: false, until: null });
  assert.throws(() => m.resolveFreeLaunch({ ...PROD, FREE_LAUNCH_MODE: 'true' }), /FREE_LAUNCH_UNTIL/);
});

test('le gratuit s’arrête tout seul à la date prévue', () => {
  const env = { ...PROD, FREE_LAUNCH_MODE: 'true', FREE_LAUNCH_UNTIL: '2027-01-15T00:00:00Z' };
  assert.equal(m.resolveFreeLaunch(env, new Date('2026-12-01T00:00:00Z')).active, true);
  assert.equal(m.resolveFreeLaunch(env, new Date('2027-02-01T00:00:00Z')).active, false);
  assert.throws(() => m.resolveFreeLaunch({ ...env, FREE_LAUNCH_UNTIL: 'demain' }), /date ISO/);
});

test('hors production, l’absence de variable garde le gratuit', () => {
  assert.equal(m.resolveFreeLaunch({ NODE_ENV: 'development' }).active, true);
});

test('solde de départ : 3 000 coins par défaut, borné', () => {
  assert.equal(m.resolveStartingCoins({}), 3000);
  assert.equal(m.resolveStartingCoins({ STARTING_COINS: '2500' }), 2500);
  assert.throws(() => m.resolveStartingCoins({ STARTING_COINS: '-1' }));
  assert.throws(() => m.resolveStartingCoins({ STARTING_COINS: 'abc' }));
});

test('coût IA : 0 pendant le gratuit, barème réduit ensuite', () => {
  const free = { ...PROD, FREE_LAUNCH_MODE: 'true', FREE_LAUNCH_UNTIL: '2099-01-01T00:00:00Z' };
  const paid = { ...PROD, FREE_LAUNCH_MODE: 'false' };
  assert.equal(m.resolveAiCost(free, 'fullDoc'), 0);
  assert.equal(m.resolveAiCost(paid, 'passage'), 1);
  assert.equal(m.resolveAiCost(paid, 'careerDoc'), 2);
  assert.equal(m.resolveAiCost(paid, 'fullDoc'), 3);
  assert.equal(m.resolveAiCost({ ...paid, AI_COST_FULL_DOC: '4' }, 'fullDoc'), 4);
});

test('la copie de recruiter-web est identique', () => {
  const a = fs.readFileSync(path.resolve('lib/free-launch.ts'), 'utf8');
  const b = fs.readFileSync(path.resolve('../recruiter-web/lib/free-launch.ts'), 'utf8');
  assert.equal(b, a, 'modifier les deux fichiers ensemble');
});
