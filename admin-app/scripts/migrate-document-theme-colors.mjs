/**
 * Migration: Add theme color columns to app_documents
 * - primary_color: hex color used for H1 in preview/cover (default emerald-500)
 * - secondary_color: hex color used for H2 in preview/cover (default slate-500)
 *
 * The columns are NOT NULL with a default, so existing rows backfill
 * automatically on ALTER and the editor doesn't have to handle null.
 *
 * Idempotent: re-running is safe (add column if not exists).
 *
 * Note: We connect to PG directly instead of importing `lib/database.ts`
 * because Node ESM can't resolve `.ts` extensions without a loader, and
 * we don't want to pull in tsx/ts-node just for a one-shot script.
 */
import fs from 'node:fs';
import { Client } from 'pg';

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv('.env.local');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing.');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query('begin');

  // 1. Add primary_color (H1 — titres principaux)
  await client.query(`
    alter table public.app_documents
    add column if not exists primary_color text not null default '#10B981'
  `);
  console.log('[Migration] Added primary_color column to app_documents');

  // 2. Add secondary_color (H2 — sous-titres)
  await client.query(`
    alter table public.app_documents
    add column if not exists secondary_color text not null default '#64748B'
  `);
  console.log('[Migration] Added secondary_color column to app_documents');

  // 3. Sanity-check: count rows that got the default applied
  const res = await client.query(`
    select
      count(*) filter (where primary_color = '#10B981')   as primary_default_count,
      count(*) filter (where secondary_color = '#64748B') as secondary_default_count,
      count(*)                                              as total_rows
    from public.app_documents
  `);
  const row = res.rows[0];
  console.log(
    `[Migration] app_documents totals: ${row.total_rows} rows, ` +
    `${row.primary_default_count} on default primary, ` +
    `${row.secondary_default_count} on default secondary`
  );

  await client.query('commit');
  console.log('[Migration] Done');
} catch (err) {
  await client.query('rollback');
  console.error('[Migration] Failed:', err);
  process.exit(1);
} finally {
  await client.end();
}