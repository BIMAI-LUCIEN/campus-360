import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

// Photo of the official CV. One photo per student account, sent as a data URI.
const MAX_PHOTO_CHARS = 2_000_000;
const MAX_BODY_BYTES = MAX_PHOTO_CHARS + 1024;
const photoSchema = z.object({
  photo: z
    .string()
    .max(MAX_PHOTO_CHARS)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Format de photo non pris en charge.'),
});

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Expo-Origin, x-client-info, apikey, X-Requested-With',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const result = await databasePool.query('select cv_photo from public.app_users where id = $1', [access.user.id]);
    const photo = result.rows[0]?.cv_photo ? String(result.rows[0].cv_photo) : null;
    return withCors(NextResponse.json({ photo }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return withCors(NextResponse.json({ error: 'Photo trop lourde.' }, { status: 413 }), request);
    }
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const body = await request.json().catch(() => null);
    const parsed = photoSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileApiError(parsed.error.issues[0]?.message || 'Photo invalide.');
    }

    await databasePool.query('update public.app_users set cv_photo = $2, updated_at = now() where id = $1', [
      access.user.id,
      parsed.data.photo,
    ]);
    return withCors(NextResponse.json({ ok: true }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    await databasePool.query('update public.app_users set cv_photo = null, updated_at = now() where id = $1', [access.user.id]);
    return withCors(NextResponse.json({ ok: true }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
