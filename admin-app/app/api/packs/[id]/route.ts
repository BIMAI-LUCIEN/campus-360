import { NextRequest, NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/access';
import { deletePack } from '@/lib/course-db';

export const runtime = 'nodejs';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Pack introuvable.' }, { status: 400 });
  }

  deletePack(id, user!.id);
  return NextResponse.json({ ok: true });
}
