import { requireAdminPage } from '@/lib/access';
import NewDocumentClient from './NewDocumentClient';

export const dynamic = 'force-dynamic';

export default async function NewDocumentPage() {
  await requireAdminPage();
  return <NewDocumentClient />;
}