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
      if (eqIdx === -1) {
        // Support direct hex signature without v1= prefix
        if (/^[a-fA-F0-9]{64}$/.test(part)) {
          v1Signature = part;
        }
        continue;
      }
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

    const rawTsNum = Number(effectiveTs);
    if (!Number.isFinite(rawTsNum) || rawTsNum <= 0) {
      return false;
    }
    // Support both second and millisecond timestamps
    const tsSeconds = effectiveTs.length >= 12 ? Math.floor(rawTsNum / 1000) : rawTsNum;

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

    // Only `${timestamp}.${rawBody}` is accepted (nyole.com/docs/webhooks/signature): a signature
    // that does not cover the timestamp could be replayed with a fresh timestamp.
    if (Buffer.byteLength(cleanSig) !== Buffer.byteLength(cleanComputed)) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(cleanSig, 'utf8'), Buffer.from(cleanComputed, 'utf8'));
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
 *
 * Nyole: a FAILED session stays payable (the customer can retry on the same page), so a later
 * success on a transaction stored as 'failed' is still credited. Non-terminal events
 * (`payment.updated` back to PENDING, REFUNDED) are ignored: `failed` must be explicit.
 */
export const decideWebhookCredit = (
  tx: { status: string; amount_coins: number },
  paid: { amount: number | null | undefined; success: boolean; failed?: boolean },
): 'credit' | 'ignore-already-processed' | 'reject-amount' | 'mark-failed' => {
  if (tx.status !== 'pending' && tx.status !== 'failed') {
    return 'ignore-already-processed';
  }
  if (!paid.success) {
    const failed = paid.failed ?? true;
    return tx.status === 'pending' && failed ? 'mark-failed' : 'ignore-already-processed';
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
