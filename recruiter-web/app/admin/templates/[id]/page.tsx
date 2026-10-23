import { Suspense } from 'react';

import { requireAdminPage } from '@/lib/access';

import { TemplateEditor } from '../TemplateEditor';

export const dynamic = 'force-dynamic';

export default async function TemplateWorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <TemplateEditor id={id} />
    </Suspense>
  );
}
