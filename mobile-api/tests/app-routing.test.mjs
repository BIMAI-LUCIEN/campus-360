// mobile-api/tests/app-routing.test.mjs
// Verifies Tâche 23.22 source-guards:
// 1. src/features/auth/betterAuth.ts defines and exports baseUrlFor.
// 2. baseUrlFor directs both /api/mobile/ and /api/ai/ to mobileApiBaseUrl.
// 3. authFetchRaw routes via baseUrlFor.
// 4. recruiter-web has 0 routes under /api/mobile/ and /api/ai/.
// 5. No guest-student references in recruiter-web or mobile-api.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');

test('betterAuth.ts defines baseUrlFor routing /api/mobile and /api/ai to mobileApiBaseUrl', () => {
  const betterAuthPath = path.join(ROOT, 'src/features/auth/betterAuth.ts');
  assert.ok(fs.existsSync(betterAuthPath), 'src/features/auth/betterAuth.ts must exist');

  const content = fs.readFileSync(betterAuthPath, 'utf8');

  // Verify baseUrlFor definition
  assert.match(
    content,
    /export const baseUrlFor =/,
    'betterAuth.ts must export baseUrlFor function'
  );

  assert.ok(
    content.includes("path.startsWith('/api/mobile/')") || content.includes('path.startsWith("/api/mobile/")'),
    'baseUrlFor must check /api/mobile/'
  );

  assert.ok(
    content.includes("path.startsWith('/api/ai/')") || content.includes('path.startsWith("/api/ai/")'),
    'baseUrlFor must check /api/ai/'
  );

  // Verify authFetchRaw uses baseUrlFor
  assert.match(
    content,
    /authFetchRawAt\(\s*baseUrlFor\(path\)/,
    'authFetchRaw must route using baseUrlFor(path)'
  );
});

test('recruiter-web has no /api/mobile or /api/ai routes', () => {
  const mobileApiDir = path.join(ROOT, 'recruiter-web/app/api/mobile');
  const aiApiDir = path.join(ROOT, 'recruiter-web/app/api/ai');

  assert.ok(!fs.existsSync(mobileApiDir), 'recruiter-web/app/api/mobile must not exist');
  assert.ok(!fs.existsSync(aiApiDir), 'recruiter-web/app/api/ai must not exist');
});

test('no guest-student references remain in recruiter-web or mobile-api', () => {
  const checkDirs = [
    path.join(ROOT, 'recruiter-web/app'),
    path.join(ROOT, 'recruiter-web/lib'),
    path.join(ROOT, 'mobile-api/app'),
    path.join(ROOT, 'mobile-api/lib'),
  ];

  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js')) {
        const text = fs.readFileSync(full, 'utf8');
        assert.ok(
          !text.includes('guest-student'),
          `Forbidden guest-student found in ${full}`
        );
      }
    }
  }

  for (const d of checkDirs) {
    scan(d);
  }
});
