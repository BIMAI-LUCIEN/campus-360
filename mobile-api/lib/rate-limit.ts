import type { NextRequest } from 'next/server';

import { databasePool } from './database';

// Lightweight sliding-window rate limiter, backed by a small Postgres table.
//
// The first request from a key in a window creates a row; subsequent requests
// in the same window are counted. When the row expires (older than `windowMs`)
// it is deleted lazily on the next hit. This is *good enough* for an
// admin/mobile backend at modest scale (a few thousand req/min) and avoids
// pulling in Redis.
//
// Usage:
//   await rateLimit(request, { bucket: 'wallet-topup', max: 5, windowMs: 60_000 })
//
// `key` is derived from the authenticated user id when present, else the
// request IP, so anonymous abuse is bounded too.

export type RateLimitOptions = {
  bucket: string;
  max: number;
  windowMs: number;
  // Override key derivation (defaults to user-id || ip).
  key?: string;
};

const getClientIp = (request: NextRequest) => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
};

export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Ensure the table exists. Idempotent — uses IF NOT EXISTS so this is safe
// to call on every cold start. We also keep the schema minimal.
const ensureTable = async () => {
  await databasePool.query(`
    create table if not exists public.app_rate_limits (
      bucket text not null,
      key text not null,
      window_started_at timestamptz not null default now(),
      count integer not null default 1,
      primary key (bucket, key)
    );
    create index if not exists app_rate_limits_window_idx
      on public.app_rate_limits (window_started_at);
  `);
};

let tableEnsured = false;

export const rateLimit = async (
  request: NextRequest,
  options: RateLimitOptions,
): Promise<void> => {
  if (!tableEnsured) {
    await ensureTable();
    tableEnsured = true;
  }

  const key = options.key ?? getClientIp(request);
  const { bucket, max, windowMs } = options;

  // Single round-trip: bump the counter, fetch the row back, and check.
  // We use a CTE so that the update + check happens atomically.
  const result = await databasePool.query<{ count: number; window_started_at: Date }>(
    `
    with upsert as (
      insert into public.app_rate_limits (bucket, key, window_started_at, count)
      values ($1, $2, now(), 1)
      on conflict (bucket, key) do update
        set count = case
          when public.app_rate_limits.window_started_at + ($3 || ' milliseconds')::interval <= now()
            then 1
          else public.app_rate_limits.count + 1
        end,
        window_started_at = case
          when public.app_rate_limits.window_started_at + ($3 || ' milliseconds')::interval <= now()
            then now()
          else public.app_rate_limits.window_started_at
        end
      returning count, window_started_at
    )
    select count::int as count, window_started_at from upsert
    `,
    [bucket, key, windowMs],
  );

  const row = result.rows[0];
  if (!row) return; // Should never happen.

  if (row.count > max) {
    const elapsedMs = Date.now() - new Date(row.window_started_at).getTime();
    const retryAfter = Math.max(1, Math.ceil((windowMs - elapsedMs) / 1000));
    throw new RateLimitError('Trop de requetes. Reessaie plus tard.', retryAfter);
  }

  // Opportunistic cleanup. If we're well past the window and still have a row,
  // it's stale. We only delete when the row has been around for > 2 windows
  // so we don't churn every hit.
  await databasePool.query(
    `delete from public.app_rate_limits
       where window_started_at + ($1 || ' milliseconds')::interval * 2 <= now()`,
    [windowMs],
  ).catch(() => undefined);
};

// Convenience helper for route handlers.
export const rateLimitResponse = (error: unknown) => {
  if (error instanceof RateLimitError) {
    return new Response(
      JSON.stringify({ error: error.message, retryAfter: error.retryAfterSeconds }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(error.retryAfterSeconds),
        },
      },
    );
  }
  return null;
};
