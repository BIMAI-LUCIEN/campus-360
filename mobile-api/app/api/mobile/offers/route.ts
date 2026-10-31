import { NextRequest, NextResponse } from 'next/server';

import { getOfferState, listOffers } from '@/lib/offers';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

/** Catalogue of packs and passes, with the student's credits and active pass. */
export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const state = await getOfferState(access.user.id);
    return withCors(NextResponse.json({ offers: listOffers(), ...state }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
