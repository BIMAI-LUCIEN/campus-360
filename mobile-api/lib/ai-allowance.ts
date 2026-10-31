import { consumeAllowanceOn, type AiActionKind, type Allowance } from './ai-allowance-core';
import { databasePool } from './database';
import { MobileApiError } from './mobile-access';

export const FREE_AI_EXHAUSTED_MESSAGE =
  'Tes 3 actions IA gratuites du jour sont utilisées. Prends un Pass Révision (200 F les 24 h, 1 000 F les 7 jours) pour continuer.';

/** Counts one AI action on a PDF; throws 402 when the free actions of the day are used and no pass is active. */
export const consumeAiAllowance = async (userId: string, kind: AiActionKind): Promise<Allowance> => {
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const allowance = await consumeAllowanceOn(client, userId, kind);
    await client.query('commit');
    if (!allowance.allowed) throw new MobileApiError(FREE_AI_EXHAUSTED_MESSAGE, 402);
    return allowance;
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};
