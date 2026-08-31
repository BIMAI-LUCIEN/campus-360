import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
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

    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null, email: 'guest@campus360.local' },
      response: null,
    }));
    const user = access?.user ?? { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null, email: 'guest@campus360.local' };

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
        throw new MobileApiError(
          'Erreur lors du traitement du debit direct. Verifiez le numero de telephone.',
          400,
        );
      }
    } else {
      reference = `mock_pay_${crypto.randomUUID().replace(/-/g, '')}`;
    }

    if (user.id !== 'guest-student') {
      try {
        const client = await databasePool.connect();
        try {
          await client.query(
            `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
             values ($1, 'topup', $2, $3, $4)`,
            [user.id, input.amountCoins, reference, status],
          );
        } finally {
          client.release();
        }
      } catch (dbErr) {
        console.warn('[topup] Transaction record skipped:', dbErr);
      }
    }

    return withCors(NextResponse.json({ reference, status, mock: !isRealPayment }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
