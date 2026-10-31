import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sql = fs.readFileSync(path.resolve('sql/0026_wallet_ai_generation_type.sql'), 'utf8').toLowerCase();

const listFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

test('migration 0026 : ai_generation ajouté, les 11 types de 0024 gardés', () => {
  const drop = sql.indexOf('drop constraint if exists app_wallet_transactions_type_check');
  const add = sql.indexOf('add constraint app_wallet_transactions_type_check');
  assert.ok(drop >= 0 && add > drop, 'drop avant add');
  for (const type of ['topup', 'purchase', 'withdrawal', 'commission', 'subscription', 'ia_pack', 'bonus', 'admin_adjustment', 'contribution_reward', 'pack_purchase', 'pass_purchase', 'ai_generation']) {
    assert.ok(sql.includes(`'${type}'`), type);
  }
});

test('migration 0026 : chaque type inséré par le code est autorisé', () => {
  const allowed = new Set([...sql.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
  const sources = [...listFiles(path.resolve('app')), ...listFiles(path.resolve('lib'))];
  for (const file of sources) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/insert into public\.app_wallet_transactions\s*\([^)]*\)\s*values\s*\(\$1,\s*'([a-z_]+)'/g)) {
      assert.ok(allowed.has(m[1]), `${path.relative(process.cwd(), file)} insère '${m[1]}'`);
    }
  }
});

test('migration 0026 : aucune suppression de données', () => {
  for (const forbidden of ['drop table', 'delete from', 'truncate', 'drop column']) {
    assert.ok(!sql.includes(forbidden), forbidden);
  }
});
