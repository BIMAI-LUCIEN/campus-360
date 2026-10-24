import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const rules = await loadTs('lib/payment-rules.ts');
const {
  PAYMENT_PACKS,
  verifyNyoleSignature,
  verifyNotchSignature,
  decideWebhookCredit,
  isMockAllowed,
} = rules;

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const serverUp = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) }).then(
  () => true,
  () => false,
);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL}`;

test('verifyNyoleSignature : validation HMAC-SHA256 sur t.rawBody et fenêtre anti-rejeu 300s', () => {
  const secret = 'af_test_sec_webhook_secret_key_12345';
  const nowSeconds = 1_760_000_000;
  const ts = String(nowSeconds - 10);
  const body = JSON.stringify({
    event: 'payment.completed',
    livemode: false,
    data: { id: 'cmvk0qbw900ixpotx0mk5i16l', status: 'SUCCESS', amount: 500, currency: 'XAF' },
  });

  const validDigest = crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
  const sigHeader = `t=${ts},v1=${validDigest}`;

  // Signature et timestamp valides
  assert.equal(verifyNyoleSignature(body, sigHeader, ts, secret, { nowSeconds }), true);
  // Sans en-tête timestamp séparé (extrait de t=)
  assert.equal(verifyNyoleSignature(body, sigHeader, null, secret, { nowSeconds }), true);

  // En-tête timestamp incohérent avec t=
  assert.equal(
    verifyNyoleSignature(body, sigHeader, String(nowSeconds - 20), secret, { nowSeconds }),
    false,
  );

  // Expiration anti-rejeu (> 300s)
  assert.equal(
    verifyNyoleSignature(body, sigHeader, ts, secret, { nowSeconds: nowSeconds + 305 }),
    false,
  );

  // Signature altérée
  const tamperedDigest = validDigest.slice(0, -1) + (validDigest.endsWith('a') ? 'b' : 'a');
  assert.equal(
    verifyNyoleSignature(body, `t=${ts},v1=${tamperedDigest}`, ts, secret, { nowSeconds }),
    false,
  );

  // Mauvais secret ou corps modifié
  assert.equal(verifyNyoleSignature(body, sigHeader, ts, 'wrong_secret', { nowSeconds }), false);
  assert.equal(verifyNyoleSignature(body + ' ', sigHeader, ts, secret, { nowSeconds }), false);
});

test('verifyNotchSignature : validation stricte HMAC-SHA256 timing-safe (rétro-compatibilité)', () => {
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

  // Déjà crédité -> ignore-already-processed (rejeu idempotent)
  assert.equal(
    decideWebhookCredit({ status: 'success', amount_coins: 1000 }, { amount: 1000, success: true }),
    'ignore-already-processed',
  );
  // Nyole : une session FAILED reste payable, un succès ultérieur est crédité
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

test('isMockAllowed : interdiction formelle en production et si clé Nyole ou Notch configurée', () => {
  assert.equal(isMockAllowed({ NODE_ENV: 'production' }), false);
  assert.equal(isMockAllowed({ VERCEL_ENV: 'production' }), false);
  assert.equal(isMockAllowed({ NODE_ENV: 'development' }), true);
  assert.equal(isMockAllowed({ NODE_ENV: 'development', NYOLE_SECRET_KEY: 'af_test_sec_xyz' }), false);
  assert.equal(isMockAllowed({ NODE_ENV: 'development', NOTCHPAY_PRIVATE_KEY: 'live_key_xyz' }), false);
});

test('Enregistrement KO -> pas d’appel Nyole (atomicité et protection)', async () => {
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

  const oldNyoleKey = process.env.NYOLE_SECRET_KEY;
  process.env.NYOLE_SECRET_KEY = 'af_test_sec_dummy';
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
      'Fetch vers Nyole ne doit jamais être appelé si l’insertion DB a échoué',
    );
  } finally {
    process.env.NYOLE_SECRET_KEY = oldNyoleKey;
  }
});

test('Initialisation Nyole : crée la session Checkout, met à jour reference_id et retourne paymentUrl', async () => {
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
    if (String(url).endsWith('/v1/checkout/sessions')) {
      return new Response(
        JSON.stringify({
          id: 'cmvk0qbw900ixpotx0mk5i16l',
          object: 'checkout.session',
          url: 'https://app.nyole.com/checkout/cmvk0qbw900ixpotx0mk5i16l',
          order_id: 'CS-TEST-001',
          amount: 500,
          currency: 'XAF',
          status: 'pending',
          livemode: false,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ sandbox: true }), { status: 200 });
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

  const oldNyoleKey = process.env.NYOLE_SECRET_KEY;
  process.env.NYOLE_SECRET_KEY = 'af_test_sec_dummy';
  try {
    const res = await paymentsModule.initiateMobileMoneyPayment(
      {
        studentId: 'student-123',
        studentEmail: 'student@campus360b.site',
        studentName: 'Étudiant Test',
        phone: '690123456',
        operator: 'orange',
        packType: 'recharge_500',
      },
      { pool: fakePool, fetch: mockFetch },
    );

    assert.equal(res.reference, 'cmvk0qbw900ixpotx0mk5i16l');
    assert.equal(res.paymentUrl, 'https://app.nyole.com/checkout/cmvk0qbw900ixpotx0mk5i16l');
    assert.equal(res.status, 'pending');
    assert.equal(res.mock, false);
    assert.equal(res.testMode, true, 'livemode: false -> session de test');
    const sentBody = JSON.parse(fetchCalls[0].init.body);
    assert.equal(sentBody.customer_phone, '+237690123456');
    assert.equal(sentBody.currency, 'XAF');
    assert.equal(sentBody.metadata.operator, 'orange');
    assert.equal(queries.length, 2, '1 insert pending + 1 update reference_id');
    assert.match(queries[0].sql, /insert into public\.app_wallet_transactions/i);
    assert.match(queries[1].sql, /update public\.app_wallet_transactions set reference_id/i);
    assert.equal(queries[1].params[0], 'cmvk0qbw900ixpotx0mk5i16l');
    assert.equal(fetchCalls.length, 1, '1 POST /v1/checkout/sessions (architecture Nyole Checkout)');
    assert.match(fetchCalls[0].url, /\/v1\/checkout\/sessions$/);
  } finally {
    process.env.NYOLE_SECRET_KEY = oldNyoleKey;
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

test('Traitement webhook payment.failed : vérifie signature Nyole, persiste failure_message et marque failed', async () => {
  const queries = [];
  const fakeClient = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.includes('select id, user_id')) {
        return {
          rows: [
            {
              id: 'tx-fail-123',
              user_id: 'user-456',
              type: 'topup',
              pack_type: 'recharge_500',
              amount_coins: 500,
              status: 'pending',
            },
          ],
        };
      }
      return { rowCount: 1, rows: [] };
    },
    release: () => {},
  };

  const fakePool = {
    connect: async () => fakeClient,
    query: async (sql, params) => fakeClient.query(sql, params),
    on: () => {},
  };

  globalThis.campusDatabasePool = fakePool;

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

  const secret = 'af_test_sec_nyole_secret_test';
  const oldSecret = process.env.NYOLE_SECRET_KEY;
  process.env.NYOLE_SECRET_KEY = secret;

  try {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const ts = String(nowSeconds);
    const payload = JSON.stringify({
      event: 'payment.failed',
      livemode: false,
      data: {
        id: 'cm_failed_session_123',
        status: 'FAILED',
        failure_message: 'Solde Mobile Money insuffisant',
      },
    });

    const signature = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
    const headers = new Headers({
      'x-afriflow-signature': `t=${ts},v1=${signature}`,
      'x-afriflow-timestamp': ts,
    });

    const result = await paymentsModule.processNyoleWebhook(payload, headers);

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.status, 'failed');
    assert.equal(result.body.failureMessage, 'Solde Mobile Money insuffisant');

    const updateQuery = queries.find((q) => q.sql.includes("status = 'failed'"));
    assert.ok(updateQuery, 'La requête de mise à jour en échec doit exister');
    assert.match(updateQuery.sql, /failure_message/i);
    assert.equal(updateQuery.params[1], 'Solde Mobile Money insuffisant');
  } finally {
    process.env.NYOLE_SECRET_KEY = oldSecret;
  }
});

test('Traitement webhook payment.completed : vérifie signature Nyole, crédite le wallet et est idempotent', async () => {
  const queries = [];
  const fakeClient = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.includes('select id, user_id')) {
        return {
          rows: [
            {
              id: 'tx-success-123',
              user_id: 'user-789',
              type: 'topup',
              pack_type: 'recharge_1000',
              amount_coins: 1000,
              status: 'pending',
            },
          ],
        };
      }
      return { rowCount: 1, rows: [] };
    },
    release: () => {},
  };

  const fakePool = {
    connect: async () => fakeClient,
    query: async (sql, params) => fakeClient.query(sql, params),
    on: () => {},
  };

  globalThis.campusDatabasePool = fakePool;

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

  const secret = 'af_test_sec_nyole_secret_test';
  const oldSecret = process.env.NYOLE_SECRET_KEY;
  process.env.NYOLE_SECRET_KEY = secret;

  try {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const ts = String(nowSeconds);
    const payload = JSON.stringify({
      event: 'payment.completed',
      livemode: false,
      data: {
        id: 'cm_success_session_456',
        status: 'SUCCESS',
        amount: 1000,
      },
    });

    const signature = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
    const headers = new Headers({
      'x-afriflow-signature': `t=${ts},v1=${signature}`,
      'x-afriflow-timestamp': ts,
    });

    const result = await paymentsModule.processNyoleWebhook(payload, headers);

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.success, true);
    assert.equal(result.body.amountCoins, 1000);

    const updateQuery = queries.find((q) => q.sql.includes("status = 'success'"));
    assert.ok(updateQuery, 'La transaction doit être marquée success');
    const creditQuery = queries.find((q) => q.sql.includes('app_wallets'));
    assert.ok(creditQuery, 'Le portefeuille app_wallets doit être crédité');
    assert.equal(creditQuery.params[0], 'user-789');
    assert.equal(creditQuery.params[1], 1000);
  } finally {
    process.env.NYOLE_SECRET_KEY = oldSecret;
  }
});

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

test('Initialisation : numéro étranger, Nexttel ou opérateur incohérent -> 400 sans écriture ni appel Nyole', async () => {
  const paymentsModule = await loadTsWithPackages('lib/payments.ts', PAYMENT_DEPS);
  let dbCalled = false;
  let fetchCalled = false;
  const pool = { query: async () => { dbCalled = true; return { rows: [] }; } };
  const fetch = async () => { fetchCalled = true; return new Response('{}', { status: 201 }); };

  const oldNyoleKey = process.env.NYOLE_SECRET_KEY;
  process.env.NYOLE_SECRET_KEY = 'af_test_sec_dummy';
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
    process.env.NYOLE_SECRET_KEY = oldNyoleKey;
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
  const secret = 'af_test_sec_nyole_secret_test';
  const oldSecret = process.env.NYOLE_SECRET_KEY;
  process.env.NYOLE_SECRET_KEY = secret;
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const payload = JSON.stringify(payloadObject);
    const signature = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
    const result = await paymentsModule.processNyoleWebhook(
      payload,
      new Headers({ 'x-afriflow-signature': `t=${ts},v1=${signature}`, 'x-afriflow-timestamp': ts }),
    );
    return { result, queries };
  } finally {
    process.env.NYOLE_SECRET_KEY = oldSecret;
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

test('Signature Nyole : un HMAC du corps seul (sans horodatage) est refusé', () => {
  const secret = 'af_test_sec_x';
  const body = '{"event":"payment.completed"}';
  const ts = String(Math.floor(Date.now() / 1000));
  const bodyOnly = crypto.createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyNyoleSignature(body, `t=${ts},v1=${bodyOnly}`, ts, secret), false);
});
