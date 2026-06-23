import { requireAdminPage } from '@/lib/access';
import { listPdfs } from '@/lib/course-db';

import { PdfDashboardClient } from './PdfDashboardClient';

export default async function PdfAdminPage() {
  await requireAdminPage();
  return <PdfDashboardClient initialDocuments={listPdfs()} />;
}
