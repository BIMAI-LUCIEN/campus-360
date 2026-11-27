import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';

const jobId = '55e78523-a25b-473d-8aa4-234e7a30b8f6';
const source = fs.readFileSync('app/api/mobile/stages/jury/route.ts', 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });

const fixture = ({ user = true, paid = true, balance = 200, modelFails = false } = {}) => {
  const state = { first: false, second: false, balance, modelCalls: 0 };
  class MobileApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }
  const dependencies = {
    zod: { z },
    'next/server': { NextResponse: Response },
    '@/lib/ai-quota': { enforceAiQuota: async () => {} },
    '@/lib/cv-ats': { evaluateAts: () => ({}), applyEliminatingCriteria: (ats) => ats },
    '@/lib/cv-jury': { buildCvJuryMessages: () => [], parseCvJury: (raw) => raw ? {} : null },
    '@/lib/cv-review': { juryPotential: () => null, juryScore: () => 3 },
    '@/lib/cv-schema': { cvToText: () => 'CV', officialCvSchema: z.object({}) },
    '@/lib/llm': {
      CV_MODELS: ['model'],
      isLlmConfigured: () => true,
      callLlm: async () => { state.modelCalls += 1; return modelFails ? null : '{}'; },
    },
    '@/lib/mobile-access': {
      requireMobileUser: async () => user ? { user: { id: 'student' } } : { response: new Response(null, { status: 401 }) },
      withCors: (response) => response,
      mobileErrorResponse: (error) => Response.json({ error: error.message }, { status: error.status ?? 500 }),
      MobileApiError,
    },
    '@/lib/stages-db': { getStageJob: async () => ({ id: jobId, title: 'Assistant', requirements: [] }) },
    '@/lib/stage-charge': {
      hasPaidStageApplication: async () => paid,
      chargeStageJury: async (_user, _job, second, settle) => {
        const pass = second ? 'second' : 'first';
        const charged = second ? 0 : 200;
        if (state[pass]) throw new MobileApiError('Limite', 429);
        if (state.balance < charged) throw new MobileApiError('Solde insuffisant', 409);
        if (settle) {
          state[pass] = true;
          state.balance -= charged;
        }
        return { charged, balance: state.balance };
      },
    },
  };
  const exports = {};
  runInNewContext(outputText, { exports, require: (name) => dependencies[name] });
  const post = (second = false) => exports.POST(new Request('http://localhost/api/mobile/stages/jury', {
    method: 'POST', body: JSON.stringify({ jobId, cv: {}, second }),
  }));
  return { state, post };
};

test('jury : préconditions vérifiées avant le modèle', async () => {
  for (const [options, status] of [[{ user: false }, 401], [{ paid: false }, 402], [{ balance: 199 }, 409]]) {
    const { state, post } = fixture(options);
    assert.equal((await post()).status, status);
    assert.equal(state.modelCalls, 0);
  }
});

test('jury : une facture de 200 coins, second passage inclus et plafond', async () => {
  const { state, post } = fixture();
  const first = await post();
  assert.equal(first.status, 200);
  assert.equal((await first.json()).payment.charged, 200);
  const second = await post(true);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).payment.charged, 0);
  assert.equal((await post(true)).status, 429);
  assert.equal(state.balance, 0);
  assert.equal(state.modelCalls, 2);
});

test('jury : aucun débit ni passage consommé sur réponse IA inutilisable', async () => {
  const { state, post } = fixture({ modelFails: true });
  assert.equal((await post()).status, 502);
  assert.equal(state.balance, 200);
  assert.equal(state.first, false);
});
