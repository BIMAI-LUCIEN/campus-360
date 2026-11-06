// Billing and scoring of the CV jury (decision of 2026-11-06): the first review
// of each generated CV is free, the next ones cost the careerDoc price. "Each
// CV" is the server-known cv-fill generation the CV came from, so a client
// cannot mint free reviews by inventing CV ids. Debit after success only.

import type { PoolClient } from 'pg';

import type { AtsResult } from './cv-ats';
import type { JuryResult } from './cv-jury';

export const FREE_REVIEW_PREFIX = 'cv-review-free:';

export type ReviewMode = 'free' | 'paid' | 'replay';

export type ReviewBillingDeps = {
  /** A successful cv-fill generation of this user carries this reference. */
  ownsCvGeneration: (userId: string, sourceGenerationId: string) => Promise<boolean>;
  freeReviewUsed: (userId: string, sourceGenerationId: string) => Promise<boolean>;
  alreadyCharged: (userId: string, generationId: string) => Promise<boolean>;
  credits: (userId: string) => Promise<number>;
};

export class ReviewBillingError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Decided before the model call, so an unaffordable review costs no AI call. */
export const decideReviewBilling = async (
  deps: ReviewBillingDeps,
  input: { userId: string; generationId: string; sourceGenerationId?: string; cost: number },
): Promise<ReviewMode> => {
  if (await deps.alreadyCharged(input.userId, input.generationId)) return 'replay';
  const source = input.sourceGenerationId;
  if (source && (await deps.ownsCvGeneration(input.userId, source)) && !(await deps.freeReviewUsed(input.userId, source))) {
    return 'free';
  }
  if ((await deps.credits(input.userId)) < input.cost) {
    throw new ReviewBillingError('Crédits IA insuffisants pour une nouvelle relecture.', 402);
  }
  return 'paid';
};

export const sqlReviewBillingDeps = (query: PoolClient['query'] | ((text: string, values: unknown[]) => Promise<{ rows: any[] }>)): ReviewBillingDeps => {
  const q = query as (text: string, values: unknown[]) => Promise<{ rows: any[] }>;
  const exists = async (text: string, values: unknown[]) => (await q(text, values)).rows.length > 0;
  return {
    ownsCvGeneration: (userId, source) => exists(
      `select 1 from public.app_wallet_transactions
        where user_id = $1 and type = 'ai_generation' and status = 'success'
          and reference_id = $2 and reference_id like 'cv-%' and reference_id not like 'cv-review%'
        limit 1`,
      [userId, source],
    ),
    freeReviewUsed: (userId, source) => exists(
      `select 1 from public.app_wallet_transactions where user_id = $1 and reference_id = $2 limit 1`,
      [userId, `${FREE_REVIEW_PREFIX}${source}`],
    ),
    alreadyCharged: (userId, generationId) => exists(
      `select 1 from public.app_wallet_transactions
        where user_id = $1 and type = 'ai_generation' and reference_id = $2 and status = 'success' limit 1`,
      [userId, generationId],
    ),
    credits: async (userId) => Number((await q('select ia_credits from public.app_wallets where user_id = $1 limit 1', [userId])).rows[0]?.ia_credits ?? 0),
  };
};

/**
 * Records the review once the jury answered. A per-user advisory lock makes two
 * simultaneous free reviews of the same CV count once; the loser pays.
 * Returns the credits left.
 */
export const settleReview = async (
  client: PoolClient,
  input: { userId: string; generationId: string; sourceGenerationId?: string; mode: ReviewMode; cost: number },
): Promise<{ remainingCredits: number; free: boolean; creditsUsed: number }> => {
  await client.query('begin');
  try {
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [`cv-review:${input.userId}`]);
    const wallet = await client.query('select ia_credits from public.app_wallets where user_id = $1 for update', [input.userId]);
    let credits = Number(wallet.rows[0]?.ia_credits ?? 0);
    const deps = sqlReviewBillingDeps(client.query.bind(client));

    if (input.mode === 'replay' || (await deps.alreadyCharged(input.userId, input.generationId))) {
      await client.query('commit');
      return { remainingCredits: credits, free: false, creditsUsed: 0 };
    }

    let free = false;
    if (input.mode === 'free' && input.sourceGenerationId && !(await deps.freeReviewUsed(input.userId, input.sourceGenerationId))) {
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
         values ($1, 'ai_generation', 0, $2, 'success')`,
        [input.userId, `${FREE_REVIEW_PREFIX}${input.sourceGenerationId}`],
      );
      free = true;
    } else {
      if (credits < input.cost) throw new ReviewBillingError('Crédits IA insuffisants pour une nouvelle relecture.', 402);
      credits -= input.cost;
      await client.query('update public.app_wallets set ia_credits = $2, updated_at = now() where user_id = $1', [input.userId, credits]);
    }
    await client.query(
      `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
       values ($1, 'ai_generation', 0, $2, 'success')`,
      [input.userId, input.generationId],
    );
    await client.query('commit');
    return { remainingCredits: credits, free, creditsUsed: free ? 0 : input.cost };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
};

/** X/7: the six judges plus the ATS. */
export const juryScore = (ats: AtsResult, jury: JuryResult): number =>
  jury.juges.filter((j) => j.verdict === 'RETENU').length + (ats.verdict === 'PASSE LE FILTRE' ? 1 : 0);
