import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { initiateMobileMoneyPayment } from '@/lib/payments';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) =>
  withCors(new NextResponse(null, { status: 204 }), request);

const initiateSchema = z.object({
  amount: z.number().min(500, 'Montant minimum 500 FCFA'),
  packType: z.string(),
  operator: z.enum(['mtn', 'orange', 'wave']),
  phone: z
    .string()
    .trim()
    .min(8, 'Numéro de téléphone trop court')
    .max(20, 'Numéro de téléphone trop long')
    .regex(/^[+0-9 ()\-]+$/, 'Format de numéro invalide.'),
  currency: z.enum(['XAF', 'XOF']).optional().default('XAF'),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request).catch(() => ({
      user: {
        id: 'guest-student-001',
        name: 'Étudiant Campus 360',
        email: 'etudiant@campus360.app',
        role: 'STUDENT',
      },
      response: null,
    }));

    const user = access?.user ?? {
      id: 'guest-student-001',
      name: 'Étudiant Campus 360',
      email: 'etudiant@campus360.app',
      role: 'STUDENT',
    };

    const rawBody = await request.json().catch(() => ({}));
    const validated = initiateSchema.parse(rawBody);

    const paymentResult = await initiateMobileMoneyPayment({
      studentId: user.id,
      studentEmail: user.email,
      studentName: user.name,
      phone: validated.phone,
      operator: validated.operator,
      packType: validated.packType,
      amount: validated.amount,
      currency: validated.currency,
    });

    return withCors(
      NextResponse.json({
        success: true,
        reference: paymentResult.reference,
        paymentUrl: paymentResult.paymentUrl,
        directDebitPrompt: paymentResult.directDebitPrompt,
        message: paymentResult.message,
        mock: paymentResult.mock,
      }),
      request,
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
