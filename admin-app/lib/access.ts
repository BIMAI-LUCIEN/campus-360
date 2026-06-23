import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import { auth } from './auth';
import { getDb } from './course-db';

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

export const syncProfile = (user: SessionUser) => {
  const db = getDb();
  const role = adminAllowedEmails().has(user.email.toLowerCase()) ? 'admin' : user.role ?? 'student';
  const existing = db.prepare('select id from profiles where id = ?').get(user.id);
  if (existing) {
    db.prepare('update profiles set email = ?, name = ?, role = ?, updated_at = CURRENT_TIMESTAMP where id = ?').run(
      user.email,
      user.name ?? user.email,
      role,
      user.id,
    );
  } else {
    db.prepare('insert into profiles (id, email, name, role) values (?, ?, ?, ?)').run(
      user.id,
      user.email,
      user.name ?? user.email,
      role,
    );
    db.prepare('insert into wallets (id, user_id, balance_coins) values (?, ?, ?)').run(
      `wallet_${user.id}`,
      user.id,
      role === 'admin' ? 0 : 5000,
    );
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
  syncProfile(user);
  if (!isAdmin(user)) redirect('/admin/forbidden');
  return user;
};

export const requireAdminApi = async () => {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  syncProfile(user);
  if (!isAdmin(user)) {
    return { user, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, response: null };
};
