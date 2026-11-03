import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { APPLY_LINK_LABEL, APPLY_LINK_SHORT_LABEL, isLinkApply, safeApplyUrl } = await loadTs('../src/features/stages/applyTarget.ts');
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
  assert.match(screen, /useApplyOnSite\(\)/);
  assert.ok(APPLY_LINK_LABEL.length > 0);
  // The one-click apply must not be reachable for a LINK offer.
  assert.match(screen, /if \(isLinkApply\(job\)\) \{\s*\n\s*openOnSite\(job\);\s*\n\s*return;/);
});

test('app : l’accueil suit la même règle que les Stages', () => {
  const home = read('../src/ui/screens/HomeScreen.tsx');
  assert.match(home, /if \(isLinkApply\(job\)\) \{\s*\n\s*openOnSite\(job\);\s*\n\s*return;/);
  // Every card goes through that rule, and none promises a one-click apply on such an offer.
  assert.equal((home.match(/setApplyingJob\(job\)/g) ?? []).length, 1);
  assert.equal((home.match(/startApply\(job\)/g) ?? []).length, 3);
  assert.match(home, /isLinkApply\(job\) \? APPLY_LINK_SHORT_LABEL : '1-Clic'/);
  assert.ok(APPLY_LINK_SHORT_LABEL.length > 0);
});

test('app : seul le site https est ouvert, et le retour propose le suivi', () => {
  const hook = read('../src/features/stages/useApplyOnSite.ts');
  assert.match(hook, /safeApplyUrl\(job\.sourceUrl\)/);
  assert.match(hook, /recordOnSiteApplication\(job\)/);
  assert.match(hook, /Tu as postulé \?/);
});

test('serveur : /cv ne débite pas une offre à lien', () => {
  const src = read('app/api/mobile/stages/cv/route.ts');
  assert.ok(src.indexOf("applyMethod === 'LINK'") > 0, 'contrôle présent');
  assert.ok(src.indexOf("applyMethod === 'LINK'") < src.indexOf('chargeStageApplication(userId'), 'contrôle avant le débit');
});

test('serveur : le suivi sur le site est gratuit et réservé aux offres à lien', () => {
  const src = read('app/api/mobile/stages/apply-on-site/route.ts');
  assert.match(src, /applyMethod !== 'LINK'/);
  assert.match(src, /status: 422/);
  assert.ok(!src.includes('chargeStageApplication'), 'aucun débit');
  assert.ok(!fs.existsSync('app/api/mobile/stages/direct-reach/route.ts'), 'direct-reach supprimée');
});

test('serveur : pas de relance ni de rappel pour une candidature sur le site', () => {
  const followups = read('lib/application-followups.ts');
  assert.match(followups, /j\.apply_method::text <> 'LINK'/);
  const db = read('lib/stages-db.ts');
  assert.match(db, /onSite \? null : followupRecipient/);
  assert.match(db, /row\.apply_method !== 'LINK' && row\.contact_email/);
});

test('serveur : aucune adresse inventée pour une entreprise sans contact', () => {
  assert.ok(!read('lib/stages-db.ts').includes('recrutement@'));
  assert.ok(!read('../recruiter-web/lib/admin-platform-service.ts').includes('contact@campus360b.site'));
});

test('admin : une offre à lien exige une URL https', () => {
  const route = read('../recruiter-web/app/api/admin/stages/route.ts');
  assert.match(route, /job\.applyMethod === 'LINK' && !\/\^https:/);
  const service = read('../recruiter-web/lib/admin-platform-service.ts');
  assert.equal((service.match(/apply_method::text <> 'LINK'/g) ?? []).length, 2);
});

test('app : le type expose la méthode et l’URL', () => {
  const types = read('../src/types.ts');
  assert.match(types, /'WHATSAPP' \| 'EMAIL' \| 'LINK' \| 'PHYSICAL'/);
  assert.match(types, /sourceUrl\?: string/);
});
