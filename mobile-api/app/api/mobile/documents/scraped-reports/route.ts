import { NextRequest, NextResponse } from 'next/server';
import { databasePool } from '@/lib/database';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return withCors(access.response, request);

    await enforceRateLimit(request, {
      bucket: 'scraped-reports',
      max: 60,
      windowMs: 60_000,
      userId: access.user.id,
    });

    const { searchParams } = new URL(request.url);
    const field = searchParams.get('field');
    const level = searchParams.get('level');
    const source = searchParams.get('source');
    const q = searchParams.get('q');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Only real documents: social posts (TikTok…) had AI titles that did not match the video.
    const conditions: string[] = [
      "status = 'published'",
      "upper(coalesce(source_platform, '')) not in ('TIKTOK','FACEBOOK','LINKEDIN','INSTAGRAM','YOUTUBE')",
      "coalesce(file_url, '') !~* '(tiktok\\.com|facebook\\.com|fb\\.watch|instagram\\.com|linkedin\\.com|youtube\\.com|youtu\\.be)'",
    ];
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

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

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
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
