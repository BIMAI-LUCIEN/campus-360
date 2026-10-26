import { Platform } from 'react-native';
import { authFetch } from '../auth/betterAuth';

// Photo of the official CV, read from the phone gallery and kept as a data URI.
// Only png/jpeg/webp data URIs pass safeImageUrl() in cvHtml.ts.
const MAX_PHOTO_CHARS = 2_000_000;

// Opens the photo library and returns the picked photo as a data URI, or null when cancelled.
export async function pickCvPhoto(): Promise<string | null> {
  const ImagePicker = await import('expo-image-picker');
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted && permission.accessPrivileges !== 'limited') {
      throw new Error('Autorisez l’accès à vos photos dans les réglages du téléphone pour ajouter votre photo.');
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.6,
    base64: true,
    exif: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (!asset.base64) throw new Error('Impossible de lire cette photo. Réessayez avec une autre image.');
  const mime = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' ? asset.mimeType : 'image/jpeg';
  const dataUri = `data:${mime};base64,${asset.base64}`;
  if (dataUri.length > MAX_PHOTO_CHARS) throw new Error('Photo trop lourde. Choisissez une image plus petite.');
  return dataUri;
}

// Photo saved on the student account (mobile-api /api/mobile/account/photo).
export async function fetchCvPhoto(): Promise<string | null> {
  const res = await authFetch('/api/mobile/account/photo');
  if (!res.ok) throw new Error('Impossible de récupérer ta photo.');
  const data = (await res.json()) as { photo: string | null };
  return data.photo ?? null;
}

export async function saveCvPhoto(dataUri: string): Promise<void> {
  const res = await authFetch('/api/mobile/account/photo', {
    method: 'PUT',
    body: JSON.stringify({ photo: dataUri }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Impossible d’enregistrer ta photo.');
  }
}

export async function deleteCvPhoto(): Promise<void> {
  const res = await authFetch('/api/mobile/account/photo', { method: 'DELETE' });
  if (!res.ok) throw new Error('Impossible de retirer ta photo.');
}
