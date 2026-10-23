import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getNyoleBaseUrl } from '@/lib/payments';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) =>
  withCors(new NextResponse(null, { status: 204 }), request);

const schema = z.object({
  reference: z.string().min(4).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const nyoleSecret = process.env.NYOLE_SECRET_KEY?.trim();
    const isTestMode = nyoleSecret?.startsWith('af_test_') || process.env.NODE_ENV !== 'production';

    if (!isTestMode || !nyoleSecret) {
      throw new MobileApiError('La simulation de paiement est réservée au mode test sandbox.', 403);
    }

    const body = await request.json().catch(() => ({}));
    const { reference } = schema.parse(body);

    const baseUrl = getNyoleBaseUrl();
    const simRes = await fetch(`${baseUrl}/checkout/sandbox`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nyoleSecret}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        transactionId: reference,
        issue: 'succes',
      }),
    });

    const simData = (await simRes.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
    };

    if (!simRes.ok || !simData.success) {
      throw new MobileApiError(
        simData.message || 'Impossible de simuler le paiement test sandbox.',
        simRes.status || 500,
      );
    }

    return withCors(
      NextResponse.json({
        success: true,
        message: 'Paiement test sandbox simulé avec succès.',
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
