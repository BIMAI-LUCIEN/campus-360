import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { isMockAllowed } from '@/lib/payment-rules';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8 * 1024;
const MIN_TOPUP_COINS = 500;

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Expo-Origin, x-client-info, apikey, X-Requested-With',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return new NextResponse(null, { status: 204, headers });
}

const bodySchema = z.object({
  amountCoins: z.number().int().min(MIN_TOPUP_COINS).max(1_000_000),
  providerName: z.string().min(2).max(80),
  phoneNumber: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^[+0-9 ()\-]+$/, 'Numero de telephone invalide.')
    .optional(),
});

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
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return withCors(NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 }), request);
    }

    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    try {
      await enforceRateLimit(request, {
        bucket: 'wallet-topup',
        max: 20,
        windowMs: 60_000,
        userId: user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

    const input = bodySchema.parse(await request.json().catch(() => ({})));

    const privateKey = process.env.NOTCHPAY_PRIVATE_KEY?.trim();
    const mockAllowed = isMockAllowed(process.env);

    if (!privateKey && !mockAllowed) {
      throw new MobileApiError('Paiement indisponible pour le moment.', 503);
    }

    const isRealPayment = Boolean(privateKey);
    let reference = isRealPayment
      ? `c360_topup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
      : `mock_pay_${crypto.randomUUID().replace(/-/g, '')}`;

    // Insert pending transaction BEFORE provider call (no swallowed errors)
    await databasePool.query(
      `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
       values ($1, 'topup', $2, $3, 'pending')`,
      [user.id, input.amountCoins, reference],
    );

    if (isRealPayment) {
      if (!input.phoneNumber) {
        await databasePool.query(
          `update public.app_wallet_transactions set status = 'failed' where reference_id = $1`,
          [reference],
        );
        throw new MobileApiError('Le numero de telephone est requis pour ce moyen de paiement.', 400);
      }

      try {
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
            email: user.email || 'etudiant@campus360b.site',
            description: `Recharge Campus 360 - ${input.amountCoins} Coins`,
          }),
        });

        if (!initRes.ok) {
          throw new MobileApiError("Impossible d'initialiser le paiement.", 502);
        }

        const initData = (await initRes.json()) as {
          reference?: string;
          data?: { reference?: string };
          transaction?: { reference?: string };
          authorization_url?: string;
        };

        const providerRef =
          initData.reference ||
          initData.data?.reference ||
          initData.transaction?.reference ||
          (initData.authorization_url ? initData.authorization_url.split('/').pop() : '') ||
          '';

        if (providerRef && providerRef !== reference) {
          await databasePool.query(
            `update public.app_wallet_transactions set reference_id = $1 where reference_id = $2`,
            [providerRef, reference],
          );
          reference = providerRef;
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
          throw new MobileApiError(
            'Erreur lors du traitement du debit direct. Verifiez le numero de telephone.',
            400,
          );
        }
      } catch (err) {
        await databasePool.query(
          `update public.app_wallet_transactions set status = 'failed' where reference_id = $1`,
          [reference],
        );
        throw err;
      }
    }

    return withCors(NextResponse.json({ reference, status: 'pending', mock: !isRealPayment }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
