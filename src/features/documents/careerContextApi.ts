import * as DocumentPicker from 'expo-document-picker';

import { authFetch } from '../auth/betterAuth';
import { readAsBase64 } from '../profile/cvBackgroundApi';
import type { OfferImage } from '../stages/externalOfferApi';

// The offer a CV or a letter is written for. mobile-api reads it
// (/api/mobile/documents/offer-read) and keeps nothing: the conversation holds
// it and sends it back with each question and with the generation.

export type CareerOffer = {
  kind: 'stage' | 'emploi';
  title: string;
  company: string;
  location: string;
  duration: string;
  description: string;
  requirements: string[];
  deadline: string;
};

const FILE_MIMES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

const readOffer = async (body: Record<string, unknown>): Promise<CareerOffer> => {
  const res = await authFetch('/api/mobile/documents/offer-read', { method: 'POST', body: JSON.stringify(body) });
  const { offer } = (await res.json()) as { offer: CareerOffer & Record<string, unknown> };
  // Only the fields the conversation sends back (the server schema is strict on lengths).
  return {
    kind: offer.kind === 'emploi' ? 'emploi' : 'stage',
    title: offer.title ?? '',
    company: offer.company ?? '',
    location: offer.location ?? '',
    duration: offer.duration ?? '',
    description: offer.description ?? '',
    requirements: offer.requirements ?? [],
    deadline: offer.deadline ?? '',
  };
};

export const readOfferFromImages = (images: OfferImage[]) =>
  readOffer({ images: images.map(({ mime, base64 }) => ({ mime, base64 })) });

export const readOfferFromText = (text: string) => readOffer({ text: text.trim() });

/** Picks the offer as a PDF, Word or text file; null when cancelled. */
export async function readOfferFromFile(): Promise<CareerOffer | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: Object.values(FILE_MIMES),
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;
  const asset = picked.assets[0];
  const mime = FILE_MIMES[(asset.name.split('.').pop() || '').toLowerCase()] ?? asset.mimeType ?? '';
  if (!Object.values(FILE_MIMES).includes(mime)) {
    throw new Error('Format non pris en charge : choisis un PDF, un Word (.docx) ou un texte.');
  }
  if (asset.size && asset.size > 5 * 1024 * 1024) throw new Error('Fichier trop lourd : 5 Mo au plus.');
  return readOffer({ file: { mime, base64: await readAsBase64(asset) } });
}

export const careerOfferLabel = (offer: CareerOffer): string =>
  [offer.title, offer.company].filter(Boolean).join(' · ');
