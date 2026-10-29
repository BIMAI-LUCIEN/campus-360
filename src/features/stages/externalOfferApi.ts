import { Platform } from 'react-native';
import type { StageJob } from '../../types';
import { authFetch } from '../auth/betterAuth';

// An offer the student saw outside the app (flyer, screenshot, WhatsApp text).
// mobile-api reads it and keeps it as a private offer of theirs, then the usual
// application flow (AI CV, letter, payment, sending) runs on it.

export const MAX_OFFER_IMAGES = 3;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export interface OfferImage {
  uri: string;
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  base64: string;
}

// Opens the gallery; screenshots and flyer photos come back compressed, as base64.
export async function pickOfferImages(remaining: number): Promise<OfferImage[]> {
  const ImagePicker = await import('expo-image-picker');
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted && permission.accessPrivileges !== 'limited') {
      throw new Error('Autorise l’accès à tes photos dans les réglages du téléphone pour ajouter l’offre.');
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: remaining > 1,
    selectionLimit: remaining,
    quality: 0.7,
    base64: true,
    exif: false,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.slice(0, remaining).map((asset) => {
    if (!asset.base64) throw new Error('Impossible de lire cette image. Réessaie avec une autre.');
    // base64 is 4/3 of the file size.
    if (asset.base64.length * 0.75 > MAX_IMAGE_BYTES) throw new Error('Image trop lourde : 4 Mo au plus par photo.');
    const mime = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' ? asset.mimeType : 'image/jpeg';
    return { uri: asset.uri, mime, base64: asset.base64 };
  });
}

/** Reads the offer with the AI and returns it as a private offer, ready to apply to. */
export async function importExternalOffer(input: { text: string; images: OfferImage[] }): Promise<StageJob> {
  const text = input.text.trim();
  const res = await authFetch('/api/mobile/stages/external', {
    method: 'POST',
    body: JSON.stringify({
      text: text || undefined,
      images: input.images.length ? input.images.map(({ mime, base64 }) => ({ mime, base64 })) : undefined,
    }),
  });
  const payload = (await res.json()) as { job?: StageJob };
  if (!payload.job) throw new Error("L'offre n'a pas pu être lue. Réessaie.");
  return payload.job;
}
