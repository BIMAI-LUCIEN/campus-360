import { requireAdminPage } from '@/lib/access';

import { TemplatesClient } from './TemplatesClient';

// Auth-gated, data loaded by the client from the relay: no prerender.
export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  await requireAdminPage();
  return <TemplatesClient />;
}
