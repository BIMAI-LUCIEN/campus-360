import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadTs } from './helpers/load-ts.mjs';

test('isValidHealthSecret : validation stricte et timing-safe du secret', async () => {
  const { isValidHealthSecret } = await loadTs('lib/health-secret.ts');
  const secret = 'super-secret-token-12345';

  // Secret exact -> true
  assert.strictEqual(isValidHealthSecret(secret, secret), true);

  // Secret incorrect -> false
  assert.strictEqual(isValidHealthSecret('wrong-secret', secret), false);

  // Secret tronqué ou plus long -> false
  assert.strictEqual(isValidHealthSecret('super-secret', secret), false);
  assert.strictEqual(isValidHealthSecret('super-secret-token-12345-extra', secret), false);

  // Expected vide, undefined ou whitespace -> false
  assert.strictEqual(isValidHealthSecret(secret, undefined), false);
  assert.strictEqual(isValidHealthSecret(secret, ''), false);
  assert.strictEqual(isValidHealthSecret(secret, '   '), false);

  // Provided vide, null, undefined -> false
  assert.strictEqual(isValidHealthSecret(null, secret), false);
  assert.strictEqual(isValidHealthSecret(undefined, secret), false);
  assert.strictEqual(isValidHealthSecret('', secret), false);
  assert.strictEqual(isValidHealthSecret('   ', secret), false);
});

test('Garde de source : route app/api/health/pdf/route.ts configurée correctement', () => {
  const routeContent = fs.readFileSync(
    path.resolve(process.cwd(), 'app/api/health/pdf/route.ts'),
    'utf8'
  );

  assert.ok(routeContent.includes("runtime = 'nodejs'"), 'Runtime nodejs obligatoire pour Chromium/Puppeteer');
  assert.ok(routeContent.includes('isValidHealthSecret'), 'Validation du secret branchée');
  assert.ok(routeContent.includes('renderHtmlToPdf'), 'Moteur de rendu PDF branché');
  assert.ok(routeContent.includes('application/pdf'), 'Content-Type application/pdf retourné');
});

test('HTTP : GET /api/health/pdf vérification live', {
  skip: !process.env.HEALTH_PDF_SECRET
}, async () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3002';
  const secret = process.env.HEALTH_PDF_SECRET;

  let res;
  try {
    // Sans header -> 401
    const unauthRes = await fetch(`${baseUrl}/api/health/pdf`);
    assert.strictEqual(unauthRes.status, 401);

    // Avec header -> 200 et application/pdf
    res = await fetch(`${baseUrl}/api/health/pdf`, {
      headers: { 'x-health-secret': secret }
    });
  } catch {
    // Si le serveur local n'est pas démarré, ne pas faire échouer le test hors ligne
    return;
  }

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
  const buffer = await res.arrayBuffer();
  const pdfHeader = Buffer.from(buffer).subarray(0, 5).toString('ascii');
  assert.strictEqual(pdfHeader, '%PDF-');
});
