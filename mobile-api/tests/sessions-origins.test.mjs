import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const origins = await loadTs('lib/origins.ts');
const ip = await loadTs('lib/client-ip.ts');
const ssl = await loadTs('lib/db-ssl.ts');
const PROD = { NODE_ENV: 'production' };
const DEV = { NODE_ENV: 'development' };
const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');
const headers = (map) => ({ get: (name) => map[name.toLowerCase()] ?? null });

test('origines : liste exacte, aucun domaine tiers', () => {
  assert.equal(origins.isTrustedOrigin('campus360://', PROD), true);
  assert.equal(origins.isTrustedOrigin('campus-bordes://', PROD), true);
  assert.equal(origins.isTrustedOrigin('evil://', PROD), false);
  assert.equal(origins.isTrustedOrigin('https://evil.vercel.app', PROD), false);
  assert.equal(origins.isTrustedOrigin('https://x.expo.dev', PROD), false);
  assert.equal(origins.isTrustedOrigin('https://admin.campus360b.site', PROD), true);
  assert.equal(origins.isTrustedOrigin('https://admin.campus360b.site.evil.com', PROD), false);
  assert.equal(origins.isTrustedOrigin('exp://192.168.1.5:8081', PROD), false);
  assert.equal(origins.isTrustedOrigin('exp://192.168.1.5:8081', DEV), true);
  assert.equal(origins.isTrustedOrigin('http://localhost:8081', PROD), false);
  assert.equal(origins.isTrustedOrigin('https://preview.example.com', { ...PROD, TRUSTED_EXTRA_ORIGINS: 'https://preview.example.com' }), true);
  assert.equal(origins.isTrustedOrigin('https://a.vercel.app', { ...PROD, TRUSTED_EXTRA_ORIGINS: 'https://*.vercel.app' }), false);
  assert.ok(!origins.trustedOriginList(PROD).some((o) => o.includes('*')));
});

test('IP client : seulement derrière notre proxy, dernière entrée', () => {
  const h = headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' });
  assert.equal(ip.clientIpFrom(h, { TRUST_PROXY: 'true' }), '2.2.2.2');
  assert.equal(ip.clientIpFrom(h, {}), 'unknown');
  assert.equal(ip.clientIpFrom(headers({ 'x-real-ip': '3.3.3.3' }), { TRUST_PROXY: 'true' }), '3.3.3.3');
});

test('TLS base : vérifié en production, dérogation explicite seulement', () => {
  const url = 'postgres://u:p@db.example.com:5432/x';
  const noCa = () => { throw new Error('pas de lecture attendue'); };
  assert.deepEqual(ssl.resolveDbSsl(PROD, url, noCa), { rejectUnauthorized: true });
  assert.deepEqual(ssl.resolveDbSsl({ ...PROD, DATABASE_SSL_REJECT_UNAUTHORIZED: 'false' }, url, noCa), { rejectUnauthorized: false });
  assert.deepEqual(ssl.resolveDbSsl({ ...PROD, DATABASE_SSL_CA_FILE: '/ca.pem' }, url, () => 'CA'), { rejectUnauthorized: true, ca: 'CA' });
  assert.equal(ssl.resolveDbSsl(PROD, 'postgres://localhost/x', noCa), false);
});

test('garde de source : plus de jeton en URL ni de session par identifiant', () => {
  const file = 'lib/mobile-access.ts';
  const src = read(file);
  assert.ok(!src.includes("searchParams.get('token')"), file);
  assert.ok(!/s\.id\s*=/.test(src), file);
  assert.match(read('lib/mobile-access.ts'), /emailVerified !== true/);
  assert.match(read('lib/route-rate-limit.ts'), /failMode: isFailClosedBucket/);
});

test('copies recruiter-web identiques', () => {
  for (const file of ['origins.ts', 'client-ip.ts', 'db-ssl.ts']) {
    assert.equal(read(`../recruiter-web/lib/${file}`), read(`lib/${file}`), file);
  }
});

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3002';
const reachable = await fetch(`${BASE_URL}/api/health`).then(() => true, () => false);

test('HTTP : jeton en URL refusé, origine tierce sans CORS', { skip: reachable ? false : `serveur injoignable sur ${BASE_URL}` }, async () => {
  const pre = await fetch(`${BASE_URL}/api/mobile/account`, { method: 'OPTIONS', headers: { Origin: 'https://evil.vercel.app' } });
  assert.notEqual(pre.headers.get('access-control-allow-origin'), 'https://evil.vercel.app');
  const res = await fetch(`${BASE_URL}/api/mobile/account?token=fake-token-for-test`);
  assert.equal(res.status, 401);
});
