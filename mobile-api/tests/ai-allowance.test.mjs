import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { consumeAllowanceOn, allowanceDay } = await loadTs('lib/ai-allowance-core.ts');

const fakeDb = ({ pass = false } = {}) => {
  const rows = new Map();
  return {
    rows,
    query: async (sql, params = []) => {
      if (sql.includes('from public.app_revision_passes')) return { rows: pass ? [{}] : [] };
      const key = `${params[0]}|${params[1]}`;
      if (sql.includes('insert into public.app_ai_free_actions')) {
        if (!rows.has(key)) rows.set(key, { actions: 0, questions: 0 });
        return { rows: [] };
      }
      if (sql.startsWith('select actions, questions')) return { rows: [rows.get(key)] };
      if (sql.startsWith('update public.app_ai_free_actions')) {
        rows.set(key, { actions: params[2], questions: params[3] });
        return { rows: [] };
      }
      throw new Error(`requête inattendue : ${sql}`);
    },
  };
};

const now = new Date('2026-11-01T10:00:00Z');

test('3 actions gratuites par jour, puis refus', async () => {
  const db = fakeDb();
  for (const kind of ['summary', 'quiz', 'sheet']) {
    assert.equal((await consumeAllowanceOn(db, 'u', kind, now)).allowed, true, kind);
  }
  const fourth = await consumeAllowanceOn(db, 'u', 'summary', now);
  assert.deepEqual(fourth, { allowed: false, pass: false, remaining: 0 });
});

test('une conversation de 5 questions compte 1 action', async () => {
  const db = fakeDb();
  for (let i = 0; i < 5; i += 1) await consumeAllowanceOn(db, 'u', 'question', now);
  assert.deepEqual(db.rows.get(`u|${allowanceDay(now)}`), { actions: 1, questions: 5 });
  const sixth = await consumeAllowanceOn(db, 'u', 'question', now);
  assert.equal(sixth.remaining, 1);
});

test('après 3 actions, une question en cours de bloc passe encore', async () => {
  const db = fakeDb();
  await consumeAllowanceOn(db, 'u', 'summary', now);
  await consumeAllowanceOn(db, 'u', 'quiz', now);
  await consumeAllowanceOn(db, 'u', 'question', now); // 3e action, bloc ouvert
  assert.equal((await consumeAllowanceOn(db, 'u', 'question', now)).allowed, true);
  assert.equal((await consumeAllowanceOn(db, 'u', 'summary', now)).allowed, false);
});

test('Pass actif : aucune limite, rien n’est compté', async () => {
  const db = fakeDb({ pass: true });
  for (let i = 0; i < 10; i += 1) assert.equal((await consumeAllowanceOn(db, 'u', 'quiz', now)).allowed, true);
  assert.equal(db.rows.size, 0);
});

test('les actions reviennent à minuit, heure du Cameroun', () => {
  assert.equal(allowanceDay(new Date('2026-11-01T22:59:00Z')), '2026-11-01');
  assert.equal(allowanceDay(new Date('2026-11-01T23:01:00Z')), '2026-11-02');
});

test('pdf-chat : quota journalier puis actions gratuites, 402 au-delà', () => {
  const route = fs.readFileSync(path.resolve('app/api/ai/pdf-chat/route.ts'), 'utf8');
  assert.ok(route.indexOf('enforceAiQuota(') < route.indexOf('consumeAiAllowance('));
  const lib = fs.readFileSync(path.resolve('lib/ai-allowance.ts'), 'utf8');
  assert.match(lib, /, 402\)/);
});
