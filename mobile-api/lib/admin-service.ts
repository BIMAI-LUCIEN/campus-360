import { NextResponse, type NextRequest } from 'next/server';

import { adminRoleAllowed, checkAdminService } from './admin-service-check';
import { databasePool } from './database';

// Admin routes of mobile-api (Module 24, report templates) are called by the
// admin web only, server to server: shared secret + the admin's Better Auth id,
// whose role is checked here in the database.

export type AdminServiceUser = { appUserId: string; betterAuthUserId: string };

export const requireAdminService = async (
  request: NextRequest,
): Promise<{ admin: AdminServiceUser; response: null } | { admin: null; response: NextResponse }> => {
  const check = checkAdminService(request.headers, { ADMIN_SERVICE_SECRET: process.env.ADMIN_SERVICE_SECRET });
  if (!check.ok) return { admin: null, response: NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }) };
  const { rows } = await databasePool.query(
    `select au.id, au.role as app_role, u.role as auth_role
       from public.app_users au
       left join public."user" u on u.id = au.better_auth_user_id
      where au.better_auth_user_id = $1
      limit 1`,
    [check.betterAuthUserId],
  );
  const row = rows[0];
  if (!row || !adminRoleAllowed(row.app_role, row.auth_role)) {
    return { admin: null, response: NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 }) };
  }
  return { admin: { appUserId: String(row.id), betterAuthUserId: check.betterAuthUserId }, response: null };
};
