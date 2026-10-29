import { requireAdminPage } from '@/lib/access';
import { StudentsClient } from './StudentsClient';

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  await requireAdminPage();
  return <StudentsClient />;
}
