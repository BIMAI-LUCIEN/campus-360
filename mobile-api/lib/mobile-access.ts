import { MobileApiError } from './mobile-error';
export { MobileApiError };
import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseUnavailable } from './db-errors';
import { resolveStartingCoins } from './free-launch';
import type { PoolClient } from 'pg';
import { ZodError } from 'zod';

import { auth } from './auth';
import { databasePool } from './database';
import { isTrustedOrigin } from './origins';
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
  emailVerified?: boolean;
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
  try {
    const existing = await databasePool.query(
      'select * from public.app_users where better_auth_user_id = $1 limit 1',
      [authUser.id],
    );
    if (existing.rows[0]) return mapUser(existing.rows[0]);

    const client = await databasePool.connect();
    try {
      await client.query('begin');
      const email = authUser.email.trim().toLowerCase();
      // Legacy data (wallet, purchases) is matched by email only: never hand it
      // to an account whose email is not verified.
      const legacy = authUser.emailVerified !== true ? { rows: [] } : await client.query(
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
         where public.app_users.better_auth_user_id is null
            or public.app_users.better_auth_user_id = excluded.better_auth_user_id
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
      if (!inserted.rows[0]) {
        throw new MobileApiError('Cette adresse e-mail est déjà liée à un autre compte.', 409);
      }
      const appUser = mapUser(inserted.rows[0]);

      await client.query(
        `insert into public.app_wallets (user_id, balance_coins)
         values ($1, $2)
         on conflict (user_id) do nothing`,
        [appUser.id, Number(legacyRow?.balance_coins ?? resolveStartingCoins(process.env))],
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
  } catch (err) {
    if (err instanceof MobileApiError) throw err;
    // Never fabricate an identity or a paid tier when the DB is unavailable.
    console.error('[mobile-access] Database query failed in ensureMobileUser:', err);
    throw new MobileApiError('Service temporairement indisponible.', 503);
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
  // The session comes from the cookie or the Authorization header only: a token
  // in the URL would end up in logs and browser history.
  const headers = request.headers;

  let session = await auth.api.getSession({ headers }).catch(() => null);

  // Resilient fallback: if getSession didn't resolve, check Authorization Bearer header or Cookie in session table
  if (!session?.user) {
    const authHeader = headers.get('authorization') || headers.get('Authorization');
    const cookieHeader = headers.get('cookie') || headers.get('Cookie');
    let sessionToken = '';
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      sessionToken = authHeader.slice(7).trim();
    } else if (cookieHeader) {
      const match = cookieHeader.match(/(?:better-auth\.session_token|__Secure-better-auth\.session_token)=([^;]+)/);
      if (match) sessionToken = match[1];
    }

    if (sessionToken) {
      const rawToken = sessionToken.split('.')[0];
      try {
        const dbSession = await databasePool.query(
          `select s."userId", s."expiresAt", u.id, u.email, u.name, u.role, u."emailVerified"
           from public."session" s
           join public."user" u on u.id = s."userId"
           where (s.token = $1 or s.token = $2) and s."expiresAt" > now()
           order by s."expiresAt" desc
           limit 1`,
          [sessionToken, rawToken],
        );
        if (dbSession.rows[0]) {
          const row = dbSession.rows[0];
          session = {
            user: {
              id: String(row.id),
              email: String(row.email),
              name: String(row.name),
              role: String(row.role || 'student'),
              emailVerified: row.emailVerified === true,
            },
            session: {
              id: String(row.id),
              userId: String(row.userId),
              expiresAt: row.expiresAt,
            },
          } as any;
        }
      } catch (err) {
        console.warn('[mobile-access] Direct DB session fallback check error:', err);
      }
    }
  }

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


export const withCors = (
  response: NextResponse,
  request?: NextRequest | Request | null,
): NextResponse => {
  const origin = request?.headers?.get('origin');
  if (origin && isTrustedOrigin(origin, process.env)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  } else if (!origin) {
    // Native mobile clients (React Native / Expo) do not send an Origin header
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Expo-Origin, x-client-info, apikey, X-Requested-With, X-N8N-API-KEY',
  );
  // DevSecOps Hardening Headers (OWASP)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return response;
};

export const mobileErrorResponse = (error: unknown, request?: NextRequest | Request | null) => {
  if (error instanceof MobileApiError) {
    return withCors(NextResponse.json({ error: error.message }, { status: error.status }), request);
  }
  if (error instanceof RateLimitError) {
    return withCors(
      NextResponse.json(
        { error: error.message, retryAfter: error.retryAfterSeconds },
        {
          status: 429,
          headers: { 'Retry-After': String(error.retryAfterSeconds) },
        },
      ),
      request,
    );
  }
  if (error instanceof ZodError) {
    return withCors(NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }), request);
  }
  if (typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505') {
    return withCors(NextResponse.json({ error: 'Cet achat a deja ete effectue.' }, { status: 409 }), request);
  }
  console.error('Mobile API error', error);
  const isDbDown = isDatabaseUnavailable(error);
  return withCors(
    NextResponse.json(
      isDbDown
        ? { error: 'Service momentanément indisponible. Réessaie dans un instant.', offline: true }
        : { error: 'Service momentanement indisponible.' },
      { status: isDbDown ? 503 : 500 },
    ),
    request,
  );
};
