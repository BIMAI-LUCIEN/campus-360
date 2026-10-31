import { NextRequest, NextResponse } from 'next/server';

import { enforceAiQuota } from '@/lib/ai-quota';
import { callLlm, isLlmConfigured } from '@/lib/llm';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { buildWorkshopMessages, chargeWorkshop, refundWorkshop, workshopRequestSchema } from '@/lib/workshop';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

// AI writing workshop: paid before the AI runs, refunded when it fails.
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const parsed = workshopRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new MobileApiError(parsed.error.issues[0]?.message ?? 'Renseigne au moins le sujet du document.', 400);
    }
    if (!isLlmConfigured()) throw new MobileApiError("L'IA n'est pas disponible pour le moment.", 503);

    const userId = access.user.id;
    await enforceAiQuota(request, { userId, route: 'workshop' });
    const payment = await chargeWorkshop(userId, parsed.data);
    const refund = () =>
      payment.reference ? refundWorkshop(userId, parsed.data, payment.reference).catch(() => undefined) : undefined;

    let content: string | null = null;
    try {
      content = await callLlm(buildWorkshopMessages(parsed.data), {
        temperature: 0.5,
        maxTokens: parsed.data.step === 'plan' ? 1200 : 2500,
        title: 'Campus 360 Atelier',
        timeoutMs: 60_000,
      });
    } catch (error) {
      await refund();
      throw error;
    }
    const markdown = content?.trim();
    if (!markdown) {
      await refund();
      throw new MobileApiError("L'IA n'a pas pu rédiger le document. Tes coins t'ont été rendus, réessaie.", 502);
    }

    return withCors(NextResponse.json({ content: markdown, payment }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
