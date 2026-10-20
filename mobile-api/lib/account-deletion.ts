import type { Pool } from 'pg';

export const ACCOUNT_DELETION_CONFIRM = 'SUPPRIMER';

export interface AccountDeletionInput {
  appUserId: string;
  betterAuthUserId: string;
  email: string;
}

export interface AccountDeletionDeps {
  pool: Pool;
  logoutWhatsApp: () => Promise<boolean>;
  deleteFile: (key: string) => Promise<void>;
  canStoreFiles: () => boolean;
}

export interface AccountDeletionResult {
  counts: Record<string, number>;
  whatsapp: 'ok' | 'failed' | 'skipped';
}

export const deleteAccount = async (
  input: AccountDeletionInput,
  deps: AccountDeletionDeps,
): Promise<AccountDeletionResult> => {
  // 1. Before transaction: read stored file keys and WhatsApp configuration
  const filesRes = await deps.pool.query<{ storage_key: string | null }>(
    'select storage_key from public.app_document_files where user_id = $1',
    [input.appUserId],
  );
  const storageKeys = filesRes.rows
    .map((row) => row.storage_key)
    .filter((k): k is string => typeof k === 'string' && k.length > 0);

  const userRes = await deps.pool.query<{ whatsapp_phone: string | null }>(
    'select whatsapp_phone from public.app_users where id = $1',
    [input.appUserId],
  );
  let waNumber = userRes.rows[0]?.whatsapp_phone;
  if (!waNumber) {
    const studentRes = await deps.pool.query<{ phone_whatsapp: string | null }>(
      'select phone_whatsapp from public.stage_students where app_user_id = $1 or auth_id = $2 or lower(email) = lower($3) limit 1',
      [input.appUserId, input.betterAuthUserId, input.email],
    );
    waNumber = studentRes.rows[0]?.phone_whatsapp;
  }

  let whatsappStatus: 'ok' | 'failed' | 'skipped' = 'skipped';
  if (waNumber) {
    try {
      const loggedOut = await deps.logoutWhatsApp();
      whatsappStatus = loggedOut ? 'ok' : 'failed';
    } catch {
      whatsappStatus = 'failed';
    }
  }

  // 2. Transaction: anonymize finances and purge user data
  const client = await deps.pool.connect();
  const counts: Record<string, number> = {};

  try {
    await client.query('begin');

    // Financial audit trail: anonymize user_id, keep transaction rows intact
    const txRes = await client.query(
      'update public.app_wallet_transactions set user_id = null, anonymized_at = now() where user_id = $1',
      [input.appUserId],
    );
    counts.wallet_transactions_anonymized = txRes.rowCount ?? 0;

    // Purge document events
    const eventsRes = await client.query(
      'delete from public.document_events where user_id = $1 or better_auth_user_id = $2',
      [input.appUserId, input.betterAuthUserId],
    );
    counts.document_events = eventsRes.rowCount ?? 0;

    // Purge stage student profile and cascaded applications
    const studentsRes = await client.query(
      'delete from public.stage_students where app_user_id = $1 or auth_id = $2 or lower(email) = lower($3)',
      [input.appUserId, input.betterAuthUserId, input.email],
    );
    counts.stage_students = studentsRes.rowCount ?? 0;

    // Purge user rate limit rows
    const rateLimitsRes = await client.query(
      "delete from public.app_rate_limits where bucket = 'user:' || $1 or key in ($2, $1)",
      [input.betterAuthUserId, input.appUserId],
    );
    counts.rate_limits = rateLimitsRes.rowCount ?? 0;

    // Delete app_user (cascades to wallets, purchases, user files, chunks, sections, documents)
    const appUsersRes = await client.query(
      'delete from public.app_users where id = $1',
      [input.appUserId],
    );
    counts.app_users = appUsersRes.rowCount ?? 0;

    // Delete Better Auth records
    const sessRes = await client.query(
      'delete from public."session" where "userId" = $1',
      [input.betterAuthUserId],
    );
    counts.sessions = sessRes.rowCount ?? 0;

    const accRes = await client.query(
      'delete from public."account" where "userId" = $1',
      [input.betterAuthUserId],
    );
    counts.accounts = accRes.rowCount ?? 0;

    const verifRes = await client.query(
      'delete from public."verification" where identifier ilike \'%\' || $1 || \'%\'',
      [input.email],
    );
    counts.verifications = verifRes.rowCount ?? 0;

    const baUserRes = await client.query(
      'delete from public."user" where id = $1',
      [input.betterAuthUserId],
    );
    counts.better_auth_users = baUserRes.rowCount ?? 0;

    // Record deletion event in audit log (zero personal data stored)
    await client.query(
      'insert into public.app_account_deletions (counts, whatsapp_logout) values ($1, $2)',
      [JSON.stringify(counts), whatsappStatus],
    );

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  // 3. After commit only: remove uploaded physical files from VPS disk
  if (deps.canStoreFiles() && storageKeys.length > 0) {
    await Promise.allSettled(storageKeys.map((k) => deps.deleteFile(k)));
  }

  return { counts, whatsapp: whatsappStatus };
};
