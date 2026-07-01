import { requireAdminPage } from '@/lib/access';
import { UsersDashboardClient } from './UsersDashboardClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  await requireAdminPage();
  return <UsersDashboardClient />;
}
