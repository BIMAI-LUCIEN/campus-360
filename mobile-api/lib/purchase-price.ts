/**
 * Campus 360 - Purchase Pricing & Document Access Rules
 * Core business rules governing catalog document purchases, promotional launch pricing,
 * and permanent free access for courses and past exams.
 */

export const resolvePurchasePrice = (input: {
  alwaysFree: boolean;
  priceCoins: number;
  freeLaunch: boolean;
}): number => {
  if (input.alwaysFree || input.freeLaunch) {
    return 0;
  }
  return Math.max(0, input.priceCoins);
};

export const isFreeAccess = (doc: {
  always_free?: boolean | null;
  price_coins?: number | string | null;
}): boolean => {
  if (doc.always_free === true) {
    return true;
  }
  const price = Number(doc.price_coins ?? 0);
  return Number.isFinite(price) && price <= 0;
};
