import { requireAdminPage, getSessionUser } from '@/lib/access';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdminPage();
  const user = await getSessionUser();

  return (
    <SettingsClient
      user={
        user
          ? {
              id: user.id,
              name: user.name ?? user.email,
              email: user.email,
              image: null,
            }
          : null
      }
    />
  );
}