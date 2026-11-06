import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceAiQuota } from '@/lib/ai-quota';
import { careerOfferSchema } from '@/lib/career-context';
import { cvBackgroundSchema, cvBackgroundToText } from '@/lib/cv-background';
import { getCvBackground } from '@/lib/cv-background-db';
import { buildCvFillMessages, cvFillRequestSchema, externalCvFillInput, juryAnswersText, parseCvFill } from '@/lib/cv-fill';
import { cvToText, officialCvSchema } from '@/lib/cv-schema';
import { databasePool } from '@/lib/database';
import { aiCost } from '@/lib/free-launch';
import { CV_MODELS, callLlm, isLlmConfigured } from '@/lib/llm';
import { MobileApiError, corsPreflight, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => corsPreflight(request);

const requestSchema = z.object({
  offer: careerOfferSchema,
  // The reference CV just imported; the background saved on the account otherwise.
  background: cvBackgroundSchema.nullish(),
  student: cvFillRequestSchema.shape.student,
  notes: z.string().trim().max(4000).optional(),
  // Correction asked by the jury: the CV being corrected and the student's answers
  // to the jury questions. Both are the student's material for the grounding check.
  currentCv: officialCvSchema.optional(),
  answers: z.array(z.object({ question: z.string().trim().max(300), reponse: z.string().trim().max(600) })).max(8).optional(),
  // One id per generation: retrying the same one is never charged twice.
  generationId: z.string().trim().min(8).max(200),
});

// Debited once the CV is written, so a failed generation costs nothing.
const debitCredits = async (userId: string, generationId: string, cost: number): Promise<number> => {
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const wallet = await client.query('select ia_credits from public.app_wallets where user_id = $1 for update', [userId]);
    const credits = Number(wallet.rows[0]?.ia_credits ?? 0);
    const replay = await client.query(
      `select id from public.app_wallet_transactions
        where user_id = $1 and type = 'ai_generation' and reference_id = $2 and status = 'success'
        limit 1`,
      [userId, generationId],
    );
    let remaining = credits;
    if (replay.rows.length === 0) {
      if (credits < cost) throw new MobileApiError('Crédits IA insuffisants.', 402);
      remaining = credits - cost;
      await client.query('update public.app_wallets set ia_credits = $2, updated_at = now() where user_id = $1', [userId, remaining]);
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
         values ($1, 'ai_generation', 0, $2, 'success')`,
        [userId, generationId],
      );
    }
    await client.query('commit');
    return remaining;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

// Writes the structured CV (same format as an application) for an offer seen
// outside the app, from the student's skills, reference CV and notes.
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new MobileApiError('Données du CV invalides.', 400);
    const { offer, background, student, notes, generationId, currentCv, answers } = parsed.data;
    if (offer.title.length < 2) throw new MobileApiError("L'intitulé du poste manque dans cette offre.", 422);
    if (!isLlmConfigured()) throw new MobileApiError("L'IA n'est pas disponible pour le moment.", 503);

    await enforceAiQuota(request, { userId, route: 'cv-fill' });

    const cost = aiCost('careerDoc');
    const wallet = await databasePool.query('select ia_credits from public.app_wallets where user_id = $1 limit 1', [userId]);
    if (Number(wallet.rows[0]?.ia_credits ?? 0) < cost) throw new MobileApiError('Crédits IA insuffisants.', 402);

    // Reference CV and notes are the student's own words: the grounding check accepts them.
    const reference = cvBackgroundToText(background ?? (await getCvBackground(userId).catch(() => null)));
    const input = externalCvFillInput(offer, student, [
      reference,
      currentCv ? `CV actuel de l’étudiant :\n${cvToText(currentCv)}` : '',
      answers?.length ? `Réponses de l’étudiant aux questions du jury :\n${juryAnswersText(answers)}` : '',
      notes,
    ].filter(Boolean).join('\n\n').slice(0, 12000));

    // A long reference CV can make the answer run past the token limit: a cut or
    // unreadable answer goes to the next model instead of failing the student.
    const messages = buildCvFillMessages(input);
    let cv = null;
    for (const model of CV_MODELS) {
      const raw = await callLlm(messages, { temperature: 0.3, maxTokens: 3500, title: 'Campus 360 CV', models: [model], timeoutMs: 45_000 });
      cv = parseCvFill(raw, input);
      if (cv) break;
      console.warn(`[cv-fill] ${model}: answer unreadable (${raw ? `${raw.length} chars` : 'empty'})`);
    }
    if (!cv) throw new MobileApiError("L'IA n'a pas pu rédiger le CV. Aucun crédit débité, réessaie.", 502);

    const remainingCredits = await debitCredits(userId, generationId, cost);
    return withCors(NextResponse.json({ cv, remainingCredits, creditsUsed: cost }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
