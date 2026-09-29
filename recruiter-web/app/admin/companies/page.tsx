import { requireAdminPage } from '@/lib/access';
import { CompaniesDashboardClient } from './CompaniesDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminCompaniesPage() {
  await requireAdminPage();
  return <CompaniesDashboardClient />;
}
