import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi } from '@/lib/access';
import {
  getAdminCompanies,
  updateAdminCompany,
} from '@/lib/admin-platform-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  try {
    const companies = await getAdminCompanies({ query, status });
    return NextResponse.json(companies);
  } catch (err) {
    console.error('[api/admin/companies] GET failed:', err);
    return NextResponse.json(
      { error: 'Impossible de charger les entreprises' },
      { status: 500 },
    );
  }
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update-status'),
    companyId: z.string().min(1),
    status: z.enum(['UNVERIFIED', 'VERIFIED', 'SUSPENDED']),
  }),
  z.object({
    action: z.literal('update-kyb'),
    companyId: z.string().min(1),
    kybScore: z.number().min(0).max(100),
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
    if (body.action === 'update-status') {
      await updateAdminCompany({
        companyId: body.companyId,
        status: body.status,
      });
      const labels = {
        VERIFIED: 'Entreprise vérifiée avec succès',
        UNVERIFIED: 'Entreprise marquée en attente de vérification',
        SUSPENDED: 'Entreprise suspendue (mise en quarantaine anti-fraude)',
      };
      return NextResponse.json({ ok: true, message: labels[body.status] });
    }

    if (body.action === 'update-kyb') {
      await updateAdminCompany({
        companyId: body.companyId,
        kybScore: body.kybScore,
      });
      return NextResponse.json({
        ok: true,
        message: `Score KYB mis à jour (${body.kybScore}%)`,
      });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (err) {
    console.error('[api/admin/companies] POST failed:', err);
    return NextResponse.json(
      { error: "Impossible de mettre à jour l'entreprise" },
      { status: 500 },
    );
  }
}
