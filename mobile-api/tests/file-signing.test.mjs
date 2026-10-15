import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

process.env.FILES_SIGNING_SECRET = 'test-secret-for-signing';
const { signFileUrl, verifyFileSignature } = await loadTs('lib/file-signing.ts');

const FILE = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
const parse = (url) => {
  const u = new URL(url);
  return { exp: u.searchParams.get('exp'), sig: u.searchParams.get('sig'), path: u.pathname };
};

test('une URL fraîchement signée est valide', () => {
  const { url } = signFileUrl(FILE, { baseUrl: 'https://files.campus360b.site/' });
  const { exp, sig, path } = parse(url);
  assert.equal(path, `/api/files/${FILE}`);
  assert.equal(verifyFileSignature(FILE, exp, sig), 'valid');
});

test('une URL expirée est refusée', () => {
  const now = Math.floor(Date.now() / 1000);
  const { url } = signFileUrl(FILE, { baseUrl: 'https://x', ttlSeconds: 60, now: now - 3600 });
  const { exp, sig } = parse(url);
  assert.equal(verifyFileSignature(FILE, exp, sig, now), 'expired');
});

test('une signature modifiée, un autre fichier ou une expiration rallongée sont refusés', () => {
  const { url } = signFileUrl(FILE, { baseUrl: 'https://x' });
  const { exp, sig } = parse(url);
  const flipped = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
  assert.equal(verifyFileSignature(FILE, exp, flipped), 'invalid');
  assert.equal(verifyFileSignature('2a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d', exp, sig), 'invalid');
  assert.equal(verifyFileSignature(FILE, String(Number(exp) + 1000), sig), 'invalid');
  assert.equal(verifyFileSignature(FILE, null, sig), 'invalid');
  assert.equal(verifyFileSignature('../etc', exp, sig), 'invalid');
});
