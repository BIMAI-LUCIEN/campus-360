import crypto from 'crypto';

import { notifyAdmin, sendTopUpReceipt } from './automations';
import { databasePool } from './database';

export type PaymentPackType = 'recharge_500' | 'recharge_1000' | 'recharge_2000' | 'recharge_5000' | 'discovery_500' | 'monthly_2000' | string;
export type PaymentOperator = 'mtn' | 'orange' | 'wave';

export interface InitiatePaymentParams {
  studentId: string;
  studentEmail?: string;
  studentName?: string;
  phone: string;
  operator: PaymentOperator;
  packType: PaymentPackType;
  amount: number;
  currency?: 'XAF' | 'XOF';
}

export interface PaymentInitiationResult {
  reference: string;
  status: 'pending' | 'success';
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
    } else if (cleaned.startsWith('225')) {
      cleaned = `+${cleaned}`;
    } else {
      // Default to Cameroon prefix if 9 digits starting with 6
      cleaned = `+237${cleaned}`;
    }
  }
  return cleaned;
};

/**
 * Initialise le paiement direct Mobile Money (MTN MoMo, Orange Money, Wave)
 * via la passerelle Notch Pay / CinetPay ou mode mock sécurisé.
 */
export async function initiateMobileMoneyPayment(
  params: InitiatePaymentParams,
): Promise<PaymentInitiationResult> {
  const privateKey = process.env.NOTCHPAY_PRIVATE_KEY;
  const isRealPayment = Boolean(privateKey);
  const formattedPhone = formatPhoneForOperator(params.phone);
  const currency = params.currency || 'XAF';

  const description = `Campus 360 - Recharge Portefeuille (${params.amount} FCFA)`;

  let reference = `c360_${params.packType}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  let paymentUrl: string | undefined;
  let directDebitPrompt = true;

  if (isRealPayment) {
    try {
      const initRes = await fetch('https://api.notchpay.co/payments', {
        method: 'POST',
        headers: {
          Authorization: privateKey!,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount,
          currency,
          email: params.studentEmail || 'etudiant@campus360.app',
          description,
          customer: {
            name: params.studentName || 'Étudiant Campus 360',
            phone: formattedPhone,
          },
        }),
      });

      if (initRes.ok) {
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

        if (gatewayRef) {
          reference = gatewayRef;
          paymentUrl = initData.authorization_url;

          // Push USSD direct si opérateur supporté
          const channel = params.operator === 'orange' ? 'cm.orange' : 'cm.mtn';
          await fetch(`https://api.notchpay.co/payments/${gatewayRef}`, {
            method: 'POST',
            headers: {
              Authorization: privateKey!,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channel,
              data: { account_number: formattedPhone },
            }),
          }).catch((err) => console.warn('[Payment Direct Push]', err));
        }
      }
    } catch (apiErr) {
      console.warn('[Payment Gateway Warn] Fallback to internal processing:', apiErr);
    }
  }

  // Enregistrement de la transaction en base
  try {
    const client = await databasePool.connect();
    try {
      await client.query(
        `insert into public.app_wallet_transactions (
           user_id, type, amount_coins, reference_id, status
         ) values ($1, $2, $3, $4, 'pending')`,
        [params.studentId, `momo_${params.packType}`, params.amount, reference],
      );
    } finally {
      client.release();
    }
  } catch (dbErr) {
    console.warn('[Payment DB Record Skipped]:', dbErr);
  }

  return {
    reference,
    status: 'pending',
    paymentUrl,
    directDebitPrompt,
    message: directDebitPrompt
      ? `Une notification de validation de débit (${params.amount} ${currency}) a été envoyée sur votre téléphone ${formattedPhone}. Veuillez saisir votre code PIN Mobile Money.`
      : 'Veuillez finaliser le paiement sur la page sécurisée.',
    mock: !isRealPayment,
  };
}

/**
 * Traite le webhook de paiement entrant et crédite les jetons / pass illimité
 */
export async function verifyAndProcessMobilePaymentWebhook(params: {
  rawBody: string;
  signature?: string | null;
  eventPayload: {
    event?: string;
    status?: string;
    reference?: string;
    amount?: number;
    customer?: { email?: string; phone?: string };
  };
}): Promise<{ success: boolean; studentId?: string; packType?: string; amountCoins?: number; message: string }> {
  const webhookSecret = process.env.NOTCHPAY_WEBHOOK_SECRET?.trim();

  // Fail closed: a webhook that credits wallets must always be signed and verified.
  if (!webhookSecret) {
    throw new Error('Webhook de paiement non configuré (NOTCHPAY_WEBHOOK_SECRET manquant).');
  }
  if (!params.signature) {
    throw new Error('Signature webhook absente');
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(params.rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(params.signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Signature webhook invalide');
  }

  const { reference, status, event } = params.eventPayload;
  const isSuccess =
    status === 'complete' ||
    status === 'success' ||
    status === 'successful' ||
    event === 'payment.complete';

  if (!isSuccess || !reference) {
    // Automation 4: admin alert on an explicit payment failure.
    if (/fail|cancel|expire|reject/i.test(`${status ?? ''} ${event ?? ''}`)) {
      await notifyAdmin('Paiement Mobile Money échoué', {
        Statut: status,
        Événement: event,
        Référence: reference || 'inconnue',
      });
    }
    return { success: false, message: 'Paiement non complété ou statut ignoré.' };
  }

  const client = await databasePool.connect();
  try {
    await client.query('begin');

    // Retrouver la transaction
    const txRes = await client.query<{
      id: string;
      user_id: string;
      type: string;
      amount_coins: number;
      status: string;
    }>(
      `select id, user_id, type, amount_coins, status
         from public.app_wallet_transactions
        where reference_id = $1
        limit 1
        for update`,
      [reference],
    );

    if (txRes.rows.length === 0) {
      await client.query('rollback');
      return { success: false, message: `Transaction introuvable pour la référence ${reference}.` };
    }

    const tx = txRes.rows[0];
    if (tx.status === 'success' || tx.status === 'completed') {
      await client.query('rollback');
      return { success: true, message: 'Transaction déjà traitée.' };
    }

    // The amount the provider confirms must match what we initiated.
    const paidAmount = Number(params.eventPayload.amount ?? 0);
    if (paidAmount > 0 && paidAmount !== Number(tx.amount_coins)) {
      await client.query('rollback');
      return { success: false, message: `Montant incohérent pour la référence ${reference}.` };
    }

    // Mettre à jour le statut de la transaction
    await client.query(
      `update public.app_wallet_transactions
          set status = 'completed'
        where id = $1`,
      [tx.id],
    );

    const isDiscovery = tx.type.includes('500') || tx.amount_coins === 500;

    if (isDiscovery) {
      // Crédit de 5 candidatures IA (+50 tokens / +5 candidatures)
      await client.query(
        `update public.stage_students
            set tokens = tokens + 5
          where auth_id = $1 or id::text = $1 or app_user_id::text = $1`,
        [tx.user_id],
      );
    } else {
      // 100 % wallet model (no subscription / monthly pass): the paid amount is credited in coins.
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

    // Automation 3: receipt for wallet credits (after commit, best-effort).
    if (!isDiscovery) {
      await sendTopUpReceipt(String(tx.user_id), Number(tx.amount_coins), reference);
    }

    return {
      success: true,
      studentId: tx.user_id,
      packType: isDiscovery ? 'discovery_500' : 'wallet_topup',
      amountCoins: Number(tx.amount_coins),
      message: isDiscovery
        ? '5 candidatures IA créditées avec succès.'
        : `${Number(tx.amount_coins)} coins crédités sur ton wallet.`,
    };
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}
