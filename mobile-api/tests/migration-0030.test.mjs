import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sql = fs.readFileSync(path.resolve('sql/0030_document_events_drop_legacy_fk.sql'), 'utf8');
const lower = sql.toLowerCase();

test('migration 0030 : retire la clé étrangère héritée, de façon idempotente', () => {
  assert.match(lower, /alter table public\.document_events\s+drop constraint if exists document_events_user_id_fkey/);
});

test('migration 0030 : aucune suppression de données', () => {
  for (const forbidden of ['drop table', 'delete from', 'truncate', 'drop column']) {
    assert.ok(!lower.includes(forbidden), forbidden);
  }
});
