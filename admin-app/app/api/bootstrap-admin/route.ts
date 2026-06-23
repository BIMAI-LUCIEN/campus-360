import { NextRequest, NextResponse } from 'next/server';

import { databasePool } from '@/lib/database';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  const expectedEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const expectedPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!expectedEmail || !expectedPassword || email !== expectedEmail || password !== expectedPassword) {
    return NextResponse.json({ error: 'Bootstrap denied' }, { status: 403 });
  }

  const result = await databasePool.query(
    'select id, email, name from "user" where lower(email) = lower($1) limit 1',
    [email],
  );
  const user = result.rows[0] as { id: string; email: string; name: string } | undefined;

  if (!user) {
    return NextResponse.json({ error: 'Create the user first, then bootstrap.' }, { status: 404 });
  }

  await databasePool.query('update "user" set role = $1, "updatedAt" = now() where id = $2', ['admin', user.id]);
  await databasePool.query(
    `update public.app_users set role = 'admin', updated_at = now()
     where better_auth_user_id = $1 or lower(email) = lower($2)`,
    [user.id, user.email],
  );

  const pool = require('@/lib/supabase-pdf').getPool();
  if (pool) {
    await pool.query(
      `insert into public.profiles (id, email, name, role) 
       values ($1, $2, $3, 'admin') 
       on conflict (id) do update set role = 'admin', updated_at = now()`,
      [user.id, user.email, user.name ?? user.email]
    );
    await pool.query(
      `insert into public.wallets (user_id, balance_coins) 
       values ($1, 0) 
       on conflict (user_id) do nothing`,
      [user.id]
    );
  }

  return NextResponse.json({ ok: true });
}
