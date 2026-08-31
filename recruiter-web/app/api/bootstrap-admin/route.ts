import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionUser } from '@/lib/access';
import { databasePool } from '@/lib/database';

export const runtime = 'nodejs';

const bodySchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

const adminAllowedEmails = () =>
  new Set(
    [process.env.ADMIN_BOOTSTRAP_EMAIL, ...(process.env.ADMIN_ALLOWED_EMAILS ?? '').split(',')]
      .map((email) => email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );

// Ensures the signed-up user becomes an admin in the better-auth `user` table
// if their email matches the admin allow-list. Called only right after
// sign-up, not on every sign-in. The session cookie set by authClient.signUp
// is what actually authenticates the request — we just look up the matching
// row and flip its role.
export async function POST(request: NextRequest) {
  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }
  const parsed = bodySchema.safeParse(payload);
  const data = parsed.success ? parsed.data : {};

  const allowed = adminAllowedEmails();
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });
  }

  const isAllowed = allowed.has(user.email.toLowerCase());

  try {
    if (isAllowed) {
      await databasePool.query(
        'UPDATE "user" SET role = $1, "updatedAt" = now() WHERE id = $2 AND (role IS NULL OR role <> $1)',
        ['admin', user.id],
      );
      return NextResponse.json({ ok: true, promoted: true });
    }
    return NextResponse.json({ ok: true, promoted: false });
  } catch (err) {
    console.error('[api/bootstrap-admin] failed:', err);
    return NextResponse.json({ ok: false, error: 'Bootstrap impossible' }, { status: 500 });
  }
}
