import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/access';
import { getAdminPayments } from '@/lib/admin-platform-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const operator = searchParams.get('operator') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const query = searchParams.get('query') ?? undefined;

  try {
    const payments = await getAdminPayments({ operator, status, query });
    return NextResponse.json(payments);
  } catch (err) {
    console.error('[api/admin/payments] GET failed:', err);
    return NextResponse.json(
      { error: 'Impossible de charger les transactions Mobile Money' },
      { status: 500 },
    );
  }
}
