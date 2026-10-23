import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { initiateMobileMoneyPayment } from '@/lib/payments';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) =>
  withCors(new NextResponse(null, { status: 204 }), request);

const initiateSchema = z
  .object({
    packType: z.enum([
      'recharge_500',
      'recharge_1000',
      'recharge_2000',
      'recharge_5000',
      'discovery_500',
    ]),
    amount: z.number().int().positive().optional(),
    operator: z.enum(['mtn', 'orange']),
    phone: z
      .string()
      .trim()
      .min(8, 'Numéro de téléphone trop court')
      .max(20, 'Numéro de téléphone trop long')
      .regex(/^[+0-9 ()\-]+$/, 'Format de numéro invalide.'),
    currency: z.literal('XAF').default('XAF'),
  });

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    await enforceRateLimit(request, {
      bucket: 'payments-initiate',
      max: 10,
      windowMs: 10 * 60_000,
      userId: user.id,
    });

    const rawBody = await request.json().catch(() => ({}));
    const validated = initiateSchema.parse(rawBody);

    const paymentResult = await initiateMobileMoneyPayment({
      studentId: user.id,
      studentEmail: user.email,
      studentName: user.name,
      phone: validated.phone,
      operator: validated.operator,
      packType: validated.packType,
      currency: validated.currency,
    });

    return withCors(
      NextResponse.json({
        success: true,
        reference: paymentResult.reference,
        status: paymentResult.status,
        paymentUrl: paymentResult.paymentUrl,
        directDebitPrompt: paymentResult.directDebitPrompt,
        message: paymentResult.message,
        ...(paymentResult.mock ? { mock: true } : {}),
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
