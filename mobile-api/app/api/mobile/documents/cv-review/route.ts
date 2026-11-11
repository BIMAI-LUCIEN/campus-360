import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceAiQuota } from '@/lib/ai-quota';
import { careerOfferSchema } from '@/lib/career-context';
import { applyEliminatingCriteria, evaluateAts } from '@/lib/cv-ats';
import { buildCvJuryMessages, parseCvJury } from '@/lib/cv-jury';
import { decideReviewBilling, juryScore, ReviewBillingError, settleReview, sqlReviewBillingDeps, juryPotential } from '@/lib/cv-review';
import { cvToText, officialCvSchema } from '@/lib/cv-schema';
import { databasePool } from '@/lib/database';
import { aiCost } from '@/lib/free-launch';
import { CV_MODELS, callLlm, isLlmConfigured } from '@/lib/llm';
import { MobileApiError, corsPreflight, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => corsPreflight(request);

const requestSchema = z.object({
  cv: officialCvSchema,
  template: z.enum(['classic', 'prestige', 'ingenieur', 'etudiant', 'ats']).default('classic'),
  offer: careerOfferSchema.nullish(),
  // One id per review: retrying the same one is never charged twice.
  generationId: z.string().trim().min(8).max(200).regex(/^jury-/),
  // The cv-fill generation this CV came from: its first review is free.
  sourceGenerationId: z.string().trim().min(8).max(200).optional(),
}).strict();

// The CV jury: 7 judges (ATS in code, six people in one model call), score X/7,
// errors and questions for the student. Nothing here writes into the CV.
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new MobileApiError('Données du CV invalides.', 400);
    const { cv, template, offer, generationId, sourceGenerationId } = parsed.data;
    if (!isLlmConfigured()) throw new MobileApiError("L'IA n'est pas disponible pour le moment.", 503);

    const cost = aiCost('careerDoc');
    const mode = await decideReviewBilling(sqlReviewBillingDeps(databasePool.query.bind(databasePool)), {
      userId, generationId, sourceGenerationId, cost,
    });

    await enforceAiQuota(request, { userId, route: 'cv-review' });

    const usableOffer = offer && offer.title.trim().length >= 2 ? offer : null;
    const atsFromCode = evaluateAts(cv, { template, requirements: usableOffer?.requirements });
    const offerText = usableOffer
      ? [usableOffer.title, usableOffer.company, usableOffer.location, usableOffer.duration, ...usableOffer.requirements, usableOffer.description].filter(Boolean).join('\n')
      : '';
    const cvText = cvToText(cv);
    const messages = buildCvJuryMessages(cvText, usableOffer && {
      title: usableOffer.title,
      company: usableOffer.company || undefined,
      requirements: usableOffer.requirements,
      description: usableOffer.description || undefined,
    });
    // An answer cut off or unreadable goes to the next model, not to the student.
    let jury = null;
    for (const model of CV_MODELS) {
      const raw = await callLlm(messages, { temperature: 0.2, maxTokens: 5000, title: 'Campus 360 Jury CV', models: [model], timeoutMs: 60_000 });
      jury = parseCvJury(raw, cvText, offerText);
      if (jury) break;
      console.warn(`[cv-review] ${model}: jury answer unreadable (${raw ? `${raw.length} chars` : 'empty'})`);
    }
    if (!jury) throw new MobileApiError("Le jury n'a pas pu relire ton CV. Aucun crédit débité, réessaie.", 502);
    const ats = applyEliminatingCriteria(atsFromCode, jury.criteres);

    const client = await databasePool.connect();
    let billing;
    try {
      billing = await settleReview(client, { userId, generationId, sourceGenerationId, mode, cost });
    } finally {
      client.release();
    }

    return withCors(NextResponse.json({
      score: juryScore(ats, jury),
      total: 7,
      potentiel: juryPotential(ats, jury),
      ats,
      jury,
      ...billing,
    }), request);
  } catch (error) {
    if (error instanceof ReviewBillingError) {
      return withCors(NextResponse.json({ error: error.message, code: 'INSUFFICIENT_AI_CREDITS' }, { status: error.status }), request);
    }
    return withCors(mobileErrorResponse(error, request), request);
  }
}
