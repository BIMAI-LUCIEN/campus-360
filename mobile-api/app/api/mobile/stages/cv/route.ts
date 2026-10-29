import { NextRequest, NextResponse } from 'next/server';

import { enforceAiQuota } from '@/lib/ai-quota';
import { cvBackgroundToText } from '@/lib/cv-background';
import { getCvBackground } from '@/lib/cv-background-db';
import { buildCvFillMessages, cvFillRequestSchema, parseCvFill } from '@/lib/cv-fill';
import { callLlm, isLlmConfigured } from '@/lib/llm';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { chargeStageApplication, refundStageApplication } from '@/lib/stage-charge';
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
    const job = await getStageJob(parsed.data.jobId);
    if (!job) throw new MobileApiError('Offre de stage indisponible.', 404);

    await enforceAiQuota(request, { userId: access.user.id, route: 'cv-fill' });

    const userId = access.user.id;
    const payment = await chargeStageApplication(userId, job);
    const refund = () =>
      payment.charged > 0 ? refundStageApplication(userId, job.id).catch(() => undefined) : undefined;

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
        timeoutMs: 45_000,
      });
      cv = parseCvFill(raw, input);
    } catch (error) {
      await refund();
      throw error;
    }
    if (!cv) {
      await refund();
      throw new MobileApiError("L'IA n'a pas pu remplir le CV. Tes coins t'ont été rendus, réessaie.", 502);
    }

    return withCors(NextResponse.json({ cv, payment }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
