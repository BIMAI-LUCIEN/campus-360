import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const { sendFollowupReminder } = await loadTsWithPackages('lib/application-remind.ts', ['lib/application-rules.ts']);

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
const NOW = new Date('2026-11-22T00:00:00Z');
const target = {
  status: 'DELIVERED',
  appliedAt: '2026-11-15T00:00:00Z',
  lastRemindedAt: null,
  reminderCount: 0,
  contactEmail: 'rh@exemple.cm',
  offerExpired: false,
};

// One row: reserve behaves like the conditional update of stages-db.ts.
const fakeRow = ({ sendOk = true } = {}) => {
  const row = { count: 0, last: null, sent: 0 };
  return {
    row,
    deps: {
      reserve: async () => {
        if (row.count >= 1) return null;
        const previous = row.last;
        row.count += 1;
        row.last = 'now';
        return { lastRemindedAt: 'now', reminderCount: row.count, previous };
      },
      release: async (previous) => {
        row.count -= 1;
        row.last = previous;
      },
      send: async (to) => {
        assert.equal(to, 'rh@exemple.cm');
        row.sent += 1;
        return sendOk;
      },
    },
  };
};

test('relance due : envoyée et comptée', async () => {
  const { row, deps } = fakeRow();
  const out = await sendFollowupReminder(target, false, deps, NOW);
  assert.equal(out.status, 200);
  assert.equal(out.reminderCount, 1);
  assert.equal(row.sent, 1);
});

test('deux appels simultanés : un seul envoi', async () => {
  const { row, deps } = fakeRow();
  const outs = await Promise.all([
    sendFollowupReminder(target, false, deps, NOW),
    sendFollowupReminder(target, false, deps, NOW),
  ]);
  assert.deepEqual(outs.map((o) => o.status).sort(), [200, 409]);
  assert.equal(row.sent, 1);
});

test('refus de Resend : 502 et aucune relance comptée', async () => {
  const { row, deps } = fakeRow({ sendOk: false });
  const out = await sendFollowupReminder(target, false, deps, NOW);
  assert.equal(out.status, 502);
  assert.equal(row.count, 0);
  assert.equal(row.last, null);
});

test('exception à l’envoi : 502 et aucune relance comptée', async () => {
  const { row, deps } = fakeRow();
  deps.send = async () => {
    throw new Error('réseau');
  };
  const out = await sendFollowupReminder(target, false, deps, NOW);
  assert.equal(out.status, 502);
  assert.equal(row.count, 0);
});

test('sans e-mail : 422, rien de réservé', async () => {
  const { row, deps } = fakeRow();
  const out = await sendFollowupReminder({ ...target, contactEmail: 'pas-une-adresse' }, false, deps, NOW);
  assert.equal(out.status, 422);
  assert.equal(row.count, 0);
});

test('hors échéance, plafond ou offre expirée : 409, rien envoyé', async () => {
  const cases = [
    { ...target, appliedAt: '2026-11-20T00:00:00Z' },
    { ...target, reminderCount: 2 },
    { ...target, offerExpired: true },
    { ...target, status: 'INTERVIEW' },
    { ...target, status: 'SENT_PENDING' },
  ];
  for (const item of cases) {
    const { row, deps } = fakeRow();
    const out = await sendFollowupReminder(item, true, deps, NOW);
    assert.equal(out.status, 409, JSON.stringify(item));
    assert.equal(row.sent, 0);
  }
});

test('PENDING : l’étudiant confirme son envoi avant la relance', async () => {
  const { row, deps } = fakeRow();
  const refused = await sendFollowupReminder({ ...target, status: 'PENDING' }, false, deps, NOW);
  assert.equal(refused.status, 409);
  assert.equal(row.sent, 0);
  const accepted = await sendFollowupReminder({ ...target, status: 'PENDING' }, true, deps, NOW);
  assert.equal(accepted.status, 200);
});

test('garde de source : route authentifiée, limitée, liée au propriétaire, destinataire lu en base', () => {
  const route = read('app/api/mobile/stages/applications/remind/route.ts');
  assert.match(route, /requireMobileUser/);
  assert.match(route, /enforceRateLimit/);
  assert.match(route, /getReminderTarget\(studentId, input\.applicationId\)/);
  assert.match(route, /\.strict\(\)/);
  assert.ok(!/recipient|contactEmail/.test(route.match(/z\s*\.object\(\{[\s\S]*?\}\)/)[0]), 'le client ne fournit pas le destinataire');
  const db = read('lib/stages-db.ts');
  assert.match(db, /for update of a/);
  assert.match(db, /a\.student_id = \$2/);
});

test('garde de source : l’ancien PATCH reminded suit la même réservation', () => {
  const route = read('app/api/mobile/stages/applications/route.ts');
  assert.match(route, /reserveStudentApplicationReminder\(studentId, input\.applicationId\)/);
  assert.match(route, /status: 409/);
  assert.ok(!read('lib/stages-db.ts').includes('recordStudentApplicationReminder'));
});

test('migration 0029 : idempotente, rien de supprimé, relance existante comptée', () => {
  const sql = read('sql/0029_application_followups.sql').toLowerCase();
  assert.match(sql, /add column if not exists reminder_count integer not null default 0/);
  assert.match(sql, /add column if not exists followup_notified_at timestamptz/);
  assert.match(sql, /set reminder_count = 1\s+where last_reminded_at is not null and reminder_count = 0/);
  for (const forbidden of ['drop table', 'delete from', 'truncate', 'drop column']) {
    assert.ok(!sql.includes(forbidden), forbidden);
  }
});
