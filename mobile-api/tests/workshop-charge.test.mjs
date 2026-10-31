import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { chargeWorkshopOn, refundWorkshopOn, WorkshopFundsError } = await loadTs('lib/workshop-charge-core.ts');

const PRICES = { REPORT: 2000, CV: 300, THESIS_FLAT: 4000, THESIS_CHAPTER: 1000 };

const fakeDb = (balance = 10000) => {
  const state = { balance, tx: [], thesis: null };
  return {
    state,
    query: async (sql, params = []) => {
      if (sql.includes('from public.app_wallets')) return { rows: [{ balance_coins: state.balance }] };
      if (sql.includes('from public.app_thesis_purchases')) return { rows: state.thesis ? [state.thesis] : [] };
      if (sql.includes('insert into public.app_thesis_purchases')) {
        state.thesis = { mode: params[2], chapters: params[3] };
        return { rows: [] };
      }
      if (sql.includes("set mode = 'chapitre'")) { state.thesis.mode = 'chapitre'; return { rows: [] }; }
      if (sql.includes('array_remove')) {
        state.thesis.chapters = state.thesis.chapters.filter((c) => c !== params[2]);
        return { rows: [] };
      }
      if (sql.includes('select 1 from public.app_wallet_transactions')) {
        return { rows: state.tx.filter((t) => t.reference === params[1] && t.status === 'success') };
      }
      if (sql.includes('balance_coins = balance_coins - $1')) { state.balance -= params[0]; return { rows: [] }; }
      if (sql.includes('balance_coins = balance_coins + $1')) { state.balance += params[0]; return { rows: [] }; }
      if (sql.includes('insert into public.app_wallet_transactions')) {
        state.tx.push({ amount: params[1], reference: params[2], status: 'success' });
        return { rows: [] };
      }
      if (sql.includes("set status = 'failed'")) {
        const tx = state.tx.find((t) => t.reference === params[1] && t.status === 'success');
        if (!tx) return { rows: [] };
        tx.status = 'failed';
        return { rows: [{ amount_coins: tx.amount }] };
      }
      throw new Error(`requête inattendue : ${sql}`);
    },
  };
};

const thesis = (extra) => ({ type: 'THESIS', step: 'chapter', generationId: 'gen-12345', ...extra });

test('plan gratuit, rapport à 2 000 F une seule fois', async () => {
  const db = fakeDb();
  assert.deepEqual(await chargeWorkshopOn(db, 'u', { type: 'REPORT', step: 'plan', generationId: 'g1-plan' }, PRICES), {
    charged: 0,
    reference: null,
  });
  assert.equal((await chargeWorkshopOn(db, 'u', { type: 'REPORT', step: 'full', generationId: 'g1-full' }, PRICES)).charged, 2000);
  assert.equal((await chargeWorkshopOn(db, 'u', { type: 'REPORT', step: 'full', generationId: 'g1-full' }, PRICES)).charged, 0);
  assert.equal(db.state.balance, 8000);
});

test('mémoire par chapitre : 1 000 F, chapitre déjà payé gratuit', async () => {
  const db = fakeDb();
  assert.equal((await chargeWorkshopOn(db, 'u', thesis({ thesisMode: 'chapitre', chapterIndex: 1 }), PRICES)).charged, 1000);
  assert.equal((await chargeWorkshopOn(db, 'u', thesis({ thesisMode: 'chapitre', chapterIndex: 1 }), PRICES)).charged, 0);
  assert.equal((await chargeWorkshopOn(db, 'u', thesis({ thesisMode: 'chapitre', chapterIndex: 2 }), PRICES)).charged, 1000);
  assert.deepEqual(db.state.thesis.chapters, [1, 2]);
});

test('mémoire au forfait : 4 000 F, puis tous les chapitres gratuits', async () => {
  const db = fakeDb();
  assert.equal((await chargeWorkshopOn(db, 'u', thesis({ thesisMode: 'forfait', chapterIndex: 1 }), PRICES)).charged, 4000);
  for (const chapterIndex of [2, 3, 4, 5]) {
    assert.equal((await chargeWorkshopOn(db, 'u', thesis({ thesisMode: 'chapitre', chapterIndex }), PRICES)).charged, 0);
  }
  assert.equal(db.state.balance, 6000);
});

test('solde insuffisant : rien n’est enregistré', async () => {
  const db = fakeDb(500);
  await assert.rejects(chargeWorkshopOn(db, 'u', thesis({ thesisMode: 'chapitre', chapterIndex: 1 }), PRICES), WorkshopFundsError);
  assert.equal(db.state.thesis, null);
  assert.equal(db.state.balance, 500);
});

test('échec IA : coins rendus et chapitre libéré', async () => {
  const db = fakeDb();
  const input = thesis({ thesisMode: 'chapitre', chapterIndex: 3 });
  const { reference } = await chargeWorkshopOn(db, 'u', input, PRICES);
  await refundWorkshopOn(db, 'u', input, reference);
  assert.equal(db.state.balance, 10000);
  assert.deepEqual(db.state.thesis.chapters, []);
  assert.equal((await chargeWorkshopOn(db, 'u', input, PRICES)).charged, 1000);
});
