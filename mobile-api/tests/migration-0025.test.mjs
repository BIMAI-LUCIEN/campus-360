import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sql = fs.readFileSync(path.resolve('sql/0025_source_role.sql'), 'utf8').toLowerCase();

test('migration 0025 : colonne source_role idempotente et contrainte', () => {
  assert.match(sql, /add column if not exists source_role text not null default 'personal'/);
  const drop = sql.indexOf('drop constraint if exists app_document_files_source_role_check');
  const add = sql.indexOf('add constraint app_document_files_source_role_check');
  assert.ok(drop >= 0 && add > drop, 'drop avant add');
  assert.match(sql, /check \(source_role in \('reference', 'personal'\)\)/);
});

test('migration 0025 : aucune suppression de données', () => {
  for (const forbidden of ['drop table', 'delete from', 'truncate', 'drop column']) {
    assert.ok(!sql.includes(forbidden), forbidden);
  }
});
