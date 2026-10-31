import type { NextRequest } from 'next/server';

import {
  AI_ROUTE_LIMITS,
  type AiRoute,
  DAILY_LIMIT_MESSAGE,
  readDailyLimit,
  reserveDailyAiCall,
} from './ai-quota-rules';
import { isFeatureEnabled } from './app-config';
import { databasePool } from './database';
import { RateLimitError } from './rate-limit';
import { enforceRateLimit } from './route-rate-limit';

/**
 * Enforces per-route burst limits and global daily 24h AI quotas per authenticated user.
 * Even during the free launch mode, this protects LLM providers from runaway automated abuse.
 */
export const enforceAiQuota = async (
  request: NextRequest,
  options: { userId: string; route: AiRoute },
): Promise<void> => {
  // Switch controlled from the admin dashboard (app_config.features.ai)
  if (!(await isFeatureEnabled('ai'))) {
    throw new RateLimitError("L'assistant IA est temporairement indisponible. Réessaie plus tard.", 600);
  }

  // (a) Route-level burst rate limit (fail-closed under 'ai-' prefix)
  const routeLimit = AI_ROUTE_LIMITS[options.route];
  await enforceRateLimit(request, {
    bucket: `ai-${options.route}`,
    max: routeLimit.max,
    windowMs: routeLimit.windowMs,
    userId: options.userId,
  });

  // (b) Atomic daily global reservation in app_ia_usage_logs
  const dailyLimit = readDailyLimit(process.env);
  const reserved = await reserveDailyAiCall(databasePool, options.userId, dailyLimit);

  if (!reserved) {
    const oldestRes = await databasePool
      .query<{ wait_seconds: number }>(
        `select extract(epoch from (created_at + interval '1 day' - now()))::int as wait_seconds
         from public.app_ia_usage_logs
         where user_id = $1 and created_at > now() - interval '1 day'
         order by created_at asc limit 1`,
        [options.userId],
      )
      .catch(() => ({ rows: [] }));

    const retryAfter = Math.max(60, Number(oldestRes.rows[0]?.wait_seconds || 3600));
    throw new RateLimitError(DAILY_LIMIT_MESSAGE, retryAfter);
  }
};

/**
 * PDF contributions (Module 27, D27.1): their own hourly budget, outside the
 * daily 60-call quota, since the 30 PDF/day cap already bounds the cost.
 */
export const enforcePdfIntakeQuota = async (request: NextRequest, options: { userId: string }): Promise<void> => {
  if (!(await isFeatureEnabled('ai'))) {
    throw new RateLimitError("L'analyse des PDF est temporairement indisponible. Réessaie plus tard.", 600);
  }
  const routeLimit = AI_ROUTE_LIMITS['pdf-intake'];
  await enforceRateLimit(request, {
    bucket: 'ai-pdf-intake',
    max: routeLimit.max,
    windowMs: routeLimit.windowMs,
    userId: options.userId,
  });
};
