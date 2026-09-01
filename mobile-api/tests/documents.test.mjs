/**
 * documents.test.mjs — Integration tests for the document (rédaction) API.
 *
 * Prerequisites:
 *   1. Copy .env.example → .env.local and fill in real values
 *   2. Have a registered test user account
 *   3. Set TEST_EMAIL and TEST_PASSWORD env vars (or edit below)
 *
 * Run:
 *   node tests/documents.test.mjs
 *
 * Or with a specific user:
 *   TEST_EMAIL=test@example.com TEST_PASSWORD=secret node tests/documents.test.mjs
 *
 * What it tests:
 *   ✓ POST /api/mobile/documents          — create document
 *   ✓ GET  /api/mobile/documents           — list documents
 *   ✓ GET  /api/mobile/documents/[id]     — fetch one with sections
 *   ✓ PATCH /api/mobile/documents/[id]    — update settings
 *   ✓ POST /api/mobile/documents/[id]/sections — add section
 *   ✓ PATCH /api/mobile/documents/[id]/sections/[sid] — update section content
 *   ✓ DELETE /api/mobile/documents/[id]/sections/[sid] — delete section
 *   ✓ DELETE /api/mobile/documents/[id]   — delete document
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);

// ── Load .env.local (gitignored) ───────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const eq = line.indexOf('=');
      if (eq > 0) {
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    });
}

const BASE_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3002';
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

// ── Simple fetch wrapper that keeps cookies ───────────────────────────────────
class Session {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = [];
  }

  async fetch(path, init = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = { ...(init.headers || {}) };
    if (this.cookies.length) {
      headers['Cookie'] = this.cookies.join('; ');
    }
    // Expo-origin so Better Auth doesn't reject the request from Node.js client
    headers['Expo-Origin'] = 'campus-360://';

    const res = await fetch(url, { ...init, headers });
    const setCookies = res.headers.get('set-cookie');
    if (setCookies) {
      this.#parseSetCookie(setCookies);
    }
    return res;
  }

  #parseSetCookie(header) {
    // Extract name=value pairs from Set-Cookie header
    const parts = header.split(';').map(p => p.trim());
    if (parts[0]) {
      const cookiePart = parts[0]; // "better-auth.session_token=abc123"
      const eqIdx = cookiePart.indexOf('=');
      if (eqIdx > 0) {
        const name = cookiePart.slice(0, eqIdx);
        const val = cookiePart.slice(eqIdx + 1).split(';')[0];
        const existing = this.cookies.findIndex(c => c.startsWith(name + '='));
        const cookieStr = `${name}=${val}`;
        if (existing >= 0) {
          this.cookies[existing] = cookieStr;
        } else {
          this.cookies.push(cookieStr);
        }
      }
    }
  }

  getCookieHeader() {
    return this.cookies.join('; ');
  }
}

// ── Test helpers ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

async function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} — expected ${expected}, got ${actual}`);
  }
}

async function assertOk(res, expectStatus = 200) {
  const status = res.status;
  const body = await res.json().catch(() => ({}));
  if (status !== expectStatus) {
    const errMsg = body?.error || res.statusText;
    throw new Error(`HTTP ${status} (expected ${expectStatus}): ${errMsg}`);
  }
  return body;
}

// ── Auth: sign in to get a session cookie ──────────────────────────────────────
async function signIn(session, email, password) {
  const res = await session.fetch('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Sign-in failed (${res.status}): ${body?.error || res.statusText}`);
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n📄 Document API Integration Tests');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log('');

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.log('⚠️  Skipping authenticated tests — set TEST_EMAIL and TEST_PASSWORD env vars.');
    console.log('   You can run a quick unauthenticated smoke test against production instead:\n');
    console.log('   node -e "');
    console.log('     fetch(\'https://api.campus360b.site/api/health\')');
    console.log('       .then(r=>r.json()).then(console.log)');
    console.log('   "');
    console.log('');
    // Run basic unauthenticated checks
    await smokeTests();
    return;
  }

  const session = new Session(BASE_URL);
  let docId;
  let sectionId;

  // ── Auth ──────────────────────────────────────────────────────────────────────
  console.log('🔐 Signing in...');
  await signIn(session, TEST_EMAIL, TEST_PASSWORD);
  console.log('   ✅ Signed in\n');

  // ── 1. Create a document ─────────────────────────────────────────────────────
  await test('POST /api/mobile/documents — creates a new document', async () => {
    const res = await session.fetch('/api/mobile/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Rapport de Stage — Test E2E',
        description: 'Test automatisé de bout en bout',
        templateType: 'stage',
      }),
    });
    const body = await assertOk(res, 201);
    if (!body.document?.id) throw new Error('Missing document.id in response');
    docId = body.document.id;
    if (body.document.template_type !== 'stage') throw new Error('template_type mismatch');
    if (body.document.title !== 'Rapport de Stage — Test E2E') throw new Error('title mismatch');
  });

  // ── 2. List documents ─────────────────────────────────────────────────────────
  await test('GET /api/mobile/documents — returns user documents', async () => {
    const res = await session.fetch('/api/mobile/documents');
    const body = await assertOk(res);
    if (!Array.isArray(body.documents)) throw new Error('Expected documents array');
    const found = body.documents.find(d => d.id === docId);
    if (!found) throw new Error('Created document not in list');
  });

  // ── 3. Fetch one document with sections ──────────────────────────────────────
  await test('GET /api/mobile/documents/[id] — returns document + sections', async () => {
    const res = await session.fetch(`/api/mobile/documents/${docId}`);
    const body = await assertOk(res);
    if (!body.document) throw new Error('Missing document');
    if (!Array.isArray(body.sections)) throw new Error('Missing sections array');
    if (body.sections.length === 0) throw new Error('Expected auto-generated sections');
    sectionId = body.sections[0].id;
  });

  // ── 4. Update document settings ───────────────────────────────────────────────
  await test('PATCH /api/mobile/documents/[id] — updates settings', async () => {
    const res = await session.fetch(`/api/mobile/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Rapport de Stage — Test E2E (updated)',
        font_family: 'Georgia',
        line_spacing: 1.8,
        primary_color: '#1E40AF',
      }),
    });
    const body = await assertOk(res);
    if (body.document.title !== 'Rapport de Stage — Test E2E (updated)') {
      throw new Error('Title not updated');
    }
    if (body.document.font_family !== 'Georgia') throw new Error('font_family not updated');
  });

  // ── 5. Add a custom section ───────────────────────────────────────────────────
  await test('POST /api/mobile/documents/[id]/sections — adds a section', async () => {
    const res = await session.fetch(`/api/mobile/documents/${docId}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Conclusion', sort_order: 99 }),
    });
    const body = await assertOk(res, 201);
    if (!body.section?.id) throw new Error('Missing section.id');
    // Return the new section id for later tests
    global.__newSectionId = body.section.id;
  });

  // ── 6. Update section content ─────────────────────────────────────────────────
  await test('PATCH /api/mobile/documents/[id]/sections/[sid] — updates content', async () => {
    const targetId = global.__newSectionId || sectionId;
    const res = await session.fetch(`/api/mobile/documents/${docId}/sections/${targetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Conclusion finale',
        content_html: '<p>Ce stage m\'a permis de découvrir le monde professionnel.</p>',
      }),
    });
    const body = await assertOk(res);
    if (!body.section) throw new Error('Missing section in response');
  });

  // ── 7. Delete the custom section ──────────────────────────────────────────────
  await test('DELETE /api/mobile/documents/[id]/sections/[sid] — deletes section', async () => {
    const targetId = global.__newSectionId;
    if (!targetId) {
      console.log('     (skipped — no new section id available)');
      return;
    }
    const res = await session.fetch(`/api/mobile/documents/${docId}/sections/${targetId}`, {
      method: 'DELETE',
    });
    await assertOk(res);
  });

  // ── 8. Delete document ────────────────────────────────────────────────────────
  await test('DELETE /api/mobile/documents/[id] — deletes document', async () => {
    const res = await session.fetch(`/api/mobile/documents/${docId}`, {
      method: 'DELETE',
    });
    await assertOk(res);
  });

  // ── 9. Deleted doc is gone ────────────────────────────────────────────────────
  await test('GET /api/mobile/documents/[id] — returns 404 after deletion', async () => {
    const res = await session.fetch(`/api/mobile/documents/${docId}`);
    await assertOk(res, 404);
  });

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

// ── Unauthenticated smoke tests ────────────────────────────────────────────────
async function smokeTests() {
  const tests = [
    { url: '/api/health', expect: 200 },
    { url: '/api/mobile/documents', expect: 401 },
    { url: `/api/mobile/documents/${'00000000-0000-0000-0000-000000000000'}`, expect: 401 },
  ];

  for (const t of tests) {
    try {
      const res = await fetch(`${BASE_URL}${t.url}`);
      const ok = res.status === t.expect ? '✅' : '⚠️';
      const body = await res.json().catch(() => null);
      console.log(`  ${ok} ${t.url} → HTTP ${res.status} (expected ${t.expect}) ${body?.error ? '| ' + body.error : ''}`);
    } catch (err) {
      console.log(`  ❌ ${t.url} → ${err.message}`);
    }
  }
}

// ── Bootstrap a test user via admin (if ADMIN_BOOTSTRAP_EMAIL is set) ───────────
// Uncomment and configure if you want automatic user creation:
// async function bootstrapTestUser() {
//   // Creates a session for the bootstrap admin
// }
// ── Entry point ─────────────────────────────────────────────────────────────────
run().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
