import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import { auth } from './auth';
import { getPool } from './supabase-pdf';
import { databasePool } from './database';

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

const adminAllowedEmails = () =>
  new Set(
    [process.env.ADMIN_BOOTSTRAP_EMAIL, ...(process.env.ADMIN_ALLOWED_EMAILS ?? '').split(',')]
      .map((email) => email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );

export const getSessionUser = async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;
  return session.user as SessionUser;
};

export const syncProfile = async (user: SessionUser) => {
  const role = adminAllowedEmails().has(user.email.toLowerCase()) ? 'admin' : user.role ?? 'student';
  const pool = getPool();
  
  if (pool) {
    try {
      const existing = await pool.query('select id from public.profiles where id = $1', [user.id]);
      if (existing.rows.length > 0) {
        await pool.query(
          'update public.profiles set email = $1, name = $2, role = $3, updated_at = now() where id = $4',
          [user.email, user.name ?? user.email, role, user.id]
        );
      } else {
        await pool.query(
          'insert into public.profiles (id, email, name, role) values ($1, $2, $3, $4)',
          [user.id, user.email, user.name ?? user.email, role]
        );
        await pool.query(
          'insert into public.wallets (user_id, balance_coins) values ($1, $2) on conflict (user_id) do nothing',
          [user.id, role === 'admin' ? 0 : 5000]
        );
      }
    } catch (err) {
      console.error('Error syncing profile to Postgres:', err);
    }
  }

  if (role === 'admin') {
    try {
      await databasePool.query(
        'update "user" set role = $1, "updatedAt" = now() where id = $2 and (role is null or role != $1)',
        ['admin', user.id]
      );
      await databasePool.query(
        'update public.app_users set role = $1, updated_at = now() where better_auth_user_id = $2 and (role is null or role != $1)',
        ['admin', user.id]
      );
    } catch (err) {
      console.error('Error syncing admin roles:', err);
    }
  }
};

export const isAdmin = (user: SessionUser | null) =>
  Boolean(
    user &&
      (['admin', 'super_admin'].includes(user.role ?? '') ||
        adminAllowedEmails().has(user.email.toLowerCase())),
  );

export const requireAdminPage = async () => {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');
  await syncProfile(user);
  if (!isAdmin(user)) redirect('/admin/forbidden');
  return user;
};

export const requireAdminApi = async () => {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  await syncProfile(user);
  if (!isAdmin(user)) {
    return { user, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, response: null };
};
