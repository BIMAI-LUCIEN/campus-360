import { requireAdminPage } from '@/lib/access';
import { NotificationsClient } from './NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  await requireAdminPage();
  return <NotificationsClient />;
}
