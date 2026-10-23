import crypto from 'node:crypto';
import net from 'node:net';

import { notifyAdmin, sendTopUpReceipt } from './automations';
import { databasePool } from './database';
import { MobileApiError } from './mobile-error';
import {
  PAYMENT_PACKS,
  PaymentPackType,
  decideWebhookCredit,
  isMockAllowed,
  verifyNotchSignature,
  verifyNyoleSignature,
} from './payment-rules';

try {
  net.setDefaultAutoSelectFamilyAttemptTimeout?.(5000);
} catch {
  // Ignore on runtimes without setDefaultAutoSelectFamilyAttemptTimeout
}

export { PAYMENT_PACKS, type PaymentPackType };
export type PaymentOperator = 'mtn' | 'orange';

export const getNyoleBaseUrl = (): string =>
  (process.env.NYOLE_API_URL?.trim() || 'https://app.nyole.com/api').replace(/\/+$/, '');

export interface InitiatePaymentParams {
  studentId: string;
  studentEmail?: string;
  studentName?: string;
  phone: string;
  operator: PaymentOperator;
  packType: PaymentPackType;
  currency?: 'XAF';
}

export interface PaymentInitiationResult {
  reference: string;
  status: 'pending';
  paymentUrl?: string;
  directDebitPrompt: boolean;
  message: string;
  mock: boolean;
}

export const formatPhoneForOperator = (raw: string): string => {
  let cleaned = raw.replace(/[\s()\-]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('237')) {
      cleaned = `+${cleaned}`;
    } else {
      // Default to Cameroon prefix if 9 digits starting with 6
      cleaned = `+237${cleaned}`;
    }
  }
  return cleaned;
};

/**
 * Automatically detects the Cameroon Mobile Money operator from the phone prefix
 * so a user with an Orange number (69x, 655-659, 685-689) or MTN number (67x, 650-654, 680-684)
 * never gets rejected by PawaPay due to a mismatched UI toggle.
 */
export const detectCameroonOperator = (
  rawPhone: string,
  fallback: PaymentOperator = 'mtn',
): PaymentOperator => {
  const digits = rawPhone.replace(/\D/g, '');
  const national = digits.startsWith('237') && digits.length >= 12 ? digits.slice(3) : digits;
  if (/^6(9\d|5[5-9]|8[5-9])\d{6}$/.test(national)) {
    return 'orange';
  }
  if (/^6(7\d|5[0-4]|8[0-4])\d{6}$/.test(national)) {
    return 'mtn';
  }
  return fallback;
};

/**
 * Initiates direct Mobile Money payment (MTN MoMo or Orange Money) via Nyole Checkout API.
 * Inserts the pending transaction BEFORE calling the provider. Any provider failure marks status 'failed'.
 */
export async function initiateMobileMoneyPayment(
  params: InitiatePaymentParams,
  deps?: { pool?: any; fetch?: typeof fetch },
): Promise<PaymentInitiationResult> {
  const pool = deps?.pool || databasePool;
  const doFetch = deps?.fetch || globalThis.fetch;
  const amount = PAYMENT_PACKS[params.packType];
  if (!amount) {
    throw new MobileApiError('Pack de recharge invalide.', 400);
  }

  const nyoleSecretKey = process.env.NYOLE_SECRET_KEY?.trim();
  const legacyPrivateKey = process.env.NOTCHPAY_PRIVATE_KEY?.trim();
  const hasProviderKey = Boolean(nyoleSecretKey || legacyPrivateKey);
  const mockAllowed = isMockAllowed(process.env);

  if (!hasProviderKey && !mockAllowed) {
    throw new MobileApiError('Paiement indisponible pour le moment.', 503);
  }

  const formattedPhone = formatPhoneForOperator(params.phone);
  const effectiveOperator = detectCameroonOperator(formattedPhone, params.operator);
  const currency = 'XAF';
  const description = `Campus 360 - Recharge Portefeuille (${amount} FCFA)`;

  let reference = `c360_${params.packType}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  let paymentUrl: string | undefined;

  // Insert pending row before contacting payment gateway (atomic & tracked)
  await pool.query(
    `insert into public.app_wallet_transactions (
       user_id, type, pack_type, amount_coins, reference_id, status
     ) values ($1, 'topup', $2, $3, $4, 'pending')`,
    [params.studentId, params.packType, amount, reference],
  );

  if (nyoleSecretKey) {
    const baseUrl = getNyoleBaseUrl();
    try {
      const initRes = await doFetch(`${baseUrl}/v1/checkout/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${nyoleSecretKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Idempotency-Key': reference,
        },
        body: JSON.stringify({
          amount,
          currency,
          customer_name: params.studentName || 'Étudiant Campus 360',
          customer_email: params.studentEmail || 'etudiant@campus360b.site',
          customer_phone: formattedPhone,
          description,
          merchant_name: 'Campus 360',
          metadata: {
            reference,
            student_id: params.studentId,
            pack_type: params.packType,
            operator: effectiveOperator,
          },
        }),
      });

      if (!initRes.ok) {
        await pool.query(
          `update public.app_wallet_transactions set status = 'failed' where reference_id = $1`,
          [reference],
        );
        throw new MobileApiError("L'opérateur n'a pas répondu. Réessaie.", 502);
      }

      const initData = (await initRes.json()) as {
        id?: string;
        url?: string;
        order_id?: string;
        reference?: string;
        authorization_url?: string;
      };

      const gatewayRef = initData.id || initData.reference;
      if (gatewayRef && gatewayRef !== reference) {
        await pool.query(
          `update public.app_wallet_transactions set reference_id = $1 where reference_id = $2`,
          [gatewayRef, reference],
        );
        reference = gatewayRef;
      }

      paymentUrl =
        initData.url ||
        initData.authorization_url ||
        (initData.id ? `https://app.nyole.com/checkout/${initData.id}` : undefined);
    } catch (error) {
      if (error instanceof MobileApiError) throw error;
      await pool.query(
        `update public.app_wallet_transactions set status = 'failed' where reference_id = $1`,
        [reference],
      );
      throw new MobileApiError("L'opérateur n'a pas répondu. Réessaie.", 502);
    }
  } else if (legacyPrivateKey) {
    try {
      const initRes = await doFetch('https://api.notchpay.co/payments', {
        method: 'POST',
        headers: {
          Authorization: legacyPrivateKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          email: params.studentEmail || 'etudiant@campus360.app',
          description,
          customer: {
            name: params.studentName || 'Étudiant Campus 360',
            phone: formattedPhone,
          },
        }),
      });

      if (!initRes.ok) {
        await pool.query(
          `update public.app_wallet_transactions set status = 'failed' where reference_id = $1`,
          [reference],
        );
        throw new MobileApiError("L'opérateur n'a pas répondu. Réessaie.", 502);
      }

      const initData = (await initRes.json()) as {
        reference?: string;
        data?: { reference?: string };
        transaction?: { reference?: string };
        authorization_url?: string;
      };

      const gatewayRef =
        initData.reference ||
        initData.data?.reference ||
        initData.transaction?.reference;

      if (gatewayRef && gatewayRef !== reference) {
        await pool.query(
          `update public.app_wallet_transactions set reference_id = $1 where reference_id = $2`,
          [gatewayRef, reference],
        );
        reference = gatewayRef;
      }
      paymentUrl = initData.authorization_url;

      const channel = params.operator === 'orange' ? 'cm.orange' : 'cm.mtn';
      await doFetch(`https://api.notchpay.co/payments/${reference}`, {
        method: 'POST',
        headers: {
          Authorization: legacyPrivateKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel,
          data: { account_number: formattedPhone },
        }),
      }).catch((err) => console.warn('[Payment Direct Push]', err));
    } catch (error) {
      if (error instanceof MobileApiError) throw error;
      await pool.query(
        `update public.app_wallet_transactions set status = 'failed' where reference_id = $1`,
        [reference],
      );
      throw new MobileApiError("L'opérateur n'a pas répondu. Réessaie.", 502);
    }
  }

  return {
    reference,
    status: 'pending',
    paymentUrl,
    directDebitPrompt: true,
    message: `Une notification de validation de débit (${amount} ${currency}) a été envoyée sur votre téléphone ${formattedPhone}. Veuillez saisir votre code PIN Mobile Money.`,
    mock: !hasProviderKey,
  };
}

export interface NotchWebhookResult {
  status: number;
  body: Record<string, unknown>;
}

export type NyoleWebhookResult = NotchWebhookResult;

/**
 * Unified webhook handler for both /api/mobile/payments/webhook and /api/mobile/wallet/webhook.
 * Supports Nyole (`X-Afriflow-Signature` + `X-Afriflow-Timestamp`) and legacy HMAC headers.
 */
export async function processNyoleWebhook(
  rawBody: string,
  headers: Headers | { get(name: string): string | null },
): Promise<NyoleWebhookResult> {
  const nyoleSecret =
    process.env.NYOLE_WEBHOOK_SECRET?.trim() ||
    process.env.NYOLE_SECRET_KEY?.trim();
  const legacySecret = process.env.NOTCHPAY_WEBHOOK_SECRET?.trim();

  if (!nyoleSecret && !legacySecret) {
    console.error('[processNyoleWebhook] NYOLE_SECRET_KEY / NYOLE_WEBHOOK_SECRET missing.');
    return {
      status: 503,
      body: { error: 'Webhook non configuré.' },
    };
  }

  const afriflowSignature = headers.get('x-afriflow-signature');
  const afriflowTimestamp = headers.get('x-afriflow-timestamp');
  const legacySignature =
    headers.get('x-notch-signature') ||
    headers.get('x-cinetpay-signature') ||
    headers.get('x-webhook-signature');

  let signatureValid = false;
  if (afriflowSignature && nyoleSecret) {
    signatureValid = verifyNyoleSignature(
      rawBody,
      afriflowSignature,
      afriflowTimestamp,
      nyoleSecret,
    );
  } else if (legacySignature && (legacySecret || nyoleSecret)) {
    signatureValid = verifyNotchSignature(
      rawBody,
      legacySignature,
      (legacySecret || nyoleSecret)!,
    );
  }

  if (!signatureValid) {
    return {
      status: 401,
      body: { error: 'Signature invalide.' },
    };
  }

  let eventPayload: any;
  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return {
      status: 400,
      body: { error: 'JSON invalide.' },
    };
  }

  const reference =
    eventPayload.data?.id ||
    eventPayload.data?.reference ||
    eventPayload.data?.metadata?.reference ||
    eventPayload.reference ||
    eventPayload.transaction?.reference;

  const fallbackMetaReference =
    typeof eventPayload.data?.metadata?.reference === 'string'
      ? eventPayload.data.metadata.reference
      : null;

  if (!reference || typeof reference !== 'string' || reference.length > 200) {
    return {
      status: 400,
      body: { error: 'Référence manquante ou invalide.' },
    };
  }

  const status = String(eventPayload.status || eventPayload.data?.status || '').toLowerCase();
  const event = String(eventPayload.event || '').toLowerCase();
  const isSuccess =
    status === 'complete' ||
    status === 'completed' ||
    status === 'confirmed' ||
    status === 'success' ||
    status === 'successful' ||
    event === 'payment.completed' ||
    event === 'payment.complete' ||
    event === 'payment.confirmed';

  const rawAmount = eventPayload.amount ?? eventPayload.data?.amount;
  const amount = rawAmount !== null && rawAmount !== undefined ? Number(rawAmount) : null;

  const client = await databasePool.connect();
  try {
    await client.query('begin');

    const txRes = await client.query<{
      id: string;
      user_id: string;
      type: string;
      pack_type: string | null;
      amount_coins: number;
      status: string;
    }>(
      `select id, user_id, type, pack_type, amount_coins, status
       from public.app_wallet_transactions
       where reference_id = $1
          or ($2::text is not null and reference_id = $2)
       limit 1
       for update`,
      [reference, fallbackMetaReference],
    );

    if (txRes.rows.length === 0) {
      await client.query('rollback');
      return {
        status: 404,
        body: { error: `Transaction introuvable pour la référence ${reference}.` },
      };
    }

    const tx = txRes.rows[0];
    const decision = decideWebhookCredit(
      { status: tx.status, amount_coins: Number(tx.amount_coins) },
      { amount, success: isSuccess },
    );

    if (decision === 'ignore-already-processed') {
      await client.query('rollback');
      return {
        status: 200,
        body: { ok: true, message: 'Transaction déjà traitée.' },
      };
    }

    if (decision === 'reject-amount') {
      await client.query('rollback');
      await notifyAdmin('Montant webhook incohérent', {
        Référence: reference,
        Attendu: String(tx.amount_coins),
        Reçu: String(amount),
      }).catch(() => {});
      return {
        status: 400,
        body: { error: 'Montant incohérent.' },
      };
    }

    if (decision === 'mark-failed') {
      await client.query(
        `update public.app_wallet_transactions set status = 'failed' where id = $1`,
        [tx.id],
      );
      await client.query('commit');
      await notifyAdmin('Paiement Mobile Money échoué', {
        Référence: reference,
        Statut: status,
        Événement: event,
      }).catch(() => {});
      return {
        status: 200,
        body: { ok: true, status: 'failed' },
      };
    }

    // decision === 'credit'
    await client.query(
      `update public.app_wallet_transactions set status = 'success' where id = $1`,
      [tx.id],
    );

    const isDiscovery = tx.pack_type === 'discovery_500';
    if (isDiscovery) {
      await client.query(
        `update public.stage_students
         set tokens = tokens + 5
         where auth_id = $1 or id::text = $1 or app_user_id::text = $1`,
        [tx.user_id],
      );
    } else {
      await client.query(
        `insert into public.app_wallets (user_id, balance_coins)
         values ($1, $2)
         on conflict (user_id) do update
           set balance_coins = public.app_wallets.balance_coins + excluded.balance_coins,
               updated_at = now()`,
        [tx.user_id, Number(tx.amount_coins)],
      );
    }

    await client.query('commit');

    if (!isDiscovery) {
      await sendTopUpReceipt(String(tx.user_id), Number(tx.amount_coins), reference).catch(() => {});
    }

    return {
      status: 200,
      body: {
        ok: true,
        success: true,
        studentId: tx.user_id,
        amountCoins: Number(tx.amount_coins),
      },
    };
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

export const processNotchWebhook = processNyoleWebhook;

/**
 * Backward compatibility alias for existing callers.
 */
export async function verifyAndProcessMobilePaymentWebhook(params: {
  rawBody: string;
  signature?: string | null;
  timestamp?: string | null;
  eventPayload?: any;
}) {
  const result = await processNyoleWebhook(params.rawBody, {
    get: (name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'x-afriflow-timestamp') {
        return params.timestamp ?? null;
      }
      if (lower === 'x-afriflow-signature') {
        return params.signature && params.signature.includes('v1=') ? params.signature : null;
      }
      if (lower.includes('signature')) {
        return params.signature ?? null;
      }
      return null;
    },
  });
  return {
    success: result.status === 200 && Boolean((result.body as any).ok),
    message: String((result.body as any).error || (result.body as any).message || 'OK'),
  };
}
