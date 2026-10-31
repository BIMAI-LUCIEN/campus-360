import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { publishUpload, rejectUpload, CONTRIBUTION_REWARD_COINS } = await loadTs('lib/contribution-publish.ts');

const baseUpload = {
  id: 'u1',
  status: 'pending_review',
  source: 'student',
  uploader_id: 'student-1',
  storage_url: 'https://res.cloudinary.com/x/a.pdf',
  original_name: 'a.pdf',
  file_size: 1024,
  page_count: 3,
  file_sha256: 'abc',
  text_fingerprint: 'fp',
  minhash: [1, 2],
  copyright_flag: false,
  personal_data_flag: false,
  ai_sheet: { title: 'Sujet ENSP 2023', summary: 'Résumé', keywords: ['maths'] },
};

// Fake pg client: keeps every query, answers the ones publishUpload relies on.
const fakeClient = ({ upload = baseUpload, rewardInserted = true, documentError = null } = {}) => {
  const queries = [];
  return {
    queries,
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.includes('from public.pdf_uploads where id = $1 for update')) return { rows: upload ? [upload] : [] };
      if (sql.includes('insert into public.documents') && documentError) throw documentError;
      if (sql.includes('insert into public.contribution_rewards')) return { rows: rewardInserted ? [{ upload_id: 'u1' }] : [] };
      if (sql.includes("set status = 'rejected'")) return { rows: [{ id: 'u1' }] };
      return { rows: [] };
    },
  };
};
const count = (client, fragment) => client.queries.filter((q) => q.sql.includes(fragment)).length;

test('contribution étudiante publiée → un document et un crédit de 10 coins', async () => {
  const client = fakeClient();
  const result = await publishUpload(client, { uploadId: 'u1', adminAppUserId: 'admin-1' });
  assert.equal(result.credited, true);
  assert.equal(count(client, 'insert into public.documents'), 1);
  const tx = client.queries.find((q) => q.sql.includes('insert into public.app_wallet_transactions'));
  assert.deepEqual(tx.params.slice(0, 3), ['student-1', CONTRIBUTION_REWARD_COINS, 'contribution:u1']);
  assert.match(tx.sql, /'contribution_reward'/);
  assert.equal(client.queries.at(-1).sql, 'commit');
});

test('récompense déjà enregistrée (on conflict) → aucun crédit', async () => {
  const client = fakeClient({ rewardInserted: false });
  const result = await publishUpload(client, { uploadId: 'u1', adminAppUserId: 'admin-1' });
  assert.equal(result.credited, false);
  assert.equal(count(client, 'app_wallets'), 0);
});

test('envoi déjà publié → réponse idempotente, rien de réécrit', async () => {
  const client = fakeClient({ upload: { ...baseUpload, status: 'published', document_id: 'pdf_x' } });
  const result = await publishUpload(client, { uploadId: 'u1', adminAppUserId: 'admin-1' });
  assert.deepEqual([result.alreadyPublished, result.documentId, result.credited], [true, 'pdf_x', false]);
  assert.equal(count(client, 'insert into'), 0);
});

test('hash déjà au catalogue (23505) → 409 et envoi marqué doublon, sans crédit', async () => {
  const client = fakeClient({ documentError: Object.assign(new Error('dup'), { code: '23505' }) });
  await assert.rejects(publishUpload(client, { uploadId: 'u1', adminAppUserId: 'admin-1' }), (e) => e.status === 409);
  assert.equal(count(client, "set status = 'duplicate'"), 1);
  assert.equal(count(client, 'contribution_rewards'), 0);
});

test('doublon probable ou drapeau sans force → 409 et rollback', async () => {
  for (const upload of [{ ...baseUpload, status: 'probable_duplicate' }, { ...baseUpload, copyright_flag: true }]) {
    const client = fakeClient({ upload });
    await assert.rejects(publishUpload(client, { uploadId: 'u1', adminAppUserId: 'a' }), /Confirmation explicite/);
    assert.equal(client.queries.at(-1).sql, 'rollback');
  }
  const forced = fakeClient({ upload: { ...baseUpload, status: 'probable_duplicate' } });
  assert.equal((await publishUpload(forced, { uploadId: 'u1', adminAppUserId: 'a', force: true })).credited, true);
});

test('import admin publié → aucun crédit, pas de contributeur', async () => {
  const client = fakeClient({ upload: { ...baseUpload, source: 'admin', status: 'ready' } });
  const result = await publishUpload(client, { uploadId: 'u1', adminAppUserId: 'admin-1' });
  assert.deepEqual([result.credited, result.contributorId], [false, null]);
  assert.equal(count(client, 'contribution_rewards'), 0);
});

test('envoi refusé ou doublon → non publiable (409)', async () => {
  for (const status of ['duplicate', 'rejected', 'analyzing']) {
    const client = fakeClient({ upload: { ...baseUpload, status } });
    await assert.rejects(publishUpload(client, { uploadId: 'u1', adminAppUserId: 'a' }), (e) => e.status === 409);
  }
});

test('refus : raison obligatoire', async () => {
  await assert.rejects(rejectUpload(fakeClient(), { uploadId: 'u1', adminAppUserId: 'a', reason: ' ' }), (e) => e.status === 400);
  await rejectUpload(fakeClient(), { uploadId: 'u1', adminAppUserId: 'a', reason: 'Document illisible' });
});

test('routes admin : secret de service requis, relais limité à pdf-intake', () => {
  const route = fs.readFileSync(path.resolve('app/api/admin/pdf-intake/[id]/route.ts'), 'utf8');
  assert.ok(route.includes('requireAdminService(request)'));
  const proxy = fs.readFileSync(path.resolve('../recruiter-web/lib/mobile-api-proxy.ts'), 'utf8');
  assert.match(proxy, /PREFIXES = \['templates', 'pdf-intake'\]/);
  const relay = fs.readFileSync(path.resolve('../recruiter-web/app/api/pdf/intake/[[...path]]/route.ts'), 'utf8');
  assert.ok(relay.includes('requireAdminApi()'));
});
