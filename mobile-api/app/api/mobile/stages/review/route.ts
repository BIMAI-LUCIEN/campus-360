import { timingSafeEqual } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { mobileErrorResponse, withCors } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';
import { listPendingStageJobs, reviewStageJob } from '@/lib/stages-db';

export const runtime = 'nodejs';

// Human review of scraped offers, called by the Hermes Telegram bot.
// Auth: shared secret STAGES_REVIEW_SECRET (fail closed when not configured).

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

const isAuthorized = (request: NextRequest) => {
  const expected = process.env.STAGES_REVIEW_SECRET?.trim();
  const provided =
    request.headers.get('x-review-secret')?.trim() ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  return Boolean(expected && provided && safeEqual(provided, expected));
};

const unauthorized = (request: NextRequest) =>
  withCors(NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }), request);

const reviewSchema = z.object({
  jobId: z.string().uuid('jobId invalide'),
  decision: z.enum(['publish', 'reject']),
  reviewer: z.string().trim().min(1).max(80).optional().default('telegram'),
});

export const OPTIONS = (request: NextRequest) =>
  withCors(new NextResponse(null, { status: 204 }), request);

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, { bucket: 'stages-review', max: 60, windowMs: 60_000 });
    if (!isAuthorized(request)) return unauthorized(request);
    const jobs = await listPendingStageJobs();
    return withCors(NextResponse.json({ jobs }), request);
  } catch (error) {
    return rateLimitFailedResponse(error) ?? mobileErrorResponse(error, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, { bucket: 'stages-review', max: 60, windowMs: 60_000 });
    if (!isAuthorized(request)) return unauthorized(request);
    const raw = await request.text();
    if (raw.length > 2_000) {
      return withCors(NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 }), request);
    }
    const parsed = reviewSchema.safeParse(JSON.parse(raw || '{}'));
    if (!parsed.success) {
      return withCors(
        NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide.' }, { status: 400 }),
        request,
      );
    }
    const { jobId, decision, reviewer } = parsed.data;
    const updated = await reviewStageJob(jobId, decision, reviewer);
    if (!updated) {
      return withCors(NextResponse.json({ error: "Offre introuvable ou déjà traitée." }, { status: 404 }), request);
    }
    return withCors(NextResponse.json({ ok: true, jobId, status: decision === 'publish' ? 'published' : 'rejected' }), request);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return withCors(NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }), request);
    }
    return rateLimitFailedResponse(error) ?? mobileErrorResponse(error, request);
  }
}
