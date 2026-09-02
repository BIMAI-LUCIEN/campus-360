/**
 * Migration: Add report_credits column to app_wallets
 * - report_credits: free reports per billing cycle (subscribers get 3/month)
 * - Initializes existing active subscribers with 3 credits
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

  // 1. Add column
  await client.query(`
    alter table public.app_wallets
    add column if not exists report_credits integer not null default 0
  `);
  console.log('[Migration] Added report_credits column to app_wallets');

  // 2. Give active subscribers 3 free reports (one-time boost)
  const res = await client.query(`
    update public.app_wallets w
    set report_credits = 3
    from public.app_users u
    where w.user_id = u.id
      and u.subscription_tier in ('basic', 'pro', 'elite')
      and u.subscription_expires_at > now()
      and w.report_credits = 0
    returning w.user_id
  `);
  console.log(`[Migration] Gave ${res.rowCount} active subscribers 3 report credits`);

  await client.query('commit');
  console.log('[Migration] Done');
} catch (err) {
  await client.query('rollback');
  console.error('[Migration] Failed:', err);
  process.exit(1);
} finally {
  await client.end();
}
