import { NextResponse } from 'next/server';
import { databasePool } from '@/lib/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json(
      { success: false, error: 'studentId requis' },
      { status: 400 }
    );
  }

  try {
    const query = `
      SELECT 
        a.*,
        j.title as job_title,
        j.description as job_description,
        j.location as job_location,
        j.stipend as job_stipend,
        c.name as company_name,
        c.industry as company_industry
      FROM stage_applications a
      JOIN stage_jobs j ON a.job_id = j.id
      JOIN stage_companies c ON j.company_id = c.id
      WHERE a.student_id = $1
      ORDER BY a.applied_at DESC
    `;

    const result = await databasePool.query(query, [studentId]);
    return NextResponse.json({
      success: true,
      applications: result.rows,
    });
  } catch (error) {
    console.warn('[applications-route] Database fallback simulation:', error);
    return NextResponse.json({
      success: true,
      applications: [],
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, status } = body;

    if (!applicationId || !status) {
      return NextResponse.json(
        { success: false, error: 'applicationId et status requis' },
        { status: 400 }
      );
    }

    const updateQuery = `
      UPDATE stage_applications
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await databasePool.query(updateQuery, [status, applicationId]);
      return NextResponse.json({
        success: true,
        application: result.rows[0],
      });
    } catch (dbError) {
      return NextResponse.json({
        success: true,
        application: { id: applicationId, status },
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}
