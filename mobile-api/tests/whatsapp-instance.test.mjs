import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const targetModule = await loadTs('lib/whatsapp-target.ts');
const { resolveWhatsAppTarget, isOwnInstance, normalizeTargetPhone } = targetModule;

test('whatsapp-target : résolution de cible avec numéro camerounais 9 chiffres', () => {
  const result = resolveWhatsAppTarget({ whatsappPhone: '690000000' });
  assert.deepEqual(result, {
    phone: '237690000000',
    instanceName: 'student-237690000000',
  });
});

test('whatsapp-target : résolution avec indicatif international et formatage libre', () => {
  const resPhone = resolveWhatsAppTarget({ phone: '+237 690 12 34 56' });
  assert.deepEqual(resPhone, {
    phone: '237690123456',
    instanceName: 'student-237690123456',
  });

  const res00 = resolveWhatsAppTarget({ whatsappPhone: '00237 690 12 34 56' });
  assert.deepEqual(res00, {
    phone: '237690123456',
    instanceName: 'student-237690123456',
  });
});

test('whatsapp-target : profil vide ou sans numéro valide renvoie null', () => {
  assert.equal(resolveWhatsAppTarget({}), null);
  assert.equal(resolveWhatsAppTarget({ whatsappPhone: '', phone: null }), null);
  assert.equal(resolveWhatsAppTarget(null), null);
  assert.equal(resolveWhatsAppTarget(undefined), null);
  assert.equal(resolveWhatsAppTarget({ whatsappPhone: '123' }), null);
});

test('whatsapp-target : isOwnInstance vérifie la propriété de l’instance', () => {
  assert.equal(isOwnInstance('student-237699999999', 'student-237690000000'), false);
  assert.equal(isOwnInstance('student-237690000000', 'student-237690000000'), true);
  assert.equal(isOwnInstance(null, 'student-237690000000'), true);
  assert.equal(isOwnInstance('', 'student-237690000000'), true);
  assert.equal(isOwnInstance(undefined, 'student-237690000000'), true);
});

test('whatsapp-target : normalizeTargetPhone normalise correctement', () => {
  assert.equal(normalizeTargetPhone('690000000'), '237690000000');
  assert.equal(normalizeTargetPhone('+237 690 00 00 00'), '237690000000');
  assert.equal(normalizeTargetPhone(''), '');
  assert.equal(normalizeTargetPhone(null), '');
});

test('garde de source : suppression absolue de isStrictProd et VERCEL_ENV dans la route', () => {
  const routeContent = fs.readFileSync(
    path.resolve('app/api/mobile/whatsapp/instance/route.ts'),
    'utf8',
  );
  assert.equal(
    /isStrictProd/.test(routeContent),
    false,
    'isStrictProd ne doit plus exister dans la route',
  );
  assert.equal(
    /VERCEL_ENV/.test(routeContent),
    false,
    'VERCEL_ENV ne doit plus exister dans la route',
  );
  assert.ok(
    routeContent.includes('enforceRateLimit'),
    'enforceRateLimit doit être appelé',
  );
  assert.ok(
    routeContent.includes('resolveWhatsAppTarget'),
    'resolveWhatsAppTarget doit être appelé',
  );
  assert.ok(
    routeContent.includes('isOwnInstance'),
    'isOwnInstance doit être appelé',
  );
});

// Tests HTTP d'intégration (injoignable -> skip)
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const serverUp = await fetch(`${BASE_URL}/api/health`, {
  signal: AbortSignal.timeout(1500),
}).then(() => true, () => false);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL} (lancer mobile-api en dev)`;

test('HTTP : POST /api/mobile/whatsapp/instance sans session renvoie 401', { skip: NO_SERVER }, async () => {
  const res = await fetch(`${BASE_URL}/api/mobile/whatsapp/instance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '690000000' }),
  });
  assert.equal(res.status, 401);
});

test('HTTP : GET /api/mobile/whatsapp/instance sans session renvoie 401', { skip: NO_SERVER }, async () => {
  const res = await fetch(`${BASE_URL}/api/mobile/whatsapp/instance?instance=student-237699999999`, {
    method: 'GET',
  });
  assert.equal(res.status, 401);
});

test('HTTP : DELETE /api/mobile/whatsapp/instance sans session renvoie 401', { skip: NO_SERVER }, async () => {
  const res = await fetch(`${BASE_URL}/api/mobile/whatsapp/instance`, {
    method: 'DELETE',
  });
  assert.equal(res.status, 401);
});
