import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { updatePackStatus } from '@/lib/course-db';
import { upsertSupabasePack } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

const bodySchema = z.object({
  status: z.enum(['draft', 'analyzing', 'needs_review', 'published', 'archived']),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pack = await updatePackStatus(id, parsed.data.status, user!.id);
  if (!pack) {
    return NextResponse.json({ error: 'Pack introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ pack });
}
