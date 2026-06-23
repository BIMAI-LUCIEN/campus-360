import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { updatePdfStatus } from '@/lib/course-db';
import { upsertSupabasePdf } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

const schema = z.object({
  status: z.enum(['draft', 'analyzing', 'needs_review', 'published', 'archived']),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi();
  if (response) return response;

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;
  const document = await updatePdfStatus(id, body.data.status, user!.id);
  if (!document) return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  return NextResponse.json({ document });
}
