import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { updatePdfPrice } from '@/lib/course-db';

export const runtime = 'nodejs';

const schema = z.object({
  priceCoins: z.number().int().min(0),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi();
  if (response) return response;

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;
  const document = await updatePdfPrice(id, body.data.priceCoins, user!.id);
  if (!document) return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  
  return NextResponse.json({ document });
}
