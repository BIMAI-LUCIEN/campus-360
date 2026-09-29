import { requireAdminPage } from '@/lib/access';
import { ApplicationsDashboardClient } from './ApplicationsDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminApplicationsPage() {
  await requireAdminPage();
  return <ApplicationsDashboardClient />;
}
