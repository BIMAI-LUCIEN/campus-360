import type { PoolClient } from 'pg';

import { databasePool } from './database';

export type SubscriptionTier = 'basic' | 'pro' | 'elite';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'payment_failed';

export type ActiveSubscription = {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
};

type SubRow = {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  auto_renew: boolean;
  cancel_at_period_end: boolean;
  current_period_start: Date;
  current_period_end: Date;
};

const mapRow = (row: SubRow): ActiveSubscription => ({
  id: String(row.id),
  userId: String(row.user_id),
  tier: row.tier as SubscriptionTier,
  status: row.status as SubscriptionStatus,
  autoRenew: Boolean(row.auto_renew),
  cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
  currentPeriodStart: new Date(row.current_period_start).toISOString(),
  currentPeriodEnd: new Date(row.current_period_end).toISOString(),
});

const SUBSCRIPTION_PRICES: Record<SubscriptionTier, number> = {
  basic: 2000,
  pro: 3500,
  elite: 5000,
};

const SUBSCRIPTION_DURATION_DAYS = 30;

/**
 * Resolve the user's currently-accessible subscription.
 *
 * Side effects: this also reconciles state lazily — if the period has ended
 * we flip the row to expired / canceled and downgrade app_users. Callers can
 * rely on a "no subscription" return value to deny access without having to
 * re-check timestamps themselves.
 *
 * The reconciliation runs inside a row-level lock so it's safe to call from
 * concurrent request handlers (e.g. several reads on the PDF route).
 */
export const getActiveSubscription = async (
  userId: string,
  client?: PoolClient,
): Promise<ActiveSubscription | null> => {
  const ownClient = !client;
  const c = client ?? (await databasePool.connect());

  try {
    if (ownClient) await c.query('begin');

    const subRes = await c.query<SubRow>(
      `select id, user_id, tier, status, auto_renew, cancel_at_period_end,
              current_period_start, current_period_end
         from public.app_subscriptions
        where user_id = $1
          and status in ('active', 'canceled', 'payment_failed')
        order by current_period_end desc
        limit 1
        for update`,
      [userId],
    );
    const row = subRes.rows[0];
    if (!row) {
      if (ownClient) await c.query('rollback');
      return null;
    }

    const now = new Date();
    const periodEnd = new Date(row.current_period_end);

    if (periodEnd <= now) {
      // Period has lapsed. Promote:
      //   canceled / payment_failed / active → expired
      // We also clear the denormalized columns on app_users so signed-url
      // checks stop granting access.
      await c.query(
        `update public.app_subscriptions
            set status = 'expired', updated_at = now()
          where id = $1`,
        [row.id],
      );
      await c.query(
        `update public.app_users
            set subscription_tier = 'free', subscription_expires_at = null, updated_at = now()
          where id = $1`,
        [userId],
      );
      if (ownClient) await c.query('commit');
      return null;
    }

    if (row.status === 'active' && row.cancel_at_period_end) {
      // User requested cancellation but the period is still paid — flip
      // to canceled so the UI can show "expire le ..." and we don't try
      // to auto-renew on cron.
      await c.query(
        `update public.app_subscriptions
            set status = 'canceled', updated_at = now()
          where id = $1 and status = 'active'`,
        [row.id],
      );
      if (ownClient) await c.query('commit');
      return { ...mapRow(row), status: 'canceled' };
    }

    if (ownClient) await c.query('commit');
    return mapRow(row);
  } catch (err) {
    if (ownClient) await c.query('rollback');
    throw err;
  } finally {
    if (ownClient) (c as PoolClient).release();
  }
};

export type PurchaseResult =
  | { ok: true; subscription: ActiveSubscription }
  | { ok: false; code: 'already_active'; current: ActiveSubscription }
  | { ok: false; code: 'downgrade_blocked'; current: ActiveSubscription }
  | { ok: false; code: 'insufficient_balance' }
  | { ok: false; code: 'no_wallet' };

/**
 * Purchase or upgrade a subscription.
 *
 * Rules:
 * 1. If the user has an ACTIVE or CANCELED subscription for the same tier,
 *    they keep their existing period — no double debit. (Rejected as 409.)
 * 2. If they have an ACTIVE/CANCELED subscription for a different tier, we
 *    block the "downgrade" until the current period ends. (Rejected as 409.)
 * 3. Otherwise we charge the wallet, create a new subscription row, and
 *    mirror the denormalized columns on app_users.
 */
export const purchaseSubscription = async (
  userId: string,
  tier: SubscriptionTier,
): Promise<PurchaseResult> => {
  const price = SUBSCRIPTION_PRICES[tier];
  const durationDays = SUBSCRIPTION_DURATION_DAYS;

  const client = await databasePool.connect();
  try {
    await client.query('begin');

    const existing = await client.query<SubRow>(
      `select id, user_id, tier, status, auto_renew, cancel_at_period_end,
              current_period_start, current_period_end
         from public.app_subscriptions
        where user_id = $1
          and status in ('active', 'canceled', 'payment_failed')
        order by current_period_end desc
        limit 1
        for update`,
      [userId],
    );
    const existingRow = existing.rows[0];

    if (existingRow) {
      const periodEnd = new Date(existingRow.current_period_end);
      const mapped = mapRow(existingRow);

      if (periodEnd > new Date()) {
        if (existingRow.tier === tier) {
          // Same tier while still paid — no double debit.
          await client.query('rollback');
          return { ok: false, code: 'already_active', current: mapped };
        }

        // Tier change while still paid — block the downgrade / change.
        // The user has to wait for the period to end, OR explicitly cancel
        // first (which preserves access until period_end but cancels auto_renew).
        await client.query('rollback');
        return { ok: false, code: 'downgrade_blocked', current: mapped };
      }

      await client.query(
        `update public.app_subscriptions
            set status = 'expired', updated_at = now()
          where id = $1`,
        [existingRow.id],
      );
    }

    const walletRes = await client.query(
      'select id, balance_coins from public.app_wallets where user_id = $1 for update',
      [userId],
    );
    const wallet = walletRes.rows[0];
    if (!wallet) {
      await client.query('rollback');
      return { ok: false, code: 'no_wallet' };
    }
    if (Number(wallet.balance_coins) < price) {
      await client.query('rollback');
      return { ok: false, code: 'insufficient_balance' };
    }

    await client.query(
      `update public.app_wallets
          set balance_coins = balance_coins - $2,
              updated_at = now()
        where user_id = $1`,
      [userId, price],
    );

    await client.query(
      `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
       values ($1, 'subscription', $2, $3, 'success')`,
      [userId, -price, tier],
    );

    // If the existing row is expired, we keep the historical record and
    // insert a fresh one. The unique partial index allows at most one
    // non-expired row per user.
    const inserted = await client.query<SubRow>(
      `insert into public.app_subscriptions (
         user_id, tier, status, auto_renew, cancel_at_period_end,
         current_period_start, current_period_end, last_renewed_at
       ) values (
         $1, $2, 'active', true, false,
         now(), now() + make_interval(days => $3), now()
       )
       returning id, user_id, tier, status, auto_renew, cancel_at_period_end,
                 current_period_start, current_period_end`,
      [userId, tier, durationDays],
    );

    await client.query(
      `update public.app_users
          set subscription_tier = $2,
              subscription_expires_at = now() + make_interval(days => $3),
              updated_at = now()
        where id = $1`,
      [userId, tier, durationDays],
    );

    await client.query('commit');
    return { ok: true, subscription: mapRow(inserted.rows[0]) };
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Mark the current subscription as canceled.
 * Access continues until current_period_end; auto_renew stops.
 */
export const cancelSubscription = async (userId: string): Promise<ActiveSubscription | null> => {
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const res = await client.query<SubRow>(
      `update public.app_subscriptions
          set cancel_at_period_end = true, auto_renew = false, updated_at = now()
        where user_id = $1
          and status = 'active'
        returning id, user_id, tier, status, auto_renew, cancel_at_period_end,
                  current_period_start, current_period_end`,
      [userId],
    );
    if (!res.rows[0]) {
      await client.query('rollback');
      return null;
    }
    await client.query('commit');
    return mapRow(res.rows[0]);
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Renew a subscription for one more period. Used by the cron worker.
 *
 * Returns 'renewed' on success, 'insufficient_balance' if the wallet can't
 * cover the next period, or 'not_found' if the subscription is gone.
 * The caller is responsible for marking the row 'expired' / 'payment_failed'
 * based on the result.
 */
export const renewSubscription = async (
  userId: string,
  tier: SubscriptionTier,
): Promise<'renewed' | 'insufficient_balance' | 'not_found'> => {
  const price = SUBSCRIPTION_PRICES[tier];

  const client = await databasePool.connect();
  try {
    await client.query('begin');

    const walletRes = await client.query(
      'select balance_coins from public.app_wallets where user_id = $1 for update',
      [userId],
    );
    const wallet = walletRes.rows[0];
    if (!wallet) {
      await client.query('rollback');
      return 'not_found';
    }
    if (Number(wallet.balance_coins) < price) {
      await client.query('rollback');
      return 'insufficient_balance';
    }

    await client.query(
      `update public.app_wallets
          set balance_coins = balance_coins - $2,
              updated_at = now()
        where user_id = $1`,
      [userId, price],
    );

    await client.query(
      `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
       values ($1, 'subscription', $2, $3, 'success')`,
      [userId, -price, `${tier}_renewal`],
    );

    const updated = await client.query(
      `update public.app_subscriptions
          set current_period_start = current_period_end,
              current_period_end = current_period_end + make_interval(days => $2),
              last_renewed_at = now(),
              last_renewal_attempt_at = now(),
              last_renewal_error = null,
              status = 'active',
              updated_at = now()
        where user_id = $1 and tier = $3 and status in ('active', 'canceled', 'payment_failed')
        returning id`,
      [userId, SUBSCRIPTION_DURATION_DAYS, tier],
    );
    if (!updated.rows[0]) {
      // No matching active subscription — refund the wallet.
      await client.query(
        `update public.app_wallets
            set balance_coins = balance_coins + $2,
                updated_at = now()
          where user_id = $1`,
        [userId, price],
      );
      await client.query('rollback');
      return 'not_found';
    }

    await client.query(
      `update public.app_users
          set subscription_tier = $2,
              subscription_expires_at = (
                select current_period_end from public.app_subscriptions
                 where user_id = $1 order by current_period_end desc limit 1
              ),
              updated_at = now()
        where id = $1`,
      [userId, tier],
    );

    await client.query('commit');
    return 'renewed';
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
};

export const SUBSCRIPTION_CONFIG = {
  PRICES: SUBSCRIPTION_PRICES,
  DURATION_DAYS: SUBSCRIPTION_DURATION_DAYS,
} as const;
