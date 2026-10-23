import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const { templateInputSchema } = await loadTsWithPackages('lib/template-schema.ts', ['lib/document-style.ts', 'lib/document-style-schema.ts']);
const { canTransition, publishProblems } = await loadTs('lib/template-rules.ts');

const valid = {
  name: 'Université Exemple — Rapport de stage',
  establishment: 'Université Exemple',
  degree: 'Licence',
  kind: 'stage',
  documentStyle: { preset: 'classique', headerFooter: { headerStyle: 'band', authorLabel: 'Rédigé et présenté par :' } },
  outline: [{ title: 'Dédicace' }, { title: 'Introduction générale' }, { title: 'Chapitre 1 : Présentation' }],
};

test('modèle : entrée valide acceptée, style complété', () => {
  const parsed = templateInputSchema.safeParse(valid);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.documentStyle.headerFooter.headerStyle, 'band');
  assert.equal(parsed.data.documentStyle.typography.bodyFont, 'Times New Roman');
});

test('modèle : nom vide, type inconnu, clé inconnue, plan trop long refusés', () => {
  const ko = (body) => templateInputSchema.safeParse(body).success === false;
  assert.ok(ko({ ...valid, name: '' }));
  assert.ok(ko({ ...valid, name: '   ' }));
  assert.ok(ko({ ...valid, kind: 'cv' }));
  assert.ok(ko({ ...valid, inconnu: 1 }));
  assert.ok(ko({ ...valid, outline: Array.from({ length: 41 }, (_, i) => ({ title: `Section ${i}` })) }));
  assert.ok(ko({ ...valid, documentStyle: { typography: { bodyFont: 'Comic Sans MS' } } }));
});

test('modèle : transitions de statut', () => {
  assert.equal(canTransition('draft', 'published'), true);
  assert.equal(canTransition('published', 'draft'), true);
  assert.equal(canTransition('published', 'archived'), true);
  assert.equal(canTransition('archived', 'published'), false);
  assert.equal(canTransition('archived', 'draft'), false);
});

test('modèle : publier exige un nom, un style et au moins une section', () => {
  assert.deepEqual(publishProblems({ name: 'A', outline: [{ title: 'x' }], document_style: {} }), []);
  assert.equal(publishProblems({ name: '', outline: [], document_style: null }).length, 3);
});

test('migration 0013 : idempotente, sans suppression de données', () => {
  const sql = fs.readFileSync(path.resolve('sql/0013_document_templates.sql'), 'utf8').toLowerCase();
  for (const statement of sql.match(/create table[^(]*/g)) assert.match(statement, /if not exists/);
  for (const statement of sql.match(/add column[^;]*/g)) assert.match(statement, /if not exists/);
  for (const statement of sql.match(/create index[^;]*/g)) assert.match(statement, /if not exists/);
  const adds = sql.match(/add constraint (\w+)/g).map((s) => s.split(' ').pop());
  for (const name of adds) assert.ok(sql.includes(`drop constraint if exists ${name}`), name);
  for (const forbidden of ['drop table', 'delete from', 'truncate']) assert.ok(!sql.includes(forbidden), forbidden);
  assert.match(sql, /template_id uuid references public\.app_document_templates\(id\) on delete set null/);
});
