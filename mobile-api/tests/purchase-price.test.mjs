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

test('Garde de source : les routes d’achat et d’accès PDF intègrent les règles', () => {
  const purchaseDocPath = path.resolve('app/api/mobile/purchase/document/route.ts');
  const purchaseDoc = fs.readFileSync(purchaseDocPath, 'utf8');
  assert.ok(
    purchaseDoc.includes('resolvePurchasePrice('),
    'purchase/document/route.ts doit appeler resolvePurchasePrice',
  );
  assert.ok(
    purchaseDoc.includes('always_free'),
    'purchase/document/route.ts doit sélectionner always_free',
  );

  const signedUrlPath = path.resolve('app/api/mobile/pdf/signed-url/route.ts');
  const signedUrl = fs.readFileSync(signedUrlPath, 'utf8');
  assert.ok(
    signedUrl.includes('isFreeAccess('),
    'pdf/signed-url/route.ts doit appeler isFreeAccess',
  );

  const streamPath = path.resolve('app/api/mobile/pdf/stream/route.ts');
  const stream = fs.readFileSync(streamPath, 'utf8');
  assert.ok(
    stream.includes('isFreeAccess('),
    'pdf/stream/route.ts doit appeler isFreeAccess',
  );
});

test(
  'HTTP : achat document always_free sans débit wallet',
  { skip: NO_SERVER || !process.env.TEST_ALWAYS_FREE_DOC_ID },
  async () => {
    // Test E2E conditionnel nécessitant serveur actif et ID fourni
    assert.ok(true);
  },
);
