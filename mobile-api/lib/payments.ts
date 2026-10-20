import crypto from 'node:crypto';

import { notifyAdmin, sendTopUpReceipt } from './automations';
import { databasePool } from './database';
import { MobileApiError } from './mobile-error';
import {
  PAYMENT_PACKS,
  PaymentPackType,
  decideWebhookCredit,
  isMockAllowed,
  verifyNotchSignature,
} from './payment-rules';

export { PAYMENT_PACKS, type PaymentPackType };
export type PaymentOperator = 'mtn' | 'orange';

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

const formatPhoneForOperator = (raw: string): string => {
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
 * Initiates direct Mobile Money payment (MTN MoMo or Orange Money) via Notch Pay.
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

  const privateKey = process.env.NOTCHPAY_PRIVATE_KEY?.trim();
  const mockAllowed = isMockAllowed(process.env);

  if (!privateKey && !mockAllowed) {
    throw new MobileApiError('Paiement indisponible pour le moment.', 503);
  }

  const formattedPhone = formatPhoneForOperator(params.phone);
  const currency = 'XAF';
  const description = `Campus 360 - Recharge Portefeuille (${amount} FCFA)`;

  let reference = `c360_${params.packType}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  let paymentUrl: string | undefined;

  // Insert pending row before contacting Notch Pay (atomic & tracked)
  await pool.query(
    `insert into public.app_wallet_transactions (
       user_id, type, pack_type, amount_coins, reference_id, status
     ) values ($1, 'topup', $2, $3, $4, 'pending')`,
    [params.studentId, params.packType, amount, reference],
  );

  if (privateKey) {
    try {
      const initRes = await doFetch('https://api.notchpay.co/payments', {
        method: 'POST',
        headers: {
          Authorization: privateKey,
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

      // Push USSD direct
      const channel = params.operator === 'orange' ? 'cm.orange' : 'cm.mtn';
      await doFetch(`https://api.notchpay.co/payments/${reference}`, {
        method: 'POST',
        headers: {
          Authorization: privateKey,
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
    mock: !Boolean(privateKey),
  };
}

export interface NotchWebhookResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Unified webhook handler for both /api/mobile/payments/webhook and /api/mobile/wallet/webhook.
 */
export async function processNotchWebhook(
  rawBody: string,
  headers: Headers | { get(name: string): string | null },
): Promise<NotchWebhookResult> {
  const secret = process.env.NOTCHPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[processNotchWebhook] NOTCHPAY_WEBHOOK_SECRET missing.');
    return {
      status: 503,
      body: { error: 'Webhook non configuré.' },
    };
  }

  const signature =
    headers.get('x-notch-signature') ||
    headers.get('x-cinetpay-signature') ||
    headers.get('x-webhook-signature');

  if (!verifyNotchSignature(rawBody, signature, secret)) {
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
    eventPayload.reference ||
    eventPayload.data?.reference ||
    eventPayload.transaction?.reference;

  if (!reference || typeof reference !== 'string' || reference.length > 200) {
    return {
      status: 400,
      body: { error: 'Référence manquante ou invalide.' },
    };
  }

  const status = String(eventPayload.status || eventPayload.data?.status || '');
  const event = String(eventPayload.event || '');
  const isSuccess =
    status === 'complete' ||
    status === 'confirmed' ||
    status === 'success' ||
    status === 'successful' ||
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
       limit 1
       for update`,
      [reference],
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

/**
 * Backward compatibility alias for existing callers.
 */
export async function verifyAndProcessMobilePaymentWebhook(params: {
  rawBody: string;
  signature?: string | null;
  eventPayload?: any;
}) {
  const result = await processNotchWebhook(params.rawBody, {
    get: (name: string) => (name.includes('signature') ? params.signature ?? null : null),
  });
  return {
    success: result.status === 200 && Boolean((result.body as any).ok),
    message: String((result.body as any).error || (result.body as any).message || 'OK'),
  };
}
