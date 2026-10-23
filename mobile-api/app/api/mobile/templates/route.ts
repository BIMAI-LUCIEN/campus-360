import { NextRequest, NextResponse } from 'next/server';

import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';
import { assetDataUris, listPublishedTemplates } from '@/lib/templates-db';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

// Gallery of published report templates (Module 24).
export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    await enforceRateLimit(request, { bucket: 'templates-list', max: 60, windowMs: 60_000, userId: access.user.id });
    const establishment = request.nextUrl.searchParams.get('establishment')?.trim().slice(0, 120) || undefined;
    const templates = (await listPublishedTemplates({ establishment })).slice(0, 50);
    const previews = await assetDataUris(templates.map((t) => t.preview_asset_id));
    return withCors(
      NextResponse.json({
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          establishment: t.establishment,
          degree: t.degree,
          kind: t.kind,
          previewDataUri: t.preview_asset_id ? previews.get(t.preview_asset_id) ?? null : null,
          updatedAt: t.published_at,
        })),
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
