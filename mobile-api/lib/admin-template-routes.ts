import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { requireAdminService, type AdminServiceUser } from './admin-service';
import { mobileErrorResponse } from './mobile-access';
import { enforceRateLimit } from './route-rate-limit';
import { TemplateImportError } from './template-import-docx';
import { assetDataUris, TemplateError, type DocumentTemplate } from './templates-db';

// Shared plumbing of the admin template routes (Module 24): admin check, rate
// limit, error mapping, and the JSON shape of a template.

export const withAdmin = async (
  request: NextRequest,
  bucket: { name: string; max: number; windowMs: number },
  handler: (admin: AdminServiceUser) => Promise<NextResponse>,
): Promise<NextResponse> => {
  try {
    const access = await requireAdminService(request);
    if (access.response) return access.response;
    await enforceRateLimit(request, { bucket: bucket.name, max: bucket.max, windowMs: bucket.windowMs, userId: access.admin.appUserId });
    return await handler(access.admin);
  } catch (error) {
    if (error instanceof TemplateError || error instanceof TemplateImportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    return mobileErrorResponse(error, request);
  }
};

export const ADMIN_TEMPLATES_BUCKET = { name: 'admin-templates', max: 120, windowMs: 60_000 };
export const ADMIN_IMPORT_BUCKET = { name: 'admin-template-import', max: 10, windowMs: 10 * 60_000 };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const assertUuid = (id: string) => {
  if (!UUID.test(id)) throw new TemplateError('Modèle introuvable.', 404);
  return id;
};

// A template as sent to the admin web: logos and preview as data URIs.
export const templateJson = async (template: DocumentTemplate) => {
  const logoIds = Object.values(template.logo_assets);
  const uris = await assetDataUris([...logoIds, template.preview_asset_id]);
  const logos = Object.fromEntries(Object.entries(template.logo_assets).map(([slot, id]) => [slot, uris.get(id as string) ?? null]));
  return { ...template, logos, previewDataUri: template.preview_asset_id ? uris.get(template.preview_asset_id) ?? null : null };
};

// Reads a multipart body after checking its announced size.
export const readMultipart = async (request: NextRequest, maxBytes: number) => {
  const length = Number(request.headers.get('content-length') || 0);
  if (!length || length > maxBytes + 512 * 1024) throw new TemplateError('Fichier trop volumineux.', 413);
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') throw new TemplateError('Aucun fichier reçu.', 400);
  const data = Buffer.from(await file.arrayBuffer());
  if (data.length > maxBytes) throw new TemplateError('Fichier trop volumineux.', 413);
  return { form, data };
};
