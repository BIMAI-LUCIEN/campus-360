import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import type { OfficialCvData } from '../../types';
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

export const readAsBase64 = async (asset: DocumentPicker.DocumentPickerAsset): Promise<string> => {
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

const normalizedEntry = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const mergeEntries = <T>(
  current: T[], imported: T[], limit: number, keyOf: (item: T) => string,
  combine: (saved: T, incoming: T) => T = (saved) => saved,
): T[] => {
  const entries = new Map<string, T>();
  for (const value of [...current, ...imported]) {
    const key = keyOf(value);
    const saved = entries.get(key);
    if (saved !== undefined) entries.set(key, combine(saved, value));
    else if (key && entries.size < limit) entries.set(key, value);
  }
  return [...entries.values()];
};

const mergeStrings = (current: string[], imported: string[], limit: number) =>
  mergeEntries(current, imported, limit, normalizedEntry);

const recordKey = (...parts: string[]) => JSON.stringify(parts.map(normalizedEntry));

/** Existing values win. Different periods preserve distinct positions or degrees. */
export const mergeCvBackground = (current: CvBackground, imported: CvBackground): CvBackground => ({
  profil: current.profil || imported.profil,
  experiences: mergeEntries(current.experiences, imported.experiences, 10,
    (e) => recordKey(e.poste, e.entreprise, e.periode),
    (saved, incoming) => ({
      ...saved,
      ville: saved.ville || incoming.ville,
      missions: mergeStrings(saved.missions, incoming.missions, 8),
    })),
  formations: mergeEntries(current.formations, imported.formations, 8,
    (f) => recordKey(f.diplome, f.etablissement, f.periode),
    (saved, incoming) => ({ ...saved, ville: saved.ville || incoming.ville })),
  competences: mergeStrings(current.competences, imported.competences, 30),
  logiciels: mergeStrings(current.logiciels, imported.logiciels, 30),
  qualites: mergeStrings(current.qualites, imported.qualites, 10),
  langues: mergeEntries(current.langues, imported.langues, 8, (l) => normalizedEntry(l.langue),
    (saved, incoming) => ({ ...saved, niveau: saved.niveau || incoming.niveau })),
  loisirs: mergeStrings(current.loisirs, imported.loisirs, 10),
});

/** Fills the untouched sections of the initial editor draft. */
export const backgroundToOfficialCv = (base: OfficialCvData, background: CvBackground): OfficialCvData => ({
  ...base,
  profil: base.profil || background.profil,
  experiences: base.experiences.length ? base.experiences : background.experiences,
  formations: mergeEntries(base.formations, background.formations, 10,
    (f) => recordKey(f.diplome, f.etablissement, f.periode)),
  competences: {
    professionnelles: mergeStrings(base.competences.professionnelles, background.competences, 40),
    habilitesRelationnelles: mergeStrings(base.competences.habilitesRelationnelles, background.qualites, 20),
    logiciels: base.competences.logiciels.length || !background.logiciels.length
      ? base.competences.logiciels
      : [background.logiciels.slice(0, 20), background.logiciels.slice(20)].filter((items) => items.length).map((items) => ({ items })),
  },
  langues: base.langues.length ? base.langues : background.langues,
  loisirs: mergeStrings(base.loisirs, background.loisirs, 15),
});

/** Merges a newly imported reference CV into an already-started editor draft without losing manual edits. */
export const mergeBackgroundIntoCv = (cv: OfficialCvData, incoming: CvBackground): OfficialCvData => {
  const existingTools = new Set(
    cv.competences.logiciels.flatMap((group) => group.items.map(normalizedEntry)),
  );
  const newTools = incoming.logiciels.filter((tool) => {
    const key = normalizedEntry(tool);
    if (!key || existingTools.has(key)) return false;
    existingTools.add(key);
    return true;
  });
  const mergedTools = newTools.length
    ? [...cv.competences.logiciels, { items: newTools.slice(0, 20) }].slice(0, 10)
    : cv.competences.logiciels;

  return {
    ...cv,
    profil: cv.profil || incoming.profil,
    experiences: mergeEntries(
      cv.experiences,
      incoming.experiences,
      15,
      (e) => recordKey(e.poste, e.entreprise, e.periode),
      (saved, add) => ({
        ...saved,
        ville: saved.ville || add.ville,
        missions: mergeStrings(saved.missions, add.missions, 15),
      }),
    ),
    formations: mergeEntries(
      cv.formations,
      incoming.formations,
      10,
      (f) => recordKey(f.diplome, f.etablissement, f.periode),
      (saved, add) => ({ ...saved, ville: saved.ville || add.ville }),
    ),
    competences: {
      professionnelles: mergeStrings(cv.competences.professionnelles, incoming.competences, 40),
      habilitesRelationnelles: mergeStrings(cv.competences.habilitesRelationnelles, incoming.qualites, 20),
      logiciels: mergedTools,
    },
    langues: mergeEntries(
      cv.langues,
      incoming.langues,
      10,
      (l) => normalizedEntry(l.langue),
      (saved, add) => ({ ...saved, niveau: saved.niveau || add.niveau }),
    ),
    loisirs: mergeStrings(cv.loisirs, incoming.loisirs, 15),
  };
};
