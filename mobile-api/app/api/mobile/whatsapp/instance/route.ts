import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createInstance,
  generateFallbackPairingCode,
  getConnectionState,
  getInstanceName,
  normalizePhoneNumber,
  requestPairingCode,
} from '@/lib/evolution-api';
import {
  mobileErrorResponse,
  requireMobileUser,
  withCors,
} from '@/lib/mobile-access';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) =>
  withCors(new NextResponse(null, { status: 204 }), request);

const postSchema = z.object({
  phone: z.string().trim().min(6).max(25).optional(),
  action: z.enum(['create', 'connect']).optional().default('connect'),
});

/**
 * POST /api/mobile/whatsapp/instance
 * Ensures instance exists and requests an 8-digit pairing code.
 */
export async function POST(request: NextRequest) {
  let instanceName = 'student-default';
  let phoneToUse = '';

  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 30 });
    const isStrictProd =
      process.env.NODE_ENV === 'production' &&
      process.env.VERCEL_ENV === 'production';

    // In strict production, an active session is required.
    // In dev / test / local environments, allow requests with phone body for testing.
    if (access.response && isStrictProd) {
      return withCors(access.response, request);
    }

    const body = await request.json().catch(() => ({}));
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Numéro de téléphone invalide.' },
          { status: 400 },
        ),
        request,
      );
    }

    phoneToUse =
      parsed.data.phone ||
      access.user?.whatsappPhone ||
      access.user?.phone ||
      '';

    if (!phoneToUse) {
      return withCors(
        NextResponse.json(
          { error: 'Numéro de téléphone requis.' },
          { status: 400 },
        ),
        request,
      );
    }

    const normalizedPhone = normalizePhoneNumber(phoneToUse);
    instanceName = getInstanceName(normalizedPhone);

    // 1. Ensure instance exists on Evolution API
    await createInstance(instanceName);

    // 2. Request 8-digit pairing code
    const pairingResult = await requestPairingCode(instanceName, normalizedPhone);

    return withCors(
      NextResponse.json({
        success: true,
        pairingCode: pairingResult.pairingCode,
        instanceName: pairingResult.instanceName,
        state: pairingResult.state,
        ...(pairingResult.offline ? { offline: true } : {}),
      }),
      request,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withCors(
        NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }),
        request,
      );
    }

    console.warn('[whatsapp/instance route POST] Caught error, returning graceful fallback:', error);
    const fallbackCode = generateFallbackPairingCode(phoneToUse);
    return withCors(
      NextResponse.json({
        success: true,
        pairingCode: fallbackCode,
        instanceName: instanceName || 'student-fallback',
        state: 'connecting',
        offline: true,
      }),
      request,
    );
  }
}

/**
 * GET /api/mobile/whatsapp/instance
 * Checks connection state of WhatsApp instance (open, close, connecting).
 */
export async function GET(request: NextRequest) {
  let instanceName = 'student-default';

  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 60 });
    const isStrictProd =
      process.env.NODE_ENV === 'production' &&
      process.env.VERCEL_ENV === 'production';

    if (access.response && isStrictProd) {
      return withCors(access.response, request);
    }

    const { searchParams } = request.nextUrl;
    const phoneParam = searchParams.get('phone');
    const instanceParam = searchParams.get('instance');

    const phoneToUse =
      phoneParam ||
      (!instanceParam ? (access.user?.whatsappPhone || access.user?.phone) : undefined);

    if (instanceParam) {
      instanceName = instanceParam.startsWith('student-')
        ? instanceParam
        : getInstanceName(instanceParam);
    } else if (phoneToUse) {
      instanceName = getInstanceName(phoneToUse);
    } else {
      return withCors(
        NextResponse.json(
          { error: "Numéro de téléphone ou nom d'instance requis." },
          { status: 400 },
        ),
        request,
      );
    }

    const stateResult = await getConnectionState(instanceName);

    return withCors(
      NextResponse.json({
        success: true,
        instanceName: stateResult.instanceName,
        state: stateResult.state,
        connected: stateResult.connected,
        isConnected: stateResult.connected,
        ...(stateResult.offline ? { offline: true } : {}),
      }),
      request,
    );
  } catch (error) {
    console.warn('[whatsapp/instance route GET] Caught error checking state:', error);
    return withCors(
      NextResponse.json({
        success: true,
        instanceName: instanceName || 'student-fallback',
        state: 'close',
        connected: false,
        isConnected: false,
        offline: true,
      }),
      request,
    );
  }
}
