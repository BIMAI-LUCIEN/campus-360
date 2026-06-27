import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

const MAX_BODY_BYTES = 8 * 1024; // 8 KB is plenty for {amount, provider, phone}

const bodySchema = z.object({
  amountCoins: z.number().int().min(100).max(1_000_000),
  providerName: z.string().min(2).max(80),
  // E.164-ish (looser): digits, spaces, +, -, must be 8-20 chars after trim.
  phoneNumber: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^[+0-9 ()\-]+$/, 'Numero de telephone invalide.')
    .optional(),
});

export const runtime = 'nodejs';

const formatPhoneForProvider = (raw: string): string => {
  let phone = raw.replace(/[\s()\-]/g, '');
  if (!phone.startsWith('+')) {
    if (phone.startsWith('237')) {
      phone = `+${phone}`;
    } else {
      phone = `+237${phone}`;
    }
  }
  return phone;
};

export async function POST(request: NextRequest) {
  try {
    // Enforce body-size limit BEFORE parsing.
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 });
    }

    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    // Wallet topups are the main abuse surface: charge flow is expensive and
    // each attempt can spend money at the payment provider. Hard cap.
    try {
      await enforceRateLimit(request, {
        bucket: 'wallet-topup',
        max: 5,
        windowMs: 60_000,
        userId: access.user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return response;
      throw error;
    }

    const input = bodySchema.parse(await request.json());

    const client = await databasePool.connect();
    try {
      const privateKey = process.env.NOTCHPAY_PRIVATE_KEY;
      const isRealPayment = Boolean(privateKey);

      let reference = '';
      let status = 'pending';

      if (isRealPayment) {
        if (!input.phoneNumber) {
          throw new MobileApiError('Le numero de telephone est requis pour ce moyen de paiement.', 400);
        }

        const initRes = await fetch('https://api.notchpay.co/payments', {
          method: 'POST',
          headers: {
            Authorization: privateKey!,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: input.amountCoins,
            currency: 'XAF',
            email: access.user.email,
            description: `Recharge Campus 360 - ${input.amountCoins} Coins`,
          }),
        });

        if (!initRes.ok) {
          console.error('[NotchPay Init] Non-OK response', initRes.status);
          throw new MobileApiError("Impossible d'initialiser le paiement.", 502);
        }

        const initData = (await initRes.json()) as {
          reference?: string;
          data?: { reference?: string };
          transaction?: { reference?: string };
          authorization_url?: string;
        };
        reference =
          initData.reference ||
          initData.data?.reference ||
          initData.transaction?.reference ||
          (initData.authorization_url ? initData.authorization_url.split('/').pop() : '') ||
          '';

        if (!reference) {
          throw new MobileApiError('Reference de transaction manquante.', 502);
        }

        const channel = input.providerName.toLowerCase().includes('orange') ? 'cm.orange' : 'cm.mtn';
        const formattedPhone = formatPhoneForProvider(input.phoneNumber);

        const chargeRes = await fetch(`https://api.notchpay.co/payments/${reference}`, {
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
        });

        if (!chargeRes.ok) {
          console.error('[NotchPay Charge] Non-OK response', chargeRes.status);
          throw new MobileApiError(
            'Erreur lors du traitement du debit direct. Verifiez le numero de telephone.',
            400,
          );
        }
      } else {
        // Mock sandbox: use a crypto-random reference (not Math.random) and a
        // length cap to keep the DB happy.
        reference = `mock_pay_${crypto.randomUUID().replace(/-/g, '')}`;
      }

      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
         values ($1, 'topup', $2, $3, $4)`,
        [access.user.id, input.amountCoins, reference, status],
      );

      return NextResponse.json({ reference, status, mock: !isRealPayment });
    } finally {
      client.release();
    }
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
