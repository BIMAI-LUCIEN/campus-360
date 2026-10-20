import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { APPLY_LINK_LABEL, isLinkApply, safeApplyUrl } = await loadTs('../src/features/stages/applyTarget.ts');
const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

test('offre à lien : reconnaissance de la méthode', () => {
  assert.equal(isLinkApply({ applyMethod: 'LINK' }), true);
  assert.equal(isLinkApply({ applyMethod: 'EMAIL' }), false);
  assert.equal(isLinkApply({ applyMethod: 'PHYSICAL' }), false);
  assert.equal(isLinkApply(null), false);
  assert.equal(isLinkApply(undefined), false);
});

test('offre à lien : seules les URL https sont ouvertes', () => {
  assert.equal(safeApplyUrl('https://www.linkedin.com/jobs/view/1'), 'https://www.linkedin.com/jobs/view/1');
  assert.equal(safeApplyUrl('  https://example.org/a  '), 'https://example.org/a');
  assert.equal(safeApplyUrl('http://example.org/a'), null);
  assert.equal(safeApplyUrl('javascript:alert(1)'), null);
  assert.equal(safeApplyUrl('campus-bordes://x'), null);
  assert.equal(safeApplyUrl('https://'), null);
  assert.equal(safeApplyUrl(''), null);
  assert.equal(safeApplyUrl(null), null);
  assert.equal(safeApplyUrl(undefined), null);
});

test('migration 0015 : valeur ajoutée hors transaction', () => {
  const sql = read('sql/0015_apply_method_link.sql').toLowerCase();
  assert.match(sql, /alter type apply_method add value if not exists 'link'/);
  assert.ok(!sql.includes('begin;'), 'pas de begin');
  assert.ok(!sql.includes('commit;'), 'pas de commit');
});

test('serveur : une candidature sur une offre à lien est refusée (422)', () => {
  for (const route of ['app/api/mobile/stages/dispatch/route.ts', 'app/api/mobile/stages/apply/route.ts']) {
    const src = read(route);
    assert.match(src, /applyMethod === 'LINK'/, route);
    assert.match(src, /status: 422/, route);
  }
});

test('API : l’URL de l’offre est renvoyée à l’app', () => {
  const src = read('lib/stages-db.ts');
  assert.match(src, /source_url: string \| null/);
  assert.match(src, /sourceUrl: row\.source_url \?\? undefined/);
  assert.match(src, /'WHATSAPP' \| 'EMAIL' \| 'LINK' \| 'PHYSICAL'/);
});

test('app : la carte ouvre le site au lieu du formulaire', () => {
  const screen = read('../src/ui/screens/StagesScreen.tsx');
  assert.match(screen, /isLinkApply\(job\)/);
  assert.match(screen, /openApplyLink/);
  assert.match(screen, /safeApplyUrl\(job\.sourceUrl\)/);
  assert.ok(APPLY_LINK_LABEL.length > 0);
  // The one-click apply must not be reachable for a LINK offer.
  assert.match(screen, /if \(isLinkApply\(job\)\) \{\s*\n\s*openApplyLink\(job\);\s*\n\s*return;/);
});

test('app : le type expose la méthode et l’URL', () => {
  const types = read('../src/types.ts');
  assert.match(types, /'WHATSAPP' \| 'EMAIL' \| 'LINK' \| 'PHYSICAL'/);
  assert.match(types, /sourceUrl\?: string/);
});
