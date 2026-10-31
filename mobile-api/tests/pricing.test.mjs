import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const p = await loadTs('lib/pricing.ts');
const { CONTRIBUTION_REWARD_COINS } = await loadTs('lib/contribution-publish.ts');

test('grille v2 : packs et pass (contexte.md §19)', () => {
  const byCode = Object.fromEntries(p.OFFERS.map((offer) => [offer.code, offer]));
  assert.deepEqual([byCode.STARTER.priceCoins, byCode.STARTER.credits, byCode.STARTER.passHours], [1000, 5, 0]);
  assert.deepEqual([byCode.RECHERCHE_ACTIVE.priceCoins, byCode.RECHERCHE_ACTIVE.credits, byCode.RECHERCHE_ACTIVE.passHours], [2000, 12, 24]);
  assert.deepEqual([byCode.PASS_24H.priceCoins, byCode.PASS_24H.passHours], [200, 24]);
  assert.deepEqual([byCode.PASS_7J.priceCoins, byCode.PASS_7J.passHours], [1000, 168]);
  assert.equal(p.findOffer('INCONNU'), undefined);
  assert.equal(p.CREDIT_VALIDITY_DAYS, 30);
});

test('grille v2 : rédaction, IA et coins gratuits', () => {
  assert.equal(p.REPORT_PRICE, 2000);
  assert.equal(p.THESIS_FLAT_PRICE, 4000);
  assert.equal(p.THESIS_CHAPTER_PRICE, 1000);
  assert.equal(p.EXTERNAL_CV_PRICE, 300);
  assert.equal(p.FREE_AI_ACTIONS_PER_DAY, 3);
  assert.equal(p.QUESTIONS_PER_ACTION, 5);
  assert.equal(p.LAUNCH_SIGNUP_BONUS, 1000);
  assert.equal(p.SIGNUP_BONUS, 300);
});

test('récompense de contribution alignée sur la grille', () => {
  assert.equal(CONTRIBUTION_REWARD_COINS, p.CONTRIBUTION_REWARD);
  assert.equal(CONTRIBUTION_REWARD_COINS, 50);
});
