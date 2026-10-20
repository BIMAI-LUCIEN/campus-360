import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { calculateChecksum } from '../scripts/migrate.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sqlDir = path.join(rootDir, 'sql');
const libDir = path.join(rootDir, 'lib');

test('Garde de source : chaque migration dans mobile-api/sql/ est idempotente', () => {
  const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql'));
  assert.ok(files.length >= 10, 'Au moins 10 fichiers SQL attendus');

  for (const file of files) {
    const content = fs.readFileSync(path.join(sqlDir, file), 'utf8');

    // Strip comments to only analyze real SQL statements
    const cleanLines = content
      .split(/\r?\n/)
      .filter(l => !l.trim().startsWith('--'))
      .join('\n');

    // 1. Every CREATE TABLE must have IF NOT EXISTS
    const createTableRegex = /create\s+table\s+(?!if\s+not\s+exists)/gi;
    const badCreateTable = createTableRegex.exec(cleanLines);
    assert.strictEqual(
      badCreateTable,
      null,
      `[${file}] CREATE TABLE doit obligatoirement inclure IF NOT EXISTS`
    );

    // 2. Every ADD COLUMN must have IF NOT EXISTS
    const addColumnRegex = /add\s+column\s+(?!if\s+not\s+exists)/gi;
    const badAddColumn = addColumnRegex.exec(cleanLines);
    assert.strictEqual(
      badAddColumn,
      null,
      `[${file}] ADD COLUMN doit obligatoirement inclure IF NOT EXISTS`
    );

    // 3. Every CREATE TYPE must be handled with exception when duplicate_object
    const createTypeRegex = /create\s+type\s+([a-zA-Z0-9_]+)/gi;
    let match;
    while ((match = createTypeRegex.exec(cleanLines)) !== null) {
      assert.ok(
        cleanLines.includes('exception when duplicate_object'),
        `[${file}] CREATE TYPE ${match[1]} doit être dans un bloc exception when duplicate_object`
      );
    }
  }
});

test('Garde de source : aucune instruction CREATE TABLE dynamique dans mobile-api/lib', () => {
  const libFiles = fs.readdirSync(libDir).filter(f => f.endsWith('.ts'));

  for (const file of libFiles) {
    const content = fs.readFileSync(path.join(libDir, file), 'utf8');
    const match = /create\s+table/gi.exec(content);
    assert.strictEqual(
      match,
      null,
      `[${file}] Aucune création de table dynamique ne doit subsister dans mobile-api/lib`
    );
  }
});

test('migrate.mjs : calcul checksum SHA-256 et détection du header no-transaction', () => {
  const scriptContent = fs.readFileSync(path.join(rootDir, 'scripts/migrate.mjs'), 'utf8');
  assert.ok(scriptContent.includes("crypto.createHash('sha256')"), 'Checksum SHA-256 utilisé');
  assert.ok(scriptContent.includes('-- migrate:no-transaction'), 'Prise en charge du flag no-transaction');
  assert.ok(scriptContent.includes('public.schema_migrations'), 'Table de tracking public.schema_migrations présente');

  const hash1 = calculateChecksum('select 1;');
  const hash2 = calculateChecksum('select 1;');
  const hash3 = calculateChecksum('select 2;');
  assert.strictEqual(hash1, hash2);
  assert.notStrictEqual(hash1, hash3);
});

test('migrate.mjs CLI : support du drapeau --help', () => {
  const out = execSync(`node scripts/migrate.mjs --help`, {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert.ok(out.includes('Usage: node scripts/migrate.mjs'), 'Message d’usage affiché');
});

test('Exécution sur base de test réelle (skip si MIGRATE_TEST_DATABASE_URL absente)', {
  skip: !process.env.MIGRATE_TEST_DATABASE_URL
}, () => {
  const testDbUrl = process.env.MIGRATE_TEST_DATABASE_URL;

  // 1ère passe : applique toutes les migrations
  const run1 = execSync('node scripts/migrate.mjs', {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: testDbUrl }
  });
  assert.ok(run1.includes('Terminé avec succès'), 'Première passe terminée avec succès');

  // 2ème passe : idempotence complète, toutes déjà appliquées
  const run2 = execSync('node scripts/migrate.mjs', {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: testDbUrl }
  });
  assert.ok(run2.includes('Terminé avec succès'), 'Deuxième passe terminée avec succès');
  assert.ok(!run2.includes('appliquée : 00'), 'Aucune nouvelle migration ré-appliquée');
});
