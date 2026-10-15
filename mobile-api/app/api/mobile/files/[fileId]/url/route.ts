import { NextRequest, NextResponse } from 'next/server';

import { signOwnedFileUrls } from '@/lib/file-urls';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ fileId: string }> };

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { fileId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const signed = (await signOwnedFileUrls(request, access.user.id, [fileId]))[fileId.toLowerCase()];
    if (!signed) return withCors(NextResponse.json({ error: 'Fichier introuvable.' }, { status: 404 }), request);
    return withCors(NextResponse.json(signed), request);
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
