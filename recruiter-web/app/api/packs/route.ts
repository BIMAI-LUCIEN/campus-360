import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { createPack, listPacks } from '@/lib/course-db';
import { upsertSupabasePack } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 32 * 1024;
const MAX_TEXT = 5_000;
const MAX_DESCRIPTION = 10_000;

const packSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(2).max(MAX_DESCRIPTION),
  university: z.string().trim().min(1).max(MAX_TEXT).default('Multi-etablissements'),
  faculty: z.string().trim().min(1).max(MAX_TEXT).default('Transversal'),
  level: z.string().trim().min(1).max(MAX_TEXT).default('Tous niveaux'),
  semester: z.string().trim().min(1).max(MAX_TEXT).default('Libre'),
  packType: z.enum(['semester', 'exam_prep', 'corrections', 'course_bundle', 'catch_up', 'transversal']),
  priceCoins: z.coerce.number().int().min(0).max(1_000_000),
  originalPriceCoins: z.coerce.number().int().min(0).max(1_000_000),
  discountPercent: z.coerce.number().int().min(0).max(100),
  status: z.enum(['draft', 'analyzing', 'needs_review', 'published', 'archived']).default('needs_review'),
  aiSummary: z.string().max(MAX_DESCRIPTION).optional().default(''),
  aiConfidence: z.coerce.number().int().min(0).max(100).optional().default(0),
  documentIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  const packs = await listPacks();
  return NextResponse.json({ packs });
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 });
    }

    const { user, response } = await requireAdminApi();
    if (response) return response;

    const payload = await request.json().catch(() => null);
    const parsed = packSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const pack = await createPack(parsed.data, user!.id);

    return NextResponse.json({ pack }, { status: 201 });
  } catch (error) {
    console.error('Pack create error:', error);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
