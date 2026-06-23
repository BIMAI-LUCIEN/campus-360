import { NextRequest, NextResponse } from 'next/server';

import { databasePool } from '@/lib/database';
import { getDb } from '@/lib/course-db';

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

  const db = getDb();
  const profile = db.prepare('select id from profiles where id = ?').get(user.id);
  if (profile) {
    db.prepare('update profiles set role = ?, updated_at = CURRENT_TIMESTAMP where id = ?').run('admin', user.id);
  } else {
    db.prepare('insert into profiles (id, email, name, role) values (?, ?, ?, ?)').run(
      user.id,
      user.email,
      user.name ?? user.email,
      'admin',
    );
    db.prepare('insert into wallets (id, user_id, balance_coins) values (?, ?, ?)').run(`wallet_${user.id}`, user.id, 0);
  }

  return NextResponse.json({ ok: true });
}
