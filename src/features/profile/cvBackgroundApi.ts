import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { authFetch } from '../auth/betterAuth';

// "Mon parcours": the student's CV background, kept on the account
// (mobile-api /api/mobile/account/cv-background) and reused by every application.

export type CvBackgroundExperience = { poste: string; entreprise: string; ville: string; periode: string; missions: string[] };
export type CvBackgroundFormation = { diplome: string; etablissement: string; ville: string; periode: string };

export type CvBackground = {
  profil: string;
  experiences: CvBackgroundExperience[];
  formations: CvBackgroundFormation[];
  competences: string[];
  logiciels: string[];
  qualites: string[];
  langues: { langue: string; niveau: string }[];
  loisirs: string[];
};

export const emptyCvBackground = (): CvBackground => ({
  profil: '',
  experiences: [],
  formations: [],
  competences: [],
  logiciels: [],
  qualites: [],
  langues: [],
  loisirs: [],
});

/** Number of filled sections, to show how complete the background is. */
export const cvBackgroundFilledCount = (b: CvBackground): number =>
  [b.profil, b.experiences.length, b.formations.length, b.competences.length, b.langues.length, b.loisirs.length].filter(Boolean).length;

export async function fetchCvBackground(): Promise<{ background: CvBackground; saved: boolean }> {
  const res = await authFetch('/api/mobile/account/cv-background');
  return (await res.json()) as { background: CvBackground; saved: boolean };
}

export async function saveCvBackground(background: CvBackground): Promise<CvBackground> {
  const res = await authFetch('/api/mobile/account/cv-background', {
    method: 'PUT',
    body: JSON.stringify(background),
  });
  return ((await res.json()) as { background: CvBackground }).background;
}

const MIMES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

const readAsBase64 = async (asset: DocumentPicker.DocumentPickerAsset): Promise<string> => {
  if (Platform.OS === 'web' && asset.file) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(asset.file as Blob);
    });
    return dataUrl.slice(dataUrl.indexOf(',') + 1);
  }
  return FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
};

/**
 * Lets the student pick an existing CV (PDF, Word or text) and returns the
 * background the AI read in it, for review before saving. Null when cancelled.
 */
export async function importCvFromFile(): Promise<CvBackground | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: Object.values(MIMES),
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;
  const asset = picked.assets[0];
  const ext = (asset.name.split('.').pop() || '').toLowerCase();
  const mime = MIMES[ext] ?? asset.mimeType ?? '';
  if (!Object.values(MIMES).includes(mime)) {
    throw new Error('Format non pris en charge : choisis un PDF, un Word (.docx) ou un texte.');
  }
  if (asset.size && asset.size > 5 * 1024 * 1024) throw new Error('Fichier trop lourd : 5 Mo au plus.');
  const base64 = await readAsBase64(asset);
  const res = await authFetch('/api/mobile/account/cv-background/import', {
    method: 'POST',
    body: JSON.stringify({ mime, base64 }),
  });
  return ((await res.json()) as { background: CvBackground }).background;
}

/** Same as importCvFromFile, from pasted text (scanned CVs, photos). */
export async function importCvFromText(text: string): Promise<CvBackground> {
  const res = await authFetch('/api/mobile/account/cv-background/import', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return ((await res.json()) as { background: CvBackground }).background;
}
