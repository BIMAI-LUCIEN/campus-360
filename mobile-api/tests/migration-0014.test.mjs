import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Static checks only: this file never connects to a database.
const sql = fs.readFileSync(path.resolve('sql/0014_scrape_runs_and_expiry.sql'), 'utf8').toLowerCase();

test('migration 0014 : journal des passages idempotent', () => {
  assert.match(sql, /create table if not exists public\.stage_scrape_runs/);
  assert.match(sql, /create index if not exists idx_stage_scrape_runs_started_at/);
  for (const column of ['collected', 'published', 'pending_review', 'rejected', 'deferred', 'cap_reached', 'error']) {
    assert.ok(sql.includes(column), column);
  }
});

test('migration 0014 : le statut expired est ajouté par drop puis add', () => {
  const drop = sql.indexOf('drop constraint if exists stage_jobs_status_check');
  const add = sql.indexOf('add constraint stage_jobs_status_check');
  assert.ok(drop >= 0 && add > drop, 'drop avant add');
  const check = sql.slice(add, sql.indexOf(';', add));
  for (const status of ['published', 'pending_review', 'rejected', 'expired']) {
    assert.ok(check.includes(`'${status}'`), status);
  }
  assert.match(sql, /create index if not exists idx_stage_jobs_created_at/);
});

test('migration 0014 : aucune suppression de données', () => {
  for (const forbidden of ['drop table', 'delete from', 'truncate']) {
    assert.ok(!sql.includes(forbidden), forbidden);
  }
});
