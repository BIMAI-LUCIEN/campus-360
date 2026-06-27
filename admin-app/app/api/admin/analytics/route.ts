import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/access';
import { getSupabasePdfAnalytics } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  const analytics = await getSupabasePdfAnalytics();
  return NextResponse.json(analytics);
}
