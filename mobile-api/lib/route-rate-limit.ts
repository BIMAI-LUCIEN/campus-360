import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { RateLimitError, rateLimit } from './rate-limit';

// Buckets that protect money or paid AI calls refuse the request when the
// limiter itself fails, instead of letting it through.
const FAIL_CLOSED_PREFIXES = ['ai-', 'payments-', 'purchase-', 'wallet-', 'whatsapp-'];

export const isFailClosedBucket = (bucket: string): boolean =>
  FAIL_CLOSED_PREFIXES.some((prefix) => bucket.startsWith(prefix));

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
    failMode: isFailClosedBucket(options.bucket) ? 'closed' : 'open',
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
