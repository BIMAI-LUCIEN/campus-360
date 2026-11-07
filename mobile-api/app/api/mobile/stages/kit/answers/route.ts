import { NextRequest, NextResponse } from 'next/server';

import { enforceAiQuota } from '@/lib/ai-quota';
import { cvBackgroundToText } from '@/lib/cv-background';
import { getCvBackground } from '@/lib/cv-background-db';
import { CV_MODELS, callLlm, isLlmConfigured } from '@/lib/llm';
import {
  MobileApiError,
  corsPreflight,
  mobileErrorResponse,
  requireMobileUser,
  withCors,
} from '@/lib/mobile-access';
import { hasPaidStageApplication } from '@/lib/stage-charge';
import {
  buildCustomQuestionMessages,
  buildReadyAnswersMessages,
  kitAnswersRequestSchema,
  parseCustomQuestionAnswer,
  parseReadyAnswers,
  type KitJobContext,
  type KitStudentContext,
} from '@/lib/stage-kit-answers';
import {
  appendKitCustomQuestion,
  getStageKit,
  releaseKitQuestionSlot,
  reserveKitQuestionSlot,
  saveKitReadyAnswers,
} from '@/lib/stage-kits';
import { getStageJob } from '@/lib/stages-db';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => corsPreflight(request);

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const parsed = kitAnswersRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new MobileApiError('Requête invalide (question limitée à 500 caractères).', 400);
    }

    const { jobId, question, student, notes } = parsed.data;

    const job = await getStageJob(jobId, userId);
    if (!job) {
      throw new MobileApiError('Offre de stage indisponible.', 404);
    }
    if (job.applyMethod !== 'LINK') {
      throw new MobileApiError("Ce kit est réservé aux offres à postuler sur le site de l'offre.", 422);
    }

    const paid = await hasPaidStageApplication(userId, job.id);
    if (!paid) {
      throw new MobileApiError("Prépare d'abord ton dossier pour débloquer les réponses du kit.", 402);
    }

    // If ready answers are requested and already generated on this kit, return them without calling AI.
    if (!question) {
      const existing = await getStageKit(userId, job.id);
      if (existing?.answers.ready) {
        return withCors(NextResponse.json({ kit: existing, cached: true }), request);
      }
    }

    if (!isLlmConfigured()) {
      throw new MobileApiError("L'IA n'est pas disponible pour le moment.", 503);
    }

    // For a custom question, reserve the slot BEFORE calling the AI so simultaneous
    // calls can never exceed 5. If the quota or AI call fails, release the slot.
    let slotReserved = false;
    if (question) {
      const used = await reserveKitQuestionSlot(userId, job.id);
      if (used === null) {
        throw new MobileApiError('Tu as déjà utilisé les 5 questions incluses dans ce kit.', 409);
      }
      slotReserved = true;
    }

    try {
      await enforceAiQuota(request, { userId, route: 'kit-answers' });

      const background = cvBackgroundToText(await getCvBackground(userId).catch(() => null));
      const studentCtx: KitStudentContext = {
        fullName: student?.fullName || access.user.name,
        university: student?.university || access.user.university,
        major: student?.major || access.user.faculty,
        educationLevel: student?.educationLevel || access.user.level,
        skills: student?.skills,
        backgroundText: background || undefined,
        notes: notes || undefined,
      };
      const jobCtx: KitJobContext = {
        title: job.title,
        company: job.company?.name,
        location: job.location,
        duration: job.duration,
        description: job.description,
        requirements: job.requirements,
      };

      if (!question) {
        const raw = await callLlm(buildReadyAnswersMessages(jobCtx, studentCtx), {
          temperature: 0.3,
          maxTokens: 1200,
          title: 'Campus 360 Kit Ready Answers',
          models: CV_MODELS,
          timeoutMs: 35_000,
        });
        const ready = parseReadyAnswers(raw, studentCtx);
        if (!ready) {
          throw new MobileApiError("L'IA n'a pas pu rédiger les réponses du dossier. Réessaie.", 502);
        }
        const kit = await saveKitReadyAnswers(userId, job.id, ready);
        return withCors(NextResponse.json({ kit, cached: false }), request);
      }

      const raw = await callLlm(buildCustomQuestionMessages(jobCtx, studentCtx, question), {
        temperature: 0.3,
        maxTokens: 700,
        title: 'Campus 360 Kit Custom Question',
        models: CV_MODELS,
        timeoutMs: 30_000,
      });
      const answer = parseCustomQuestionAnswer(raw, studentCtx);
      if (!answer) {
        throw new MobileApiError("L'IA n'a pas pu répondre à cette question. La question n'a pas été décomptée, réessaie.", 502);
      }
      const kit = await appendKitCustomQuestion(userId, job.id, {
        question,
        answer,
        createdAt: new Date().toISOString(),
      });
      slotReserved = false;
      return withCors(NextResponse.json({ kit, answer }), request);
    } catch (err) {
      if (slotReserved) {
        await releaseKitQuestionSlot(userId, job.id).catch(() => undefined);
      }
      throw err;
    }
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
