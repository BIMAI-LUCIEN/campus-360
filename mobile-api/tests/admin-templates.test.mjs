import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const { checkAdminService, adminRoleAllowed } = await loadTs('lib/admin-service-check.ts');
const { templatePreviewHtml } = await loadTsWithPackages('lib/template-preview.ts', ['lib/document-style.ts', 'lib/document-cover.ts', 'lib/document-render.ts']);
const { presetStyle, applyStylePatch } = await loadTs('lib/document-style.ts');

const SECRET = 'x'.repeat(40);
const headers = (values) => ({ get: (name) => values[name] ?? null });

test('service admin : secret et identifiant exigés, comparaison stricte', () => {
  const env = { ADMIN_SERVICE_SECRET: SECRET };
  assert.equal(checkAdminService(headers({}), env).ok, false);
  assert.equal(checkAdminService(headers({ 'x-admin-service-key': 'mauvais', 'x-admin-user-id': 'u1' }), env).ok, false);
  assert.equal(checkAdminService(headers({ 'x-admin-service-key': SECRET }), env).ok, false, 'identifiant manquant');
  assert.equal(checkAdminService(headers({ 'x-admin-service-key': SECRET, 'x-admin-user-id': 'u1' }), {}).ok, false, 'secret absent côté serveur');
  assert.equal(checkAdminService(headers({ 'x-admin-service-key': 'court', 'x-admin-user-id': 'u1' }), { ADMIN_SERVICE_SECRET: 'court' }).ok, false, 'secret trop court');
  assert.deepEqual(checkAdminService(headers({ 'x-admin-service-key': SECRET, 'x-admin-user-id': 'u1' }), env), { ok: true, betterAuthUserId: 'u1' });
});

test('service admin : seuls admin et super_admin passent', () => {
  assert.equal(adminRoleAllowed('student', null), false);
  assert.equal(adminRoleAllowed(undefined, 'student'), false);
  assert.equal(adminRoleAllowed('student', 'admin'), true);
  assert.equal(adminRoleAllowed('super_admin'), true);
});

test('aperçu d’un modèle : données fictives, bandeau et pied du style', () => {
  const style = applyStylePatch(presetStyle('classique'), { headerFooter: { headerStyle: 'band', authorLabel: 'Rédigé et présenté par :', pageNumberFrame: 'box' } });
  const html = templatePreviewHtml(style, [{ title: 'Introduction générale' }, { title: 'Chapitre 1' }], {});
  assert.match(html, /Prénom NOM/);
  assert.match(html, /Rédigé et présenté par : Prénom NOM/);
  assert.match(html, /text-transform:uppercase/);
  assert.doesNotMatch(html, /<script/i);
  const hostile = templatePreviewHtml(presetStyle('classique'), [{ title: 'Chapitre <img src=x onerror=alert(1)>' }]);
  assert.doesNotMatch(hostile, /<img src=x/);
});

test('routes admin : toutes passent par withAdmin (contrôle avant tout)', () => {
  const root = path.resolve('app/api/admin/templates');
  const files = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name === 'route.ts' && files.push(path.join(dir, e.name))));
  walk(root);
  assert.equal(files.length, 6);
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const handlers = source.match(/export async function (GET|POST|PATCH|DELETE)/g) || [];
    const guarded = source.match(/return withAdmin\(request,/g) || [];
    assert.ok(handlers.length > 0 && handlers.length === guarded.length, `${file} : chaque méthode commence par withAdmin`);
  }
});

const BASE = process.env.MOBILE_API_TEST_URL;
test('HTTP : sans en-têtes de service → 401', { skip: !BASE && 'MOBILE_API_TEST_URL non défini (serveur mobile-api non lancé)' }, async () => {
  const res = await fetch(`${BASE}/api/admin/templates`);
  assert.equal(res.status, 401);
});
