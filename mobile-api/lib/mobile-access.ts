import { NextRequest, NextResponse } from 'next/server';
import type { PoolClient } from 'pg';

import { auth } from './auth';
import { databasePool } from './database';
import { RateLimitError, rateLimit } from './rate-limit';

export type MobileUser = {
  id: string;
  betterAuthUserId: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  whatsappPhone?: string;
  university?: string;
  faculty?: string;
  level?: string;
  subscription_tier?: string;
  subscription_expires_at?: string | null;
};

type AuthSessionUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  phone?: string;
  whatsappPhone?: string;
  university?: string;
  faculty?: string;
  level?: string;
};

const adminEmails = () =>
  new Set(
    [process.env.ADMIN_BOOTSTRAP_EMAIL, ...(process.env.ADMIN_ALLOWED_EMAILS ?? '').split(',')]
      .map((email) => email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );

const mapUser = (row: Record<string, unknown>): MobileUser => ({
  id: String(row.id),
  betterAuthUserId: String(row.better_auth_user_id),
  email: String(row.email),
  name: String(row.name),
  role: String(row.role),
  phone: row.phone ? String(row.phone) : undefined,
  whatsappPhone: row.whatsapp_phone ? String(row.whatsapp_phone) : undefined,
  university: row.university ? String(row.university) : undefined,
  faculty: row.faculty ? String(row.faculty) : undefined,
  level: row.level ? String(row.level) : undefined,
  subscription_tier: row.subscription_tier ? String(row.subscription_tier) : 'free',
  subscription_expires_at: row.subscription_expires_at
    ? new Date(row.subscription_expires_at as string).toISOString()
    : null,
});

const copyLegacyData = async (client: PoolClient, appUserId: string, legacyUserId: string) => {
  await client.query(
    `insert into public.app_document_purchases (document_id, buyer_id, amount_coins, created_at)
     select document_id, $1, amount_coins, created_at
     from public.document_purchases where buyer_id = $2
     on conflict (document_id, buyer_id) do nothing`,
    [appUserId, legacyUserId],
  );
  await client.query(
    `insert into public.app_pack_purchases (pack_id, buyer_id, amount_coins, document_ids, created_at)
     select pack_id, $1, amount_coins, document_ids, created_at
     from public.pack_purchases where buyer_id = $2
     on conflict (pack_id, buyer_id) do nothing`,
    [appUserId, legacyUserId],
  );
  await client.query(
    `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status, created_at)
     select $1, type, amount_coins, reference_id, status, created_at
     from public.wallet_transactions where user_id = $2`,
    [appUserId, legacyUserId],
  );
};

export const ensureMobileUser = async (authUser: AuthSessionUser): Promise<MobileUser> => {
  const existing = await databasePool.query(
    'select * from public.app_users where better_auth_user_id = $1 limit 1',
    [authUser.id],
  );
  if (existing.rows[0]) return mapUser(existing.rows[0]);

  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const email = authUser.email.trim().toLowerCase();
    const legacy = await client.query(
      `select p.*, w.balance_coins
       from public.profiles p
       left join public.wallets w on w.user_id = p.id
       where lower(p.email) = $1 limit 1`,
      [email],
    );
    const legacyRow = legacy.rows[0] as Record<string, unknown> | undefined;
    const role = adminEmails().has(email) ? 'admin' : String(authUser.role ?? legacyRow?.role ?? 'student');
    const inserted = await client.query(
      `insert into public.app_users (
         id, better_auth_user_id, legacy_supabase_user_id, email, name, role, phone, whatsapp_phone, university, faculty, level
       ) values (
         coalesce($1::uuid, gen_random_uuid()), $2, $1::uuid, $3, $4, $5, $6, $7, $8, $9, $10
       )
       on conflict (email) do update set
         better_auth_user_id = excluded.better_auth_user_id,
         name = excluded.name,
         role = excluded.role,
         phone = coalesce(excluded.phone, public.app_users.phone),
         whatsapp_phone = coalesce(excluded.whatsapp_phone, public.app_users.whatsapp_phone),
         university = coalesce(excluded.university, public.app_users.university),
         faculty = coalesce(excluded.faculty, public.app_users.faculty),
         level = coalesce(excluded.level, public.app_users.level),
         updated_at = now()
       returning *`,
      [
        legacyRow?.id ?? null,
        authUser.id,
        email,
        authUser.name || legacyRow?.name || email,
        role,
        authUser.phone || legacyRow?.phone || null,
        authUser.whatsappPhone || legacyRow?.whatsapp_phone || null,
        authUser.university || legacyRow?.university || null,
        authUser.faculty || legacyRow?.faculty || null,
        authUser.level || legacyRow?.level || null,
      ],
    );
    const appUser = mapUser(inserted.rows[0]);

    await client.query(
      `insert into public.app_wallets (user_id, balance_coins)
       values ($1, $2)
       on conflict (user_id) do nothing`,
      [appUser.id, Number(legacyRow?.balance_coins ?? 5000)],
    );
    if (legacyRow?.id) await copyLegacyData(client, appUser.id, String(legacyRow.id));

    await client.query('commit');
    return appUser;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
};

// Per-user daily read budget. Reads (signed URLs, account, events) are cheap
// but should still be bounded so a single user can't burn DB cycles.
const DEFAULT_USER_READ_LIMIT_PER_MIN = 120;

// Mutations are tighter. Wallet operations especially need hard caps.
export type MobileAccessOptions = {
  readBudgetPerMinute?: number;
};

export const requireMobileUser = async (
  request: NextRequest,
  options: MobileAccessOptions = {},
) => {
  let headers = request.headers;
  
  // Support session token in query parameter for Linking.openURL on mobile PDF exports
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (token) {
    const newHeaders = new Headers(request.headers);
    newHeaders.set('Authorization', `Bearer ${token}`);
    headers = newHeaders;
  }

  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Session requise.' }, { status: 401 }),
    };
  }

  const budget = options.readBudgetPerMinute ?? DEFAULT_USER_READ_LIMIT_PER_MIN;

  // Per-user rate limit. Falls back to IP for unauthenticated attempts (should
  // never happen because we check session first, but defensive).
  try {
    await rateLimit(request, {
      bucket: `user:${session.user.id}`,
      max: budget,
      windowMs: 60_000,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        user: null,
        response: NextResponse.json(
          { error: error.message, retryAfter: error.retryAfterSeconds },
          {
            status: 429,
            headers: { 'Retry-After': String(error.retryAfterSeconds) },
          },
        ),
      };
    }
    throw error;
  }

  const user = await ensureMobileUser(session.user as AuthSessionUser);
  return { user, response: null };
};

export class MobileApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const mobileErrorResponse = (error: unknown) => {
  if (error instanceof MobileApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message, retryAfter: error.retryAfterSeconds },
      {
        status: 429,
        headers: { 'Retry-After': String(error.retryAfterSeconds) },
      },
    );
  }
  console.error('Mobile API error', error);
  return NextResponse.json(
    { error: 'Service momentanement indisponible.' },
    { status: 500 },
  );
};
