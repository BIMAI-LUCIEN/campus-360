import { requireAdminPage } from '@/lib/access';
import NewReportClient from './NewReportClient';

export default async function NewReportPage() {
  await requireAdminPage();
  return <NewReportClient />;
}