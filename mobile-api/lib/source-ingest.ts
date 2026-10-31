import { chunkPages } from './chunking';
import { databasePool } from './database';
import {
  createDocumentFile,
  replaceChunks,
  setFileFailed,
  setFileReady,
  type DocumentFileRow,
  type SourceRole,
} from './document-files-db';
import { htmlToText } from './html-text';
import { safeFetch, SafeFetchError } from './safe-fetch';
import { decodeText, ExtractionError, extractPlainText, extractSource, type ExtractedSource } from './source-extraction';

// Turns a source (uploaded file, web page or pasted text) into searchable
// chunks and moves its row to `ready`, or to `failed` with a readable reason.

const MAX_TEXT_SOURCE_CHARS = 200_000;

const readableError = (error: unknown): string => {
  if (error instanceof ExtractionError || error instanceof SafeFetchError) return error.message;
  console.error('[source-ingest] unexpected error', error);
  return 'Le traitement de cette source a échoué. Réessayez.';
};

const indexExtracted = async (file: DocumentFileRow, extracted: ExtractedSource): Promise<DocumentFileRow> => {
  const chunks = chunkPages(extracted.pages);
  if (chunks.length === 0) throw new ExtractionError('Cette source ne contient aucun texte exploitable.');
  await replaceChunks(file, chunks);
  return (await setFileReady(file.id, file.user_id, extracted.pageCount)) ?? file;
};

// Indexes an already-stored upload. Never throws: failures are recorded on the row.
export const ingestUploadedSource = async (file: DocumentFileRow, data: Buffer): Promise<DocumentFileRow> => {
  try {
    return await indexExtracted(file, await extractSource(data, file.mime));
  } catch (error) {
    return (await setFileFailed(file.id, file.user_id, readableError(error))) ?? file;
  }
};

export const ingestTextSource = async (input: {
  documentId: string;
  userId: string;
  title: string;
  text: string;
  sourceRole?: SourceRole;
}): Promise<DocumentFileRow> => {
  const text = input.text.slice(0, MAX_TEXT_SOURCE_CHARS);
  const file = await createDocumentFile({
    documentId: input.documentId,
    userId: input.userId,
    kind: 'source',
    origin: 'text',
    originalName: input.title,
    title: input.title,
    mime: 'text/plain',
    bytes: Buffer.byteLength(text),
    sourceRole: input.sourceRole,
  });
  try {
    return await indexExtracted(file, extractPlainText(text));
  } catch (error) {
    return (await setFileFailed(file.id, file.user_id, readableError(error))) ?? file;
  }
};

export const ingestUrlSource = async (input: {
  documentId: string;
  userId: string;
  url: string;
  title?: string;
  sourceRole?: SourceRole;
}): Promise<DocumentFileRow> => {
  const fallbackTitle = (() => {
    try {
      return new URL(input.url).hostname;
    } catch {
      return 'Page web';
    }
  })();
  const file = await createDocumentFile({
    documentId: input.documentId,
    userId: input.userId,
    kind: 'source',
    origin: 'url',
    originalName: input.url.slice(0, 255),
    title: input.title?.trim() || fallbackTitle,
    mime: 'text/html',
    bytes: 0,
    sourceUrl: input.url,
    sourceRole: input.sourceRole,
  });
  try {
    const fetched = await safeFetch(input.url);
    let extracted: ExtractedSource;
    let pageTitle = '';
    if (fetched.contentType === 'application/pdf') {
      extracted = await extractSource(fetched.body, 'application/pdf');
    } else if (fetched.contentType === 'text/plain') {
      extracted = await extractSource(fetched.body, 'text/plain', fetched.charset);
    } else {
      const html = decodeText(fetched.body, fetched.charset);
      const page = htmlToText(html);
      pageTitle = page.title;
      extracted = extractPlainText(page.text);
    }
    await databasePool.query(
      `update public.app_document_files
       set mime = $3, bytes = $4, source_url = $5, title = case when $6 <> '' and $7 then $6 else title end
       where id = $1 and user_id = $2`,
      [file.id, file.user_id, fetched.contentType, fetched.body.length, fetched.finalUrl, pageTitle.slice(0, 255), !input.title?.trim()],
    );
    return await indexExtracted(file, extracted);
  } catch (error) {
    return (await setFileFailed(file.id, file.user_id, readableError(error))) ?? file;
  }
};
