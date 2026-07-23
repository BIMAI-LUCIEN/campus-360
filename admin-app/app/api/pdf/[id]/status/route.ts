import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { updatePdfStatus } from '@/lib/course-db';
import { upsertSupabasePdf } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4 * 1024;
// Resource ids are app-generated (e.g. "pdf_ab12cd...", "pack-...", legacy slugs),
// not RFC UUIDs. Keep this permissive but strict enough to be a sane path guard.
const ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

const schema = z.object({
  status: z.enum(['draft', 'analyzing', 'needs_review', 'published', 'archived']),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 });
    }
    const { user, response } = await requireAdminApi();
    if (response) return response;

    const { id } = await context.params;
    if (!ID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
    }
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
    }

    const document = await updatePdfStatus(id, body.data.status, user!.id);
    if (!document) return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    return NextResponse.json({ document });
  } catch (error) {
    console.error('PDF status update error:', error);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
