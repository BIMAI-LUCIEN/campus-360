import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { checkBatchAllowance, sanitizeSheetPatch, sanitizeFileName, isUuid, MAX_PER_BATCH, MAX_PER_DAY } =
  await loadTs('lib/contributions-rules.ts');

const BASE_URL = process.env.MOBILE_API_TEST_URL || 'http://localhost:3002';
const NO_SERVER = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(1500) })
  .then(() => false)
  .catch(() => 'serveur mobile-api injoignable');

test('lot : 10ᵉ fichier accepté, 11ᵉ refusé (400)', () => {
  assert.deepEqual(checkBatchAllowance({ inBatch: MAX_PER_BATCH - 1, inLast24h: 0 }), { ok: true });
  const refused = checkBatchAllowance({ inBatch: MAX_PER_BATCH, inLast24h: 0 });
  assert.deepEqual([refused.ok, refused.status], [false, 400]);
});

test('jour : 30ᵉ envoi accepté, 31ᵉ refusé (429)', () => {
  assert.deepEqual(checkBatchAllowance({ inBatch: 0, inLast24h: MAX_PER_DAY - 1 }), { ok: true });
  const refused = checkBatchAllowance({ inBatch: 0, inLast24h: MAX_PER_DAY });
  assert.deepEqual([refused.ok, refused.status], [false, 429]);
  assert.match(refused.error, /30 PDF par jour/);
});

test("pas de plafond journalier pour l'admin (inLast24h null)", () => {
  assert.deepEqual(checkBatchAllowance({ inBatch: 0, inLast24h: null }), { ok: true });
});

test('la fiche corrigée ignore les drapeaux, le statut et les valeurs invalides', () => {
  const patch = sanitizeSheetPatch({
    title: '  Sujet ENSP 2023  ',
    year: '23',
    kind: 'piratage',
    status: 'published',
    copyright_flag: false,
    personal_data_flag: false,
    keywords: ['maths', '', 3, 'analyse'],
  });
  assert.deepEqual(patch, { title: 'Sujet ENSP 2023', keywords: ['maths', 'analyse'] });
});

test('noms de fichiers assainis, identifiant de lot vérifié', () => {
  assert.equal(sanitizeFileName('../../etc/passwd\u0000.pdf'), '.._.._etc_passwd_.pdf');
  assert.equal(isUuid('7b0e8c39-6f6b-4f2a-9c51-2f7f3b1e9a10'), true);
  assert.equal(isUuid("1' or '1'='1"), false);
});

test('les routes contributions appliquent la session et le quota PDF', () => {
  const post = fs.readFileSync(path.resolve('app/api/mobile/contributions/route.ts'), 'utf8');
  assert.ok(post.includes('requireMobileUser(request)'));
  assert.ok(post.includes('enforcePdfIntakeQuota('));
  assert.ok(post.includes("rightsDeclared') !== 'true'"));
  const patch = fs.readFileSync(path.resolve('app/api/mobile/contributions/[id]/route.ts'), 'utf8');
  assert.ok(patch.includes('updateUploadSheet(id, access.user.id'), 'PATCH filtré par propriétaire');
});

test('HTTP : POST et GET sans session → 401, OPTIONS → 204', { skip: NO_SERVER }, async () => {
  const url = `${BASE_URL}/api/mobile/contributions`;
  const form = new FormData();
  form.append('file', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'a.pdf');
  assert.equal((await fetch(url, { method: 'POST', body: form })).status, 401);
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { method: 'OPTIONS' })).status, 204);
});
