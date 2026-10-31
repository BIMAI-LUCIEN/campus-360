import { Platform } from 'react-native';

import { authFetchRawAt, filesBaseUrl, getAuthHeaders, mobileApiBaseUrl } from '../auth/betterAuth';

// Client for document images and sources (Module 19): pick from the phone,
// upload to the files host, list, add web pages or pasted text, and resolve
// stored images to short-lived URLs for display.

export type DocumentFileKind = 'image' | 'source';
export type DocumentFileStatus = 'pending' | 'ready' | 'failed';
// « personal » : rapports journaliers, notes, livrables de l'étudiant (les faits).
// « reference » : cours, articles, normes, consignes de l'encadreur (l'appui).
export type SourceRole = 'personal' | 'reference';

export const SOURCE_ROLE_LABEL: Record<SourceRole, string> = {
  personal: 'Mes documents',
  reference: 'Référence',
};

export type DocumentFile = {
  id: string;
  document_id: string;
  kind: DocumentFileKind;
  origin: 'upload' | 'url' | 'text';
  original_name: string;
  title: string;
  mime: string;
  bytes: number;
  source_url: string | null;
  source_role?: SourceRole;
  status: DocumentFileStatus;
  error: string | null;
  page_count: number;
  created_at: string;
  updated_at: string;
};

export type DocumentImageRecord = {
  id: string;
  file_id?: string | null;
  file_name: string;
  image_url: string;
  suggested_caption: string;
  is_placed: boolean;
};

export type SourceCitation = {
  label: number;
  sourceId: string;
  title: string;
  page: number | null;
  excerpt: string;
  sourceUrl: string | null;
  cited: boolean;
};

export type PickedFile = {
  uri: string;
  name: string;
  type: string;
  size?: number;
  webFile?: Blob;
};

export const MAX_IMAGE_MB = 10;
export const MAX_SOURCE_MB = 20;
const UPLOAD_TIMEOUT_MS = 120_000;

const SOURCE_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const UPDATE_REQUIRED = 'Mettez à jour l’application pour ajouter des fichiers depuis votre téléphone.';

const readError = async (res: Response, fallback: string) => {
  const payload = (await res.json().catch(() => null)) as { error?: string } | null;
  return payload?.error || fallback;
};

const api = async <T>(path: string, init: RequestInit = {}, fallback = 'Erreur serveur.'): Promise<T> => {
  let res: Response;
  try {
    res = await authFetchRawAt(mobileApiBaseUrl, path, init);
  } catch {
    throw new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');
  }
  if (!res.ok) throw new Error(await readError(res, `${fallback} (${res.status})`));
  return (await res.json()) as T;
};

// ── Picking ────────────────────────────────────────────────────────────────

const loadImagePicker = async () => {
  try {
    return await import('expo-image-picker');
  } catch {
    throw new Error(UPDATE_REQUIRED);
  }
};

const loadDocumentPicker = async () => {
  try {
    return await import('expo-document-picker');
  } catch {
    throw new Error(UPDATE_REQUIRED);
  }
};

const tooBig = (size: number | undefined, maxMb: number) => typeof size === 'number' && size > maxMb * 1024 * 1024;

// Opens the photo library. Returns null if the user cancels.
export const pickImageFromPhone = async (): Promise<PickedFile | null> => {
  const ImagePicker = await loadImagePicker();
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted && permission.accessPrivileges !== 'limited') {
      throw new Error('Autorisez l’accès à vos photos dans les réglages du téléphone pour insérer une image.');
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    // Re-encoding also turns HEIC photos into JPEG, which every export supports.
    quality: 0.85,
    exif: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const type = asset.mimeType && asset.mimeType !== 'image/heic' ? asset.mimeType : 'image/jpeg';
  if (tooBig(asset.fileSize, MAX_IMAGE_MB)) throw new Error(`Image trop lourde (maximum ${MAX_IMAGE_MB} Mo).`);
  const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  return {
    uri: asset.uri,
    name: asset.fileName || `photo-${Date.now()}.${extension}`,
    type,
    size: asset.fileSize,
    webFile: (asset as { file?: Blob }).file,
  };
};

// Opens the file picker for PDF, DOCX or TXT. Returns null if the user cancels.
export const pickSourceFromPhone = async (): Promise<PickedFile | null> => {
  const DocumentPicker = await loadDocumentPicker();
  const result = await DocumentPicker.getDocumentAsync({
    type: SOURCE_MIME_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (tooBig(asset.size, MAX_SOURCE_MB)) throw new Error(`Fichier trop lourd (maximum ${MAX_SOURCE_MB} Mo).`);
  return {
    uri: asset.uri,
    name: asset.name || 'source',
    type: asset.mimeType || 'application/octet-stream',
    size: asset.size,
    webFile: (asset as { file?: Blob }).file,
  };
};

// ── Upload ─────────────────────────────────────────────────────────────────

// XMLHttpRequest rather than fetch, to report upload progress (0 → 1).
export const uploadDocumentFile = async (
  documentId: string,
  file: PickedFile,
  kind: DocumentFileKind,
  onProgress?: (fraction: number) => void,
  role?: SourceRole,
): Promise<DocumentFile> => {
  const headers = await getAuthHeaders();
  const form = new FormData();
  if (Platform.OS === 'web' && file.webFile) {
    form.append('file', file.webFile, file.name);
  } else {
    // React Native's FormData accepts a { uri, name, type } descriptor for files.
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
  form.append('kind', kind);
  if (kind === 'source' && role) form.append('role', role);

  return new Promise<DocumentFile>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${filesBaseUrl}/api/mobile/documents/${documentId}/files`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    Object.entries(headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== 'content-type') xhr.setRequestHeader(key, value);
    });
    if (Platform.OS === 'web') xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.min(1, event.loaded / event.total));
    };
    xhr.onload = () => {
      let payload: { file?: DocumentFile; error?: string } | null = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.file) {
        onProgress?.(1);
        resolve(payload.file);
      } else {
        reject(new Error(payload?.error || `Envoi impossible (${xhr.status}). Réessayez.`));
      }
    };
    xhr.onerror = () => reject(new Error('Connexion impossible. Vérifiez votre réseau et réessayez.'));
    xhr.ontimeout = () => reject(new Error('L’envoi a pris trop de temps. Réessayez avec une meilleure connexion.'));
    xhr.send(form);
  });
};

export const deleteDocumentFile = async (documentId: string, fileId: string): Promise<void> => {
  // Sent to the files host so the disk copy is removed immediately.
  let res: Response;
  try {
    res = await authFetchRawAt(filesBaseUrl, `/api/mobile/documents/${documentId}/files?fileId=${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
    });
  } catch {
    throw new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');
  }
  if (!res.ok && res.status !== 404) throw new Error(await readError(res, 'Suppression impossible.'));
};

// ── Images ─────────────────────────────────────────────────────────────────

export const listDocumentImages = async (documentId: string): Promise<DocumentImageRecord[]> =>
  (await api<{ images: DocumentImageRecord[] }>(`/api/mobile/documents/${documentId}/images`)).images || [];

export const attachImageToDocument = async (documentId: string, fileId: string, fileName: string) =>
  (
    await api<{ image: DocumentImageRecord }>(
      `/api/mobile/documents/${documentId}/images`,
      { method: 'POST', body: JSON.stringify({ fileId, fileName }) },
      'Ajout de l’image impossible.',
    )
  ).image;

export const updateImageCaption = async (documentId: string, imageId: string, patch: { isPlaced?: boolean; suggestedCaption?: string }) =>
  api<{ image: DocumentImageRecord | null }>(`/api/mobile/documents/${documentId}/images`, {
    method: 'PATCH',
    body: JSON.stringify({ imageId, ...patch }),
  });

// Signed URLs (10 min) for stored files, keyed by file id. Unknown ids are omitted.
export const resolveFileUrls = async (fileIds: string[]): Promise<Record<string, string>> => {
  const unique = Array.from(new Set(fileIds)).slice(0, 100);
  if (unique.length === 0) return {};
  const { urls } = await api<{ urls: Record<string, { url: string }> }>('/api/mobile/files/sign', {
    method: 'POST',
    body: JSON.stringify({ fileIds: unique }),
  });
  return Object.fromEntries(Object.entries(urls || {}).map(([id, value]) => [id, value.url]));
};

// ── Sources ────────────────────────────────────────────────────────────────

export const listDocumentSources = async (documentId: string): Promise<DocumentFile[]> =>
  (await api<{ sources: DocumentFile[] }>(`/api/mobile/documents/${documentId}/sources`)).sources || [];

export const addUrlSource = async (documentId: string, url: string, role?: SourceRole): Promise<DocumentFile> =>
  (
    await api<{ source: DocumentFile }>(
      `/api/mobile/documents/${documentId}/sources`,
      { method: 'POST', body: JSON.stringify({ url: url.trim(), role }) },
      'Ajout de la page impossible.',
    )
  ).source;

export const addTextSource = async (
  documentId: string,
  title: string,
  text: string,
  role?: SourceRole,
): Promise<DocumentFile> =>
  (
    await api<{ source: DocumentFile }>(
      `/api/mobile/documents/${documentId}/sources`,
      { method: 'POST', body: JSON.stringify({ title: title.trim(), text, role }) },
      'Ajout du texte impossible.',
    )
  ).source;

export const roleOf = (source: DocumentFile): SourceRole =>
  source.source_role ?? (source.origin === 'url' ? 'reference' : 'personal');

export const updateSourceRole = async (documentId: string, sourceId: string, role: SourceRole): Promise<DocumentFile> =>
  (
    await api<{ source: DocumentFile }>(
      `/api/mobile/documents/${documentId}/sources/${sourceId}`,
      { method: 'PATCH', body: JSON.stringify({ role }) },
      'Changement impossible.',
    )
  ).source;

export const deleteSource = async (documentId: string, source: DocumentFile): Promise<void> => {
  if (source.origin === 'upload') return deleteDocumentFile(documentId, source.id);
  await api(`/api/mobile/documents/${documentId}/sources/${source.id}`, { method: 'DELETE' }, 'Suppression impossible.');
};

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
