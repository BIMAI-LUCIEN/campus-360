import { NextRequest, NextResponse } from 'next/server';

import { enforceAiQuota } from '@/lib/ai-quota';
import { cvBackgroundToText } from '@/lib/cv-background';
import { getCvBackground } from '@/lib/cv-background-db';
import { buildCvFillMessages, buildKitCoverLetter, cvFillRequestSchema, parseCvFill } from '@/lib/cv-fill';
import { CV_MODELS, callLlm, isLlmConfigured } from '@/lib/llm';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { chargeStageApplication, isCharged, refundStageApplication } from '@/lib/stage-charge';
import { upsertStageKitLetter } from '@/lib/stage-kits';
import { getStageJob } from '@/lib/stages-db';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

// Fills the CV of an application with the AI, from the student's profile and
// notes, targeted at the offer. The application is paid here, before the AI
// runs: once per user and offer (stage-charge), so regenerating or sending
// later is not charged again. The coins come back if the AI fails.
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const parsed = cvFillRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new MobileApiError('Données du CV invalides.', 400);
    if (!isLlmConfigured()) throw new MobileApiError("L'IA n'est pas disponible pour le moment.", 503);

    // The price comes from the stored offer, never from the client.
    // LINK offers are allowed here so the student can purchase the application kit
    // (CV + cover letter + ready answers) before applying on the external site.
    // Expired or unavailable offers return null from getStageJob -> 404.
    const job = await getStageJob(parsed.data.jobId, access.user.id);
    if (!job || (job.expiresAt && new Date(job.expiresAt).getTime() <= Date.now())) {
      throw new MobileApiError('Offre de stage indisponible ou expirée.', 404);
    }

    await enforceAiQuota(request, { userId: access.user.id, route: 'cv-fill' });

    const userId = access.user.id;
    const payment = await chargeStageApplication(userId, job);
    const refund = () =>
      isCharged(payment) ? refundStageApplication(userId, job.id).catch(() => undefined) : undefined;

    // The background saved on the account ("Mon parcours") counts as the student's
    // own words, like the notes: the model may use it, the grounding check accepts it.
    const background = cvBackgroundToText(await getCvBackground(userId).catch(() => null));
    const input = background
      ? { ...parsed.data, notes: [background, parsed.data.notes].filter(Boolean).join('\n\nPour cette offre : ') }
      : parsed.data;

    let cv;
    try {
      const raw = await callLlm(buildCvFillMessages(input), {
        temperature: 0.3,
        maxTokens: 1800,
        title: 'Campus 360 CV',
        models: CV_MODELS,
        timeoutMs: 45_000,
      });
      cv = parseCvFill(raw, input);
    } catch (error) {
      await refund();
      throw error;
    }
    if (!cv) {
      await refund();
      throw new MobileApiError("L'IA n'a pas pu remplir le CV. Tes coins ou crédits t'ont été rendus, réessaie.", 502);
    }

    let kit = undefined;
    if (job.applyMethod === 'LINK') {
      const letter = buildKitCoverLetter(parsed.data, access.user.name);
      kit = await upsertStageKitLetter(userId, job.id, letter).catch(() => undefined);
    }

    return withCors(NextResponse.json({ cv, payment, ...(kit ? { kit } : {}) }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
