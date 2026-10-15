import { databasePool } from './database';
import type { TextChunk } from './chunking';

// Files attached to a document (images and sources) and the text chunks
// extracted from sources. Every query is scoped to the owner's user_id.

export type FileKind = 'image' | 'source';
export type FileOrigin = 'upload' | 'url' | 'text';
export type FileStatus = 'pending' | 'ready' | 'failed';

export type DocumentFileRow = {
  id: string;
  document_id: string;
  user_id: string;
  kind: FileKind;
  origin: FileOrigin;
  storage_key: string | null;
  original_name: string;
  title: string;
  mime: string;
  bytes: number;
  sha256: string | null;
  source_url: string | null;
  status: FileStatus;
  error: string | null;
  page_count: number;
  created_at: string;
  updated_at: string;
};

// What clients see: the storage key and owner id stay server-side.
export type PublicDocumentFile = Omit<DocumentFileRow, 'storage_key' | 'user_id' | 'sha256'>;

export const toPublicFile = (row: DocumentFileRow): PublicDocumentFile => {
  const { storage_key: _key, user_id: _user, sha256: _sha, ...rest } = row;
  return rest;
};

const mapRow = (row: Record<string, unknown>): DocumentFileRow => ({
  ...(row as DocumentFileRow),
  bytes: Number(row.bytes || 0),
  page_count: Number(row.page_count || 0),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value);

export async function createDocumentFile(input: {
  documentId: string;
  userId: string;
  kind: FileKind;
  origin: FileOrigin;
  storageKey?: string | null;
  originalName: string;
  title: string;
  mime: string;
  bytes: number;
  sha256?: string | null;
  sourceUrl?: string | null;
}): Promise<DocumentFileRow> {
  const res = await databasePool.query(
    `insert into public.app_document_files
       (document_id, user_id, kind, origin, storage_key, original_name, title, mime, bytes, sha256, source_url, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
     returning *`,
    [
      input.documentId,
      input.userId,
      input.kind,
      input.origin,
      input.storageKey ?? null,
      input.originalName.slice(0, 255),
      input.title.slice(0, 255),
      input.mime,
      input.bytes,
      input.sha256 ?? null,
      input.sourceUrl ?? null,
    ],
  );
  return mapRow(res.rows[0]);
}

export async function setFileReady(fileId: string, userId: string, pageCount = 0): Promise<DocumentFileRow | null> {
  const res = await databasePool.query(
    `update public.app_document_files
     set status = 'ready', error = null, page_count = $3, updated_at = now()
     where id = $1 and user_id = $2
     returning *`,
    [fileId, userId, pageCount],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function setFileFailed(fileId: string, userId: string, error: string): Promise<DocumentFileRow | null> {
  const res = await databasePool.query(
    `update public.app_document_files
     set status = 'failed', error = $3, updated_at = now()
     where id = $1 and user_id = $2
     returning *`,
    [fileId, userId, error.slice(0, 500)],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function getDocumentFile(fileId: string, userId: string): Promise<DocumentFileRow | null> {
  if (!isUuid(fileId) || !isUuid(userId)) return null;
  const res = await databasePool.query(
    'select * from public.app_document_files where id = $1 and user_id = $2 limit 1',
    [fileId, userId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

// Only for the signed-URL file server: the HMAC signature already proves access.
export async function getDocumentFileForSignedAccess(fileId: string): Promise<DocumentFileRow | null> {
  if (!isUuid(fileId)) return null;
  const res = await databasePool.query(
    `select * from public.app_document_files where id = $1 and status = 'ready' limit 1`,
    [fileId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function listDocumentFiles(documentId: string, userId: string, kind?: FileKind): Promise<DocumentFileRow[]> {
  const res = await databasePool.query(
    `select * from public.app_document_files
     where document_id = $1 and user_id = $2 and ($3::text is null or kind = $3)
     order by created_at desc`,
    [documentId, userId, kind ?? null],
  );
  return res.rows.map(mapRow);
}

export async function getUserStorageBytes(userId: string): Promise<number> {
  const res = await databasePool.query(
    `select coalesce(sum(bytes), 0)::bigint as total from public.app_document_files
     where user_id = $1 and storage_key is not null`,
    [userId],
  );
  return Number(res.rows[0]?.total || 0);
}

// Replaces the chunks of a file in one transaction.
export async function replaceChunks(file: DocumentFileRow, chunks: TextChunk[]): Promise<void> {
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    await client.query('delete from public.app_document_chunks where file_id = $1 and user_id = $2', [file.id, file.user_id]);
    if (chunks.length > 0) {
      await client.query(
        `insert into public.app_document_chunks (file_id, document_id, user_id, page, position, content)
         select $1, $2, $3, c.page, c.position, c.content
         from unnest($4::int[], $5::int[], $6::text[]) as c(page, position, content)`,
        [
          file.id,
          file.document_id,
          file.user_id,
          chunks.map((c) => c.page),
          chunks.map((c) => c.position),
          chunks.map((c) => c.content),
        ],
      );
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

// Deletes the row (chunks cascade) and returns the storage key so the caller removes the file.
export async function deleteDocumentFile(
  fileId: string,
  documentId: string,
  userId: string,
  kind?: FileKind,
): Promise<{ deleted: boolean; storageKey: string | null }> {
  if (!isUuid(fileId)) return { deleted: false, storageKey: null };
  const res = await databasePool.query(
    `delete from public.app_document_files
     where id = $1 and document_id = $2 and user_id = $3 and ($4::text is null or kind = $4)
     returning storage_key`,
    [fileId, documentId, userId, kind ?? null],
  );
  return { deleted: res.rows.length > 0, storageKey: res.rows[0]?.storage_key ?? null };
}

export async function listStorageKeysForDocument(documentId: string, userId: string): Promise<string[]> {
  const res = await databasePool.query(
    `select storage_key from public.app_document_files
     where document_id = $1 and user_id = $2 and storage_key is not null`,
    [documentId, userId],
  );
  return res.rows.map((r: { storage_key: string }) => r.storage_key);
}

export async function listAllStorageKeys(): Promise<Set<string>> {
  const res = await databasePool.query(
    'select storage_key from public.app_document_files where storage_key is not null',
  );
  return new Set(res.rows.map((r: { storage_key: string }) => r.storage_key));
}

// ── Lexical retrieval ──────────────────────────────────────────────────────

export type RetrievedChunk = {
  chunk_id: string;
  file_id: string;
  page: number;
  position: number;
  content: string;
  rank: number;
  title: string;
  mime: string;
  source_url: string | null;
};

// Letters and digits only, so the string is always valid to_tsquery syntax.
export const buildOrQuery = (question: string): string => {
  const words = (question.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []).slice(0, 60);
  return Array.from(new Set(words)).slice(0, 30).join(' | ');
};

export async function searchChunks(input: {
  documentId: string;
  userId: string;
  fileIds: string[];
  question: string;
  limit?: number;
}): Promise<RetrievedChunk[]> {
  const fileIds = input.fileIds.filter(isUuid);
  if (fileIds.length === 0) return [];
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 20);
  const query = buildOrQuery(input.question);

  if (query) {
    const res = await databasePool.query(
      `select c.id as chunk_id, c.file_id, c.page, c.position, c.content,
              ts_rank(c.tsv, q.query) as rank, f.title, f.mime, f.source_url
       from public.app_document_chunks c
       join public.app_document_files f on f.id = c.file_id and f.user_id = c.user_id
       cross join (select to_tsquery('french', $4) as query) q
       where c.document_id = $1 and c.user_id = $2 and c.file_id = any($3::uuid[])
         and f.status = 'ready' and c.tsv @@ q.query
       order by rank desc, c.position asc
       limit $5`,
      [input.documentId, input.userId, fileIds, query, limit],
    );
    if (res.rows.length > 0) return res.rows.map((r: RetrievedChunk) => ({ ...r, rank: Number(r.rank) }));
  }

  // No lexical match (e.g. "summarise my sources"): the opening chunks of each source.
  const res = await databasePool.query(
    `select chunk_id, file_id, page, position, content, 0::float as rank, title, mime, source_url from (
       select c.id as chunk_id, c.file_id, c.page, c.position, c.content, f.title, f.mime, f.source_url,
              row_number() over (partition by c.file_id order by c.position) as rn
       from public.app_document_chunks c
       join public.app_document_files f on f.id = c.file_id and f.user_id = c.user_id
       where c.document_id = $1 and c.user_id = $2 and c.file_id = any($3::uuid[]) and f.status = 'ready'
     ) ranked
     where rn <= 2
     order by rn, file_id
     limit $4`,
    [input.documentId, input.userId, fileIds, limit],
  );
  return res.rows.map((r: RetrievedChunk) => ({ ...r, rank: 0 }));
}
