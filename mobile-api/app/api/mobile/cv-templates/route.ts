import { NextRequest, NextResponse } from 'next/server';

import { listCvTemplates } from '@/lib/cv-templates';
import { corsPreflight, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => corsPreflight(request);

/** GET /api/mobile/cv-templates — Active CV designs sorted by sort_order (with built-in fallback). */
export async function GET(request: NextRequest) {
  const result = await listCvTemplates();
  const response = NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
  return withCors(response, request);
}
