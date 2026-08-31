import { NextRequest, NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/access';
import { deletePack } from '@/lib/course-db';

export const runtime = 'nodejs';

// Resource ids are app-generated (e.g. "pdf_ab12cd...", "pack-...", legacy slugs),
// not RFC UUIDs. Keep this permissive but strict enough to be a sane path guard.
const ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user, response } = await requireAdminApi();
    if (response) return response;

    const { id } = await context.params;
    if (!ID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
    }

    await deletePack(id, user!.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Pack delete error:', error);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
