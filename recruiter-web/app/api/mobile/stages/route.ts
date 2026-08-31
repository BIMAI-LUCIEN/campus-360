import { NextResponse } from 'next/server';
import { listStageJobs } from '@/lib/stages-db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || undefined;
  const sector = searchParams.get('sector') || undefined;

  const jobs = await listStageJobs({ query, sector });
  return NextResponse.json({
    success: true,
    count: jobs.length,
    jobs: jobs,
  });
}
