import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createInstance,
  getConnectionState,
  logoutInstance,
  requestPairingCode,
} from '@/lib/evolution-api';
import {
  requireMobileUser,
  withCors,
} from '@/lib/mobile-access';
import {
  enforceRateLimit,
  rateLimitFailedResponse,
} from '@/lib/route-rate-limit';
import {
  ensureStageStudent,
  getStageStudentWhatsAppStatusById,
  setStageStudentWhatsAppStatusById,
} from '@/lib/stages-db';
import {
  isOwnInstance,
  normalizeTargetPhone,
  resolveWhatsAppTarget,
} from '@/lib/whatsapp-target';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) =>
  withCors(new NextResponse(null, { status: 204 }), request);

const postSchema = z.object({
  phone: z.string().trim().min(6).max(25).optional(),
  action: z.enum(['create', 'connect', 'reconnect', 'pair']).optional().default('connect'),
  force: z.boolean().optional().default(false),
});

/**
 * POST /api/mobile/whatsapp/instance
 * Ensures instance exists and requests an 8-digit pairing code.
 * Requires authenticated session and profile phone number.
 */
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 30 });
    if (access.response) {
      return withCors(access.response, request);
    }

    const target = resolveWhatsAppTarget(access.user);
    if (!target) {
      return withCors(
        NextResponse.json(
          { error: 'Ajoute ton numéro WhatsApp dans ton profil avant de relier WhatsApp.' },
          { status: 400 },
        ),
        request,
      );
    }

    await enforceRateLimit(request, {
      bucket: 'whatsapp-pairing',
      max: 5,
      windowMs: 10 * 60_000,
      userId: access.user.id,
    });

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

    if (parsed.data.phone) {
      const normalizedRequested = normalizeTargetPhone(parsed.data.phone);
      if (normalizedRequested !== target.phone) {
        return withCors(
          NextResponse.json(
            { error: 'Tu ne peux relier que le numéro WhatsApp de ton profil.' },
            { status: 400 },
          ),
          request,
        );
      }
    }

    const { phone, instanceName } = target;
    const isReconnect = parsed.data.action === 'reconnect' || parsed.data.force === true;
    const studentId = await ensureStageStudent(access.user);

    // 1. Ensure instance exists on Evolution API
    await createInstance(instanceName);

    // 2. Request 8-digit pairing code
    const pairingResult = await requestPairingCode(instanceName, phone, { forceNew: isReconnect });
    if (!pairingResult.success) {
      return withCors(
        NextResponse.json(
          { error: "L'appairage WhatsApp est indisponible pour le moment. Réessaie plus tard." },
          { status: 503 },
        ),
        request,
      );
    }

    // 3. Persist pending instance in Supabase
    await setStageStudentWhatsAppStatusById(studentId, instanceName, pairingResult.state === 'open');

    return withCors(
      NextResponse.json({
        success: true,
        pairingCode: pairingResult.pairingCode,
        instanceName: pairingResult.instanceName,
        state: pairingResult.state,
        connected: pairingResult.state === 'open',
        ...(pairingResult.offline ? { offline: true } : {}),
      }),
      request,
    );
  } catch (error) {
    const rateLimitRes = rateLimitFailedResponse(error);
    if (rateLimitRes) return withCors(rateLimitRes, request);

    if (error instanceof z.ZodError) {
      return withCors(
        NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }),
        request,
      );
    }

    console.warn('[whatsapp/instance route POST] Pairing failed:', error);
    return withCors(
      NextResponse.json(
        { error: "L'appairage WhatsApp est indisponible pour le moment. Réessaie plus tard." },
        { status: 503 },
      ),
      request,
    );
  }
}

/**
 * GET /api/mobile/whatsapp/instance
 * Checks connection state of WhatsApp instance (open, close, connecting)
 * and synchronizes live status with Supabase PostgreSQL.
 * Requires authenticated session and profile phone number.
 */
export async function GET(request: NextRequest) {
  let authenticatedUser: any = null;
  let targetInfo: { phone: string; instanceName: string } | null = null;

  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 60 });
    if (access.response) {
      return withCors(access.response, request);
    }
    authenticatedUser = access.user;

    const target = resolveWhatsAppTarget(access.user);
    if (!target) {
      return withCors(
        NextResponse.json(
          { error: 'Ajoute ton numéro WhatsApp dans ton profil avant de relier WhatsApp.' },
          { status: 400 },
        ),
        request,
      );
    }
    targetInfo = target;

    await enforceRateLimit(request, {
      bucket: 'whatsapp-status',
      max: 60,
      windowMs: 60_000,
      userId: access.user.id,
    });

    const { searchParams } = request.nextUrl;
    const phoneParam = searchParams.get('phone');
    const instanceParam = searchParams.get('instance');

    if (phoneParam) {
      const normalizedRequested = normalizeTargetPhone(phoneParam);
      if (normalizedRequested !== target.phone) {
        return withCors(
          NextResponse.json(
            { error: 'Tu ne peux relier que le numéro WhatsApp de ton profil.' },
            { status: 400 },
          ),
          request,
        );
      }
    }

    if (!isOwnInstance(instanceParam, target.instanceName)) {
      return withCors(
        NextResponse.json({ error: 'Accès refusé.' }, { status: 403 }),
        request,
      );
    }

    const studentId = await ensureStageStudent(access.user);
    const { instanceName } = target;
    const stateResult = await getConnectionState(instanceName);

    // Synchronize live status to Supabase
    if (!stateResult.offline) {
      await setStageStudentWhatsAppStatusById(studentId, instanceName, stateResult.connected);
    } else {
      // If Evolution API is offline or slow, read cached status from Supabase
      const dbStatus = await getStageStudentWhatsAppStatusById(studentId);
      if (dbStatus) {
        return withCors(
          NextResponse.json({
            success: true,
            instanceName,
            state: dbStatus.connected ? 'open' : 'close',
            connected: dbStatus.connected,
            isConnected: dbStatus.connected,
            offline: true,
          }),
          request,
        );
      }
    }

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
    const rateLimitRes = rateLimitFailedResponse(error);
    if (rateLimitRes) return withCors(rateLimitRes, request);

    console.warn('[whatsapp/instance route GET] Caught error checking state:', error);

    // In catch block, attempt to check Supabase fallback
    if (authenticatedUser && targetInfo) {
      try {
        const studentId = await ensureStageStudent(authenticatedUser);
        const dbStatus = await getStageStudentWhatsAppStatusById(studentId);
        if (dbStatus) {
          return withCors(
            NextResponse.json({
              success: true,
              instanceName: targetInfo.instanceName,
              state: dbStatus.connected ? 'open' : 'close',
              connected: dbStatus.connected,
              isConnected: dbStatus.connected,
              offline: true,
            }),
            request,
          );
        }
      } catch {
        // ignore
      }
    }

    return withCors(
      NextResponse.json(
        { error: "L'appairage WhatsApp est indisponible pour le moment. Réessaie plus tard." },
        { status: 503 },
      ),
      request,
    );
  }
}

/**
 * DELETE /api/mobile/whatsapp/instance
 * Logs out the WhatsApp instance and marks whatsapp_connected = false in Supabase.
 * Requires authenticated session and profile phone number.
 */
export async function DELETE(request: NextRequest) {
  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 30 });
    if (access.response) {
      return withCors(access.response, request);
    }

    const target = resolveWhatsAppTarget(access.user);
    if (!target) {
      return withCors(
        NextResponse.json(
          { error: 'Ajoute ton numéro WhatsApp dans ton profil avant de relier WhatsApp.' },
          { status: 400 },
        ),
        request,
      );
    }

    await enforceRateLimit(request, {
      bucket: 'whatsapp-logout',
      max: 10,
      windowMs: 10 * 60_000,
      userId: access.user.id,
    });

    const { searchParams } = request.nextUrl;
    const phoneParam = searchParams.get('phone');
    const instanceParam = searchParams.get('instance');

    if (phoneParam) {
      const normalizedRequested = normalizeTargetPhone(phoneParam);
      if (normalizedRequested !== target.phone) {
        return withCors(
          NextResponse.json(
            { error: 'Tu ne peux relier que le numéro WhatsApp de ton profil.' },
            { status: 400 },
          ),
          request,
        );
      }
    }

    if (!isOwnInstance(instanceParam, target.instanceName)) {
      return withCors(
        NextResponse.json({ error: 'Accès refusé.' }, { status: 403 }),
        request,
      );
    }

    const studentId = await ensureStageStudent(access.user);
    const { instanceName } = target;

    await logoutInstance(instanceName);
    await setStageStudentWhatsAppStatusById(studentId, instanceName, false);

    return withCors(
      NextResponse.json({
        success: true,
        message: 'Session WhatsApp déconnectée avec succès.',
        instanceName,
      }),
      request,
    );
  } catch (error) {
    const rateLimitRes = rateLimitFailedResponse(error);
    if (rateLimitRes) return withCors(rateLimitRes, request);

    console.warn('[whatsapp/instance route DELETE] Error logging out:', error);
    return withCors(
      NextResponse.json(
        { error: 'La déconnexion de WhatsApp a échoué. Réessaie.' },
        { status: 502 },
      ),
      request,
    );
  }
}
