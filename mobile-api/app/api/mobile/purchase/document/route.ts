import { NextRequest, NextResponse } from 'next/server';

import { withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

// Retired with the v2 economic model (contexte.md §19, D28.2): PDFs are free to
// read and AI credits are replaced by the Revision Pass (/api/mobile/offers).
// Past purchases stay in their tables for the history.
export async function POST(request: NextRequest) {
  return withCors(
    NextResponse.json(
      { error: 'Cet achat n’existe plus : les PDF sont gratuits, les packs et pass sont dans /api/mobile/offers.' },
      { status: 410 },
    ),
    request,
  );
}
