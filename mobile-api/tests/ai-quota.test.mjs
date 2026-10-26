import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const rules = await loadTs('lib/ai-quota-rules.ts');
const { readDailyLimit, AI_ROUTE_LIMITS, DAILY_LIMIT_MESSAGE, reserveDailyAiCall } = rules;

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const serverUp = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) }).then(
  () => true,
  () => false,
);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL}`;

test('readDailyLimit : 60 par défaut, validation stricte d’entier', () => {
  assert.equal(readDailyLimit({}), 60);
  assert.equal(readDailyLimit({ AI_DAILY_LIMIT: '' }), 60);
  assert.equal(readDailyLimit({ AI_DAILY_LIMIT: '100' }), 100);
  assert.equal(readDailyLimit({ AI_DAILY_LIMIT: '  50  ' }), 50);

  // Valeurs interdites
  assert.throws(() => readDailyLimit({ AI_DAILY_LIMIT: '0' }), /AI_DAILY_LIMIT/);
  assert.throws(() => readDailyLimit({ AI_DAILY_LIMIT: '-5' }), /AI_DAILY_LIMIT/);
  assert.throws(() => readDailyLimit({ AI_DAILY_LIMIT: '1001' }), /AI_DAILY_LIMIT/);
  assert.throws(() => readDailyLimit({ AI_DAILY_LIMIT: 'abc' }), /AI_DAILY_LIMIT/);
  assert.throws(() => readDailyLimit({ AI_DAILY_LIMIT: '12.5' }), /AI_DAILY_LIMIT/);
});

test('reserveDailyAiCall : réservation atomique avec contrôle de plafond 24h', async () => {
  const mockPoolFull = {
    query: async () => ({ rows: [] }),
  };
  const resultFull = await reserveDailyAiCall(mockPoolFull, 'user-full-id', 60);
  assert.equal(resultFull, false, 'Doit renvoyer false quand la limite est atteinte');

  const mockPoolAllowed = {
    query: async (sql, params) => {
      assert.ok(sql.includes('app_ia_usage_logs'));
      assert.equal(params[0], 'user-ok-id');
      assert.equal(params[1], 60);
      return { rows: [{ id: 'new-log-uuid' }] };
    },
  };
  const resultAllowed = await reserveDailyAiCall(mockPoolAllowed, 'user-ok-id', 60);
  assert.equal(resultAllowed, true, 'Doit renvoyer true quand le quota permet la réservation');
});

test('Garde de source : présence de enforceAiQuota sur chacune des 10 routes IA', () => {
  const routes = [
    'app/api/mobile/documents/generate/route.ts',
    'app/api/mobile/documents/generate-full/route.ts',
    'app/api/mobile/documents/onboard-chat/route.ts',
    'app/api/mobile/documents/defense-coach/route.ts',
    'app/api/mobile/documents/ai/diagram/route.ts',
    'app/api/mobile/documents/ai/route.ts',
    'app/api/mobile/documents/[id]/chat/route.ts',
    'app/api/mobile/documents/[id]/sections/[sectionId]/interview/route.ts',
    'app/api/ai/pdf-chat/route.ts',
    'app/api/mobile/stages/cv/route.ts',
  ];

  for (const rel of routes) {
    const full = path.resolve(rel);
    assert.ok(fs.existsSync(full), `Fichier de route introuvable : ${rel}`);
    const content = fs.readFileSync(full, 'utf8');
    assert.ok(
      content.includes('enforceAiQuota('),
      `La route ${rel} doit appeler enforceAiQuota`,
    );
  }
});

test('Garde de source : suppression absolue de GEMINI_API_KEY et de ia_credits = 10', () => {
  const defenseCoach = fs.readFileSync(path.resolve('app/api/mobile/documents/defense-coach/route.ts'), 'utf8');
  assert.ok(!defenseCoach.includes('GEMINI_API_KEY'), 'defense-coach ne doit pas contenir GEMINI_API_KEY');

  const aiEditor = fs.readFileSync(path.resolve('app/api/mobile/documents/ai/route.ts'), 'utf8');
  assert.ok(!aiEditor.includes('ia_credits = 10'), 'documents/ai ne doit plus contenir de recharge courtesy à 10');
});

test(
  'HTTP : diagram route protégée par quota',
  { skip: NO_SERVER },
  async () => {
    const res = await fetch(`${BASE_URL}/api/mobile/documents/ai/diagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'architecture' }),
    });
    // Non authentifié -> doit renvoyer 401
    assert.equal(res.status, 401);
  },
);
