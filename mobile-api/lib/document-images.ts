import { getDocumentFile } from './document-files-db';
import { getFilesPublicBaseUrl, signFileUrl } from './file-signing';
import { canStoreFiles, readStoredFile, storedFileExists } from './file-storage';
import { MAX_IMAGE_BYTES } from './file-validation';
import { extractImageFileIds, type LoadedImage } from './html-images';

export { inlineDocumentImages, readImageSize, type LoadedImage } from './html-images';

// Loads the uploaded images referenced by `data-file-id` in a document's HTML,
// for exports. On the VPS the bytes come from disk; on Vercel (no disk) they
// are downloaded from the files host through a freshly signed URL.

const FETCH_TIMEOUT_MS = 10_000;

const downloadFromFilesHost = async (fileId: string, requestOrigin?: string): Promise<Buffer | null> => {
  const { url } = signFileUrl(fileId, { baseUrl: getFilesPublicBaseUrl(requestOrigin), ttlSeconds: 120 });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok) return null;
    const data = Buffer.from(await response.arrayBuffer());
    return data.length <= MAX_IMAGE_BYTES ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

export const loadDocumentImages = async (
  html: string,
  userId: string,
  documentId: string,
  requestOrigin?: string,
): Promise<Map<string, LoadedImage>> => {
  const images = new Map<string, LoadedImage>();
  for (const fileId of extractImageFileIds(html)) {
    const file = await getDocumentFile(fileId, userId);
    if (!file || file.kind !== 'image' || file.status !== 'ready' || !file.storage_key) continue;
    if (file.document_id !== documentId) continue;
    let data: Buffer | null = null;
    if (canStoreFiles() && (await storedFileExists(file.storage_key))) {
      data = await readStoredFile(file.storage_key).catch(() => null);
    }
    if (!data) data = await downloadFromFilesHost(fileId, requestOrigin);
    if (data) images.set(fileId, { data, mime: file.mime });
  }
  return images;
};
