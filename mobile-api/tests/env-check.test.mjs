import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { missingProductionEnv, assertProductionEnv } = await loadTs('lib/env-check.ts');

const validProductionEnv = {
  NODE_ENV: 'production',
  BETTER_AUTH_SECRET: '0123456789abcdef0123456789abcdef', // 32 chars
  BETTER_AUTH_URL: 'https://api.campus360b.site',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/campus360',
  FREE_LAUNCH_MODE: 'true',
  FREE_LAUNCH_UNTIL: '2027-01-20T00:00:00.000Z',
  FILES_SIGNING_SECRET: 'super-signing-secret-key-123456',
  UPLOAD_ROOT: '/var/www/campus-360-uploads',
  OPENROUTER_API_KEY: 'sk-or-test-key-123',
  RESEND_API_KEY: 're_test_key_123',
  NOTCHPAY_PRIVATE_KEY: 'pk.test.key.123',
  NOTCHPAY_WEBHOOK_SECRET: 'whsec_test_123',
};

test('missingProductionEnv : environnement complet valide -> aucune variable manquante', () => {
  const missing = missingProductionEnv(validProductionEnv);
  assert.deepEqual(missing, []);
});

test('missingProductionEnv : validation stricte de FREE_LAUNCH_MODE et FREE_LAUNCH_UNTIL', () => {
  // Absent
  const missing1 = missingProductionEnv({ ...validProductionEnv, FREE_LAUNCH_MODE: undefined });
  assert.ok(missing1.includes('FREE_LAUNCH_MODE'));

  // Valeur non booléenne
  const missing2 = missingProductionEnv({ ...validProductionEnv, FREE_LAUNCH_MODE: 'oui' });
  assert.ok(missing2.includes('FREE_LAUNCH_MODE'));

  // Mode gratuit actif sans date de fin valide
  const missing3 = missingProductionEnv({
    ...validProductionEnv,
    FREE_LAUNCH_MODE: 'true',
    FREE_LAUNCH_UNTIL: 'date-invalide',
  });
  assert.ok(missing3.includes('FREE_LAUNCH_UNTIL'));

  // Mode gratuit désactivé sans date de fin -> OK
  const missing4 = missingProductionEnv({
    ...validProductionEnv,
    FREE_LAUNCH_MODE: 'false',
    FREE_LAUNCH_UNTIL: undefined,
  });
  assert.ok(!missing4.includes('FREE_LAUNCH_UNTIL'));
  assert.ok(!missing4.includes('FREE_LAUNCH_MODE'));
});

test('missingProductionEnv : UPLOAD_ROOT optionnel sur Vercel', () => {
  const missing = missingProductionEnv({
    ...validProductionEnv,
    UPLOAD_ROOT: undefined,
    VERCEL: '1',
  });
  assert.ok(!missing.includes('UPLOAD_ROOT'));

  const missingNoVercel = missingProductionEnv({
    ...validProductionEnv,
    UPLOAD_ROOT: undefined,
    VERCEL: undefined,
  });
  assert.ok(missingNoVercel.includes('UPLOAD_ROOT'));
});

test('missingProductionEnv : clés Notch optionnelles si PAYMENTS_ENABLED=false', () => {
  const missingDisabled = missingProductionEnv({
    ...validProductionEnv,
    PAYMENTS_ENABLED: 'false',
    NOTCHPAY_PRIVATE_KEY: undefined,
    NOTCHPAY_WEBHOOK_SECRET: undefined,
  });
  assert.ok(!missingDisabled.includes('NOTCHPAY_PRIVATE_KEY'));
  assert.ok(!missingDisabled.includes('NOTCHPAY_WEBHOOK_SECRET'));

  const missingEnabled = missingProductionEnv({
    ...validProductionEnv,
    PAYMENTS_ENABLED: 'true',
    NOTCHPAY_PRIVATE_KEY: undefined,
    NOTCHPAY_WEBHOOK_SECRET: undefined,
  });
  assert.ok(missingEnabled.includes('NOTCHPAY_PRIVATE_KEY'));
  assert.ok(missingEnabled.includes('NOTCHPAY_WEBHOOK_SECRET'));
});

test('missingProductionEnv : BETTER_AUTH_SECRET exige au moins 32 caractères', () => {
  const shortSecret = missingProductionEnv({
    ...validProductionEnv,
    BETTER_AUTH_SECRET: 'trop-court',
  });
  assert.ok(shortSecret.includes('BETTER_AUTH_SECRET'));
});

test('assertProductionEnv : lève en production sans fuiter de secrets, ignore en dev', () => {
  assert.throws(
    () => {
      assertProductionEnv({ NODE_ENV: 'production' });
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('BETTER_AUTH_SECRET'));
      assert.ok(err.message.includes('DATABASE_URL'));
      assert.ok(!err.message.includes('0123456789')); // Zéro secret fuité
      return true;
    },
  );

  // En développement, aucune erreur levée
  assert.doesNotThrow(() => {
    assertProductionEnv({ NODE_ENV: 'development' });
  });
});
