import { requireAdminPage } from '@/lib/access';
import ReportsListClient from './ReportsListClient';

export default async function ReportsAdminPage() {
  await requireAdminPage();
  return <ReportsListClient />;
}