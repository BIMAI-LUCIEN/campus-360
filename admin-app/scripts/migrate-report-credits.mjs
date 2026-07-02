/**
 * Migration: Add report_credits column to app_wallets
 * - report_credits: free reports per billing cycle (subscribers get 3/month)
 * - Initializes existing active subscribers with 3 credits
 */
import { databasePool } from '../lib/database';

async function up() {
  const client = await databasePool.connect();
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
        and u.subscription_tier in ('basic', 'premium')
        and u.subscription_expires_at > now()
        and w.report_credits = 0
      returning w.user_id
    `);
    console.log(`[Migration] Gave ${res.rowCount} active subscribers 3 report credits`);

    await client.query('commit');
    console.log('[Migration] Done');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

up().catch((err) => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
