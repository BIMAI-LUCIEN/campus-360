import type { NextRequest } from 'next/server';

import { requireAdminApi } from '@/lib/access';
import { forwardToMobileApi } from '@/lib/mobile-api-proxy';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ path: string[] }> };

// Report templates (Module 24): admin session checked here, logic in mobile-api.
const relay = async (request: NextRequest, context: RouteContext) => {
  const { response, user } = await requireAdminApi();
  if (response || !user) return response;
  const { path } = await context.params;
  return forwardToMobileApi(request, path, user.id);
};

export const GET = relay;
export const POST = relay;
export const PATCH = relay;
export const DELETE = relay;
