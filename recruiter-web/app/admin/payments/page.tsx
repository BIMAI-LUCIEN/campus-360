import { requireAdminPage } from '@/lib/access';
import { PaymentsDashboardClient } from './PaymentsDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  await requireAdminPage();
  return <PaymentsDashboardClient />;
}
