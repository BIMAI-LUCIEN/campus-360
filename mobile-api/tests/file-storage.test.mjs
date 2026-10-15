import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campus360-uploads-'));
process.env.UPLOAD_ROOT = root;
delete process.env.VERCEL;

const storage = await loadTs('lib/file-storage.ts');
const USER = '0f8b6a52-1d2c-4b8e-9a7f-3c5d6e7f8a9b';

test('un chemin qui sort de la racine est refusé', () => {
  for (const key of ['../../etc/passwd', '/etc/passwd', `${USER}/../../x.txt`, 'C:\\Windows\\win.ini', '']) {
    assert.throws(() => storage.resolveStoragePath(key), /invalide|hors/);
  }
});

test('une extension non autorisée est refusée', () => {
  assert.throws(() => storage.buildStorageKey(USER, 'exe'), /Extension/);
  assert.throws(() => storage.buildStorageKey('pas-un-uuid', 'png'), /Utilisateur/);
});

test('écriture puis lecture et suppression d’un fichier', async () => {
  const data = Buffer.from('bonjour campus');
  const key = await storage.saveFile(USER, 'txt', data);
  assert.match(key, new RegExp(`^${USER}/[0-9a-f-]{36}\\.txt$`));
  assert.ok(storage.resolveStoragePath(key).startsWith(root));
  assert.deepEqual(await storage.readStoredFile(key), data);
  assert.equal(await storage.storedFileExists(key), true);
  await storage.deleteStoredFile(key);
  assert.equal(await storage.storedFileExists(key), false);
  await storage.deleteStoredFile(key); // idempotent
});

test('aucune écriture sur Vercel (pas de disque persistant)', async () => {
  process.env.VERCEL = '1';
  try {
    await assert.rejects(storage.saveFile(USER, 'txt', Buffer.from('x')), /indisponible/);
  } finally {
    delete process.env.VERCEL;
  }
});

test.after(() => fs.rmSync(root, { recursive: true, force: true }));
