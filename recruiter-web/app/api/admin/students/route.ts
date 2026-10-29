import { NextRequest, NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/access';
import { listAdminStudents, studentsToCsv, type StudentSort } from '@/lib/admin-students';

export const runtime = 'nodejs';

const FILTERS = ['all', 'paying', 'banned', 'inactive', 'admins'] as const;
const SORTS: StudentSort[] = ['recent', 'active', 'paid', 'applications', 'documents'];

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const filterParam = searchParams.get('filter') ?? 'all';
  const sortParam = searchParams.get('sort') ?? 'recent';
  const filter = (FILTERS as readonly string[]).includes(filterParam) ? (filterParam as (typeof FILTERS)[number]) : 'all';
  const sort = SORTS.includes(sortParam as StudentSort) ? (sortParam as StudentSort) : 'recent';

  try {
    const result = await listAdminStudents({ search: searchParams.get('search') ?? '', filter, sort });
    if (searchParams.get('format') === 'csv') {
      return new NextResponse(`﻿${studentsToCsv(result.students)}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="etudiants-campus360-${new Date().toISOString().slice(0, 10)}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/admin/students] GET failed:', err);
    return NextResponse.json({ error: 'Impossible de charger les étudiants' }, { status: 500 });
  }
}
