import { requireAdminPage } from '@/lib/access';
import ReportsListClient from './ReportsListClient';

// Page is auth-gated — skip prerender so `next build` doesn't try to
// instantiate Better Auth when env vars aren't exposed during the build
// phase on Vercel.
export const dynamic = 'force-dynamic';

export default async function ReportsAdminPage() {
  await requireAdminPage();
  return <ReportsListClient />;
}