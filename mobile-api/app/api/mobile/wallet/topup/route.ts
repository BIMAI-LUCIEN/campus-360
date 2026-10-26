import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { isMockAllowed } from '@/lib/payment-rules';
import {
  getSaspayBaseUrl,
  readSaspayError,
  requireCameroonMobileMoney,
  splitCustomerName,
} from '@/lib/payments';
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

    const saspayApiKey = process.env.SASPAY_API_KEY?.trim();
    const isRealPayment = Boolean(saspayApiKey);
    const mockAllowed = isMockAllowed(process.env);

    if (!isRealPayment && !mockAllowed) {
      throw new MobileApiError('Paiement indisponible pour le moment.', 503);
    }

    // Validate the number (Cameroon, MTN or Orange, matching the chosen operator) before storing anything.
    const selectedOperator = input.providerName.toLowerCase().includes('orange') ? 'orange' : 'mtn';
    if (isRealPayment && !input.phoneNumber) {
      throw new MobileApiError('Le numero de telephone est requis pour ce moyen de paiement.', 400);
    }
    const phone = input.phoneNumber
      ? requireCameroonMobileMoney(input.phoneNumber, selectedOperator)
      : null;

    let reference = isRealPayment
      ? `c360_topup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
      : `mock_pay_${crypto.randomUUID().replace(/-/g, '')}`;
    let paymentUrl: string | undefined;
    let testMode = false;

    // Insert pending transaction BEFORE provider call (no swallowed errors)
    await databasePool.query(
      `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
       values ($1, 'topup', $2, $3, 'pending')`,
      [user.id, input.amountCoins, reference],
    );

    if (isRealPayment && phone) {
      const formattedPhone = phone.e164;
      const isOrange = phone.operator === 'orange';

      try {
        if (saspayApiKey) {
          const baseUrl = getSaspayBaseUrl();
          const { firstName, lastName } = splitCustomerName(user.name);
          const initRes = await fetch(`${baseUrl}/payments/softpay/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${saspayApiKey}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'Idempotency-Key': reference,
            },
            body: JSON.stringify({
              amount: `${input.amountCoins}.00`,
              currency: 'XAF',
              country: 'CM',
              description: `Recharge Campus 360 - ${input.amountCoins} Coins`,
              customer: {
                email: user.email || `${user.id}@campus360.app`,
                first_name: firstName,
                last_name: lastName,
                phone: formattedPhone,
              },
              network: isOrange ? 'orange_cm' : 'mtn_cm',
              metadata: {
                reference,
                student_id: user.id,
                operator: isOrange ? 'orange' : 'mtn',
              },
            }),
          });

          if (!initRes.ok) {
            const providerMessage = await readSaspayError(initRes, 'Softpay Error');
            await databasePool.query(
              `update public.app_wallet_transactions set failure_message = $2 where reference_id = $1`,
              [reference, providerMessage || null],
            );
            throw new MobileApiError(
              providerMessage
                ? `Paiement refusé par l'opérateur : ${providerMessage}`
                : "Impossible d'initialiser le paiement.",
              502,
            );
          }

          const initData = (await initRes.json()) as {
            id?: string;
            checkout_url?: string;
          };
          testMode = saspayApiKey.startsWith('sk_test_');

          const providerRef = initData.id || '';
          if (providerRef && providerRef !== reference) {
            await databasePool.query(
              `update public.app_wallet_transactions set reference_id = $1 where reference_id = $2`,
              [providerRef, reference],
            );
            reference = providerRef;
          }

          paymentUrl = initData.checkout_url || undefined;
        }
      } catch (err) {
        await databasePool.query(
          `update public.app_wallet_transactions set status = 'failed' where reference_id = $1`,
          [reference],
        );
        throw err;
      }
    }

    return withCors(
      NextResponse.json({
        reference,
        paymentUrl,
        status: 'pending',
        mock: !isRealPayment,
        testMode,
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
