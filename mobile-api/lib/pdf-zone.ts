// A zone the student circled on a PDF page (Module 30): the viewer crops it into
// an image so the AI sees the actual page, not only the document metadata.
// Nothing here is stored: the image only travels to the AI provider.

export const MAX_ZONE_IMAGE_BYTES = 1.5 * 1024 * 1024;

// Models that read images; text-only fallbacks are skipped when a zone is attached.
export const VISION_MODELS = [
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-001',
  'google/gemini-2.0-flash-exp:free',
];

export type PdfZone = { page: number; image: string };

export class PdfZoneError extends Error {}

const DATA_URL = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/;

/** Validates the zone sent by the app; throws PdfZoneError with a readable message. */
export const parsePdfZone = (input: unknown): PdfZone => {
  if (!input || typeof input !== 'object') throw new PdfZoneError('Zone invalide.');
  const { page, image } = input as { page?: unknown; image?: unknown };
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1) {
    throw new PdfZoneError('Zone invalide : numéro de page incorrect.');
  }
  if (typeof image !== 'string') throw new PdfZoneError('Zone invalide : image manquante.');
  const match = DATA_URL.exec(image);
  if (!match) throw new PdfZoneError('Zone invalide : image JPEG ou PNG attendue.');
  const base64 = match[2];
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const bytes = (base64.length * 3) / 4 - padding;
  if (bytes > MAX_ZONE_IMAGE_BYTES) throw new PdfZoneError('Zone trop lourde (1,5 Mo maximum).');
  return { page, image };
};

/** Multimodal user message: the question, then the circled zone. */
export const buildZoneUserContent = (question: string, zone: PdfZone) => [
  {
    type: 'text' as const,
    text: `${question}\n\n(L'image jointe est la zone que j'ai entourée, page ${zone.page} du document.)`,
  },
  { type: 'image_url' as const, image_url: { url: zone.image } },
];

export const ZONE_SYSTEM_RULE =
  "6. ZONE ENTOURÉE : une image de la page est jointe. Appuie-toi d'abord sur ce qu'elle montre. Si elle est illisible ou floue, dis-le franchement et demande d'entourer plus large : n'invente jamais son contenu.";

/** Vision models only, the preferred one first when it reads images. */
export const visionModelsToTry = (preferred: string | undefined) =>
  preferred && VISION_MODELS.includes(preferred)
    ? Array.from(new Set([preferred, ...VISION_MODELS]))
    : VISION_MODELS;
