import { requireAdminPage } from '@/lib/access';
import { StagesDashboardClient } from './StagesDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminStagesPage() {
  await requireAdminPage();
  return <StagesDashboardClient />;
}
