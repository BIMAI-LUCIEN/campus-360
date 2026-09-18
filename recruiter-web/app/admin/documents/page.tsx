import { requireAdminPage } from '@/lib/access';
import DocumentsListClient from './DocumentsListClient';

export const dynamic = 'force-dynamic';

export default async function DocumentsAdminPage() {
  await requireAdminPage();
  return <DocumentsListClient />;
}