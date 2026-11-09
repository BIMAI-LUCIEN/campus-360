import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sql = fs.readFileSync(path.resolve('sql/0033_documents_column_privileges.sql'), 'utf8');
const lower = sql.toLowerCase().replace(/--[^\n]*/g, '');
const app = fs.readFileSync(path.resolve('../src/features/pdf/pdfApi.ts'), 'utf8');

const HIDDEN = ['file_sha256', 'text_fingerprint', 'minhash', 'embedding', 'source', 'contributor_id'];

const grantedColumns = () => {
  const m = lower.match(/grant select \(([^)]*)\)\s+on public\.documents to anon, authenticated/);
  assert.ok(m, 'grant select (...) to anon, authenticated');
  return m[1].split(',').map((c) => c.trim()).filter(Boolean);
};

const catalogueColumns = () => {
  const m = app.match(/const CATALOGUE_COLUMNS = \[([\s\S]*?)\]\.join/);
  assert.ok(m, 'CATALOGUE_COLUMNS introuvable dans pdfApi.ts');
  return [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]);
};

test('migration 0033 : retire la lecture de la table entière aux rôles publics', () => {
  assert.match(lower, /revoke select on public\.documents from anon, authenticated;/);
});

test('migration 0033 : aucune colonne d\'empreinte ni l\'auteur ne sont rendus', () => {
  const granted = grantedColumns();
  for (const col of HIDDEN) assert.ok(!granted.includes(col), col);
});

test('migration 0033 : les colonnes rendues sont exactement celles du catalogue de l\'app', () => {
  assert.deepEqual([...grantedColumns()].sort(), [...catalogueColumns()].sort());
});

test('migration 0033 : aucune suppression de données ni droit d\'écriture ajouté', () => {
  for (const forbidden of ['drop table', 'delete from', 'truncate', 'drop column', 'grant insert', 'grant update', 'grant delete', 'grant all']) {
    assert.ok(!lower.includes(forbidden), forbidden);
  }
});
