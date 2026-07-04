import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Diagnostic endpoint — shows EXACTLY what's missing or broken in the
  // Better Auth config. NEVER expose this in production after debugging.

  const checks: Record<string, unknown> = {
    env: {
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET
        ? `set (${process.env.BETTER_AUTH_SECRET.length} chars)`
        : 'MISSING',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'MISSING (will default)',
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'MISSING',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID
        ? `set (${process.env.GOOGLE_CLIENT_ID.length} chars)`
        : 'MISSING',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
        ? `set (${process.env.GOOGLE_CLIENT_SECRET.length} chars)`
        : 'MISSING',
      SUPABASE_URL: process.env.SUPABASE_URL ?? 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? 'set'
        : 'MISSING',
      NODE_ENV: process.env.NODE_ENV ?? 'unknown',
      VERCEL_ENV: process.env.VERCEL_ENV ?? 'not on vercel',
    },
    auth_init: null as unknown,
    db_connect: null as unknown,
  };

  // Try to import auth — this is where 500 happens
  try {
    const { auth } = await import('@/lib/auth');
    checks.auth_init = 'OK';

    // Try a DB ping
    try {
      const { databasePool } = await import('@/lib/database');
      const result = await databasePool.query('SELECT 1 as ok');
      checks.db_connect = `OK (result: ${JSON.stringify(result.rows)})`;
    } catch (dbErr) {
      const dbUrl = process.env.DATABASE_URL ?? '';
      checks.db_connect = `FAILED: ${(dbErr as Error).message}`;
      checks.db_url = {
        host: (() => { try { return new URL(dbUrl.replace('postgresql://', 'http://')).host; } catch { return 'parse-error'; } })(),
        hasSSL: dbUrl.includes('sslmode=require'),
        sslmodeParam: (dbUrl.match(/sslmode=([^&]+)/) ?? [])[1] ?? 'not set',
      };
    }

    // Now actually exercise the auth Proxy — does auth.api.getSession() work?
    try {
      const session = await auth.api.getSession({ headers: new Headers() });
      checks.auth_getSession = session ? 'returned session' : 'returned null (no session)';
    } catch (gsErr) {
      checks.auth_getSession = `FAILED: ${(gsErr as Error).message}\nStack: ${(gsErr as Error).stack}`;
    }
  } catch (authErr) {
    checks.auth_init = `FAILED: ${(authErr as Error).message}\nStack: ${(authErr as Error).stack}`;
  }

  return NextResponse.json(checks, { status: 200 });
}
