import { NextRequest, NextResponse } from 'next/server';

import { listStageJobs } from '@/lib/stages-db';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { stageErrorStatus } from '@/lib/stages-errors';

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const jobs = await listStageJobs({
      query: searchParams.get('q') || undefined,
      sector: searchParams.get('sector') || undefined,
    });
    return withCors(NextResponse.json({ success: true, count: jobs.length, jobs }), request);
  } catch (error) {
    console.warn('[stages route] GET stages failed:', error);
    return withCors(
      NextResponse.json({ error: 'Offres indisponibles pour le moment. Réessaie dans un instant.' }, { status: stageErrorStatus(error) }),
      request,
    );
  }
}
