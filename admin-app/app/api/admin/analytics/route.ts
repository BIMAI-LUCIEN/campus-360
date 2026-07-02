import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/access';
import { getSupabasePdfAnalytics } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  try {
    const analytics = await getSupabasePdfAnalytics();
    return NextResponse.json(analytics);
  } catch (err) {
    console.error('[analytics-api] top-level error:', err);
    return NextResponse.json(
      {
        configured: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}
