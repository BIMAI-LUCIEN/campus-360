import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { chargeApplicationOn, refundApplicationOn, InsufficientFundsError } = await loadTs('lib/stage-charge-core.ts');

// Fake pg client: a wallet, credit grants and what was already paid, in memory.
const fakeDb = ({ balance = 1000, grants = [], usages = [], purchases = [] } = {}) => {
  const state = { balance, grants: grants.map((g) => ({ ...g })), usages: [...usages], purchases: [...purchases] };
  const now = Date.now();
  return {
    state,
    query: async (sql, params = []) => {
      if (sql.includes('from public.app_wallets')) return { rows: [{ balance_coins: state.balance }] };
      if (sql.includes('from public.app_credit_usages')) {
        return { rows: state.usages.filter((u) => u.reference === params[1] && u.status === 'success') };
      }
      if (sql.startsWith('select 1 from public.app_wallet_transactions') || sql.includes("type = 'purchase' and status = 'success' limit 1")) {
        return { rows: state.purchases.filter((p) => p.reference === params[1] && p.status === 'success') };
      }
      if (sql.includes('from public.app_credit_grants')) {
        const usable = state.grants
          .filter((g) => g.expiresAt > now && g.left >= params[1])
          .sort((a, b) => a.expiresAt - b.expiresAt);
        return { rows: usable.slice(0, 1).map((g) => ({ id: g.id })) };
      }
      if (sql.startsWith('update public.app_credit_grants set credits_left = credits_left - $1')) {
        state.grants.find((g) => g.id === params[1]).left -= params[0];
        return { rows: [] };
      }
      if (sql.startsWith('update public.app_credit_grants set credits_left = credits_left + $1')) {
        state.grants.find((g) => g.id === params[1]).left += params[0];
        return { rows: [] };
      }
      if (sql.includes('insert into public.app_credit_usages')) {
        state.usages.push({ grant_id: params[1], credits: params[2], reference: params[3], status: 'success' });
        return { rows: [] };
      }
      if (sql.includes('update public.app_credit_usages')) {
        const usage = state.usages.find((u) => u.reference === params[1] && u.status === 'success');
        if (!usage) return { rows: [] };
        usage.status = 'refunded';
        return { rows: [{ grant_id: usage.grant_id, credits: usage.credits }] };
      }
      if (sql.includes('balance_coins = balance_coins - $1')) {
        state.balance -= params[0];
        return { rows: [] };
      }
      if (sql.includes('balance_coins = balance_coins + $1')) {
        state.balance += params[0];
        return { rows: [] };
      }
      if (sql.includes('insert into public.app_wallet_transactions')) {
        state.purchases.push({ reference: params[2], amount: params[1], status: 'success' });
        return { rows: [] };
      }
      if (sql.includes("set status = 'failed'")) {
        const purchase = state.purchases.find((p) => p.reference === params[1] && p.status === 'success');
        if (!purchase) return { rows: [] };
        purchase.status = 'failed';
        return { rows: [{ amount_coins: purchase.amount }] };
      }
      throw new Error(`requête inattendue : ${sql}`);
    },
  };
};

const future = Date.now() + 86_400_000;

test('les crédits passent avant le wallet', async () => {
  const db = fakeDb({ grants: [{ id: 'g1', left: 5, expiresAt: future }] });
  const result = await chargeApplicationOn(db, 'u', 'stage-apply:j1', 300, 1);
  assert.deepEqual(result, { charged: 0, creditsUsed: 1, balance: 1000 });
  assert.equal(db.state.grants[0].left, 4);
});

test('offre rémunérée : 2 crédits, grant qui expire le plus tôt', async () => {
  const db = fakeDb({ grants: [{ id: 'late', left: 5, expiresAt: future + 1000 }, { id: 'soon', left: 2, expiresAt: future }] });
  await chargeApplicationOn(db, 'u', 'stage-apply:j2', 500, 2);
  assert.equal(db.state.grants.find((g) => g.id === 'soon').left, 0);
  assert.equal(db.state.grants.find((g) => g.id === 'late').left, 5);
});

test('crédits expirés ou insuffisants : débit du wallet', async () => {
  const db = fakeDb({ grants: [{ id: 'old', left: 5, expiresAt: Date.now() - 1000 }, { id: 'g', left: 1, expiresAt: future }] });
  const result = await chargeApplicationOn(db, 'u', 'stage-apply:j3', 500, 2);
  assert.deepEqual(result, { charged: 500, creditsUsed: 0, balance: 500 });
});

test('double envoi à la même offre : un seul paiement', async () => {
  const db = fakeDb();
  await chargeApplicationOn(db, 'u', 'stage-apply:j4', 300, 1);
  const again = await chargeApplicationOn(db, 'u', 'stage-apply:j4', 300, 1);
  assert.equal(again.charged, 0);
  assert.equal(db.state.balance, 700);
});

test('sans crédit ni solde : erreur de solde insuffisant', async () => {
  const db = fakeDb({ balance: 100 });
  await assert.rejects(chargeApplicationOn(db, 'u', 'stage-apply:j5', 300, 1), InsufficientFundsError);
  assert.equal(db.state.balance, 100);
});

test('échec d’envoi : crédits ou coins rendus (D28.4)', async () => {
  const withCredits = fakeDb({ grants: [{ id: 'g1', left: 5, expiresAt: future }] });
  await chargeApplicationOn(withCredits, 'u', 'stage-apply:j6', 300, 1);
  await refundApplicationOn(withCredits, 'u', 'stage-apply:j6');
  assert.equal(withCredits.state.grants[0].left, 5);

  const withCoins = fakeDb();
  await chargeApplicationOn(withCoins, 'u', 'stage-apply:j7', 300, 1);
  await refundApplicationOn(withCoins, 'u', 'stage-apply:j7');
  assert.equal(withCoins.state.balance, 1000);
});
