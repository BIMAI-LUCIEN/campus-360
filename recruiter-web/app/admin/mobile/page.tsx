import { requireAdminPage } from '@/lib/access';
import { MobileControlClient } from './MobileControlClient';

export const dynamic = 'force-dynamic';

export default async function MobileControlPage() {
  await requireAdminPage();
  return <MobileControlClient />;
}
