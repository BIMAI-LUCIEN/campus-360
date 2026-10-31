import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

// Regression guards for the 2026-10-31 security audit (plan.md, Module 29).
const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');
const routeFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name === 'route.ts' ? [full] : [];
  });

test('29.3 : /api/auth ne renvoie que les origines de confiance', () => {
  const source = read('app/api/auth/[...all]/route.ts');
  assert.match(source, /isTrustedOrigin\(origin, process\.env\)/);
  assert.doesNotMatch(source, /headers\.get\('origin'\) \|\| '\*'/);
});

test('29.4 : aucun pré-vol OPTIONS ne reflète une origine quelconque', () => {
  const offenders = routeFiles('app').filter((file) =>
    /headers\['Access-Control-Allow-Origin'\] = origin/.test(fs.readFileSync(file, 'utf8')),
  );
  assert.deepEqual(offenders, []);
  assert.match(read('lib/mobile-access.ts'), /export const corsPreflight = /);
});

test('29.5 : secret n8n comparé en temps constant', async () => {
  assert.match(read('app/api/mobile/stages/ingest/route.ts'), /sameSecret\(apiKey, expectedKey\)/);
  const { sameSecret } = await loadTs('lib/admin-service-check.ts');
  assert.equal(sameSecret('a'.repeat(32), 'a'.repeat(32)), true);
  assert.equal(sameSecret('a'.repeat(32), 'b'.repeat(32)), false);
  assert.equal(sameSecret('short', 'a'.repeat(32)), false);
});

test('29.1 et 29.2 : aucun identifiant littéral dans les scripts', () => {
  for (const rel of [
    '../scripts/upload_all_exams_to_cloudinary.mjs',
    '../scripts/run_full_authentic_exams_pipeline.mjs',
  ]) {
    const source = read(rel);
    assert.doesNotMatch(source, /const api(Key|Secret) = '/);
    assert.match(source, /readEnv\('CLOUDINARY_API_SECRET'\)/);
  }
  assert.doesNotMatch(read('../scripts/test-payments-flow.mjs'), /const webhookSecret = '/);
});
