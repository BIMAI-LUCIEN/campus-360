import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sql = fs.readFileSync(path.resolve('sql/0035_cv_templates.sql'), 'utf8');
const lower = sql.toLowerCase().replace(/--[^\n]*/g, '');

const EXPECTED_SLUGS = [
  'classic',
  'prestige',
  'ingenieur',
  'etudiant',
  'ats',
  'executif',
  'suisse',
  'royal',
  'colonne-droite',
  'creatif',
  'finance',
  'tech',
  'academique',
  'compact',
  'emeraude',
];

test('migration 0035 : table public.cv_templates et index idempotents', () => {
  assert.match(lower, /create table if not exists public\.cv_templates/);
  assert.match(lower, /create index if not exists idx_cv_templates_active_order/);
  assert.match(lower, /on conflict \(id\) do nothing/);
});

test('migration 0035 : seed contient exactement les 15 designs attendus', () => {
  const seedPart = sql.slice(sql.toLowerCase().indexOf('insert into public.cv_templates'));
  const inserted = [...seedPart.matchAll(/\(\s*'([a-z0-9-]+)'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*'(classique|moderne|ats|creatif|tech|academique)'/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(inserted, EXPECTED_SLUGS);
  assert.equal(new Set(inserted).size, 15);
});

test('migration 0035 : aucune suppression destructive ni CSS dangereux', () => {
  for (const forbidden of ['drop table', 'truncate', 'delete from', '<script', '</style', 'javascript:', '@import']) {
    assert.ok(!lower.includes(forbidden), `motif interdit détecté : ${forbidden}`);
  }
});
