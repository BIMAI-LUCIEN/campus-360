import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createStageApplication, ensureStageStudent, getStageJob } from '@/lib/stages-db';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { chargeStageApplication, refundStageApplication } from '@/lib/stage-charge';
import { stageErrorStatus } from '@/lib/stages-errors';

const applySchema = z.object({
  jobId: z.string().min(1),
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
    const job = await getStageJob(input.jobId);
    if (!job) {
      return withCors(NextResponse.json({ error: 'Offre de stage indisponible.' }, { status: 404 }), request);
    }
    if (job.applyMethod === 'LINK') {
      // Applications made on the source website are not tracked here.
      return withCors(
        NextResponse.json({ error: "Cette offre se postule sur le site de l'offre." }, { status: 422 }),
        request,
      );
    }
    const studentId = await ensureStageStudent(access.user!);
    const payment = await chargeStageApplication(access.user!.id, job);
    const application = await createStageApplication({ ...input, studentId }).catch(async (error) => {
      if (payment.charged > 0) await refundStageApplication(access.user!.id, job.id).catch(() => undefined);
      throw error;
    });
    return withCors(NextResponse.json({ success: true, application, payment }), request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withCors(NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }), request);
    }
    if (error instanceof MobileApiError) {
      return withCors(NextResponse.json({ error: error.message }, { status: error.status }), request);
    }
    console.warn('[apply route] Stage application failed:', error);
    return withCors(
      NextResponse.json({ error: "Ta candidature n'a pas pu être enregistrée. Réessaie." }, { status: stageErrorStatus(error) }),
      request,
    );
  }
}
