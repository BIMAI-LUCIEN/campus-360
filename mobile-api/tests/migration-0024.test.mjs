import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sql = fs.readFileSync(path.resolve('sql/0024_pricing_v2.sql'), 'utf8').toLowerCase();

test('migration 0024 : tables idempotentes', () => {
  for (const table of ['app_credit_grants', 'app_credit_usages', 'app_revision_passes', 'app_ai_free_actions', 'app_thesis_purchases']) {
    assert.match(sql, new RegExp(`create table if not exists public\.${table} `), table);
  }
  assert.match(sql, /create unique index if not exists app_credit_usages_active_uidx[\s\S]*where status = 'success'/);
  assert.match(sql, /credits_left integer not null check \(credits_left >= 0\)/);
});

test('migration 0024 : les nouveaux types gardent les 9 types existants', () => {
  const drop = sql.indexOf('drop constraint if exists app_wallet_transactions_type_check');
  const add = sql.indexOf('add constraint app_wallet_transactions_type_check');
  assert.ok(drop >= 0 && add > drop, 'drop avant add');
  const check = sql.slice(add, sql.indexOf(';', add));
  for (const type of ['topup', 'purchase', 'withdrawal', 'commission', 'subscription', 'ia_pack', 'bonus', 'admin_adjustment', 'contribution_reward', 'pack_purchase', 'pass_purchase']) {
    assert.ok(check.includes(`'${type}'`), type);
  }
});

test('migration 0024 : aucune suppression de données', () => {
  for (const forbidden of ['drop table', 'delete from', 'truncate']) {
    assert.ok(!sql.includes(forbidden), forbidden);
  }
});
