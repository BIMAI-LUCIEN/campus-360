import crypto from 'node:crypto';
import net from 'node:net';

import { notifyAdmin, sendTopUpReceipt } from './automations';
import { databasePool } from './database';
import { MobileApiError } from './mobile-error';
import { operatorMismatchMessage, parseCameroonMobile } from './cameroon-phone';
import {
  PAYMENT_PACKS,
  PaymentPackType,
  decideWebhookCredit,
  isMockAllowed,
  verifySaspaySignature,
} from './payment-rules';

try {
  net.setDefaultAutoSelectFamilyAttemptTimeout?.(5000);
} catch {
  // Ignore on runtimes without setDefaultAutoSelectFamilyAttemptTimeout
}

export { PAYMENT_PACKS, type PaymentPackType };
export type PaymentOperator = 'mtn' | 'orange';

export const getSaspayBaseUrl = (): string =>
  (process.env.SASPAY_API_URL?.trim() || 'https://api.saspay.me/api/v1').replace(/\/+$/, '');

/**
 * Lit le corps d'une réponse SasPay en échec, le journalise et renvoie un message lisible
 * (`message`, `detail`, `error`, `code` ou premier message de validation).
 */
export const readSaspayError = async (res: Response, context: string): Promise<string> => {
  const raw = await res.text().catch(() => '');
  console.error(`[Saspay ${context}]`, res.status, raw.slice(0, 1000));
  let message = '';
  try {
    const body = JSON.parse(raw) as Record<string, unknown>;
    const pick = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return pick(value[0]);
      if (value && typeof value === 'object') return pick(Object.values(value)[0]);
      return '';
    };
    message =
      pick(body.message) || pick(body.detail) || pick(body.error) || pick(body.errors) || pick(body.code);
  } catch {
    // corps non JSON
  }
  return message.trim().slice(0, 200);
};

/** Découpe un nom complet en prénom / nom pour le champ `customer` de SasPay (softpay). */
export const splitCustomerName = (fullName?: string) => {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Étudiant',
    lastName: parts.slice(1).join(' ') || 'Campus 360',
  };
};

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
  /** true when the session was created with a sandbox/test key. */
  testMode: boolean;
}

/**
 * Validates a Cameroon MTN / Orange number and checks it matches the selected operator.
 * Throws a 400 before anything is stored or sent to the provider.
 */
export const requireCameroonMobileMoney = (rawPhone: string, operator: PaymentOperator) => {
  const parsed = parseCameroonMobile(rawPhone);
  if (!parsed.ok) {
    throw new MobileApiError(parsed.error, 400);
  }
  const mismatch = operatorMismatchMessage(parsed.operator, operator);
  if (mismatch) {
    throw new MobileApiError(mismatch, 400);
  }
  return parsed;
};

/**
 * Initiates direct Mobile Money payment (MTN MoMo or Orange Money) via SasPay.
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

  const saspayApiKey = process.env.SASPAY_API_KEY?.trim();
  const hasProviderKey = Boolean(saspayApiKey);
  const mockAllowed = isMockAllowed(process.env);

  if (!hasProviderKey && !mockAllowed) {
    throw new MobileApiError('Paiement indisponible pour le moment.', 503);
  }

  const { e164: formattedPhone, operator: effectiveOperator } = requireCameroonMobileMoney(
    params.phone,
    params.operator,
  );
  const currency = 'XAF';
  const description = `Campus 360 - Recharge Portefeuille (${amount} FCFA)`;

  let reference = `c360_${params.packType}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  let paymentUrl: string | undefined;
  let testMode = false;

  // Insert pending row before contacting payment gateway (atomic & tracked)
  await pool.query(
    `insert into public.app_wallet_transactions (
       user_id, type, pack_type, amount_coins, reference_id, status
     ) values ($1, 'topup', $2, $3, $4, 'pending')`,
    [params.studentId, params.packType, amount, reference],
  );

  if (saspayApiKey) {
    const baseUrl = getSaspayBaseUrl();
    const { firstName, lastName } = splitCustomerName(params.studentName);
    try {
      const initRes = await doFetch(`${baseUrl}/payments/softpay/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${saspayApiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Idempotency-Key': reference,
        },
        body: JSON.stringify({
          amount: `${amount}.00`,
          currency,
          country: 'CM',
          description,
          customer: {
            email: params.studentEmail || `${params.studentId}@campus360.app`,
            first_name: firstName,
            last_name: lastName,
            phone: formattedPhone,
          },
          network: effectiveOperator === 'orange' ? 'orange_cm' : 'mtn_cm',
          metadata: {
            reference,
            student_id: params.studentId,
            pack_type: params.packType,
            operator: effectiveOperator,
          },
        }),
      });

      if (!initRes.ok) {
        const providerMessage = await readSaspayError(initRes, 'Softpay Error');
        await pool.query(
          `update public.app_wallet_transactions set status = 'failed', failure_message = $2 where reference_id = $1`,
          [reference, providerMessage || null],
        );
        throw new MobileApiError(
          providerMessage
            ? `Paiement refusé par l'opérateur : ${providerMessage}`
            : "L'opérateur n'a pas répondu. Réessaie.",
          502,
        );
      }

      const initData = (await initRes.json()) as {
        id?: string;
        checkout_url?: string;
      };

      testMode = saspayApiKey.startsWith('sk_test_');

      const gatewayRef = initData.id;
      if (gatewayRef && gatewayRef !== reference) {
        await pool.query(
          `update public.app_wallet_transactions set reference_id = $1 where reference_id = $2`,
          [gatewayRef, reference],
        );
        reference = gatewayRef;
      }

      // checkout_url vide = push envoyé directement sur le téléphone du client.
      paymentUrl = initData.checkout_url || undefined;
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
    directDebitPrompt: !paymentUrl,
    message: paymentUrl
      ? `Termine le paiement de ${amount} ${currency} sur la page de paiement sécurisée SasPay : choisis ${effectiveOperator === 'orange' ? 'Orange Money' : 'MTN MoMo'}, puis valide avec ton code secret sur le ${formattedPhone}.`
      : `Valide le débit de ${amount} ${currency} avec ton code secret Mobile Money sur le ${formattedPhone}.`,
    mock: !hasProviderKey,
    testMode,
  };
}

export interface SaspayWebhookResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Webhook SasPay (`X-Webhook-Signature` + `X-Webhook-Timestamp`).
 * Used by /api/mobile/payments/webhook and /api/mobile/wallet/webhook.
 */
export async function processSaspayWebhook(
  rawBody: string,
  headers: Headers | { get(name: string): string | null },
): Promise<SaspayWebhookResult> {
  const saspaySecret =
    process.env.SASPAY_WEBHOOK_SECRET?.trim() ||
    process.env.SASPAY_API_KEY?.trim();

  if (!saspaySecret) {
    console.error('[processWebhook] SASPAY_API_KEY missing.');
    return {
      status: 503,
      body: { error: 'Webhook non configuré.' },
    };
  }

  const signature = headers.get('x-webhook-signature');
  const timestamp = headers.get('x-webhook-timestamp');
  const signatureValid = Boolean(
    signature && verifySaspaySignature(rawBody, signature, timestamp, saspaySecret),
  );

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
    eventPayload.data?.metadata?.reference ||
    eventPayload.data?.id ||
    eventPayload.data?.transaction_reference ||
    eventPayload.data?.reference ||
    eventPayload.id ||
    eventPayload.reference ||
    eventPayload.transaction?.reference;

  const fallbackMetaReference =
    typeof eventPayload.data?.metadata?.reference === 'string'
      ? eventPayload.data.metadata.reference
      : (typeof eventPayload.data?.id === 'string' ? eventPayload.data.id : null);

  if (!reference || typeof reference !== 'string' || reference.length > 200) {
    return {
      status: 400,
      body: { error: 'Référence manquante ou invalide.' },
    };
  }

  const status = String(
    eventPayload.status ||
    eventPayload.data?.status ||
    eventPayload.data?.transaction_status ||
    '',
  ).toLowerCase();
  const event = String(eventPayload.event || '').toLowerCase();
  const paidFlag = eventPayload.paid ?? eventPayload.data?.paid;
  const isExplicitlyUnpaid = paidFlag === false;
  const isFailedEvent =
    event === 'transaction.failed' ||
    event === 'transaction.cancelled' ||
    event === 'payment.failed' ||
    event === 'charge.failed' ||
    event === 'payment.cancelled' ||
    event === 'payment.canceled' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'canceled' ||
    status === 'expired';

  const isSuccess =
    !isExplicitlyUnpaid &&
    !isFailedEvent &&
    (status === 'paid' ||
      status === 'complete' ||
      status === 'completed' ||
      status === 'confirmed' ||
      status === 'success' ||
      status === 'successful' ||
      event === 'transaction.success' ||
      event === 'payment.completed' ||
      event === 'payment.complete' ||
      event === 'payment.confirmed');

  const rawAmount =
    eventPayload.amount ??
    eventPayload.data?.amount ??
    eventPayload.data?.net_amount;
  const amount = rawAmount !== null && rawAmount !== undefined ? Math.round(Number(rawAmount)) : null;

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
      { amount, success: isSuccess, failed: isFailedEvent },
    );

    if (decision === 'ignore-already-processed') {
      await client.query('rollback');
      return {
        status: 200,
        body: {
          ok: true,
          message: isSuccess || isFailedEvent ? 'Transaction déjà traitée.' : 'Événement sans effet sur le solde.',
        },
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
      const failureMessage =
        eventPayload.data?.failure_message ||
        eventPayload.failure_message ||
        eventPayload.data?.failure_reason ||
        eventPayload.failure_reason ||
        eventPayload.data?.error?.message ||
        eventPayload.error?.message ||
        eventPayload.data?.message ||
        eventPayload.message ||
        'La transaction a été rejetée ou a expiré.';

      await client.query(
        `update public.app_wallet_transactions set status = 'failed', failure_message = $2 where id = $1`,
        [tx.id, failureMessage],
      );
      await client.query('commit');
      await notifyAdmin('Paiement Mobile Money échoué', {
        Référence: reference,
        Statut: status,
        Événement: event,
        Motif: failureMessage,
      }).catch(() => {});
      return {
        status: 200,
        body: { ok: true, status: 'failed', failureMessage },
      };
    }

    // decision === 'credit'
    await client.query(
      `update public.app_wallet_transactions set status = 'success', failure_message = null where id = $1`,
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

/**
 * Backward compatibility alias for existing callers.
 */
export async function verifyAndProcessMobilePaymentWebhook(params: {
  rawBody: string;
  signature?: string | null;
  timestamp?: string | null;
  eventPayload?: any;
}) {
  const result = await processSaspayWebhook(params.rawBody, {
    get: (name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'x-webhook-timestamp') {
        return params.timestamp ?? null;
      }
      if (lower === 'x-webhook-signature') {
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
