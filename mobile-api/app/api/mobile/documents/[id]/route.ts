import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';
import { getDocumentById, getDocumentSections, updateDocumentSettings, deleteDocument } from '@/lib/documents-db';
import { listStorageKeysForDocument } from '@/lib/document-files-db';
import {
  applyStylePatch,
  legacyColumnsFromStyle,
  resolveStyle,
  STYLE_FONTS,
  type DocumentStylePatch,
  type StyleFont,
} from '@/lib/document-style';
import { documentStylePatchSchema } from '@/lib/document-style-schema';
import { canStoreFiles, deleteStoredFile } from '@/lib/file-storage';

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

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Couleur hex invalide (#RGB, #RRGGBB ou #RRGGBBAA)');

const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  font_family: z.string().trim().optional(),
  line_spacing: z.number().min(0.5).max(4.0).optional(),
  margins: z.enum(['normal', 'narrow', 'wide']).optional(),
  cover_template: z.enum(['classic', 'minimalist', 'tech']).optional(),
  cover_data: z.record(z.string(), z.any()).optional(),
  document_metadata: z.record(z.string(), z.any()).optional(),
  primary_color: hexColorSchema.optional(),
  secondary_color: hexColorSchema.optional(),
  // Module 20: partial change of the document style (strictly validated).
  document_style: documentStylePatchSchema.optional(),
});

type RouteContext = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams instanceof Promise ? await rawParams : rawParams;
    const id = resolvedParams?.id || '';

    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    if (!UUID_RE.test(id)) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const document = await getDocumentById(id, userId);
    if (!document) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const sections = await getDocumentSections(id);
    return withCors(
      NextResponse.json({ document: { ...document, document_style: resolveStyle(document.document_style) }, sections }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams instanceof Promise ? await rawParams : rawParams;
    const id = resolvedParams?.id || '';

    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    if (!UUID_RE.test(id)) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const body = await request.json().catch(() => null);
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Données invalides.' }, { status: 400 }), request);
    }

    const { document_style: stylePatch, ...settings } = parsed.data;

    // Older clients still send the legacy columns: mirror them into the style.
    const legacyPatch: DocumentStylePatch = {};
    if (settings.font_family && (STYLE_FONTS as readonly string[]).includes(settings.font_family)) {
      legacyPatch.typography = { bodyFont: settings.font_family as StyleFont };
    }
    if (settings.line_spacing !== undefined) {
      legacyPatch.typography = { ...legacyPatch.typography, lineSpacing: Math.min(2.5, Math.max(1, settings.line_spacing)) };
    }
    if (settings.margins) legacyPatch.page = { margins: settings.margins };

    let styleUpdate = {};
    if (stylePatch || Object.keys(legacyPatch).length > 0) {
      const current = await getDocumentById(id, userId);
      if (!current) {
        return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
      }
      let nextStyle = applyStylePatch(current.document_style, legacyPatch);
      if (stylePatch) nextStyle = applyStylePatch(nextStyle, stylePatch as DocumentStylePatch);
      styleUpdate = { document_style: nextStyle, ...legacyColumnsFromStyle(nextStyle) };
    }

    const document = await updateDocumentSettings(id, userId, { ...settings, ...styleUpdate });
    return withCors(
      NextResponse.json({ document: { ...document, document_style: resolveStyle(document.document_style) } }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams instanceof Promise ? await rawParams : rawParams;
    const id = resolvedParams?.id || '';

    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    if (!UUID_RE.test(id)) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    // Rows cascade with the document; the disk copies must be removed explicitly.
    const storageKeys = await listStorageKeysForDocument(id, userId);
    const success = await deleteDocument(id, userId);
    if (!success) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }
    // Off the VPS the disk copies are left for the orphan purge job.
    if (canStoreFiles()) {
      await Promise.all(storageKeys.map((key) => deleteStoredFile(key).catch(() => undefined)));
    }

    return withCors(NextResponse.json({ success: true }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
