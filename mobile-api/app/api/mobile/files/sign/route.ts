import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { signOwnedFileUrls } from '@/lib/file-urls';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

// Batch signing, used by the editor to resolve every image of a document at once.
const schema = z.object({ fileIds: z.array(z.string().uuid()).min(1).max(100) });

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Liste de fichiers invalide.' }, { status: 400 }), request);
    }
    const urls = await signOwnedFileUrls(request, access.user.id, parsed.data.fileIds);
    return withCors(NextResponse.json({ urls }), request);
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
