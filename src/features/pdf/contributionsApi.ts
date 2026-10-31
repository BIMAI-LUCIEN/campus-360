import { Platform } from 'react-native';

import { authFetchRawAt, filesBaseUrl, getAuthHeaders, mobileApiBaseUrl } from '../auth/betterAuth';

// Student PDF contributions (Module 27): pick up to 10 PDF, send them one per
// request with a shared batch id, follow their review, earn 10 coins each.

export type ContributionStatus =
  | 'analyzing'
  | 'duplicate'
  | 'probable_duplicate'
  | 'ready'
  | 'pending_review'
  | 'published'
  | 'rejected';

export type ContributionSheet = {
  title?: string;
  subject?: string;
  school?: string;
  year?: string;
  level?: string;
  kind?: string;
  summary?: string;
  keywords?: string[];
};

export type Contribution = {
  id: string;
  batchId: string;
  status: ContributionStatus;
  originalName: string;
  sheet: ContributionSheet;
  duplicateOf: { id: string; title: string; kind: 'document' | 'upload' } | null;
  rejectReason: string | null;
  copyrightFlag: boolean;
  personalDataFlag: boolean;
  documentId: string | null;
  createdAt: string;
};

export type PickedPdf = { uri: string; name: string; size?: number; webFile?: Blob };

export const MAX_FILES = 10;
export const MAX_MB = 20;
const UPLOAD_TIMEOUT_MS = 120_000;
const UPDATE_REQUIRED = 'Cette fonction arrive bientôt. Mettez à jour l’application.';

export const newBatchId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const loadDocumentPicker = async () => {
  try {
    return await import('expo-document-picker');
  } catch {
    throw new Error(UPDATE_REQUIRED);
  }
};

// Returns the chosen PDF (null if cancelled). Refuses more than 10 files or a
// file over 20 Mo before anything is sent.
export const pickPdfs = async (): Promise<PickedPdf[] | null> => {
  const DocumentPicker = await loadDocumentPicker();
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true, copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return null;
  if (result.assets.length > MAX_FILES) throw new Error(`${MAX_FILES} PDF au maximum par envoi.`);
  const tooBig = result.assets.filter((a) => typeof a.size === 'number' && a.size > MAX_MB * 1024 * 1024);
  if (tooBig.length) throw new Error(`Fichier trop lourd (maximum ${MAX_MB} Mo) : ${tooBig.map((a) => a.name).join(', ')}.`);
  return result.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.name || 'document.pdf',
    size: asset.size,
    webFile: (asset as { file?: Blob }).file,
  }));
};

const readError = async (res: Response, fallback: string) => {
  if (res.status === 404) return UPDATE_REQUIRED;
  const payload = (await res.json().catch(() => null)) as { error?: string } | null;
  return payload?.error || fallback;
};

// XMLHttpRequest rather than fetch, to report upload progress (0 → 1).
export const uploadContribution = async (
  file: PickedPdf,
  batchId: string,
  onProgress?: (fraction: number) => void,
): Promise<Contribution> => {
  const headers = await getAuthHeaders();
  const form = new FormData();
  if (Platform.OS === 'web' && file.webFile) form.append('file', file.webFile, file.name);
  else form.append('file', { uri: file.uri, name: file.name, type: 'application/pdf' } as unknown as Blob);
  form.append('batchId', batchId);
  form.append('rightsDeclared', 'true');

  return new Promise<Contribution>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${filesBaseUrl}/api/mobile/contributions`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    Object.entries(headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== 'content-type') xhr.setRequestHeader(key, value);
    });
    if (Platform.OS === 'web') xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.min(1, event.loaded / event.total));
    };
    xhr.onload = () => {
      let payload: { upload?: Contribution; error?: string } | null = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.upload) resolve(payload.upload);
      else if (xhr.status === 404) reject(new Error(UPDATE_REQUIRED));
      else reject(new Error(payload?.error || `Envoi impossible (${xhr.status}). Réessayez.`));
    };
    xhr.onerror = () => reject(new Error('Connexion impossible. Vérifiez votre réseau et réessayez.'));
    xhr.ontimeout = () => reject(new Error('L’envoi a pris trop de temps. Réessayez avec une meilleure connexion.'));
    xhr.send(form);
  });
};

export const listContributions = async (): Promise<Contribution[]> => {
  let res: Response;
  try {
    res = await authFetchRawAt(mobileApiBaseUrl, '/api/mobile/contributions');
  } catch {
    throw new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');
  }
  if (!res.ok) throw new Error(await readError(res, `Chargement impossible (${res.status}).`));
  return ((await res.json()) as { uploads: Contribution[] }).uploads;
};

export const updateContributionSheet = async (id: string, sheet: ContributionSheet): Promise<Contribution> => {
  const res = await authFetchRawAt(mobileApiBaseUrl, `/api/mobile/contributions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(sheet),
  });
  if (!res.ok) throw new Error(await readError(res, `Modification impossible (${res.status}).`));
  return ((await res.json()) as { upload: Contribution }).upload;
};
