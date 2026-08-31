import { createHash } from 'node:crypto';

import { databasePool } from './database';

/**
 * Login brute-force protection.
 *
 * Tracks failed sign-in attempts by a composite key of (lower(email), IP). When
 * the per-key counter exceeds `MAX_ATTEMPTS` inside `WINDOW_MS`, further login
 * attempts for that key are blocked with HTTP 429 until the window expires.
 *
 * On successful sign-in, the caller MUST call `recordLoginSuccess` to clear
 * the counter so a legitimate user who mistyped once doesn't get a long lock.
 *
 * Why (email, IP) instead of just email?
 * - email-only would let an attacker lock legitimate users out of their own
 *   account by spamming bad passwords from anywhere.
 * - IP-only would let one attacker lock every user from a shared NAT (corp /
 *   university).
 * - (email, IP) bounds the blast radius to a single user from a single client
 *   and is the standard pattern used by Auth0, AWS Cognito, etc.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type LoginAttemptRow = {
  attempts: number;
  first_attempt_at: Date;
};

const hashKey = (email: string, ip: string) =>
  createHash('sha256').update(`${email.toLowerCase()}|${ip}`).digest('hex');

const ensureTable = async () => {
  await databasePool.query(`
    create table if not exists public.app_login_attempts (
      key text primary key,
      attempts integer not null default 0,
      first_attempt_at timestamptz not null default now(),
      last_attempt_at timestamptz not null default now()
    );
    create index if not exists app_login_attempts_last_idx
      on public.app_login_attempts (last_attempt_at);
  `);
};

let tableEnsured = false;

const keyFromRequest = (request: Request, email: string): { key: string; ip: string } => {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  return { key: hashKey(email, ip), ip };
};

export const checkLoginThrottle = async (request: Request, email: string) => {
  if (!tableEnsured) {
    await ensureTable();
    tableEnsured = true;
  }

  const { key } = keyFromRequest(request, email);

  const result = await databasePool.query<LoginAttemptRow>(
    `select attempts, first_attempt_at
       from public.app_login_attempts
       where key = $1`,
    [key],
  );
  const row = result.rows[0];
  if (!row) return { blocked: false, remainingAttempts: MAX_ATTEMPTS };

  const ageMs = Date.now() - new Date(row.first_attempt_at).getTime();
  if (ageMs > WINDOW_MS) {
    // Window expired — the row is stale, treat as fresh.
    return { blocked: false, remainingAttempts: MAX_ATTEMPTS };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - ageMs) / 1000));
    return { blocked: true, retryAfterSeconds: retryAfter, remainingAttempts: 0 };
  }

  return {
    blocked: false,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - row.attempts),
  };
};

export const recordLoginFailure = async (request: Request, email: string) => {
  if (!tableEnsured) {
    await ensureTable();
    tableEnsured = true;
  }

  const { key } = keyFromRequest(request, email);

  await databasePool.query(
    `insert into public.app_login_attempts (key, attempts, first_attempt_at, last_attempt_at)
       values ($1, 1, now(), now())
     on conflict (key) do update set
       attempts = case
         when public.app_login_attempts.first_attempt_at + interval '15 minutes' <= now()
           then 1
         else public.app_login_attempts.attempts + 1
       end,
       first_attempt_at = case
         when public.app_login_attempts.first_attempt_at + interval '15 minutes' <= now()
           then now()
         else public.app_login_attempts.first_attempt_at
       end,
       last_attempt_at = now()`,
    [key],
  );
};

export const recordLoginSuccess = async (request: Request, email: string) => {
  if (!tableEnsured) {
    await ensureTable();
    tableEnsured = true;
  }
  const { key } = keyFromRequest(request, email);
  await databasePool.query(
    `delete from public.app_login_attempts where key = $1`,
    [key],
  );
};

export const LOGIN_THROTTLE_LIMITS = { MAX_ATTEMPTS, WINDOW_MS } as const;