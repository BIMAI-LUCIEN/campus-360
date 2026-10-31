import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { purchaseOfferOn, OfferFundsError } = await loadTs('lib/offers-core.ts');
const { OFFERS } = await loadTs('lib/pricing.ts');
const offer = (code) => OFFERS.find((o) => o.code === code);

const fakeDb = ({ balance = 5000, passUntil = null } = {}) => {
  const state = { balance, tx: [], grants: [], passes: [] };
  return {
    state,
    query: async (sql, params = []) => {
      if (sql.includes('from public.app_wallets')) return { rows: [{ balance_coins: state.balance }] };
      if (sql.includes('from public.app_wallet_transactions')) return { rows: state.tx.filter((t) => t.reference === params[1]) };
      if (sql.includes('balance_coins = balance_coins - $1')) { state.balance -= params[0]; return { rows: [] }; }
      if (sql.includes('insert into public.app_wallet_transactions')) { state.tx.push({ type: params[1], amount: params[2], reference: params[3] }); return { rows: [] }; }
      if (sql.includes('insert into public.app_credit_grants')) { state.grants.push({ code: params[1], credits: params[2], expires: params[3] }); return { rows: [] }; }
      if (sql.includes('max(expires_at)')) return { rows: [{ until: passUntil }] };
      if (sql.includes('insert into public.app_revision_passes')) { state.passes.push({ start: params[1], end: params[2], source: params[3] }); return { rows: [] }; }
      throw new Error(`requête inattendue : ${sql}`);
    },
  };
};

const now = new Date('2026-11-01T10:00:00Z');

test('Starter : 1 000 coins, 5 crédits valables 30 jours', async () => {
  const db = fakeDb();
  const result = await purchaseOfferOn(db, 'u', offer('STARTER'), 'offer:a', now);
  assert.equal(result.balance, 4000);
  assert.deepEqual(db.state.grants, [{ code: 'STARTER', credits: 5, expires: '2026-12-01T10:00:00.000Z' }]);
  assert.equal(db.state.tx[0].type, 'pack_purchase');
  assert.equal(db.state.passes.length, 0);
});

test('Recherche active : 12 crédits et 1 jour de Pass', async () => {
  const db = fakeDb();
  await purchaseOfferOn(db, 'u', offer('RECHERCHE_ACTIVE'), 'offer:b', now);
  assert.equal(db.state.grants[0].credits, 12);
  assert.deepEqual(db.state.passes, [{ start: '2026-11-01T10:00:00.000Z', end: '2026-11-02T10:00:00.000Z', source: 'pack' }]);
});

test('Pass acheté pendant un Pass actif : prolongé à sa suite', async () => {
  const db = fakeDb({ passUntil: '2026-11-03T10:00:00.000Z' });
  await purchaseOfferOn(db, 'u', offer('PASS_7J'), 'offer:c', now);
  assert.deepEqual(db.state.passes[0], { start: '2026-11-03T10:00:00.000Z', end: '2026-11-10T10:00:00.000Z', source: 'purchase' });
  assert.equal(db.state.tx[0].type, 'pass_purchase');
});

test('solde insuffisant : rien n’est débité', async () => {
  const db = fakeDb({ balance: 150 });
  await assert.rejects(purchaseOfferOn(db, 'u', offer('PASS_24H'), 'offer:d', now), OfferFundsError);
  assert.equal(db.state.balance, 150);
  assert.equal(db.state.passes.length, 0);
});

test('double requête avec le même identifiant : un seul achat', async () => {
  const db = fakeDb();
  await purchaseOfferOn(db, 'u', offer('STARTER'), 'offer:e', now);
  const again = await purchaseOfferOn(db, 'u', offer('STARTER'), 'offer:e', now);
  assert.equal(again.alreadyDone, true);
  assert.equal(db.state.balance, 4000);
  assert.equal(db.state.grants.length, 1);
});

test('route : session, rate limit fermé, entrée validée', () => {
  const source = fs.readFileSync(path.resolve('app/api/mobile/offers/purchase/route.ts'), 'utf8');
  assert.match(source, /requireMobileUser\(/);
  assert.match(source, /bucket: 'purchase-offer'/);
  assert.match(source, /purchaseId: z\.string\(\)\.uuid\(\)/);
});
