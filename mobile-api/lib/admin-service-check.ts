import { timingSafeEqual } from 'node:crypto';

// Server-to-server calls from the admin web (Module 24): the admin web proves
// itself with a shared secret and names the admin it acts for. No database here,
// so the tests load this file directly; the role is checked in admin-service.ts.

export type AdminServiceCheck = { ok: true; betterAuthUserId: string } | { ok: false; status: 401 };

// Constant-time comparison of a shared secret (also used by the n8n ingest route).
export const sameSecret = (provided: string, expected: string) => {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
};

export const checkAdminService = (
  headers: { get(name: string): string | null },
  env: { ADMIN_SERVICE_SECRET?: string },
): AdminServiceCheck => {
  const expected = env.ADMIN_SERVICE_SECRET?.trim();
  const provided = headers.get('x-admin-service-key')?.trim();
  const userId = headers.get('x-admin-user-id')?.trim();
  // Without a secret on the server, every call is refused.
  if (!expected || expected.length < 32 || !provided || !userId) return { ok: false, status: 401 };
  if (!sameSecret(provided, expected)) return { ok: false, status: 401 };
  if (userId.length > 200) return { ok: false, status: 401 };
  return { ok: true, betterAuthUserId: userId };
};

export const adminRoleAllowed = (...roles: (string | null | undefined)[]) =>
  roles.some((role) => role === 'admin' || role === 'super_admin');
