import { isCloudinaryConfigured, uploadToCloudinary } from './cloudinary';
import { databasePool } from './database';
import { callLlm } from './llm';
import { MobileApiError } from './mobile-error';
import type { DedupExisting } from './pdf-dedup';
import { analyzePdf, type DuplicateQuery, type IntakeResult } from './pdf-intake';
import { extractSource } from './source-extraction';

// Database side of the batch PDF uploads (Module 27): duplicate lookups,
// counters, storage and the pdf_uploads rows. Used by the student route
// (/api/mobile/contributions) and the admin route (/api/admin/pdf-intake).

const ACTIVE = ['analyzing', 'ready', 'pending_review', 'probable_duplicate', 'published'];
const MINHASH_SCAN = 500;
const INTAKE_MODELS = ['openai/gpt-4o-mini', 'google/gemini-2.0-flash-001'];

type Row = Record<string, any>;

const toExisting = (row: Row, kind: 'document' | 'upload'): DedupExisting => ({
  ref: String(row.id),
  kind,
  sha256: row.file_sha256 ?? '',
  fingerprint: row.text_fingerprint ?? null,
  minhash: Array.isArray(row.minhash) ? row.minhash.map(Number) : null,
  meta: { school: row.school ?? null, year: row.year ?? null, subject: row.subject ?? null },
});

// Candidates for classifyDuplicate: same hash or same text, the recent rows
// carrying a MinHash, and for a sheet the rows with the same year.
export const findDuplicates = async (query: DuplicateQuery): Promise<DedupExisting[]> => {
  const docs = await databasePool.query(
    `select id, file_sha256, text_fingerprint, minhash, university as school, academic_year as year, subject
       from public.documents
      where status <> 'archived'
        and (file_sha256 = $1
             or ($2::text is not null and text_fingerprint = $2)
             or ($3 and id in (select id from public.documents where minhash is not null and status <> 'archived'
                               order by created_at desc limit ${MINHASH_SCAN}))
             or ($4::text is not null and academic_year = $4))`,
    [query.sha256, query.fingerprint ?? null, Boolean(query.minhash), query.meta?.year || null],
  );
  const uploads = await databasePool.query(
    `select id, file_sha256, text_fingerprint, minhash,
            ai_sheet->>'school' as school, ai_sheet->>'year' as year, ai_sheet->>'subject' as subject
       from public.pdf_uploads
      where status = any($5::text[])
        and document_id is null
        and (file_sha256 = $1
             or ($2::text is not null and text_fingerprint = $2)
             or ($3 and id in (select id from public.pdf_uploads where minhash is not null
                               order by created_at desc limit ${MINHASH_SCAN}))
             or ($4::text is not null and ai_sheet->>'year' = $4))`,
    [query.sha256, query.fingerprint ?? null, Boolean(query.minhash), query.meta?.year || null, ACTIVE],
  );
  return [...docs.rows.map((r) => toExisting(r, 'document')), ...uploads.rows.map((r) => toExisting(r, 'upload'))];
};

export const countUploads = async (uploaderId: string, batchId: string) => {
  const { rows } = await databasePool.query(
    `select count(*) filter (where batch_id = $2)::int as in_batch,
            count(*) filter (where created_at > now() - interval '1 day')::int as in_day
       from public.pdf_uploads where uploader_id = $1`,
    [uploaderId, batchId],
  );
  return { inBatch: rows[0]?.in_batch ?? 0, inLast24h: rows[0]?.in_day ?? 0 };
};

const batchSiblings = async (batchId: string): Promise<DedupExisting[]> => {
  const { rows } = await databasePool.query(
    `select id, file_sha256, text_fingerprint, minhash from public.pdf_uploads where batch_id = $1`,
    [batchId],
  );
  return rows.map((r) => toExisting(r, 'upload'));
};

export const intakeDeps = (reserveQuota: () => Promise<void>) => ({
  extract: (buffer: Buffer) => extractSource(buffer, 'application/pdf'),
  findDuplicates,
  reserveQuota,
  callLlm: (messages: { role: 'system' | 'user'; content: string }[]) =>
    callLlm(messages, { temperature: 0.1, maxTokens: 900, timeoutMs: 20_000, models: INTAKE_MODELS, title: 'Campus 360 PDF Intake' }),
});

const storePdf = async (buffer: Buffer, sha: string): Promise<string> => {
  if (!isCloudinaryConfigured()) throw new MobileApiError('Stockage des PDF indisponible.', 503);
  const result = await uploadToCloudinary(buffer, {
    folder: 'campus-360/contributions',
    publicId: `${Date.now()}-${sha.slice(0, 16)}`,
  });
  return result.secure_url;
};

export type PublicUpload = {
  id: string;
  batchId: string;
  status: string;
  originalName: string;
  sheet: Record<string, unknown>;
  duplicateOf: { id: string; title: string; kind: 'document' | 'upload' } | null;
  similarity: number | null;
  rejectReason: string | null;
  copyrightFlag: boolean;
  personalDataFlag: boolean;
  documentId: string | null;
  storageUrl?: string | null;
  source?: string;
  uploaderEmail?: string;
  createdAt: string;
};

const PUBLIC_COLUMNS = `u.id, u.batch_id, u.status, u.original_name, u.ai_sheet, u.similarity, u.reject_reason,
  u.copyright_flag, u.personal_data_flag, u.document_id, u.storage_url, u.source, u.created_at,
  u.duplicate_of_document, u.duplicate_of_upload,
  coalesce(d.title, du.ai_sheet->>'title', du.original_name) as duplicate_title,
  d.file_path as duplicate_url, au.email as uploader_email`;

const PUBLIC_JOINS = `left join public.documents d on d.id = u.duplicate_of_document
  left join public.pdf_uploads du on du.id = u.duplicate_of_upload
  left join public.app_users au on au.id = u.uploader_id`;

const toPublic = (row: Row, admin = false): PublicUpload => ({
  id: row.id,
  batchId: row.batch_id,
  status: row.status,
  originalName: row.original_name,
  sheet: row.ai_sheet ?? {},
  duplicateOf: row.duplicate_of_document || row.duplicate_of_upload
    ? {
        id: row.duplicate_of_document ?? row.duplicate_of_upload,
        title: row.duplicate_title ?? '',
        kind: row.duplicate_of_document ? 'document' : 'upload',
      }
    : null,
  similarity: row.similarity === null || row.similarity === undefined ? null : Number(row.similarity),
  rejectReason: row.reject_reason ?? null,
  copyrightFlag: Boolean(row.copyright_flag),
  personalDataFlag: Boolean(row.personal_data_flag),
  documentId: row.document_id ?? null,
  ...(admin ? { storageUrl: row.storage_url, source: row.source, uploaderEmail: row.uploader_email, duplicateUrl: row.duplicate_url } : {}),
  createdAt: new Date(row.created_at).toISOString(),
});

export const getUpload = async (id: string, admin = false): Promise<PublicUpload | null> => {
  const { rows } = await databasePool.query(`select ${PUBLIC_COLUMNS} from public.pdf_uploads u ${PUBLIC_JOINS} where u.id = $1`, [id]);
  return rows[0] ? toPublic(rows[0], admin) : null;
};

export const listUploadsForUser = async (uploaderId: string): Promise<PublicUpload[]> => {
  const { rows } = await databasePool.query(
    `select ${PUBLIC_COLUMNS} from public.pdf_uploads u ${PUBLIC_JOINS}
      where u.uploader_id = $1 order by u.created_at desc limit 50`,
    [uploaderId],
  );
  return rows.map((r) => toPublic(r));
};

export const listUploadsForAdmin = async (filters: { source?: string; status?: string; batchId?: string }) => {
  const { rows } = await databasePool.query(
    `select ${PUBLIC_COLUMNS} from public.pdf_uploads u ${PUBLIC_JOINS}
      where ($1::text is null or u.source = $1)
        and ($2::text is null or u.status = $2)
        and ($3::uuid is null or u.batch_id = $3)
      order by u.created_at desc limit 200`,
    [filters.source ?? null, filters.status ?? null, filters.batchId ?? null],
  );
  return rows.map((r) => toPublic(r, true));
};

export const isUploadOwner = async (id: string, userId: string) => {
  const { rows } = await databasePool.query('select 1 from public.pdf_uploads where id = $1 and uploader_id = $2', [id, userId]);
  return rows.length > 0;
};

export const updateUploadSheet = async (id: string, uploaderId: string | null, patch: Record<string, unknown>, statuses: readonly string[]) => {
  const { rows } = await databasePool.query(
    `update public.pdf_uploads set ai_sheet = ai_sheet || $3::jsonb, updated_at = now()
      where id = $1 and ($2::uuid is null or uploader_id = $2) and status = any($4::text[])
      returning id`,
    [id, uploaderId, JSON.stringify(patch), [...statuses]],
  );
  return rows.length > 0;
};

// Runs the analysis chain for one file and records the outcome. Duplicates and
// refusals are recorded too (so the uploader sees why), but nothing is stored.
export const recordIntake = async (options: {
  buffer: Buffer;
  declaredMime: string | null;
  originalName: string;
  batchId: string;
  uploaderId: string;
  source: 'admin' | 'student';
  rightsDeclared: boolean;
  reserveQuota: () => Promise<void>;
}): Promise<PublicUpload> => {
  const result: IntakeResult = await analyzePdf(
    { buffer: options.buffer, declaredMime: options.declaredMime, batchSiblings: await batchSiblings(options.batchId) },
    intakeDeps(options.reserveQuota),
  );
  let status: string = result.status;
  if (status === 'ready' && options.source === 'student') status = 'pending_review';
  // Rights or personal data flags always go to a human (cadrage §18).
  if (status === 'ready' && (result.copyrightFlag || result.personalDataFlag)) status = 'pending_review';

  const keepsFile = ['analyzing', 'ready', 'pending_review', 'probable_duplicate'].includes(status);
  const storageUrl = keepsFile ? await storePdf(options.buffer, result.sha256) : null;
  const dup = result.duplicateOf;
  const params = [
    options.batchId,
    options.uploaderId,
    options.source,
    status,
    options.originalName,
    options.buffer.length,
    storageUrl,
    result.sha256,
    result.fingerprint,
    result.minhash,
    result.pageCount,
    result.text || null,
    JSON.stringify(result.sheet ?? {}),
    dup?.kind === 'document' ? dup.ref : null,
    dup?.kind === 'upload' ? dup.ref : null,
    dup?.score ?? null,
    result.reason ?? null,
    options.rightsDeclared,
    result.copyrightFlag,
    result.personalDataFlag,
    result.aiFailed ? 1 : 0,
  ];
  const insert = `insert into public.pdf_uploads
      (batch_id, uploader_id, source, status, original_name, file_size, storage_url, file_sha256, text_fingerprint,
       minhash, page_count, extracted_text, ai_sheet, duplicate_of_document, duplicate_of_upload, similarity,
       reject_reason, rights_declared, copyright_flag, personal_data_flag, ai_attempts)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,$18,$19,$20,$21)
     returning id`;
  try {
    const { rows } = await databasePool.query(insert, params);
    return (await getUpload(rows[0].id))!;
  } catch (error) {
    // Two uploads of the same file at the same time: the unique index decides.
    if ((error as { code?: string }).code !== '23505') throw error;
    const { rows: active } = await databasePool.query(
      `select id from public.pdf_uploads where file_sha256 = $1 and status = any($2::text[]) limit 1`,
      [result.sha256, ACTIVE],
    );
    params[3] = 'duplicate';
    params[6] = null;
    params[14] = active[0]?.id ?? null;
    const { rows } = await databasePool.query(insert, params);
    return (await getUpload(rows[0].id))!;
  }
};

// Second chance for an upload left in `analyzing` (model down): the stored file
// is analysed again, the upload itself excluded from the duplicate candidates.
export const MAX_AI_ATTEMPTS = 3;

export const reanalyzeUpload = async (id: string): Promise<PublicUpload> => {
  const { rows } = await databasePool.query(
    `select id, batch_id, source, status, storage_url, ai_attempts from public.pdf_uploads where id = $1`,
    [id],
  );
  const upload = rows[0];
  if (!upload) throw new MobileApiError('Envoi introuvable.', 404);
  if (upload.status !== 'analyzing') throw new MobileApiError('Seul un envoi en analyse peut être relancé.', 409);
  if (upload.ai_attempts >= MAX_AI_ATTEMPTS) throw new MobileApiError('Nombre maximal de tentatives atteint.', 409);
  if (!upload.storage_url) throw new MobileApiError("Le fichier de cet envoi n'est pas stocké.", 409);

  const file = await fetch(upload.storage_url, { signal: AbortSignal.timeout(20_000) });
  if (!file.ok) throw new MobileApiError('Fichier stocké inaccessible.', 502);
  const buffer = Buffer.from(await file.arrayBuffer());
  const deps = intakeDeps(async () => undefined);
  const siblings = (await batchSiblings(upload.batch_id)).filter((s) => s.ref !== id);
  const result = await analyzePdf(
    { buffer, declaredMime: 'application/pdf', batchSiblings: siblings },
    { ...deps, findDuplicates: async (q) => (await findDuplicates(q)).filter((s) => s.ref !== id) },
  );
  let status: string = result.status;
  if (status === 'ready' && (upload.source === 'student' || result.copyrightFlag || result.personalDataFlag)) status = 'pending_review';
  const dup = result.duplicateOf;
  await databasePool.query(
    `update public.pdf_uploads
        set status = $2, ai_sheet = $3::jsonb, text_fingerprint = $4, minhash = $5, page_count = $6,
            duplicate_of_document = $7, duplicate_of_upload = $8, similarity = $9, reject_reason = $10,
            copyright_flag = $11, personal_data_flag = $12, ai_attempts = ai_attempts + 1, updated_at = now()
      where id = $1`,
    [
      id,
      status,
      JSON.stringify(result.sheet ?? {}),
      result.fingerprint,
      result.minhash,
      result.pageCount,
      dup?.kind === 'document' ? dup.ref : null,
      dup?.kind === 'upload' ? dup.ref : null,
      dup?.score ?? null,
      result.reason ?? null,
      result.copyrightFlag,
      result.personalDataFlag,
    ],
  );
  return (await getUpload(id, true))!;
};
