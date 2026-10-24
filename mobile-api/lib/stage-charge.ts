import { databasePool } from './database';
import { isFreeLaunch } from './free-launch';
import { MobileApiError } from './mobile-access';
import { stageApplyPrice, type StagePricingInput } from './stage-pricing';

export const stageApplyReference = (jobId: string) => `stage-apply:${jobId}`;

/**
 * Debits the wallet for an application to `jobId`, once per user and offer:
 * sending again to the same offer (retry, other channel) is not charged twice.
 * The wallet row is locked first, so two simultaneous taps cannot both pay.
 * Throws a 409 MobileApiError when the balance is too low.
 */
export const chargeStageApplication = async (
  userId: string,
  job: StagePricingInput & { id: string },
): Promise<{ charged: number; balance: number }> => {
  const price = stageApplyPrice(job, isFreeLaunch());
  const reference = stageApplyReference(job.id);
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const wallet = await client.query<{ balance_coins: number }>(
      'select balance_coins from public.app_wallets where user_id = $1 for update',
      [userId],
    );
    const balance = Number(wallet.rows[0]?.balance_coins ?? 0);
    const already = await client.query(
      `select 1 from public.app_wallet_transactions
        where user_id = $1 and reference_id = $2 and type = 'purchase' and status = 'success' limit 1`,
      [userId, reference],
    );
    if (already.rows[0] || price === 0) {
      await client.query('commit');
      return { charged: 0, balance };
    }
    if (!wallet.rows[0] || balance < price) {
      throw new MobileApiError(
        `Solde insuffisant : cette candidature coûte ${price} FCFA, ton solde est de ${balance} FCFA.`,
        409,
      );
    }
    await client.query(
      'update public.app_wallets set balance_coins = balance_coins - $1, updated_at = now() where user_id = $2',
      [price, userId],
    );
    await client.query(
      `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
       values ($1, 'purchase', $2, $3, 'success')`,
      [userId, -price, reference],
    );
    await client.query('commit');
    return { charged: price, balance: balance - price };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
};

/** Gives the coins back when the application could not be delivered. */
export const refundStageApplication = async (userId: string, jobId: string): Promise<void> => {
  const reference = stageApplyReference(jobId);
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const removed = await client.query<{ amount_coins: number }>(
      `update public.app_wallet_transactions
          set status = 'failed', failure_message = 'Candidature non délivrée : coins rendus.'
        where id = (
          select id from public.app_wallet_transactions
           where user_id = $1 and reference_id = $2 and type = 'purchase' and status = 'success'
           order by created_at desc limit 1
        )
       returning amount_coins`,
      [userId, reference],
    );
    const amount = Math.abs(Number(removed.rows[0]?.amount_coins ?? 0));
    if (amount > 0) {
      await client.query(
        'update public.app_wallets set balance_coins = balance_coins + $1, updated_at = now() where user_id = $2',
        [amount, userId],
      );
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
};
