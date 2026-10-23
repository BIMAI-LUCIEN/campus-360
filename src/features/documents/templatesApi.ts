import { authFetch } from '../auth/betterAuth';

// Report templates published by the admin (Module 24): gallery and application
// to an existing document.

export type TemplateCard = {
  id: string;
  name: string;
  establishment: string;
  degree: string;
  kind: 'stage' | 'memoire' | 'both';
  previewDataUri: string | null;
};

export const listTemplates = async (establishment?: string): Promise<TemplateCard[]> => {
  const query = establishment?.trim() ? `?establishment=${encodeURIComponent(establishment.trim())}` : '';
  const res = await authFetch(`/api/mobile/templates${query}`);
  const body = (await res.json()) as { templates: TemplateCard[] };
  return body.templates;
};

export const applyTemplate = async (documentId: string, templateId: string): Promise<{ addedSections: number }> => {
  const res = await authFetch(`/api/mobile/documents/${documentId}/apply-template`, {
    method: 'POST',
    body: JSON.stringify({ templateId }),
  });
  const body = (await res.json()) as { addedSections: number };
  return { addedSections: body.addedSections };
};
