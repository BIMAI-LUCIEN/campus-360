import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ensureStageStudent, getStageJob, recordOnSiteApplication } from '@/lib/stages-db';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { isFeatureEnabled } from '@/lib/app-config';

const applyOnSiteSchema = z.object({ jobId: z.string().min(1) }).strict();

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

// The student says they applied on the offer's website: the offer enters their follow-up.
// Free, because Campus 360 sends nothing. Refused on any other offer, which is paid at /apply.
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 15 });
    if (access.response) return withCors(access.response, request);
    if (!(await isFeatureEnabled('stages'))) {
      throw new MobileApiError('Les candidatures sont temporairement indisponibles.', 503);
    }
    const parsed = applyOnSiteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new MobileApiError('Requête invalide.', 400);

    const job = await getStageJob(parsed.data.jobId, access.user!.id);
    if (!job) throw new MobileApiError('Offre de stage indisponible.', 404);
    if (job.applyMethod !== 'LINK') {
      return withCors(
        NextResponse.json({ error: 'Cette offre se postule depuis Campus 360.' }, { status: 422 }),
        request,
      );
    }

    const studentId = await ensureStageStudent(access.user!);
    const application = await recordOnSiteApplication(studentId, job.id);
    if (!application) throw new MobileApiError("Ta candidature n'a pas pu être ajoutée à ton suivi.", 500);
    return withCors(NextResponse.json({ success: true, application }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
