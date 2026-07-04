import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { databasePool } from '@/lib/database';

export const runtime = 'nodejs';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: number | boolean | null;
  banReason: string | null;
  createdAt: string | Date;
}

const normalizeUser = (row: UserRow) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role ?? 'student',
  banned: Boolean(row.banned),
  banReason: row.banReason ?? null,
  createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
});

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') ?? '').trim();
  const role = (searchParams.get('role') ?? '').trim();
  const banned = (searchParams.get('banned') ?? '').trim();

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (search) {
    conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx += 1;
  }
  if (role) {
    conditions.push(`role = $${idx}`);
    values.push(role);
    idx += 1;
  }
  if (banned === 'true' || banned === 'false') {
    conditions.push(`banned = $${idx}`);
    values.push(banned === 'true');
    idx += 1;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT id, name, email, role, banned, "banReason", "createdAt" FROM "user" ${where} ORDER BY "createdAt" DESC LIMIT 500`;

  try {
    const result = await databasePool.query<UserRow>(sql, values);
    return NextResponse.json(result.rows.map(normalizeUser));
  } catch (err) {
    console.error('[api/admin/users] GET failed:', err);
    return NextResponse.json(
      { error: 'Impossible de charger les utilisateurs' },
      { status: 500 },
    );
  }
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update-role'),
    userId: z.string().min(1),
    role: z.enum(['student', 'admin', 'super_admin']),
  }),
  z.object({
    action: z.literal('ban'),
    userId: z.string().min(1),
    banReason: z.string().max(500).optional().default(''),
  }),
  z.object({
    action: z.literal('unban'),
    userId: z.string().min(1),
  }),
]);

export async function POST(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Action invalide', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;

  try {
    if (body.action === 'update-role') {
      await databasePool.query(
        'UPDATE "user" SET role = $1, "updatedAt" = now() WHERE id = $2',
        [body.role, body.userId],
      );
      return NextResponse.json({ ok: true, message: 'Rôle mis à jour' });
    }

    if (body.action === 'ban') {
      await databasePool.query(
        'UPDATE "user" SET banned = true, "banReason" = $1, "updatedAt" = now() WHERE id = $2',
        [body.banReason || 'Banni', body.userId],
      );
      return NextResponse.json({ ok: true, message: 'Utilisateur banni' });
    }

    // unban
    await databasePool.query(
      'UPDATE "user" SET banned = false, "banReason" = NULL, "updatedAt" = now() WHERE id = $1',
      [body.userId],
    );
    return NextResponse.json({ ok: true, message: 'Utilisateur débanni' });
  } catch (err) {
    console.error('[api/admin/users] POST failed:', err);
    return NextResponse.json(
      { error: 'Opération impossible' },
      { status: 500 },
    );
  }
}
