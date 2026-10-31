import type { NextRequest } from 'next/server';

import { requireAdminApi } from '@/lib/access';
import { forwardToMobileApi } from '@/lib/mobile-api-proxy';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ path?: string[] }> };

// Batch PDF import and student contributions (Module 27): admin session checked
// here, analysis, duplicates, publication and coin credit in mobile-api.
const relay = async (request: NextRequest, context: RouteContext) => {
  const { response, user } = await requireAdminApi();
  if (response || !user) return response;
  const { path } = await context.params;
  return forwardToMobileApi(request, path ?? [], user.id, 'pdf-intake');
};

export const GET = relay;
export const POST = relay;
export const PATCH = relay;
