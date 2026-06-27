import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/access';
import { deletePdf } from '@/lib/course-db';
import { deleteSupabasePdf } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireAdminApi();
    if (response) return response;

    const { id } = await context.params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
    }

    await deletePdf(id, user!.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PDF delete error:', error);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
