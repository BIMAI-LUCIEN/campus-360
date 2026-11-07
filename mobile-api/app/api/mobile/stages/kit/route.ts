import { NextRequest, NextResponse } from 'next/server';

import {
  MobileApiError,
  corsPreflight,
  mobileErrorResponse,
  requireMobileUser,
  withCors,
} from '@/lib/mobile-access';
import { getStageKit } from '@/lib/stage-kits';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => corsPreflight(request);

// Reads the authenticated student's application kit for a LINK offer.
// Never returns another user's kit; returns 404 when no kit exists.
export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 60 });
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const jobId = request.nextUrl.searchParams.get('jobId')?.trim() || '';
    if (!jobId || jobId.length > 200) {
      throw new MobileApiError('Identifiant de l’offre manquant.', 400);
    }

    const kit = await getStageKit(userId, jobId);
    if (!kit) {
      throw new MobileApiError('Aucun dossier préparé pour cette offre.', 404);
    }

    return withCors(NextResponse.json({ kit }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
