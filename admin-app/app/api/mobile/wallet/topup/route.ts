import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser } from '@/lib/mobile-access';

const bodySchema = z.object({
  amountCoins: z.number().int().min(100).max(1_000_000),
  providerName: z.string().min(2).max(80), // MTN MoMo or Orange Money
  phoneNumber: z.string().trim().min(8).max(30).optional(),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const input = bodySchema.parse(await request.json());
    const client = await databasePool.connect();

    try {
      const privateKey = process.env.NOTCHPAY_PRIVATE_KEY;
      const isRealPayment = !!privateKey;

      let reference = '';
      let status = 'pending';

      if (isRealPayment) {
        // Enforce phone number for real payments
        if (!input.phoneNumber) {
          throw new MobileApiError('Le numéro de téléphone est requis pour ce moyen de paiement.', 400);
        }

        // 1. Initialize Notch Pay Payment
        // XAF is the default currency in Central Africa (Cameroon)
        const initRes = await fetch('https://api.notchpay.co/payments', {
          method: 'POST',
          headers: {
            'Authorization': privateKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: input.amountCoins, // 1 Coin = 1 XAF
            currency: 'XAF',
            email: access.user.email,
            description: `Recharge Campus-Bordes - ${input.amountCoins} Coins`,
          }),
        });

        if (!initRes.ok) {
          const errText = await initRes.text();
          console.error('[NotchPay Init] Error response:', errText);
          throw new MobileApiError('Impossible d\'initialiser le paiement Notch Pay.', 500);
        }

        const initData = await initRes.json();
        reference = initData.reference || initData.data?.reference || initData.transaction?.reference || initData.authorization_url?.split('/').pop() || '';

        if (!reference) {
          throw new MobileApiError('Référence de transaction Notch Pay manquante.', 500);
        }

        // 2. Direct Charge Mobile Money
        // Map MTN MoMo and Orange Money to Notch Pay channels
        let channel = 'cm.mtn';
        if (input.providerName.toLowerCase().includes('orange')) {
          channel = 'cm.orange';
        }

        // Format phone number (must start with country prefix, e.g. +237)
        let formattedPhone = input.phoneNumber;
        if (!formattedPhone.startsWith('+')) {
          if (formattedPhone.startsWith('237')) {
            formattedPhone = '+' + formattedPhone;
          } else {
            formattedPhone = '+237' + formattedPhone;
          }
        }

        const chargeRes = await fetch(`https://api.notchpay.co/payments/${reference}`, {
          method: 'POST',
          headers: {
            'Authorization': privateKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel,
            data: {
              account_number: formattedPhone,
            },
          }),
        });

        if (!chargeRes.ok) {
          const errText = await chargeRes.text();
          console.error('[NotchPay Charge] Error response:', errText);
          throw new MobileApiError('Erreur lors du traitement du débit direct. Vérifiez le numéro de téléphone.', 400);
        }
      } else {
        // Mock Sandbox Mode
        reference = `mock_pay_${Math.random().toString(36).substring(2, 15)}`;
      }

      // Log pending transaction in database
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
         values ($1, 'topup', $2, $3, $4)`,
        [access.user.id, input.amountCoins, reference, status]
      );

      return NextResponse.json({
        reference,
        status,
        mock: !isRealPayment,
      });

    } finally {
      client.release();
    }
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

