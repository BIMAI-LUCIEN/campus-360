import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/access';
import { deletePdf } from '@/lib/course-db';
import { deleteSupabasePdf } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  deletePdf(id, user!.id);
  await deleteSupabasePdf(id);
  return NextResponse.json({ ok: true });
}
