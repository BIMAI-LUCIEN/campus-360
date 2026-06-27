import { NextRequest, NextResponse } from 'next/server';

import { databasePool } from '@/lib/database';

export const runtime = 'nodejs';

// POST is intentionally NOT exposed here — the route exists only as a placeholder
// for the disabled GET handler below, so external callers can't trigger admin
// promotion via a leaked ADMIN_BOOTSTRAP_PASSWORD.
//
// Bootstrap is now an out-of-band script (`npm run bootstrap-admin` in
// admin-app), which runs server-side only.

export async function POST() {
  return NextResponse.json(
    { error: 'Bootstrap disabled. Use the admin CLI script (npm run bootstrap-admin).' },
    { status: 405 },
  );
}
