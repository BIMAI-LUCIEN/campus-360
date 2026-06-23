import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { createPack, listPacks } from '@/lib/course-db';
import { upsertSupabasePack } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

const packSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  university: z.string().min(1).default('Multi-etablissements'),
  faculty: z.string().min(1).default('Transversal'),
  level: z.string().min(1).default('Tous niveaux'),
  semester: z.string().min(1).default('Libre'),
  packType: z.enum(['semester', 'exam_prep', 'corrections', 'course_bundle', 'catch_up', 'transversal']),
  priceCoins: z.coerce.number().int().min(0),
  originalPriceCoins: z.coerce.number().int().min(0),
  discountPercent: z.coerce.number().int().min(0).max(100),
  status: z.enum(['draft', 'analyzing', 'needs_review', 'published', 'archived']).default('needs_review'),
  aiSummary: z.string().optional().default(''),
  aiConfidence: z.coerce.number().int().min(0).max(100).optional().default(0),
  documentIds: z.array(z.string().min(1)).min(1),
});

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  const packs = await listPacks();
  return NextResponse.json({ packs });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAdminApi();
  if (response) return response;

  const payload = await request.json().catch(() => null);
  const parsed = packSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pack = await createPack(parsed.data, user!.id);

  return NextResponse.json({ pack }, { status: 201 });
}
