// Thin server-side wrapper.
//
// NOTE: Auth is enforced in middleware.ts now (fast cookie-presence check)
// instead of here. Calling `requireAdminPage()` from this layout used to
// cause a redirect loop on /admin/login (layout redirect → login → layout
// redirect → … → 404). Each page still calls `requireAdminPage()` itself
// for the full DB-backed admin-role check.

import { type ReactNode } from 'react';
import AdminShell from './AdminShell';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}