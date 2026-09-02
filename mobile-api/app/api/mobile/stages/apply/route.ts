import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createStageApplication, ensureStageStudent, getStageJob } from '@/lib/stages-db';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

const applySchema = z.object({
  jobId: z.string().uuid(),
  cvText: z.string().max(50_000).optional(),
  letterText: z.string().max(50_000).optional(),
  cvFileUrl: z.string().url().optional(),
  letterFileUrl: z.string().url().optional(),
});

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 15 });
    if (access.response) return withCors(access.response, request);
    const input = applySchema.parse(await request.json());
    if (!(await getStageJob(input.jobId))) {
      return withCors(NextResponse.json({ error: 'Offre de stage indisponible.' }, { status: 404 }), request);
    }
    const studentId = await ensureStageStudent(access.user!);
    const application = await createStageApplication({ ...input, studentId });
    return withCors(NextResponse.json({ success: true, application }), request);
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
