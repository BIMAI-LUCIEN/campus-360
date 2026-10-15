import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const m = await loadTs('../src/features/stages/applicationsCache.ts');
const job = { id: 'j', title: 'Stage' };

test('purgeFakeApplications garde seulement les candidatures venues du serveur', () => {
  const real = { id: '3f2b6c1e-8a4d-4f7b-9c2e-1a2b3c4d5e6f', job };
  const out = m.purgeFakeApplications([
    { id: 'app-seed-1', job },
    { id: 'app-local-9', job },
    { id: 'app-dispatch-3', job },
    { id: 'app-offline-4', job },
    real,
  ]);
  assert.deepEqual(out, [real]);
});

test('une candidature sans offre est retirée', () => {
  assert.deepEqual(m.purgeFakeApplications([{ id: '3f2b6c1e-8a4d-4f7b-9c2e-1a2b3c4d5e6f' }]), []);
});

test('liste vide → liste vide', () => {
  assert.deepEqual(m.purgeFakeApplications([]), []);
});

test('le budget SecureStore reste sous 1 800 octets', () => {
  const many = Array.from({ length: 60 }, (_, i) => ({ id: `id-${i}`, job, notes: 'x'.repeat(80) }));
  const raw = m.fitSecureStoreBudget(many);
  assert.ok(m.getUtf8ByteLength(raw) <= 1800);
  assert.ok(JSON.parse(raw).length > 0);
});
