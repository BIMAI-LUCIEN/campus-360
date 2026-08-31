import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/access';
import { getSupabasePdfAnalytics, emptyAnalytics } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  // Top-level guard: getSupabasePdfAnalytics now re-throws on subquery
  // failure (see lib/supabase-pdf.ts) so we never silently return zeros
  // when the DB is reachable but a query is broken.
  try {
    const analytics = await getSupabasePdfAnalytics();
    return NextResponse.json(analytics);
  } catch (err) {
    console.error('[analytics-api] getSupabasePdfAnalytics threw:', err);
    const fallback = emptyAnalytics(true);
    return NextResponse.json(
      { ...fallback, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
