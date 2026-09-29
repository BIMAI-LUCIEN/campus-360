import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/access';
import { getAdminApplications } from '@/lib/admin-platform-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? undefined;
  const query = searchParams.get('query') ?? undefined;
  const relanceJ7Only = searchParams.get('relanceJ7') === 'true';

  try {
    const applications = await getAdminApplications({ status, query, relanceJ7Only });
    return NextResponse.json(applications);
  } catch (err) {
    console.error('[api/admin/applications] GET failed:', err);
    return NextResponse.json(
      { error: 'Impossible de charger les candidatures étudiantes' },
      { status: 500 },
    );
  }
}
