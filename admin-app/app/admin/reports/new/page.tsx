import { requireAdminPage } from '@/lib/access';
import NewReportClient from './NewReportClient';

// Page is auth-gated — skip prerender so `next build` doesn't try to
// instantiate Better Auth when env vars aren't exposed during the build
// phase on Vercel.
export const dynamic = 'force-dynamic';

export default async function NewReportPage() {
  await requireAdminPage();
  return <NewReportClient />;
}