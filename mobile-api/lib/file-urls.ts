import type { NextRequest } from 'next/server';

import { getDocumentFile, isUuid } from './document-files-db';
import { getFilesPublicBaseUrl, signFileUrl } from './file-signing';

// Signs URLs for the caller's own stored files. Rows from other users, rows
// still being processed and sources without a stored file are skipped.
export const signOwnedFileUrls = async (
  request: NextRequest,
  userId: string,
  fileIds: string[],
): Promise<Record<string, { url: string; expiresAt: number }>> => {
  const baseUrl = getFilesPublicBaseUrl(request.nextUrl.origin);
  const unique = Array.from(new Set(fileIds.filter(isUuid).map((id) => id.toLowerCase())));
  const result: Record<string, { url: string; expiresAt: number }> = {};
  for (const fileId of unique) {
    const file = await getDocumentFile(fileId, userId);
    if (!file || file.status !== 'ready' || !file.storage_key) continue;
    result[fileId] = signFileUrl(fileId, { baseUrl });
  }
  return result;
};
