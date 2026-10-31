import { databasePool } from './database';
import { MobileApiError } from './mobile-access';
import { stageApplyCredits, stageApplyPrice, type StagePricingInput } from './stage-pricing';
import {
  chargeApplicationOn,
  InsufficientFundsError,
  refundApplicationOn,
  type ChargeClient,
  type StageCharge,
} from './stage-charge-core';

export const stageApplyReference = (jobId: string) => `stage-apply:${jobId}`;

const inTransaction = async <T>(work: (client: ChargeClient) => Promise<T>): Promise<T> => {
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Pays an application to `jobId` once per user and offer: pack credits first
 * (1, or 2 for a paid offer), then coins. The wallet row is locked first, so two
 * simultaneous taps cannot both pay. Throws a 409 MobileApiError when neither is enough.
 */
export const chargeStageApplication = async (
  userId: string,
  job: StagePricingInput & { id: string },
): Promise<StageCharge> => {
  try {
    return await inTransaction((client) =>
      chargeApplicationOn(client, userId, stageApplyReference(job.id), stageApplyPrice(job), stageApplyCredits(job)),
    );
  } catch (error) {
    if (error instanceof InsufficientFundsError) throw new MobileApiError(error.message, 409);
    throw error;
  }
};

export const isCharged = (payment: StageCharge) => payment.charged > 0 || payment.creditsUsed > 0;

/** Gives the credits or the coins back when the application could not be delivered. */
export const refundStageApplication = async (userId: string, jobId: string): Promise<void> =>
  inTransaction((client) => refundApplicationOn(client, userId, stageApplyReference(jobId)));
