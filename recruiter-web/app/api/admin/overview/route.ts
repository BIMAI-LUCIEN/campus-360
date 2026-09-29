import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/access';
import { getAdminUnifiedMetrics } from '@/lib/admin-platform-service';

export const runtime = 'nodejs';

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  try {
    const metrics = await getAdminUnifiedMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    console.error('[api/admin/overview] GET failed:', err);
    return NextResponse.json(
      { error: 'Impossible de calculer les métriques globales' },
      { status: 500 },
    );
  }
}
