import crypto from 'node:crypto';

export const PAYMENT_PACKS = {
  recharge_500: 500,
  recharge_1000: 1000,
  recharge_2000: 2000,
  recharge_5000: 5000,
  discovery_500: 500,
} as const;

export type PaymentPackType = keyof typeof PAYMENT_PACKS;

/**
 * Validates HMAC-SHA256 signature from Notch Pay webhooks with timing-safe comparison.
 */
export const verifyNotchSignature = (
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): boolean => {
  if (!signature || !secret || !rawBody) {
    return false;
  }
  try {
    const computed = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const cleanSig = signature.trim().toLowerCase();
    const cleanComputed = computed.trim().toLowerCase();

    if (Buffer.byteLength(cleanSig) !== Buffer.byteLength(cleanComputed)) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(cleanSig, 'utf8'),
      Buffer.from(cleanComputed, 'utf8'),
    );
  } catch {
    return false;
  }
};

/**
 * Pure decision engine for webhook processing.
 */
export const decideWebhookCredit = (
  tx: { status: string; amount_coins: number },
  paid: { amount: number | null | undefined; success: boolean },
): 'credit' | 'ignore-already-processed' | 'reject-amount' | 'mark-failed' => {
  if (tx.status !== 'pending') {
    return 'ignore-already-processed';
  }
  if (!paid.success) {
    return 'mark-failed';
  }
  if (
    paid.amount === null ||
    paid.amount === undefined ||
    typeof paid.amount !== 'number' ||
    Number.isNaN(paid.amount)
  ) {
    return 'reject-amount';
  }
  if (paid.amount !== tx.amount_coins) {
    return 'reject-amount';
  }
  return 'credit';
};

/**
 * Mock payments are strictly forbidden in production or when live Notch Pay credentials are set.
 */
export const isMockAllowed = (env: Record<string, string | undefined>): boolean => {
  const isProd = env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production';
  if (isProd) {
    return false;
  }
  if (Boolean(env.NOTCHPAY_PRIVATE_KEY?.trim())) {
    return false;
  }
  return true;
};
