import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import {
  MAX_ADJUSTMENT_COINS,
  adjustStudentWallet,
  getAdminStudent,
  resetStudentAiQuota,
  revokeStudentSessions,
  setStudentBan,
  setStudentRole,
} from '@/lib/admin-students';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }
  try {
    const detail = await getAdminStudent(id);
    if (!detail) return NextResponse.json({ error: 'Étudiant introuvable' }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err) {
    console.error('[api/admin/students/:id] GET failed:', err);
    return NextResponse.json({ error: 'Impossible de charger la fiche' }, { status: 500 });
  }
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('adjust-wallet'),
    amount: z.number().int().refine((n) => n !== 0 && Math.abs(n) <= MAX_ADJUSTMENT_COINS, `Montant entre 1 et ${MAX_ADJUSTMENT_COINS} coins`),
    reason: z.string().trim().min(3).max(300),
  }),
  z.object({ action: z.literal('ban'), reason: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal('unban') }),
  z.object({ action: z.literal('reset-ai-quota') }),
  z.object({ action: z.literal('revoke-sessions') }),
  z.object({ action: z.literal('set-role'), role: z.enum(['student', 'admin', 'super_admin']) }),
]);

export async function POST(request: NextRequest, { params }: Params) {
  const { response, user } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Action invalide' }, { status: 400 });
  }

  const detail = await getAdminStudent(id).catch(() => null);
  if (!detail) return NextResponse.json({ error: 'Étudiant introuvable' }, { status: 404 });
  const { student } = detail;
  const body = parsed.data;

  try {
    switch (body.action) {
      case 'adjust-wallet': {
        const { balance } = await adjustStudentWallet({
          userId: id,
          amount: body.amount,
          reason: body.reason,
          adminEmail: user?.email ?? 'admin',
        });
        return NextResponse.json({
          ok: true,
          message: `${body.amount > 0 ? 'Crédit' : 'Débit'} de ${Math.abs(body.amount)} coins effectué. Nouveau solde : ${balance}`,
        });
      }
      case 'ban':
        if (student.authUserId === user?.id) return NextResponse.json({ error: 'Vous ne pouvez pas vous bannir vous-même' }, { status: 400 });
        await setStudentBan(student.authUserId, true, body.reason);
        return NextResponse.json({ ok: true, message: 'Étudiant banni et déconnecté' });
      case 'unban':
        await setStudentBan(student.authUserId, false);
        return NextResponse.json({ ok: true, message: 'Étudiant débanni' });
      case 'reset-ai-quota': {
        const n = await resetStudentAiQuota(id);
        return NextResponse.json({ ok: true, message: `Quota IA remis à zéro (${n} appel(s) effacé(s))` });
      }
      case 'revoke-sessions': {
        const n = await revokeStudentSessions(student.authUserId);
        return NextResponse.json({ ok: true, message: `${n} session(s) fermée(s)` });
      }
      case 'set-role':
        if (student.authUserId === user?.id) return NextResponse.json({ error: 'Vous ne pouvez pas changer votre propre rôle' }, { status: 400 });
        await setStudentRole(id, student.authUserId, body.role);
        return NextResponse.json({ ok: true, message: 'Rôle mis à jour' });
    }
  } catch (err) {
    console.error('[api/admin/students/:id] POST failed:', err);
    const message = err instanceof Error && err.message.includes('Solde insuffisant') ? err.message : 'Opération impossible';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
