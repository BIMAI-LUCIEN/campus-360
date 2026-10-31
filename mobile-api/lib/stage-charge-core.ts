// Payment of an application, on a pg client inside the caller's transaction.
// Pack credits valid now are used first (the grant that expires soonest), then
// coins. Self-contained (no imports) so tests can drive it with a fake client.

export type ChargeClient = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };

export type StageCharge = { charged: number; creditsUsed: number; balance: number };

export class InsufficientFundsError extends Error {
  constructor(public readonly price: number, public readonly balance: number) {
    super(`Solde insuffisant : cette candidature coûte ${price} FCFA, ton solde est de ${balance} FCFA.`);
  }
}

export const chargeApplicationOn = async (
  client: ChargeClient,
  userId: string,
  reference: string,
  price: number,
  credits: number,
): Promise<StageCharge> => {
  const wallet = await client.query(
    'select balance_coins from public.app_wallets where user_id = $1 for update',
    [userId],
  );
  const balance = Number(wallet.rows[0]?.balance_coins ?? 0);

  // Sending again to the same offer (retry, other channel) is never charged twice.
  const paidWithCredits = await client.query(
    `select 1 from public.app_credit_usages where user_id = $1 and reference_id = $2 and status = 'success' limit 1`,
    [userId, reference],
  );
  const paidWithCoins = await client.query(
    `select 1 from public.app_wallet_transactions
      where user_id = $1 and reference_id = $2 and type = 'purchase' and status = 'success' limit 1`,
    [userId, reference],
  );
  if (paidWithCredits.rows[0] || paidWithCoins.rows[0]) return { charged: 0, creditsUsed: 0, balance };

  const grant = await client.query(
    `select id from public.app_credit_grants
      where user_id = $1 and expires_at > now() and credits_left >= $2
      order by expires_at asc limit 1 for update`,
    [userId, credits],
  );
  if (grant.rows[0]) {
    await client.query('update public.app_credit_grants set credits_left = credits_left - $1 where id = $2', [
      credits,
      grant.rows[0].id,
    ]);
    await client.query(
      `insert into public.app_credit_usages (user_id, grant_id, credits, reference_id) values ($1, $2, $3, $4)`,
      [userId, grant.rows[0].id, credits, reference],
    );
    return { charged: 0, creditsUsed: credits, balance };
  }

  if (!wallet.rows[0] || balance < price) throw new InsufficientFundsError(price, balance);
  await client.query(
    'update public.app_wallets set balance_coins = balance_coins - $1, updated_at = now() where user_id = $2',
    [price, userId],
  );
  await client.query(
    `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
     values ($1, 'purchase', $2, $3, 'success')`,
    [userId, -price, reference],
  );
  return { charged: price, creditsUsed: 0, balance: balance - price };
};

/** Gives the credits or the coins back when the application could not be delivered. */
export const refundApplicationOn = async (client: ChargeClient, userId: string, reference: string): Promise<void> => {
  const usage = await client.query(
    `update public.app_credit_usages set status = 'refunded'
      where user_id = $1 and reference_id = $2 and status = 'success'
     returning grant_id, credits`,
    [userId, reference],
  );
  if (usage.rows[0]) {
    // An expired grant gets its credits back too, but they stay unusable.
    await client.query('update public.app_credit_grants set credits_left = credits_left + $1 where id = $2', [
      usage.rows[0].credits,
      usage.rows[0].grant_id,
    ]);
    return;
  }
  const removed = await client.query(
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
};
