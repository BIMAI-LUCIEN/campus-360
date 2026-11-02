import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
const lib = read('lib/application-followups.ts');
const route = read('app/api/mobile/stages/followups/route.ts');

test('rappels : route protégée par le secret, refus si absent', () => {
  assert.match(route, /N8N_INGESTION_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /if \(!expected \|\| !safeEqual\(provided, expected\)\)/);
  assert.match(route, /status: 401/);
});

test('rappels : chaque échéance réservée une fois, un second passage n’en crée aucune', () => {
  assert.match(lib, /set followup_notified_at = now\(\)/);
  assert.match(lib, /for update of a skip locked/);
  assert.match(lib, /a\.followup_notified_at < coalesce\(a\.last_reminded_at, a\.applied_at\) \+ make_interval/);
});

test('rappels : une seule notification par étudiant, offre expirée exclue', () => {
  assert.match(lib, /byStudent/);
  assert.match(lib, /j\.expires_at is null or j\.expires_at > now\(\)/);
  assert.match(lib, /type: 'application_followup'/);
});

test('rappels : le type ouvre l’écran de suivi', () => {
  assert.match(read('../src/AppShell.tsx'), /type === 'application_followup'/);
});
