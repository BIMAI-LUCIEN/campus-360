import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getDocumentFile } from '@/lib/document-files-db';
import { corsPreflight, requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';
import {
  getDocumentById,
  getDocumentSections,
  getDocumentImages,
  addDocumentImage,
  updateDocumentImage,
  deleteDocumentImage,
} from '@/lib/documents-db';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const document = await getDocumentById(documentId, userId);
    if (!document) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const images = await getDocumentImages(documentId, userId);
    return withCors(NextResponse.json({ images }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

const addImageSchema = z.object({
  fileName: z.string().min(1).max(255),
  // An image uploaded to this document through /documents/[id]/files (kind=image).
  fileId: z.string().uuid(),
  aiDescription: z.string().optional(),
  suggestedCaption: z.string().optional(),
  suggestedSectionId: z.string().uuid().optional().nullable(),
  analyze: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const document = await getDocumentById(documentId, userId);
    if (!document) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const body = await request.json().catch(() => null);
    const parsed = addImageSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Données invalides.', details: parsed.error.issues }, { status: 400 }), request);
    }

    const file = await getDocumentFile(parsed.data.fileId, userId);
    if (!file || file.document_id !== documentId || file.kind !== 'image' || file.status !== 'ready') {
      return withCors(NextResponse.json({ error: 'Image introuvable. Envoyez-la à nouveau.' }, { status: 404 }), request);
    }

    const sections = await getDocumentSections(documentId);
    let aiDescription = parsed.data.aiDescription || '';
    let suggestedCaption = parsed.data.suggestedCaption || '';
    let suggestedSectionId = parsed.data.suggestedSectionId || null;

    // If no explicit recommendation was provided, run AI recommendation logic
    if (parsed.data.analyze && (!suggestedCaption || !suggestedSectionId)) {
      const lowerName = parsed.data.fileName.toLowerCase();

      // Smart semantic matching based on filename and available sections
      let targetSection = sections.find((s) => {
        const title = s.title.toLowerCase();
        if (lowerName.includes('arch') || lowerName.includes('code') || lowerName.includes('screen') || lowerName.includes('app') || lowerName.includes('techno') || lowerName.includes('dev')) {
          return title.includes('réalisations') || title.includes('conception') || title.includes('mise en oeuvre') || title.includes('technique');
        }
        if (lowerName.includes('logo') || lowerName.includes('entreprise') || lowerName.includes('organigramme') || lowerName.includes('equipe')) {
          return title.includes('présentation') || title.includes('contexte') || title.includes('entreprise');
        }
        if (lowerName.includes('test') || lowerName.includes('perf') || lowerName.includes('graph') || lowerName.includes('result')) {
          return title.includes('test') || title.includes('évaluation') || title.includes('résultat');
        }
        return false;
      });

      // Default to the first non-system chapter if no specific match
      if (!targetSection) {
        targetSection = sections.find((s) => !s.is_system && s.title.toLowerCase().includes('chapitre')) || sections[0];
      }

      suggestedSectionId = targetSection?.id || null;

      if (!aiDescription) {
        aiDescription = `Illustration pour la section « ${targetSection?.title || 'Rapport'} » (${parsed.data.fileName})`;
      }

      if (!suggestedCaption) {
        const cleanName = parsed.data.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        // The number (« Figure 2.1 ») is added when the document is rendered, from its chapter.
        suggestedCaption = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
    }

    const image = await addDocumentImage({
      documentId,
      userId,
      fileName: parsed.data.fileName,
      fileId: file.id,
      aiDescription,
      suggestedCaption,
      suggestedSectionId,
    });

    return withCors(NextResponse.json({ image }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

const patchImageSchema = z.object({
  imageId: z.string().uuid(),
  isPlaced: z.boolean().optional(),
  suggestedCaption: z.string().max(300).optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const body = await request.json().catch(() => null);
    const parsed = patchImageSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Données invalides.' }, { status: 400 }), request);
    }

    const updated = await updateDocumentImage(parsed.data.imageId, documentId, userId, {
      isPlaced: parsed.data.isPlaced,
      suggestedCaption: parsed.data.suggestedCaption,
    });

    return withCors(NextResponse.json({ image: updated }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const searchParams = request.nextUrl.searchParams;
    const imageId = searchParams.get('imageId');
    if (!imageId) {
      return withCors(NextResponse.json({ error: 'imageId requis.' }, { status: 400 }), request);
    }

    const success = await deleteDocumentImage(imageId, documentId, userId);
    return withCors(NextResponse.json({ success }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
