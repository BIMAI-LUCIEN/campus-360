import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const rules = await loadTs('lib/payment-rules.ts');
const {
  PAYMENT_PACKS,
  verifySaspaySignature,
  decideWebhookCredit,
  isMockAllowed,
} = rules;

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const serverUp = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) }).then(
  () => true,
  () => false,
);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL}`;

test('verifySaspaySignature : validation HMAC-SHA256 directe (X-Webhook-Signature hex) et anti-rejeu 300s', () => {
  const secret = 'saspay_webhook_secret_key_12345';
  const nowSeconds = 1_760_000_000;
  const ts = String(nowSeconds - 10);
  const body = JSON.stringify({
    event: 'transaction.success',
    data: { id: 'c9a17e2c-4b1a-4f0e-9c3d-2a1b3c4d5e6f', status: 'SUCCESS', amount: '500.00', currency: 'XAF' },
  });

  const validDigest = crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');

  // Signature SasPay directe en minuscules
  assert.equal(verifySaspaySignature(body, validDigest, ts, secret, { nowSeconds }), true);
  // Rejet si secret erroné
  assert.equal(verifySaspaySignature(body, validDigest, ts, 'wrong_secret', { nowSeconds }), false);
  // Rejet si anti-rejeu > 300s
  assert.equal(verifySaspaySignature(body, validDigest, ts, secret, { nowSeconds: nowSeconds + 305 }), false);
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

  // Déjà crédité -> ignore-already-processed (rejeu idempotent)
  assert.equal(
    decideWebhookCredit({ status: 'success', amount_coins: 1000 }, { amount: 1000, success: true }),
    'ignore-already-processed',
  );
  // SasPay : une session FAILED reste payable, un succès ultérieur est crédité
  assert.equal(
    decideWebhookCredit({ status: 'failed', amount_coins: 1000 }, { amount: 1000, success: true }),
    'credit',
  );
  assert.equal(
    decideWebhookCredit({ status: 'failed', amount_coins: 1000 }, { amount: 1000, success: false, failed: true }),
    'ignore-already-processed',
  );
  // Événement non terminal (payment.updated PENDING / REFUNDED) -> aucun effet
  assert.equal(
    decideWebhookCredit({ status: 'pending', amount_coins: 1000 }, { amount: 1000, success: false, failed: false }),
    'ignore-already-processed',
  );
});

test('isMockAllowed : interdiction formelle en production et si clé SasPay configurée', () => {
  assert.equal(isMockAllowed({ NODE_ENV: 'production' }), false);
  assert.equal(isMockAllowed({ VERCEL_ENV: 'production' }), false);
  assert.equal(isMockAllowed({ NODE_ENV: 'development' }), true);
  assert.equal(isMockAllowed({ NODE_ENV: 'development', SASPAY_API_KEY: 'sk_live_123' }), false);
});

test('Enregistrement KO -> pas d’appel SasPay (atomicité et protection)', async () => {
  globalThis.campusDatabasePool = {
    query: async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
    },
  };

  const paymentsModule = await loadTsWithPackages('lib/payments.ts', [
    'lib/database.ts',
    'lib/db-ssl.ts',
    'lib/payment-rules.ts',
    'lib/cameroon-phone.ts',
    'lib/mobile-error.ts',
    'lib/automations.ts',
    'lib/mailer.ts',
    'lib/match-score.ts',
    'lib/push.ts',
  ]);

  let fetchCalled = false;
  const mockFetch = async () => {
    fetchCalled = true;
    return new Response(JSON.stringify({ id: 'cs_123' }), { status: 201 });
  };

  const failingPool = {
    query: async () => {
      throw new Error('Database insertion failed');
    },
  };

  const oldSaspayKey = process.env.SASPAY_API_KEY;
  process.env.SASPAY_API_KEY = 'sk_test_dummy';
  try {
    await assert.rejects(
      paymentsModule.initiateMobileMoneyPayment(
        {
          studentId: 'test-user-id',
          phone: '690123456',
          operator: 'orange',
          packType: 'recharge_500',
        },
        { pool: failingPool, fetch: mockFetch },
      ),
      /Database insertion failed/,
    );

    assert.equal(
      fetchCalled,
      false,
      'Fetch vers SasPay ne doit jamais être appelé si l’insertion DB a échoué',
    );
  } finally {
    process.env.SASPAY_API_KEY = oldSaspayKey;
  }
});

test(
  'HTTP : webhook sans signature renvoie 401 ou 503',
  { skip: NO_SERVER },
  async () => {
    const res = await fetch(`${BASE_URL}/api/mobile/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'payment.completed' }),
    });

    assert.ok(
      res.status === 401 || res.status === 503,
      `Attendu 401 ou 503 sans signature, reçu ${res.status}`,
    );
  },
);

const PAYMENT_DEPS = [
  'lib/database.ts',
  'lib/db-ssl.ts',
  'lib/payment-rules.ts',
  'lib/cameroon-phone.ts',
  'lib/mobile-error.ts',
  'lib/automations.ts',
  'lib/mailer.ts',
  'lib/match-score.ts',
  'lib/push.ts',
];

test('Initialisation : numéro étranger, Nexttel ou opérateur incohérent -> 400 sans écriture ni appel SasPay', async () => {
  const paymentsModule = await loadTsWithPackages('lib/payments.ts', PAYMENT_DEPS);
  let dbCalled = false;
  let fetchCalled = false;
  const pool = { query: async () => { dbCalled = true; return { rows: [] }; } };
  const fetch = async () => { fetchCalled = true; return new Response('{}', { status: 201 }); };

  const oldSaspayKey = process.env.SASPAY_API_KEY;
  process.env.SASPAY_API_KEY = 'sk_test_dummy';
  try {
    for (const [phone, operator, pattern] of [
      ['+33612345678', 'mtn', /camerounais/],
      ['661234567', 'mtn', /ni MTN ni Orange/],
      ['699123456', 'mtn', /numéro Orange Money/],
      ['677123456', 'orange', /numéro MTN MoMo/],
    ]) {
      await assert.rejects(
        paymentsModule.initiateMobileMoneyPayment(
          { studentId: 'u1', phone, operator, packType: 'recharge_500' },
          { pool, fetch },
        ),
        (error) => error.status === 400 && pattern.test(error.message),
        phone,
      );
    }
    assert.equal(dbCalled, false);
    assert.equal(fetchCalled, false);
  } finally {
    process.env.SASPAY_API_KEY = oldSaspayKey;
  }
});

test('Initialisation SasPay : envoie un softpay MTN (push), met à jour reference_id sans paymentUrl', async () => {
  const queries = [];
  const fakePool = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      return { rowCount: 1, rows: [] };
    },
  };

  const fetchCalls = [];
  const mockFetch = async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    if (String(url).endsWith('/payments/softpay/')) {
      return new Response(
        JSON.stringify({
          message: 'Payment pushed successfully',
          id: 'pay_9c3f2a10',
          status: 'PENDING',
          checkout_url: '',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const paymentsModule = await loadTsWithPackages('lib/payments.ts', [
    'lib/database.ts',
    'lib/db-ssl.ts',
    'lib/payment-rules.ts',
    'lib/cameroon-phone.ts',
    'lib/mobile-error.ts',
    'lib/automations.ts',
    'lib/mailer.ts',
    'lib/match-score.ts',
    'lib/push.ts',
  ]);

  const oldSaspayKey = process.env.SASPAY_API_KEY;
  process.env.SASPAY_API_KEY = 'sk_test_mock_12345';
  try {
    const res = await paymentsModule.initiateMobileMoneyPayment(
      {
        studentId: 'test-user-id',
        phone: '670123456',
        operator: 'mtn',
        packType: 'recharge_500',
      },
      { pool: fakePool, fetch: mockFetch },
    );

    assert.equal(res.reference, 'pay_9c3f2a10');
    assert.equal(res.paymentUrl, undefined);
    assert.equal(res.directDebitPrompt, true);
    assert.equal(res.status, 'pending');
    assert.equal(res.mock, false);
    assert.equal(res.testMode, true, 'sk_test_ -> testMode true');
    const sentBody = JSON.parse(fetchCalls[0].init.body);
    assert.equal(sentBody.customer.phone, '+237670123456');
    assert.equal(sentBody.currency, 'XAF');
    assert.equal(sentBody.amount, '500.00');
    assert.equal(sentBody.country, 'CM');
    assert.equal(sentBody.network, 'mtn_cm');
    assert.equal(sentBody.metadata.operator, 'mtn');
    assert.equal(queries.length, 2, '1 insert pending + 1 update reference_id');
    assert.match(queries[0].sql, /insert into public\.app_wallet_transactions/i);
    assert.match(queries[1].sql, /update public\.app_wallet_transactions set reference_id/i);
    assert.equal(queries[1].params[0], 'pay_9c3f2a10');
    assert.equal(fetchCalls.length, 1, '1 POST /payments/softpay/');
    assert.match(fetchCalls[0].url, /\/payments\/softpay\/$/);
  } finally {
    process.env.SASPAY_API_KEY = oldSaspayKey;
  }
});

const runSignedWebhook = async (txStatus, payloadObject) => {
  const queries = [];
  const fakeClient = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.includes('select id, user_id')) {
        return {
          rows: [
            { id: 'tx-1', user_id: 'user-1', type: 'topup', pack_type: 'recharge_500', amount_coins: 500, status: txStatus },
          ],
        };
      }
      return { rowCount: 1, rows: [] };
    },
    release: () => {},
  };
  globalThis.campusDatabasePool = {
    connect: async () => fakeClient,
    query: async (sql, params) => fakeClient.query(sql, params),
    on: () => {},
  };
  const paymentsModule = await loadTsWithPackages('lib/payments.ts', PAYMENT_DEPS);
  const secret = 'whsec_test_saspay';
  const oldSecret = process.env.SASPAY_WEBHOOK_SECRET;
  process.env.SASPAY_WEBHOOK_SECRET = secret;
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const payload = JSON.stringify(payloadObject);
    const signature = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
    const result = await paymentsModule.processSaspayWebhook(
      payload,
      new Headers({ 'x-webhook-signature': signature, 'x-webhook-timestamp': ts }),
    );
    return { result, queries };
  } finally {
    process.env.SASPAY_WEBHOOK_SECRET = oldSecret;
  }
};

test('Webhook payment.updated (retour PENDING) : ne marque pas la transaction en échec', async () => {
  const { result, queries } = await runSignedWebhook('pending', {
    event: 'payment.updated',
    livemode: false,
    data: { id: 'cm_pending', status: 'PENDING', amount: 500 },
  });
  assert.equal(result.status, 200);
  assert.equal(queries.some((q) => /set status =/.test(q.sql)), false);
});

test('Webhook payment.completed après un échec (nouvel essai sur la même session) : crédite le wallet', async () => {
  const { result, queries } = await runSignedWebhook('failed', {
    event: 'payment.completed',
    livemode: false,
    data: { id: 'cm_retry', status: 'SUCCESS', amount: 500 },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.ok(queries.find((q) => q.sql.includes("status = 'success'")));
  assert.ok(queries.find((q) => q.sql.includes('app_wallets')));
});

test('Softpay accepté mais FAILED (réponse enveloppée dans data) : 402 avec le motif, transaction en échec', async () => {
  const queries = [];
  const pool = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      return { rowCount: 1, rows: [] };
    },
  };
  const fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: { id: 'pay_failed_1', status: 'FAILED', failure_message: 'Solde insuffisant' },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  const paymentsModule = await loadTsWithPackages('lib/payments.ts', PAYMENT_DEPS);
  const oldSaspayKey = process.env.SASPAY_API_KEY;
  process.env.SASPAY_API_KEY = 'sk_test_dummy';
  try {
    await assert.rejects(
      paymentsModule.initiateMobileMoneyPayment(
        { studentId: 'u1', phone: '670123456', operator: 'mtn', packType: 'recharge_1000' },
        { pool, fetch },
      ),
      (error) => error.status === 402 && /Solde insuffisant/.test(error.message),
    );
    const failedUpdate = queries.find((q) => /set status = 'failed', failure_message/.test(q.sql));
    assert.ok(failedUpdate, 'transaction marquée failed avec motif');
    assert.equal(failedUpdate.params[1], 'Solde insuffisant');
  } finally {
    process.env.SASPAY_API_KEY = oldSaspayKey;
  }
});
