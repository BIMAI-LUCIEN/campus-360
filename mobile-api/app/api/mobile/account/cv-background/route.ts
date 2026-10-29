import { NextRequest, NextResponse } from 'next/server';

import { cvBackgroundSchema, emptyCvBackground } from '@/lib/cv-background';
import { getCvBackground, saveCvBackground } from '@/lib/cv-background-db';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

// The student's CV background ("Mon parcours"), reused by every application.
export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const background = await getCvBackground(access.user.id);
    return withCors(NextResponse.json({ background: background ?? emptyCvBackground(), saved: Boolean(background) }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const parsed = cvBackgroundSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new MobileApiError('Parcours invalide : vérifie les champs trop longs.', 400);
    await saveCvBackground(access.user.id, parsed.data);
    return withCors(NextResponse.json({ background: parsed.data, saved: true }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
