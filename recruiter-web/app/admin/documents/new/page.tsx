import { requireAdminPage } from '@/lib/access';
import NewDocumentClient from './NewDocumentClient';

export default async function NewDocumentPage() {
  await requireAdminPage();
  return <NewDocumentClient />;
}