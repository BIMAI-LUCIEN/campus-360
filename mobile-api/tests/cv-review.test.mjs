import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const review = await loadTsWithPackages('lib/cv-review.ts', ['lib/stage-charge-core.ts']);
const read = (file) => fs.readFileSync(file, 'utf8');

// In-memory wallet: transactions and credits, like app_wallet_transactions / app_wallets.
const wallet = ({ credits = 4, txs = [] } = {}) => {
  const state = { credits, txs: [...txs] };
  const deps = {
    ownsCvGeneration: async (_u, ref) => state.txs.includes(ref) && ref.startsWith('cv-') && !ref.startsWith('cv-review'),
    freeReviewUsed: async (_u, ref) => state.txs.includes(`${review.FREE_REVIEW_PREFIX}${ref}`),
    alreadyCharged: async (_u, ref) => state.txs.includes(ref),
    credits: async () => state.credits,
  };
  return { state, deps };
};

const input = (patch = {}) => ({ userId: 'u1', generationId: 'jury-1', sourceGenerationId: 'cv-123', cost: 2, ...patch });

test('première relecture d’un CV généré : gratuite', async () => {
  const { deps } = wallet({ credits: 0, txs: ['cv-123'] });
  assert.equal(await review.decideReviewBilling(deps, input()), 'free');
});

test('deuxième relecture du même CV : payante', async () => {
  const { deps } = wallet({ txs: ['cv-123', `${review.FREE_REVIEW_PREFIX}cv-123`] });
  assert.equal(await review.decideReviewBilling(deps, input({ generationId: 'jury-2' })), 'paid');
});

test('identifiant de CV inventé : pas de gratuité', async () => {
  const { deps } = wallet({ txs: [] });
  assert.equal(await review.decideReviewBilling(deps, input({ sourceGenerationId: 'cv-invente' })), 'paid');
  const { deps: letter } = wallet({ txs: ['lettre-9'] });
  assert.equal(await review.decideReviewBilling(letter, input({ sourceGenerationId: 'lettre-9' })), 'paid');
});

test('sans crédits et sans gratuité : 402, avant tout appel IA', async () => {
  const { deps } = wallet({ credits: 1 });
  await assert.rejects(review.decideReviewBilling(deps, input({ sourceGenerationId: undefined })), (e) => e.status === 402);
});

test('même generationId rejoué : jamais débité deux fois', async () => {
  const { deps } = wallet({ credits: 0, txs: ['jury-1'] });
  assert.equal(await review.decideReviewBilling(deps, input()), 'replay');
});

test('score X/7 : juges retenus + ATS', () => {
  const jury = { juges: [{ verdict: 'RETENU' }, { verdict: 'RETENU' }, { verdict: 'REJETÉ' }, { verdict: 'REJETÉ' }, { verdict: 'REJETÉ' }, { verdict: 'RETENU' }] };
  assert.equal(review.juryScore({ verdict: 'PASSE LE FILTRE' }, jury), 4);
  assert.equal(review.juryScore({ verdict: 'FILTRÉ' }, jury), 3);
});

test('garde de source : session avant tout, corps strict, facturation avant l’IA, débit après', () => {
  const route = read('app/api/mobile/documents/cv-review/route.ts');
  const at = (s) => route.indexOf(s);
  assert.ok(at('requireMobileUser(request)') < at('requestSchema.safeParse'), 'session vérifiée avant de lire le corps');
  assert.match(route, /\.strict\(\)/);
  assert.match(route, /status: 400|MobileApiError\('Données du CV invalides\.', 400\)/);
  assert.ok(at('decideReviewBilling') < at('callLlm('), '402 avant l’appel IA');
  assert.ok(at('parseCvJury') < at('settleReview'), 'débit seulement après une réponse valide');
  assert.match(route, /enforceAiQuota\(request, \{ userId, route: 'cv-review' \}\)/);
  const lib = read('lib/cv-review.ts');
  assert.match(lib, /pg_advisory_xact_lock/);
  assert.match(lib, /reference_id like 'cv-%' and reference_id not like 'cv-review%'/);
});

test('36.6 : « jusqu’à Z/7 » compte les juges dont le potentiel atteint 7, et les 3 questions qui rapportent le plus', () => {
  const juges = ['recruteur', 'manager', 'concurrent', 'patron', 'expert', 'sceptique']
    .map((id, i) => ({ id, note: 5, potentiel: i < 3 ? 7 : 5, verdict: 'REJETÉ', raisons: [] }));
  const questionsDetail = [{ question: 'a', juges: [], gain: 6 }, { question: 'b', juges: [], gain: 2 }, { question: 'c', juges: [], gain: 0 }, { question: 'd', juges: [], gain: 1 }];
  const pot = review.juryPotential({ verdict: 'PASSE LE FILTRE' }, { juges, questionsDetail });
  assert.equal(pot.score, 4);
  assert.deepEqual(pot.questions, [1, 2, 4]);
  assert.equal(review.juryPotential({ verdict: 'FILTRÉ' }, { juges, questionsDetail: [] }).score, 3);
  assert.match(read('app/api/mobile/documents/cv-review/route.ts'), /potentiel: juryPotential\(ats, jury\)/);
});

test('36.9 : une candidature payée (stage-apply) donne droit à une relecture gratuite de son CV ; non payée, non', async () => {
  const paid = new Set(['credit:u1:stage-apply:job-9']);
  const query = async (sql, params) => {
    const [userId, ref] = params;
    if (/app_credit_usages/.test(sql)) return { rows: paid.has(`credit:${userId}:${ref}`) ? [{ x: 1 }] : [] };
    if (/type = 'purchase'/.test(sql)) return { rows: [] };
    return { rows: [] };
  };
  const deps = review.sqlReviewBillingDeps(query);
  assert.equal(await deps.ownsCvGeneration('u1', 'stage-apply:job-9'), true);
  assert.equal(await deps.ownsCvGeneration('u1', 'stage-apply:job-10'), false);
  assert.equal(await deps.ownsCvGeneration('u2', 'stage-apply:job-9'), false);
});
