import { NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/app-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public: read at app startup, before sign-in (maintenance, forced update, banner).
export async function GET() {
  const config = await getAppConfig();
  return NextResponse.json(config, {
    headers: { 'Cache-Control': 'public, max-age=30' },
  });
}
