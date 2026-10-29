// An offer the student found outside the app (flyer, screenshot, WhatsApp
// text...). The model reads it into the shape of a stage_jobs row, which is
// then kept private to that student so the usual application flow (AI CV,
// letter, payment, sending, follow-up) works on it unchanged.

import { z } from 'zod';

import type { LlmContentPart, LlmMessage } from './llm';

export const MAX_OFFER_IMAGES = 3;
export const MAX_OFFER_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const externalOfferRequestSchema = z
  .object({
    text: z.string().trim().max(12000).optional(),
    images: z
      .array(z.object({
        mime: z.enum(IMAGE_MIMES),
        base64: z.string().min(10).max(Math.ceil(MAX_OFFER_IMAGE_BYTES * 1.4)),
      }))
      .max(MAX_OFFER_IMAGES)
      .optional(),
  })
  .refine((data) => (data.text?.length ?? 0) >= 30 || (data.images?.length ?? 0) > 0, {
    message: "Ajoute une photo de l'offre ou colle son texte.",
  });

export type ExternalOfferRequest = z.infer<typeof externalOfferRequestSchema>;

// Lenient reading of the model output: wrong types become empty, lists are capped.
const str = (max: number) => z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string()).transform((v) => v.trim().slice(0, max));
const strList = (maxItems: number, max: number) =>
  z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown()))
    .transform((items) => items.filter((i): i is string => typeof i === 'string').map((i) => i.trim().slice(0, max)).filter(Boolean).slice(0, maxItems));

const extractedOfferSchema = z.object({
  isOffer: z.preprocess((v) => v !== false, z.boolean()),
  kind: z.preprocess((v) => (v === 'emploi' ? 'emploi' : 'stage'), z.enum(['stage', 'emploi'])),
  title: str(200),
  company: str(200),
  location: str(120),
  duration: str(80),
  stipend: str(120),
  description: str(6000),
  requirements: strList(20, 200),
  contactEmail: str(200),
  contactWhatsapp: str(40),
  deadline: str(80),
});

export type ExtractedOffer = z.infer<typeof extractedOfferSchema>;

export const buildExternalOfferMessages = (input: ExternalOfferRequest): LlmMessage[] => {
  const parts: LlmContentPart[] = [
    {
      type: 'text',
      text: input.text
        ? `Texte de l’offre :\n${input.text.slice(0, 12000)}`
        : 'L’offre est dans les images ci-jointes.',
    },
    ...(input.images ?? []).map((image): LlmContentPart => ({
      type: 'image_url',
      image_url: { url: `data:${image.mime};base64,${image.base64}` },
    })),
  ];
  return [
    {
      role: 'system',
      content: [
        'Tu lis une offre de stage ou d’emploi (affiche, capture d’écran, message) et tu la recopies en JSON, sans markdown ni commentaire.',
        'Règles : recopie seulement ce qui est écrit. N’invente ni entreprise, ni lieu, ni contact, ni salaire. Une information absente donne une chaîne vide ou un tableau vide.',
        '- "isOffer" : false si ce n’est pas une offre de stage ou d’emploi.',
        '- "kind" : "emploi" pour un CDI, CDD ou emploi, sinon "stage".',
        '- "description" : les missions et le profil recherché, avec les mots de l’offre.',
        '- "requirements" : les compétences, diplômes ou qualités demandés, un élément court par ligne.',
        '- "contactWhatsapp" : un numéro de téléphone ou WhatsApp écrit dans l’offre.',
        'Format exact :',
        '{"isOffer":true,"kind":"stage","title":"","company":"","location":"","duration":"","stipend":"","description":"","requirements":[""],"contactEmail":"","contactWhatsapp":"","deadline":""}',
      ].join('\n'),
    },
    { role: 'user', content: parts },
  ];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Offer read from the model's answer, or null when it is not a usable offer. */
export const parseExternalOffer = (raw: string | null): ExtractedOffer | null => {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const offer = extractedOfferSchema.parse(json);
  if (!offer.isOffer || offer.title.length < 3) return null;
  return {
    ...offer,
    contactEmail: EMAIL_PATTERN.test(offer.contactEmail) ? offer.contactEmail : '',
    contactWhatsapp: offer.contactWhatsapp.replace(/[^\d+]/g, '').length >= 8 ? offer.contactWhatsapp : '',
  };
};

/** Description stored on the private offer: the text of the offer plus its deadline. */
export const externalOfferDescription = (offer: ExtractedOffer): string =>
  [offer.description, offer.deadline ? `Date limite : ${offer.deadline}` : ''].filter(Boolean).join('\n\n');
