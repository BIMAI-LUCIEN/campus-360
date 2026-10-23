import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';
import { DEFAULT_FIELD, fieldFromProfile, STUDY_FIELDS } from '@/lib/document-outlines';
import { listUserDocuments, createDocument } from '@/lib/documents-db';
import { getPublishedTemplate } from '@/lib/templates-db';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Expo-Origin, x-client-info, apikey, X-Requested-With',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return new NextResponse(null, { status: 204, headers });
}

const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().default(''),
  templateType: z.enum(['stage', 'memoire', 'cv', 'lettre_motivation', 'blank']).optional(),
  type: z.enum(['stage', 'memoire', 'cv', 'lettre_motivation', 'blank']).optional(),
  // Field of study (reports and theses). Absent: guessed from the profile.
  field: z.enum(STUDY_FIELDS).optional(),
  // Module 24: start from a published report template.
  templateId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const documents = await listUserDocuments(userId);
    return withCors(NextResponse.json({ documents }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const body = await request.json().catch(() => null);
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Données invalides.' }, { status: 400 }), request);
    }

    const { title, description } = parsed.data;
    const templateType = parsed.data.templateType || parsed.data.type || 'stage';
    const academic = templateType === 'stage' || templateType === 'memoire';
    const field = academic
      ? parsed.data.field ?? fieldFromProfile(access.user.faculty, access.user.level) ?? DEFAULT_FIELD
      : null;
    let template = null;
    if (parsed.data.templateId) {
      if (!academic) {
        return withCors(NextResponse.json({ error: 'Un modèle s’applique à un rapport ou à un mémoire.' }, { status: 400 }), request);
      }
      const found = await getPublishedTemplate(parsed.data.templateId);
      const fits = found && (found.kind === 'both' || found.kind === (templateType === 'memoire' ? 'memoire' : 'stage'));
      if (!found || !fits) {
        return withCors(NextResponse.json({ error: 'Modèle indisponible.' }, { status: 404 }), request);
      }
      template = { id: found.id, outline: found.outline, style: found.document_style };
    }
    const document = await createDocument(userId, title, description || '', templateType, field, template);

    return withCors(NextResponse.json({ document, id: document.id }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
