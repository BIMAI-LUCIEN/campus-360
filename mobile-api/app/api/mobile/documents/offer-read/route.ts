import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceAiQuota } from '@/lib/ai-quota';
import {
  MAX_OFFER_IMAGE_BYTES,
  buildExternalOfferMessages,
  externalOfferRequestSchema,
  parseExternalOffer,
} from '@/lib/external-offer';
import { CV_MODELS, callLlm, isLlmConfigured } from '@/lib/llm';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { ExtractionError, extractSource } from '@/lib/source-extraction';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

const fileSchema = z.object({
  mime: z.enum(FILE_MIMES),
  base64: z.string().min(10).max(Math.ceil(MAX_FILE_BYTES * 1.4)),
});

// Reads the offer a CV or letter is written for (photos, PDF or Word file, or
// pasted text) and returns it. Nothing is saved: the app keeps it with the
// conversation and sends it back with each question and with the generation.
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const file = body?.file === undefined ? null : fileSchema.safeParse(body.file);
    if (file && !file.success) throw new MobileApiError("Envoie l'offre en PDF, Word (.docx) ou texte, 5 Mo au plus.", 400);

    let fileText = '';
    if (file?.success) {
      const data = Buffer.from(file.data.base64, 'base64');
      if (data.length > MAX_FILE_BYTES) throw new MobileApiError('Fichier trop lourd : 5 Mo au plus.', 413);
      try {
        fileText = (await extractSource(data, file.data.mime)).pages.map((p) => p.text).join('\n').trim();
      } catch (error) {
        if (error instanceof ExtractionError) {
          throw new MobileApiError("Impossible de lire ce fichier. S'il s'agit d'un scan, envoie plutôt une photo de l'offre.", 422);
        }
        throw error;
      }
    }

    const typedText = typeof body?.text === 'string' ? body.text : '';
    const parsed = externalOfferRequestSchema.safeParse({
      text: [fileText, typedText].filter(Boolean).join('\n\n').slice(0, 12000) || undefined,
      images: body?.images,
    });
    if (!parsed.success) {
      throw new MobileApiError("Ajoute l'offre : jusqu'à 3 photos (4 Mo chacune), un PDF ou Word, ou son texte.", 400);
    }
    for (const image of parsed.data.images ?? []) {
      if (Buffer.byteLength(image.base64, 'base64') > MAX_OFFER_IMAGE_BYTES) {
        throw new MobileApiError('Image trop lourde : 4 Mo au plus par photo.', 413);
      }
    }
    if (!isLlmConfigured()) throw new MobileApiError("L'IA n'est pas disponible pour le moment.", 503);

    await enforceAiQuota(request, { userId: access.user.id, route: 'offer-read' });
    const raw = await callLlm(buildExternalOfferMessages(parsed.data), {
      temperature: 0.1,
      maxTokens: 2000,
      title: 'Campus 360 Offre visée',
      timeoutMs: 27_000,
      models: CV_MODELS,
    });
    if (!raw) throw new MobileApiError("L'IA n'a pas pu lire l'offre pour le moment. Réessaie dans un instant.", 503);
    const offer = parseExternalOffer(raw);
    if (!offer) {
      throw new MobileApiError("L'IA n'a pas trouvé d'offre lisible. Envoie une photo plus nette ou colle le texte de l'offre.", 422);
    }

    return withCors(NextResponse.json({ offer }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
