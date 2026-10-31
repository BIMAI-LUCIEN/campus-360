// Purchase of a pack or a Revision Pass from the wallet, on a pg client inside
// the caller's transaction. Self-contained (no imports) for tests with a fake client.

export type OffersClient = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };

export type PurchasableOffer = { code: string; priceCoins: number; credits: number; passHours: number; kind: 'pack' | 'pass' };

export class OfferFundsError extends Error {
  constructor(public readonly price: number, public readonly balance: number) {
    super(`Solde insuffisant : cette offre coûte ${price} FCFA, ton solde est de ${balance} FCFA.`);
  }
}

const HOUR_MS = 60 * 60 * 1000;
const CREDIT_VALIDITY_MS = 30 * 24 * HOUR_MS;

export type OfferPurchase = { alreadyDone: boolean; balance: number };

export const purchaseOfferOn = async (
  client: OffersClient,
  userId: string,
  offer: PurchasableOffer,
  reference: string,
  now: Date = new Date(),
): Promise<OfferPurchase> => {
  const wallet = await client.query('select balance_coins from public.app_wallets where user_id = $1 for update', [userId]);
  const balance = Number(wallet.rows[0]?.balance_coins ?? 0);

  // Same purchase id sent twice (double tap, retry): bought once.
  const done = await client.query(
    `select 1 from public.app_wallet_transactions where user_id = $1 and reference_id = $2 and status = 'success' limit 1`,
    [userId, reference],
  );
  if (done.rows[0]) return { alreadyDone: true, balance };

  if (!wallet.rows[0] || balance < offer.priceCoins) throw new OfferFundsError(offer.priceCoins, balance);

  await client.query(
    'update public.app_wallets set balance_coins = balance_coins - $1, updated_at = now() where user_id = $2',
    [offer.priceCoins, userId],
  );
  await client.query(
    `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
     values ($1, $2, $3, $4, 'success')`,
    [userId, offer.kind === 'pack' ? 'pack_purchase' : 'pass_purchase', -offer.priceCoins, reference],
  );

  if (offer.credits > 0) {
    await client.query(
      `insert into public.app_credit_grants (user_id, offer_code, credits_total, credits_left, expires_at, reference_id)
       values ($1, $2, $3, $3, $4, $5)`,
      [userId, offer.code, offer.credits, new Date(now.getTime() + CREDIT_VALIDITY_MS).toISOString(), reference],
    );
  }
  if (offer.passHours > 0) {
    // A pass bought while another is active starts when the active one ends.
    const active = await client.query(
      'select max(expires_at) as until from public.app_revision_passes where user_id = $1 and expires_at > $2',
      [userId, now.toISOString()],
    );
    const until = active.rows[0]?.until ? new Date(active.rows[0].until) : null;
    const start = until && until > now ? until : now;
    await client.query(
      `insert into public.app_revision_passes (user_id, starts_at, expires_at, source, reference_id)
       values ($1, $2, $3, $4, $5)`,
      [
        userId,
        start.toISOString(),
        new Date(start.getTime() + offer.passHours * HOUR_MS).toISOString(),
        offer.kind === 'pack' ? 'pack' : 'purchase',
        `${reference}:pass`,
      ],
    );
  }
  return { alreadyDone: false, balance: balance - offer.priceCoins };
};

export type OfferState = { credits: number; creditsExpireAt: string | null; passUntil: string | null };

export const offerStateOn = async (client: OffersClient, userId: string): Promise<OfferState> => {
  const credits = await client.query(
    `select coalesce(sum(credits_left), 0) as credits, min(expires_at) as expires
       from public.app_credit_grants where user_id = $1 and expires_at > now() and credits_left > 0`,
    [userId],
  );
  const pass = await client.query(
    // Passes are chained end to end, so the last end date is the real one.
    `select max(expires_at) as until from public.app_revision_passes where user_id = $1 and expires_at > now()`,
    [userId],
  );
  const toIso = (value: unknown) => (value ? new Date(value as string).toISOString() : null);
  return {
    credits: Number(credits.rows[0]?.credits ?? 0),
    creditsExpireAt: toIso(credits.rows[0]?.expires),
    passUntil: toIso(pass.rows[0]?.until),
  };
};
