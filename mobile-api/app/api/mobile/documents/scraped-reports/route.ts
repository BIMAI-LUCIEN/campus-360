import { NextRequest, NextResponse } from 'next/server';
import { databasePool } from '@/lib/database';
import { withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Expo-Origin, x-client-info, apikey, X-Requested-With',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get('field');
    const level = searchParams.get('level');
    const source = searchParams.get('source');
    const q = searchParams.get('q');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (field) {
      conditions.push(`field ILIKE $${idx}`);
      values.push(`%${field}%`);
      idx++;
    }

    if (level) {
      conditions.push(`level ILIKE $${idx}`);
      values.push(`%${level}%`);
      idx++;
    }

    if (source) {
      conditions.push(`source_platform = $${idx}`);
      values.push(source.toUpperCase());
      idx++;
    }

    if (q) {
      conditions.push(`(title ILIKE $${idx} OR theme ILIKE $${idx} OR abstract ILIKE $${idx})`);
      values.push(`%${q}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        id,
        title,
        theme,
        author,
        school,
        company,
        field,
        level,
        academic_year,
        abstract,
        table_of_contents,
        file_url,
        source_platform,
        source_url,
        tags,
        quality_score,
        view_count,
        download_count,
        created_at
      FROM public.scraped_stage_reports
      ${whereClause}
      ORDER BY quality_score DESC, created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    values.push(limit, offset);

    const countSql = `SELECT COUNT(*) as total FROM public.scraped_stage_reports ${whereClause}`;
    const [dataRes, countRes] = await Promise.all([
      databasePool.query(sql, values),
      databasePool.query(countSql, values.slice(0, values.length - 2))
    ]);

    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    return withCors(
      NextResponse.json({
        success: true,
        reports: dataRes.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        }
      }),
      request
    );
  } catch (err: any) {
    console.error('Error fetching scraped reports:', err);
    return withCors(
      NextResponse.json(
        { success: false, error: err.message || 'Failed to fetch stage reports' },
        { status: 500 }
      ),
      request
    );
  }
}
