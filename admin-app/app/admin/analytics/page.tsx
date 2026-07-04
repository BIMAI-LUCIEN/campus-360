import { requireAdminPage } from '@/lib/access';
import { getSupabasePdfAnalytics } from '@/lib/supabase-pdf';
import { AnalyticsDashboard } from './AnalyticsDashboard';

// Page is auth-gated and reads the DB at request time — skip prerender so
// `next build` doesn't try to instantiate Better Auth / open a Postgres
// pool when env vars aren't exposed during the build phase on Vercel.
export const dynamic = 'force-dynamic';

export default async function PdfAnalyticsPage() {
  await requireAdminPage();
  const analytics = await getSupabasePdfAnalytics();
  
  return <AnalyticsDashboard initialData={analytics} />;
}
