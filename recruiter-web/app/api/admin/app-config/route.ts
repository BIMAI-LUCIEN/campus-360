import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { getAppConfigEntries, setAppConfigEntry } from '@/lib/admin-app-control';

export const runtime = 'nodejs';

const version = z.string().trim().regex(/^\d+\.\d+\.\d+$/, 'Version au format 1.2.0');

const updateSchema = z.discriminatedUnion('key', [
  z.object({
    key: z.literal('maintenance'),
    value: z.object({ enabled: z.boolean(), message: z.string().trim().max(300) }),
  }),
  z.object({
    key: z.literal('min_version'),
    value: z.object({ android: version, ios: version, recommended: version, updateUrl: z.string().trim().url().max(500) }),
  }),
  z.object({
    key: z.literal('features'),
    value: z.object({ ai: z.boolean(), payments: z.boolean(), stages: z.boolean(), pdf: z.boolean(), documents: z.boolean() }),
  }),
  z.object({
    key: z.literal('announcement'),
    value: z.object({
      enabled: z.boolean(),
      title: z.string().trim().max(80),
      message: z.string().trim().max(240),
      tone: z.enum(['info', 'success', 'warning']),
      link: z.string().trim().url().max(500).or(z.literal('')),
    }),
  }),
]);

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  return NextResponse.json(await getAppConfigEntries());
}

export async function PUT(request: NextRequest) {
  const { response, user } = await requireAdminApi();
  if (response) return response;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Réglage invalide' }, { status: 400 });
  }
  try {
    await setAppConfigEntry(parsed.data.key, parsed.data.value, user?.email ?? 'admin');
    return NextResponse.json({ ok: true, message: "Réglage enregistré. L'app l'appliquera sous 1 minute." });
  } catch (err) {
    console.error('[api/admin/app-config] PUT failed:', err);
    return NextResponse.json(
      { error: "Enregistrement impossible : la migration 0021 est-elle appliquée ?" },
      { status: 500 },
    );
  }
}
