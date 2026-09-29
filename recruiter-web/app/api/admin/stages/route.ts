import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi } from '@/lib/access';
import {
  getAdminStages,
  toggleAdminJobSponsored,
  deleteAdminJob,
} from '@/lib/admin-platform-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const source = searchParams.get('source') ?? undefined;
  const sponsored = searchParams.get('sponsored') ?? undefined;

  try {
    const stages = await getAdminStages({ query, status, source, sponsored });
    return NextResponse.json(stages);
  } catch (err) {
    console.error('[api/admin/stages] GET failed:', err);
    return NextResponse.json(
      { error: 'Impossible de charger les offres de stages' },
      { status: 500 },
    );
  }
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('toggle-sponsored'),
    jobId: z.string().min(1),
    isSponsored: z.boolean(),
  }),
  z.object({
    action: z.literal('delete'),
    jobId: z.string().min(1),
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
    if (body.action === 'toggle-sponsored') {
      await toggleAdminJobSponsored(body.jobId, body.isSponsored);
      return NextResponse.json({
        ok: true,
        message: body.isSponsored
          ? 'Offre sponsorisée et mise en avant dans le feed'
          : 'Sponsoring désactivé',
      });
    }

    if (body.action === 'delete') {
      await deleteAdminJob(body.jobId);
      return NextResponse.json({ ok: true, message: 'Offre de stage supprimée' });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (err) {
    console.error('[api/admin/stages] POST failed:', err);
    return NextResponse.json(
      { error: 'Opération impossible sur le stage' },
      { status: 500 },
    );
  }
}
