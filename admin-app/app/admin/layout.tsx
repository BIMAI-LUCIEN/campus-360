// Thin server-side wrapper. The shell itself is a client component
// (needs usePathname, useRouter, authClient.useSession).

import { type ReactNode } from 'react';
import { requireAdminPage } from '@/lib/access';
import AdminShell from './AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();
  return <AdminShell>{children}</AdminShell>;
}