import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceAiQuota } from '@/lib/ai-quota';
import { careerOfferSchema } from '@/lib/career-context';
import { cvBackgroundSchema, cvBackgroundToText } from '@/lib/cv-background';
import { getCvBackground } from '@/lib/cv-background-db';
import { FALLBACK_PRECISION_QUESTIONS, askPrecisions } from '@/lib/cv-precisions';
import { callLlm, isLlmConfigured } from '@/lib/llm';
import { MobileApiError, corsPreflight, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => corsPreflight(request);

const requestSchema = z.object({
  offer: careerOfferSchema,
  // The reference CV just imported; the background saved on the account otherwise.
  background: cvBackgroundSchema.nullish(),
  notes: z.string().trim().max(4000).optional(),
});

// Questions asked before the CV is written (decision of 2026-11-11): free, no
// credit, under the AI quota only when the AI is called; cached per reference
// CV and offer. Without anything to read, or when the AI fails, the fixed list.
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new MobileApiError('Données invalides.', 400);
    const { offer, background, notes } = parsed.data;
    if (offer.title.length < 2) throw new MobileApiError("L'intitulé du poste manque dans cette offre.", 422);
    await enforceRateLimit(request, { bucket: 'cv-precisions-read', max: 60, windowMs: 600_000, userId });

    const reference = [
      cvBackgroundToText(background ?? (await getCvBackground(userId).catch(() => null))),
      notes,
    ].filter(Boolean).join('\n\n').slice(0, 8000);
    if (!reference.trim() || !isLlmConfigured()) {
      return withCors(NextResponse.json({ questions: FALLBACK_PRECISION_QUESTIONS, cached: false, fallback: true }), request);
    }

    const result = await askPrecisions(reference, offer, {
      beforeAiCall: () => enforceAiQuota(request, { userId, route: 'cv-precisions' }),
      callModel: (messages) =>
        callLlm(messages, { temperature: 0.3, maxTokens: 900, title: 'Campus 360 CV precisions', timeoutMs: 30_000 }).catch(() => null),
    });
    return withCors(NextResponse.json(result), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
