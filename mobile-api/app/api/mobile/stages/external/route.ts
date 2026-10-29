import { NextRequest, NextResponse } from 'next/server';

import { enforceAiQuota } from '@/lib/ai-quota';
import {
  MAX_OFFER_IMAGE_BYTES,
  buildExternalOfferMessages,
  externalOfferDescription,
  externalOfferRequestSchema,
  parseExternalOffer,
} from '@/lib/external-offer';
import { VISION_MODELS, callLlm, isLlmConfigured } from '@/lib/llm';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { createPrivateStageJob } from '@/lib/stages-db';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

// Reads an offer the student found outside the app (photos of a flyer,
// screenshots or pasted text) and saves it as a private offer of theirs. The
// app then opens the usual application flow on it; nothing is charged here.
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const parsed = externalOfferRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new MobileApiError("Ajoute jusqu'à 3 photos de l'offre (JPEG, PNG ou WebP, 4 Mo chacune) ou colle son texte.", 400);
    }
    for (const image of parsed.data.images ?? []) {
      if (Buffer.byteLength(image.base64, 'base64') > MAX_OFFER_IMAGE_BYTES) {
        throw new MobileApiError('Image trop lourde : 4 Mo au plus par photo.', 413);
      }
    }
    if (!isLlmConfigured()) throw new MobileApiError("L'IA n'est pas disponible pour le moment.", 503);

    await enforceAiQuota(request, { userId: access.user.id, route: 'external-offer' });
    const hasImages = (parsed.data.images?.length ?? 0) > 0;
    const raw = await callLlm(buildExternalOfferMessages(parsed.data), {
      temperature: 0.1,
      maxTokens: 2000,
      title: 'Campus 360 Offre externe',
      timeoutMs: 60_000,
      ...(hasImages ? { models: VISION_MODELS } : {}),
    });
    const offer = parseExternalOffer(raw);
    if (!offer) {
      throw new MobileApiError("L'IA n'a pas trouvé d'offre lisible. Prends une photo plus nette ou colle le texte de l'offre.", 422);
    }

    const job = await createPrivateStageJob({
      ownerUserId: access.user.id,
      kind: offer.kind,
      title: offer.title,
      companyName: offer.company || 'Entreprise non précisée',
      location: offer.location,
      duration: offer.duration,
      stipend: offer.stipend,
      description: externalOfferDescription(offer),
      requirements: offer.requirements,
      contactEmail: offer.contactEmail,
      contactWhatsapp: offer.contactWhatsapp,
    });
    if (!job) throw new MobileApiError("L'offre n'a pas pu être enregistrée. Réessaie.", 500);

    return withCors(NextResponse.json({ job }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
