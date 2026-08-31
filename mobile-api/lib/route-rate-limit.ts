import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { RateLimitError, rateLimit } from './rate-limit';

// Apply a tighter per-route rate limit on top of the per-user read budget.
// `key` is derived from the request — pass an authenticated userId when
// available so the bucket is per-user, otherwise it falls back to IP.
export const enforceRateLimit = async (
  request: NextRequest,
  options: { bucket: string; max: number; windowMs: number; userId?: string },
) => {
  await rateLimit(request, {
    bucket: options.bucket,
    max: options.max,
    windowMs: options.windowMs,
    key: options.userId,
  });
};

export const rateLimitFailedResponse = (error: unknown) => {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message, retryAfter: error.retryAfterSeconds },
      {
        status: 429,
        headers: { 'Retry-After': String(error.retryAfterSeconds) },
      },
    );
  }
  return null;
};
