import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

// stages-db reads globalThis.campusDatabasePool through lib/database.ts: each test
// installs a fake pool, then reloads the module.
const loadStagesDb = async (query) => {
  const calls = [];
  globalThis.campusDatabasePool = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return query(sql, params);
    },
    on() {},
    connect: async () => ({ query: async () => ({ rows: [] }), release() {} }),
  };
  const mod = await loadTsWithPackages('lib/stages-db.ts', ['lib/database.ts', 'lib/db-ssl.ts', 'lib/free-launch.ts', 'lib/stage-pricing.ts']);
  return { mod, calls };
};

const { stageErrorStatus, isDatabaseUnavailable } = await loadTsWithPackages('lib/stages-errors.ts', ['lib/db-errors.ts']);

test('liste vide : aucune offre fictive, et offre inconnue → null', async () => {
  const { mod } = await loadStagesDb(async () => ({ rows: [], rowCount: 0 }));
  assert.deepEqual(await mod.listStageJobs({}), []);
  assert.equal(await mod.getStageJob('00000000-0000-0000-0000-000000000000'), null);
});

test('identifiant non UUID : null sans requête', async () => {
  const { mod, calls } = await loadStagesDb(async () => ({ rows: [], rowCount: 0 }));
  assert.equal(await mod.getStageJob('job-1'), null);
  assert.equal(calls.length, 0);
});

test('base en panne : les erreurs remontent au lieu d’un faux succès', async () => {
  const { mod } = await loadStagesDb(async () => {
    throw new Error('connect ECONNREFUSED');
  });
  await assert.rejects(mod.listStageJobs({}));
  await assert.rejects(mod.createStageApplication({ studentId: 's', jobId: 'j' }));
  await assert.rejects(mod.listStudentApplications('s'));
});

test('statut de dispatch : null quand aucune candidature n’est mise à jour', async () => {
  const { mod } = await loadStagesDb(async () => ({ rows: [], rowCount: 0 }));
  assert.equal(await mod.updateApplicationDispatchStatus('00000000-0000-0000-0000-000000000000', 'FAILED'), null);
});

test('codes HTTP : 503 pour une base injoignable, 500 sinon', () => {
  assert.equal(stageErrorStatus(new Error('connect ECONNREFUSED')), 503);
  assert.equal(isDatabaseUnavailable({ code: 'ETIMEDOUT' }), true);
  assert.equal(stageErrorStatus(new Error('boom')), 500);
  assert.equal(stageErrorStatus(null), 500);
});

test('garde de source : plus aucun repli fictif dans stages-db', () => {
  const src = fs.readFileSync(path.resolve('lib/stages-db.ts'), 'utf8');
  for (const forbidden of ['FALLBACK_STAGE_JOBS', 'app-offline', 'student-stage-id']) {
    assert.ok(!src.includes(forbidden), forbidden);
  }
});

const { missingDispatchTarget } = await loadTs('lib/dispatch-target.ts');
const contacts = await loadTs('../src/features/stages/contactTargets.ts');

test('envoi sans destinataire réel : message d’erreur, jamais de repli', () => {
  assert.equal(missingDispatchTarget('whatsapp', { phone: null }), "Cette entreprise n'a pas de numéro WhatsApp.");
  assert.equal(missingDispatchTarget('whatsapp', { phone: '237600000000' }), null);
  assert.equal(missingDispatchTarget('email', { email: '' }), "Cette entreprise n'a pas d'adresse e-mail.");
  assert.equal(missingDispatchTarget('email', { email: 'rh@exemple.cm' }), null);
});

test('contacts côté app : null quand l’entreprise n’a pas de contact', () => {
  assert.equal(contacts.companyWhatsapp({ contactWhatsapp: '' }), null);
  assert.equal(contacts.companyWhatsapp({ contactWhatsapp: '+237 6 00 00 00 00' }), '237600000000');
  assert.equal(contacts.companyWhatsapp(undefined), null);
  assert.equal(contacts.companyEmail({ contactEmail: 'rh@exemple.cm' }), 'rh@exemple.cm');
  assert.equal(contacts.companyEmail({ contactEmail: 'pas-une-adresse' }), null);
});
