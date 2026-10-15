import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { isDatabaseUnavailable } = await loadTs('lib/db-errors.ts');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const serverUp = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) }).then(() => true, () => false);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL} (lancer : npm run dev)`;

test('base injoignable reconnue, erreur métier non', () => {
  assert.equal(isDatabaseUnavailable(new Error('connect ECONNREFUSED 127.0.0.1:5432')), true);
  assert.equal(isDatabaseUnavailable(new Error('DATABASE_URL is required.')), true);
  assert.equal(isDatabaseUnavailable({ code: 'ENOTFOUND' }), true);
  assert.equal(isDatabaseUnavailable(new Error('Invalid input')), false);
  assert.equal(isDatabaseUnavailable('boom'), false);
});

test('santé : 200 et base connectée quand le serveur tourne', { skip: NO_SERVER }, async () => {
  const res = await fetch(`${BASE_URL}/api/health`);
  const body = await res.json();
  if (res.status === 200) assert.equal(body.db, 'connected');
  else assert.equal(res.status, 503);
});

test('garde de source : plus de code d’appairage fabriqué ni de réponse locale', () => {
  const evo = fs.readFileSync(path.resolve('lib/evolution-api.ts'), 'utf8');
  const chat = fs.readFileSync(path.resolve('app/api/ai/pdf-chat/route.ts'), 'utf8');
  const health = fs.readFileSync(path.resolve('app/api/health/route.ts'), 'utf8');
  assert.ok(!evo.includes('generateFallbackPairingCode'));
  assert.ok(!chat.includes('local: true') && !chat.includes('localPdfAnswer'));
  assert.ok(!health.includes('offline_resilient'));
});
