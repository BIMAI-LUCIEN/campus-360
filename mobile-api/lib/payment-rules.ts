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
 * Validates HMAC-SHA256 signature from Nyole webhooks (`X-Afriflow-Signature` + `X-Afriflow-Timestamp`)
 * with 5-minute anti-replay protection and timing-safe comparison.
 *
 * Format: `X-Afriflow-Signature: t=<unix_seconds>,v1=<hex_hmac_sha256>`
 * Signed payload: `${timestamp}.${rawBody}`
 */
export const verifyNyoleSignature = (
  rawBody: string,
  signatureHeader: string | null | undefined,
  timestampHeader: string | null | undefined,
  secret: string,
  options?: { nowSeconds?: number; toleranceSeconds?: number },
): boolean => {
  if (!signatureHeader || !secret || !rawBody) {
    return false;
  }
  try {
    const parts = signatureHeader
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    let sigTimestamp: string | null = null;
    let v1Signature: string | null = null;

    for (const part of parts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) continue;
      const key = part.slice(0, eqIdx).trim();
      const val = part.slice(eqIdx + 1).trim();
      if (key === 't') {
        sigTimestamp = val;
      } else if (key === 'v1') {
        v1Signature = val;
      }
    }

    const headerTs = timestampHeader?.trim() || null;
    if (headerTs && sigTimestamp && headerTs !== sigTimestamp) {
      return false;
    }

    const effectiveTs = headerTs || sigTimestamp;
    if (!effectiveTs || !v1Signature || !/^\d+$/.test(effectiveTs)) {
      return false;
    }

    const tsSeconds = Number(effectiveTs);
    if (!Number.isFinite(tsSeconds) || tsSeconds <= 0) {
      return false;
    }

    const nowSeconds = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
    const toleranceSeconds = options?.toleranceSeconds ?? 300;
    if (Math.abs(nowSeconds - tsSeconds) > toleranceSeconds) {
      return false;
    }

    const computed = crypto
      .createHmac('sha256', secret)
      .update(`${effectiveTs}.${rawBody}`)
      .digest('hex');

    const cleanSig = v1Signature.trim().toLowerCase();
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
 * Legacy helper: Validates plain HMAC-SHA256 signature with timing-safe comparison.
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
 * Mock payments are strictly forbidden in production or when Nyole / Notch Pay credentials are set.
 */
export const isMockAllowed = (env: Record<string, string | undefined>): boolean => {
  const isProd = env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production';
  if (isProd) {
    return false;
  }
  if (Boolean(env.NYOLE_SECRET_KEY?.trim()) || Boolean(env.NOTCHPAY_PRIVATE_KEY?.trim())) {
    return false;
  }
  return true;
};
