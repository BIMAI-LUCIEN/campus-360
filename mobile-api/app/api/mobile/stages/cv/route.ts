import { NextRequest, NextResponse } from 'next/server';

import { enforceAiQuota } from '@/lib/ai-quota';
import { buildCvFillMessages, cvFillRequestSchema, parseCvFill } from '@/lib/cv-fill';
import { callLlm, isLlmConfigured } from '@/lib/llm';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

// Fills the CV of an application with the AI, from the student's profile and
// notes, targeted at the offer. Not charged: the application itself is (stage-charge).
// The app falls back to the profile-only CV when this route fails.
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const parsed = cvFillRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new MobileApiError('Données du CV invalides.', 400);
    if (!isLlmConfigured()) throw new MobileApiError("L'IA n'est pas disponible pour le moment.", 503);

    await enforceAiQuota(request, { userId: access.user.id, route: 'cv-fill' });

    const raw = await callLlm(buildCvFillMessages(parsed.data), {
      temperature: 0.3,
      maxTokens: 1800,
      title: 'Campus 360 CV',
      timeoutMs: 45_000,
    });
    const cv = parseCvFill(raw, parsed.data);
    if (!cv) throw new MobileApiError("L'IA n'a pas pu remplir le CV. Réessaie.", 502);

    return withCors(NextResponse.json({ cv }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
