import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { listPushCampaigns, previewPushAudience, sendPushCampaign } from '@/lib/admin-app-control';

export const runtime = 'nodejs';

const segmentSchema = z.object({
  audience: z.enum(['all', 'inactive7d', 'paying', 'never_paid', 'university', 'faculty']),
  value: z.string().trim().max(120).optional(),
});

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('preview'), segment: segmentSchema }),
  z.object({
    action: z.literal('send'),
    segment: segmentSchema,
    title: z.string().trim().min(2).max(65),
    body: z.string().trim().min(2).max(240),
    link: z.string().trim().url().max(500).optional().or(z.literal('')),
  }),
]);

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  return NextResponse.json({ campaigns: await listPushCampaigns() });
}

export async function POST(request: NextRequest) {
  const { response, user } = await requireAdminApi();
  if (response) return response;

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide' }, { status: 400 });
  }
  const body = parsed.data;
  if ((body.segment.audience === 'university' || body.segment.audience === 'faculty') && !body.segment.value) {
    return NextResponse.json({ error: 'Précisez la valeur du segment' }, { status: 400 });
  }

  try {
    if (body.action === 'preview') {
      return NextResponse.json(await previewPushAudience(body.segment));
    }
    const result = await sendPushCampaign({
      title: body.title,
      body: body.body,
      segment: body.segment,
      link: body.link || undefined,
      adminEmail: user?.email ?? 'admin',
    });
    return NextResponse.json({
      ok: true,
      ...result,
      message: `Notification envoyée à ${result.sent} appareil(s)${result.failed ? `, ${result.failed} échec(s)` : ''}.`,
    });
  } catch (err) {
    console.error('[api/admin/push] POST failed:', err);
    return NextResponse.json({ error: 'Envoi impossible : la migration 0021 est-elle appliquée ?' }, { status: 500 });
  }
}
