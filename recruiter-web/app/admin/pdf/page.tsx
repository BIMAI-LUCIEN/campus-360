import { requireAdminPage } from '@/lib/access';
import { listPdfs } from '@/lib/course-db';

import { PdfDashboardClient } from './PdfDashboardClient';

// Page is auth-gated and reads the DB at request time — skip prerender so
// `next build` doesn't try to instantiate Better Auth / open a Postgres
// pool when env vars aren't exposed during the build phase on Vercel.
export const dynamic = 'force-dynamic';

export default async function PdfAdminPage() {
  await requireAdminPage();
  const documents = await listPdfs();
  return <PdfDashboardClient initialDocuments={documents} />;
}
