import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const m = await loadTs('lib/stage-pricing.ts');

test('offre rémunérée : 1 000 coins', () => {
  assert.equal(m.stageApplyPrice({ kind: 'stage', stipend: '50 000 FCFA/mois' }), 1000);
  assert.equal(m.stageApplyPrice({ kind: 'stage', stipend: 'Rémunéré' }), 1000);
  assert.equal(m.stageApplyPrice({ kind: 'emploi', stipend: null }), 1000);
});

test('offre non rémunérée ou non précisée : 500 coins', () => {
  for (const stipend of [null, '', 'Non rémunéré', 'non-rémunérée', 'Stage bénévole', 'Sans rémunération', 'Non précisée', '0 FCFA', 'Indemnité de stage', 'Unpaid']) {
    assert.equal(m.stageApplyPrice({ kind: 'stage', stipend }), 500, String(stipend));
  }
});

test('lancement gratuit actif : 0', () => {
  assert.equal(m.stageApplyPrice({ kind: 'emploi' }, true), 0);
});

test("l'app garde une copie identique des règles", () => {
  const server = fs.readFileSync(path.resolve('lib/stage-pricing.ts'), 'utf8');
  const app = fs.readFileSync(path.resolve('../src/features/stages/stagePricing.ts'), 'utf8');
  assert.equal(app, server);
});

test('candidatures : débit serveur dans apply et dispatch, remboursé si échec', () => {
  for (const route of ['app/api/mobile/stages/apply/route.ts', 'app/api/mobile/stages/dispatch/route.ts']) {
    const source = fs.readFileSync(path.resolve(route), 'utf8');
    assert.match(source, /chargeStageApplication\(/, route);
    assert.match(source, /refundStageApplication\(/, route);
  }
});

test('migrations : bonus de 5 000 coins et description intégrale', () => {
  const bonus = fs.readFileSync(path.resolve('sql/0017_launch_bonus_5000.sql'), 'utf8');
  assert.match(bonus, /launch-bonus-5000/);
  assert.match(bonus, /5000 - w\.balance_coins/);
  const desc = fs.readFileSync(path.resolve('sql/0018_stage_jobs_full_description.sql'), 'utf8');
  assert.match(desc, /<= 20000/);
});
