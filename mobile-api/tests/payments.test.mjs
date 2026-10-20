import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const rules = await loadTs('lib/payment-rules.ts');
const { PAYMENT_PACKS, verifyNotchSignature, decideWebhookCredit, isMockAllowed } = rules;

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const serverUp = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) }).then(
  () => true,
  () => false,
);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL}`;

test('verifyNotchSignature : validation stricte HMAC-SHA256 timing-safe', () => {
  const secret = 'super_webhook_secret_key_12345';
  const body = JSON.stringify({ event: 'payment.complete', reference: 'c360_test_ref', amount: 1000 });

  const validSig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyNotchSignature(body, validSig, secret), true);

  // Signature absente ou vide
  assert.equal(verifyNotchSignature(body, null, secret), false);
  assert.equal(verifyNotchSignature(body, undefined, secret), false);
  assert.equal(verifyNotchSignature(body, '', secret), false);

  // Signature modifiée d'un seul caractère
  const tamperedSig = validSig.slice(0, -1) + (validSig.endsWith('a') ? 'b' : 'a');
  assert.equal(verifyNotchSignature(body, tamperedSig, secret), false);

  // Secret ou corps différent
  assert.equal(verifyNotchSignature(body, validSig, 'wrong_secret'), false);
  assert.equal(verifyNotchSignature(body + ' ', validSig, secret), false);
});

test('decideWebhookCredit : règles strictes de crédit, rejeu et rejet de montant', () => {
  // Cas normal : pending et montant identique -> credit
  assert.equal(
    decideWebhookCredit({ status: 'pending', amount_coins: 1000 }, { amount: 1000, success: true }),
    'credit',
  );

  // Montant différent -> reject-amount
  assert.equal(
    decideWebhookCredit({ status: 'pending', amount_coins: 1000 }, { amount: 500, success: true }),
    'reject-amount',
  );

  // Montant manquant (null ou undefined) -> reject-amount
  assert.equal(
    decideWebhookCredit({ status: 'pending', amount_coins: 1000 }, { amount: null, success: true }),
    'reject-amount',
  );
  assert.equal(
    decideWebhookCredit({ status: 'pending', amount_coins: 1000 }, { amount: undefined, success: true }),
    'reject-amount',
  );

  // Échec opérateur -> mark-failed
  assert.equal(
    decideWebhookCredit({ status: 'pending', amount_coins: 1000 }, { amount: 1000, success: false }),
    'mark-failed',
  );

  // Déjà traité (success ou failed) -> ignore-already-processed (rejeu idempotent)
  assert.equal(
    decideWebhookCredit({ status: 'success', amount_coins: 1000 }, { amount: 1000, success: true }),
    'ignore-already-processed',
  );
  assert.equal(
    decideWebhookCredit({ status: 'failed', amount_coins: 1000 }, { amount: 1000, success: true }),
    'ignore-already-processed',
  );
});

test('isMockAllowed : interdiction formelle en production et si clé live configurée', () => {
  assert.equal(isMockAllowed({ NODE_ENV: 'production' }), false);
  assert.equal(isMockAllowed({ VERCEL_ENV: 'production' }), false);
  assert.equal(isMockAllowed({ NODE_ENV: 'development' }), true);
  assert.equal(isMockAllowed({ NODE_ENV: 'development', NOTCHPAY_PRIVATE_KEY: 'live_key_xyz' }), false);
});

test('Enregistrement KO -> pas d’appel Notch (atomicité et protection)', async () => {
  globalThis.campusDatabasePool = {
    query: async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
    },
  };

  const paymentsModule = await loadTsWithPackages('lib/payments.ts', [
    'lib/database.ts',
    'lib/db-ssl.ts',
    'lib/payment-rules.ts',
    'lib/mobile-error.ts',
    'lib/automations.ts',
    'lib/mailer.ts',
    'lib/match-score.ts',
    'lib/push.ts',
  ]);

  let fetchCalled = false;
  const mockFetch = async () => {
    fetchCalled = true;
    return new Response(JSON.stringify({ status: 'accepted' }), { status: 200 });
  };

  const failingPool = {
    query: async () => {
      throw new Error('Database insertion failed');
    },
  };

  // Sauvegarder la clé d'environnement temporairement
  const oldKey = process.env.NOTCHPAY_PRIVATE_KEY;
  process.env.NOTCHPAY_PRIVATE_KEY = 'test_key';
  try {
    await assert.rejects(
      paymentsModule.initiateMobileMoneyPayment(
        {
          studentId: 'test-user-id',
          phone: '690123456',
          operator: 'mtn',
          packType: 'recharge_500',
        },
        { pool: failingPool, fetch: mockFetch },
      ),
      /Database insertion failed/,
    );

    assert.equal(fetchCalled, false, 'Fetch vers Notch Pay ne doit jamais être appelé si l’insertion DB a échoué');
  } finally {
    process.env.NOTCHPAY_PRIVATE_KEY = oldKey;
  }
});

test(
  'HTTP : webhook sans signature renvoie 401 ou 503',
  { skip: NO_SERVER },
  async () => {
    const res = await fetch(`${BASE_URL}/api/mobile/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'payment.complete' }),
    });

    assert.ok(
      res.status === 401 || res.status === 503,
      `Attendu 401 ou 503 sans signature, reçu ${res.status}`,
    );
  },
);
