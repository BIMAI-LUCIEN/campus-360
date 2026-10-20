#!/usr/bin/env node
/**
 * Database migration runner for Campus 360 mobile-api.
 * Reads SQL migrations from mobile-api/sql/*.sql, tracks applied migrations
 * in public.schema_migrations with SHA-256 checksums, and executes unapplied migrations.
 *
 * Usage:
 *   node scripts/migrate.mjs
 *   node scripts/migrate.mjs --dry-run
 *   node scripts/migrate.mjs --help
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/migrate.mjs [--dry-run] [--help]');
  process.exit(0);
}

const isDryRun = process.argv.includes('--dry-run');

// Locate SQL directory
const sqlDir = path.resolve(__dirname, '../sql');

// 1. Resolve DATABASE_URL securely without leaking secrets
export const resolveDatabaseUrl = (overrideUrl) => {
  if (overrideUrl) return overrideUrl;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const candidateEnvFiles = [
    path.resolve(__dirname, '../.env.production'),
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../.env'),
    path.resolve(process.cwd(), '.env.production'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env')
  ];

  for (const envFile of candidateEnvFiles) {
    if (!fs.existsSync(envFile)) continue;
    try {
      const content = fs.readFileSync(envFile, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^DATABASE_URL=(.*)$/);
        if (match && match[1]) {
          return match[1].trim().replace(/^['"]|['"]$/g, '');
        }
      }
    } catch {
      // Ignore read error
    }
  }

  return undefined;
};

export const calculateChecksum = (content) => {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
};

export async function run(customDbUrl, dryRunFlag = isDryRun) {
  if (!fs.existsSync(sqlDir)) {
    throw new Error(`Répertoire SQL introuvable : ${sqlDir}`);
  }

  const databaseUrl = resolveDatabaseUrl(customDbUrl);
  if (!databaseUrl) {
    throw new Error("DATABASE_URL absente de l'environnement et des fichiers .env.");
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
    }
  });

  const client = await pool.connect();
  try {
    // 2. Ensure schema_migrations table exists
    if (!dryRunFlag) {
      await client.query(`
        create table if not exists public.schema_migrations (
          name text primary key,
          checksum text not null,
          applied_at timestamptz not null default now()
        );
      `);
    }

    // Read applied migrations if table exists
    let appliedMap = new Map();
    try {
      const { rows } = await client.query('select name, checksum, applied_at from public.schema_migrations order by name asc');
      for (const row of rows) {
        appliedMap.set(row.name, row.checksum);
      }
    } catch (err) {
      // In dry-run on a fresh DB, the table might not exist yet
      if (!dryRunFlag) throw err;
    }

    // 3. Read and sort SQL files
    const files = fs.readdirSync(sqlDir)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
      console.log('[migrate] Aucun fichier de migration trouvé.');
      return;
    }

    console.log(`[migrate] ${files.length} fichier(s) de migration détecté(s)${dryRunFlag ? ' [DRY-RUN]' : ''}.`);

    for (const filename of files) {
      const filePath = path.join(sqlDir, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      const checksum = calculateChecksum(content);

      if (appliedMap.has(filename)) {
        const appliedChecksum = appliedMap.get(filename);
        if (appliedChecksum !== checksum) {
          throw new Error(`La migration ${filename} a été modifiée après application. Crée une nouvelle migration.`);
        }
        console.log(`déjà appliquée : ${filename}`);
        continue;
      }

      if (dryRunFlag) {
        console.log(`[dry-run] à appliquer : ${filename}`);
        continue;
      }

      // Check for -- migrate:no-transaction header
      const firstLine = content.split(/\r?\n/)[0]?.trim() || '';
      const noTransaction = firstLine === '-- migrate:no-transaction';

      if (noTransaction) {
        console.log(`[migrate] Exécution sans transaction : ${filename}...`);
        await client.query(content);
        await client.query(
          'insert into public.schema_migrations (name, checksum, applied_at) values ($1, $2, now())',
          [filename, checksum]
        );
      } else {
        await client.query('BEGIN');
        try {
          await client.query(content);
          await client.query(
            'insert into public.schema_migrations (name, checksum, applied_at) values ($1, $2, now())',
            [filename, checksum]
          );
          await client.query('COMMIT');
        } catch (migrationErr) {
          await client.query('ROLLBACK').catch(() => {});
          throw migrationErr;
        }
      }

      console.log(`appliquée : ${filename}`);
    }

    console.log(`[migrate] Terminé avec succès${dryRunFlag ? ' (simulation)' : ''}.`);
  } finally {
    client.release();
    await pool.end();
  }
}

const isMain = process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(__filename) ||
  process.argv[1].endsWith('migrate.mjs')
);

if (isMain) {
  run().catch((err) => {
    console.error(`[migrate] Échec de la migration : ${err.message}`);
    process.exit(1);
  });
}
