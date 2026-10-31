import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { resolvePurchasePrice, isFreeAccess } = await loadTs('lib/purchase-price.ts');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const serverUp = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) }).then(
  () => true,
  () => false,
);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL}`;

test('resolvePurchasePrice : gratuit si alwaysFree ou freeLaunch, sinon prix standard', () => {
  // Document alwaysFree -> 0 coin même hors lancement gratuit
  assert.equal(
    resolvePurchasePrice({ alwaysFree: true, priceCoins: 300, freeLaunch: false }),
    0,
    'Un document always_free doit coûter 0 coin',
  );

  // Document payant hors lancement gratuit -> plein tarif
  assert.equal(
    resolvePurchasePrice({ alwaysFree: false, priceCoins: 300, freeLaunch: false }),
    300,
    'Un document standard doit coûter son prix hors gratuité',
  );

  // Document payant pendant le lancement gratuit -> 0 coin
  assert.equal(
    resolvePurchasePrice({ alwaysFree: false, priceCoins: 300, freeLaunch: true }),
    0,
    'Tout document doit coûter 0 coin pendant le lancement gratuit',
  );

  // Prix négatif ou nul
  assert.equal(
    resolvePurchasePrice({ alwaysFree: false, priceCoins: -50, freeLaunch: false }),
    0,
    'Un prix négatif doit être ramené à 0',
  );
});

test('isFreeAccess : vérifie l’accès direct sans débit', () => {
  assert.equal(isFreeAccess({ always_free: true, price_coins: 300 }), true);
  assert.equal(isFreeAccess({ always_free: false, price_coins: '0' }), true);
  assert.equal(isFreeAccess({ always_free: false, price_coins: 0 }), true);
  assert.equal(isFreeAccess({ always_free: false, price_coins: 300 }), false);
  assert.equal(isFreeAccess({ always_free: null, price_coins: 500 }), false);
});

test('Modèle v2 : achat de PDF retiré (410) et lecture gratuite', () => {
  for (const route of ['purchase/document', 'purchase/pack', 'ia-packs/purchase']) {
    const source = fs.readFileSync(path.resolve(`app/api/mobile/${route}/route.ts`), 'utf8');
    assert.match(source, /status: 410/, route);
  }
  for (const route of ['pdf/signed-url', 'pdf/stream']) {
    const source = fs.readFileSync(path.resolve(`app/api/mobile/${route}/route.ts`), 'utf8');
    assert.match(source, /canReadFullDocument = async \(_document: CatalogDocument, _user: MobileUser\) => true/, route);
    assert.match(source, /requireMobileUser\(/, route);
  }
});
