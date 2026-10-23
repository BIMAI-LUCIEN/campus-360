import type { NextRequest } from 'next/server';

import { requireAdminApi } from '@/lib/access';
import { forwardToMobileApi } from '@/lib/mobile-api-proxy';

export const runtime = 'nodejs';

// Report templates (Module 24): admin session checked here, logic in mobile-api.
const relay = async (request: NextRequest) => {
  const { response, user } = await requireAdminApi();
  if (response || !user) return response;
  return forwardToMobileApi(request, [], user.id);
};

export const GET = relay;
export const POST = relay;
