import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceAiQuota } from '@/lib/ai-quota';
import { normalizeJobTitle, suggestMissions } from '@/lib/cv-suggest';
import { callLlm, isLlmConfigured } from '@/lib/llm';
import { MobileApiError, corsPreflight, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => corsPreflight(request);

const requestSchema = z.object({ poste: z.string().trim().min(2).max(120) }).strict();

// Free mission suggestions for a job title (decision of 2026-11-06). A cached
// title costs no AI call and no quota; a new one goes through the AI quota.
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || normalizeJobTitle(parsed.data.poste).length < 2) {
      throw new MobileApiError('Indique l’intitulé du poste.', 400);
    }
    await enforceRateLimit(request, { bucket: 'cv-suggest-read', max: 60, windowMs: 600_000, userId });

    const result = await suggestMissions(parsed.data.poste, {
      beforeAiCall: async () => {
        if (!isLlmConfigured()) throw new MobileApiError("L'IA n'est pas disponible pour le moment.", 503);
        await enforceAiQuota(request, { userId, route: 'cv-suggest' });
      },
      callModel: (messages) => callLlm(messages, { temperature: 0.4, maxTokens: 500, title: 'Campus 360 CV suggestions', timeoutMs: 30_000 }),
    });
    if (!result.items.length) throw new MobileApiError("Aucune suggestion pour ce poste pour l'instant. Réessaie.", 502);
    return withCors(NextResponse.json(result), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
