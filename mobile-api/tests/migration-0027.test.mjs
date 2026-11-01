import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sql = fs.readFileSync(path.resolve('sql/0027_stage_application_tracking.sql'), 'utf8');
const lower = sql.toLowerCase();

test('migration 0027 : statuts d’envoi déclarés, hors transaction', () => {
  assert.match(sql, /^-- migrate:no-transaction/);
  for (const status of ['SENT_PENDING', 'DELIVERED', 'FAILED', 'WITHDRAWN']) {
    assert.ok(sql.includes(`ADD VALUE IF NOT EXISTS '${status}'`), status);
  }
  assert.match(lower, /add column if not exists student_notes text/);
  assert.match(lower, /add column if not exists status_updated_at timestamptz/);
});

test('migration 0027 : plus aucun DDL au runtime dans stages-db', () => {
  const lib = fs.readFileSync(path.resolve('lib/stages-db.ts'), 'utf8').toLowerCase();
  assert.ok(!lib.includes('alter type'), 'alter type');
  assert.ok(!lib.includes('[status:'), 'repli [Status: X]');
});

test('migration 0027 : aucune suppression de données', () => {
  for (const forbidden of ['drop table', 'delete from', 'truncate', 'drop column']) {
    assert.ok(!lower.includes(forbidden), forbidden);
  }
});
