import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceAiQuota } from '@/lib/ai-quota';
import { applyEliminatingCriteria, evaluateAts } from '@/lib/cv-ats';
import { buildCvJuryMessages, parseCvJury } from '@/lib/cv-jury';
import { juryPotential, juryScore } from '@/lib/cv-review';
import { cvToText, officialCvSchema } from '@/lib/cv-schema';
import { callLlm, CV_MODELS, isLlmConfigured } from '@/lib/llm';
import { corsPreflight, MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { chargeStageJury, hasPaidStageApplication } from '@/lib/stage-charge';
import { getStageJob } from '@/lib/stages-db';

export const runtime = 'nodejs';
export const OPTIONS = (request: NextRequest) => corsPreflight(request);

const requestSchema = z.object({
  jobId: z.string().uuid(),
  cv: officialCvSchema,
  template: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,40}$/).default('classic'),
  second: z.boolean().default(false),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new MobileApiError('Données du CV invalides.', 400);
    const { jobId, cv, template, second } = parsed.data;
    const job = await getStageJob(jobId, userId);
    if (!job) throw new MobileApiError('Offre de stage indisponible ou expirée.', 404);
    if (!(await hasPaidStageApplication(userId, job.id))) {
      throw new MobileApiError('Cette candidature doit être payée avant le jury.', 402);
    }
    if (!isLlmConfigured()) throw new MobileApiError("L'IA n'est pas disponible pour le moment.", 503);

    await chargeStageJury(userId, job.id, second, false);
    await enforceAiQuota(request, { userId, route: 'stage-jury' });

    const offer = {
      title: job.title,
      company: job.company?.name,
      description: job.description,
      requirements: job.requirements,
    };
    const cvText = cvToText(cv);
    const offerText = [offer.title, offer.company, job.location, job.duration, ...offer.requirements, offer.description].filter(Boolean).join('\n');
    const messages = buildCvJuryMessages(cvText, offer);
    const atsFromCode = evaluateAts(cv, { template, requirements: offer.requirements });
    let jury = null;
    for (let idx = 0; idx < CV_MODELS.length; idx += 1) {
      const model = CV_MODELS[idx];
      try {
        const raw = await callLlm(messages, {
          temperature: 0.2,
          maxTokens: 5000,
          title: 'Campus 360 Jury CV',
          models: [model],
          effort: 'low',
          timeoutMs: idx === 0 ? 35_000 : 25_000,
        });
        jury = parseCvJury(raw, cvText, offerText);
        if (jury) break;
        console.warn(`[stage-jury] ${model}: jury answer unreadable (${raw ? `${raw.length} chars` : 'empty'})`);
      } catch (err) {
        console.warn(`[stage-jury] ${model} failed:`, err instanceof Error ? err.message : String(err));
      }
    }
    if (!jury) throw new MobileApiError("Le jury n'a pas pu relire ton CV. Aucun coin n'a été débité.", 502);

    const ats = applyEliminatingCriteria(atsFromCode, jury.criteres);
    const payment = await chargeStageJury(userId, job.id, second, true);
    return withCors(NextResponse.json({ score: juryScore(ats, jury), total: 7, potentiel: juryPotential(ats, jury), ats, jury, payment }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
