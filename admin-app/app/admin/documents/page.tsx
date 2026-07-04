import { requireAdminPage } from '@/lib/access';
import DocumentsListClient from './DocumentsListClient';

export default async function DocumentsAdminPage() {
  await requireAdminPage();
  return <DocumentsListClient />;
}