import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { saveStudentSkills, sendWelcomeWithOffers } from '@/lib/automations';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';
import { ensureStageStudent } from '@/lib/stages-db';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

const MAX_BODY_BYTES = 8 * 1024;

const bodySchema = z.object({
  skills: z.array(z.string().trim().min(2).max(60)).min(1).max(20),
});

/**
 * POST /api/mobile/onboarding/complete
 * Called once the 3-step onboarding is finished: stores the skills on the stage profile (used by
 * new-offer alerts) and sends the welcome message with the 3 best-matching internships.
 */
export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return withCors(NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 }), request);
    }

    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    try {
      // At most 3 welcome messages per day and per student (re-onboarding, retries).
      await enforceRateLimit(request, { bucket: 'onboarding-welcome', max: 3, windowMs: 24 * 60 * 60_000, userId: user.id });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Compétences invalides.' }, { status: 400 }), request);
    }

    await ensureStageStudent(user);
    await saveStudentSkills(user.id, parsed.data.skills);
    await sendWelcomeWithOffers(user.id, parsed.data.skills);

    return withCors(NextResponse.json({ ok: true }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
