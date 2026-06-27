import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { updatePdfStatus } from '@/lib/course-db';
import { upsertSupabasePdf } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4 * 1024;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    if (!UUID_REGEX.test(id)) {
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
