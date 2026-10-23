import { NextRequest, NextResponse } from 'next/server';

import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';
import { getPublishedTemplate } from '@/lib/templates-db';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

// One published template: outline and style (no logo of the template).
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    await enforceRateLimit(request, { bucket: 'templates-list', max: 60, windowMs: 60_000, userId: access.user.id });
    const { id } = await context.params;
    const template = UUID_RE.test(id) ? await getPublishedTemplate(id) : null;
    if (!template) return withCors(NextResponse.json({ error: 'Modèle indisponible.' }, { status: 404 }), request);
    const { preview_asset_id: _preview, ...rest } = template;
    return withCors(NextResponse.json({ template: rest }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
