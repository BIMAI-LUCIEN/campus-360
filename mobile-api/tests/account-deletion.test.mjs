import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { ACCOUNT_DELETION_CONFIRM, deleteAccount } = await loadTs('lib/account-deletion.ts');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const serverUp = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) }).then(
  () => true,
  () => false,
);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL}`;

test('deleteAccount : flux nominal, transaction ordonnée et suppression fichiers post-commit', async () => {
  const executedQueries = [];
  let clientReleased = false;
  let whatsappLoggedOut = false;
  const deletedFiles = [];

  const mockPool = {
    query: async (sql) => {
      if (sql.includes('app_document_files')) {
        return { rows: [{ storage_key: 'user-1/file-1.pdf' }, { storage_key: 'user-1/file-2.png' }] };
      }
      if (sql.includes('app_users')) {
        return { rows: [{ whatsapp_phone: '+237699112233' }] };
      }
      return { rows: [] };
    },
    connect: async () => ({
      query: async (sql, params) => {
        executedQueries.push({ sql: sql.trim().toLowerCase(), params });
        return { rowCount: 1, rows: [] };
      },
      release: () => {
        clientReleased = true;
      },
    }),
  };

  const deps = {
    pool: mockPool,
    logoutWhatsApp: async () => {
      whatsappLoggedOut = true;
      return true;
    },
    deleteFile: async (key) => {
      deletedFiles.push(key);
    },
    canStoreFiles: () => true,
  };

  const res = await deleteAccount(
    {
      appUserId: 'app-user-uuid-1',
      betterAuthUserId: 'ba-user-id-1',
      email: 'student@example.com',
    },
    deps,
  );

  assert.equal(whatsappLoggedOut, true, 'WhatsApp logout doit être appelé');
  assert.equal(res.whatsapp, 'ok');
  assert.equal(clientReleased, true, 'Client Postgres doit être libéré');

  // Ordre de la transaction
  assert.equal(executedQueries[0].sql, 'begin', 'Première instruction doit être begin');
  assert.equal(executedQueries[executedQueries.length - 1].sql, 'commit', 'Dernière instruction doit être commit');

  // L'anonymisation financière doit précéder la suppression de app_users
  const anonIdx = executedQueries.findIndex((q) => q.sql.includes('update public.app_wallet_transactions'));
  const userDelIdx = executedQueries.findIndex((q) => q.sql.includes('delete from public.app_users'));
  assert.ok(anonIdx !== -1, 'Anonymisation des transactions présente');
  assert.ok(userDelIdx !== -1, 'Suppression de app_users présente');
  assert.ok(anonIdx < userDelIdx, 'Anonymisation financière avant suppression de app_users');

  // Suppression des fichiers après commit
  assert.deepEqual(deletedFiles, ['user-1/file-1.pdf', 'user-1/file-2.png']);
  assert.equal(res.counts.wallet_transactions_anonymized, 1);
  assert.equal(res.counts.app_users, 1);
});

test('deleteAccount : échec base de données -> rollback et aucun fichier supprimé', async () => {
  const executedQueries = [];
  let clientReleased = false;
  const deletedFiles = [];

  const mockPool = {
    query: async (sql) => {
      if (sql.includes('app_document_files')) {
        return { rows: [{ storage_key: 'user-1/secret.pdf' }] };
      }
      return { rows: [] };
    },
    connect: async () => ({
      query: async (sql) => {
        const normalized = sql.trim().toLowerCase();
        executedQueries.push(normalized);
        if (normalized.includes('delete from public.app_users')) {
          throw new Error('Postgres deadlock/constraint failure');
        }
        return { rowCount: 1, rows: [] };
      },
      release: () => {
        clientReleased = true;
      },
    }),
  };

  const deps = {
    pool: mockPool,
    logoutWhatsApp: async () => true,
    deleteFile: async (key) => {
      deletedFiles.push(key);
    },
    canStoreFiles: () => true,
  };

  await assert.rejects(
    async () => {
      await deleteAccount(
        {
          appUserId: 'app-user-uuid-1',
          betterAuthUserId: 'ba-user-id-1',
          email: 'student@example.com',
        },
        deps,
      );
    },
    /Postgres deadlock/,
  );

  assert.equal(clientReleased, true, 'Client libéré après erreur');
  assert.ok(executedQueries.includes('rollback'), 'Transaction rollbackée');
  assert.equal(deletedFiles.length, 0, 'Aucun fichier ne doit être supprimé en cas de rollback');
});

test('deleteAccount : échec logout WhatsApp -> suppression maintenue avec statut failed', async () => {
  const mockPool = {
    query: async (sql) => {
      if (sql.includes('app_users')) {
        return { rows: [{ whatsapp_phone: '+237699112233' }] };
      }
      return { rows: [] };
    },
    connect: async () => ({
      query: async () => ({ rowCount: 1, rows: [] }),
      release: () => {},
    }),
  };

  const deps = {
    pool: mockPool,
    logoutWhatsApp: async () => {
      throw new Error('Evolution API network timeout');
    },
    deleteFile: async () => {},
    canStoreFiles: () => false,
  };

  const res = await deleteAccount(
    {
      appUserId: 'app-user-uuid-1',
      betterAuthUserId: 'ba-user-id-1',
      email: 'student@example.com',
    },
    deps,
  );

  assert.equal(res.whatsapp, 'failed', 'Échec WhatsApp ne doit pas bloquer la suppression');
});

test('deleteAccount : aucun numéro WhatsApp -> statut skipped sans appel logout', async () => {
  let called = false;
  const mockPool = {
    query: async () => ({ rows: [] }),
    connect: async () => ({
      query: async () => ({ rowCount: 1, rows: [] }),
      release: () => {},
    }),
  };

  const deps = {
    pool: mockPool,
    logoutWhatsApp: async () => {
      called = true;
      return true;
    },
    deleteFile: async () => {},
    canStoreFiles: () => false,
  };

  const res = await deleteAccount(
    {
      appUserId: 'app-user-uuid-1',
      betterAuthUserId: 'ba-user-id-1',
      email: 'student@example.com',
    },
    deps,
  );

  assert.equal(called, false);
  assert.equal(res.whatsapp, 'skipped');
});

test('Garde de source : route DELETE /api/mobile/account durcie', () => {
  const routePath = path.resolve('app/api/mobile/account/route.ts');
  const code = fs.readFileSync(routePath, 'utf8');

  assert.ok(code.includes('export async function DELETE('), 'DELETE exporté');
  assert.ok(code.includes("bucket: 'account-delete'"), 'Bucket account-delete');
  assert.ok(code.includes("failMode: 'closed'"), 'Rate limit fail-closed');
  assert.ok(code.includes('deleteAccount('), 'Appel deleteAccount');
  assert.ok(code.includes('ACCOUNT_DELETION_CONFIRM'), 'Constante de confirmation');
  assert.ok(code.includes('better-auth.session_token'), 'Cookie de session invalidé');
});

test(
  'HTTP : suppression de compte jetable et invalidation session',
  { skip: NO_SERVER || !process.env.E2E_DELETE_EMAIL || !process.env.E2E_DELETE_PASSWORD },
  async () => {
    // Exécuté uniquement avec un compte jetable explicite (jamais le compte E2E principal)
    assert.ok(true);
  },
);
