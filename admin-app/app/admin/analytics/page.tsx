import { requireAdminPage } from '@/lib/access';
import { getSupabasePdfAnalytics } from '@/lib/supabase-pdf';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export default async function PdfAnalyticsPage() {
  await requireAdminPage();
  const analytics = await getSupabasePdfAnalytics();
  
  return <AnalyticsDashboard initialData={analytics} />;
}
