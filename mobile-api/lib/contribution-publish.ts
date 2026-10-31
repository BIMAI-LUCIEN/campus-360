import crypto from 'node:crypto';

// Publication of an analysed upload into the catalogue (Module 27), with the
// 10-coin reward of a student contribution, in one transaction on one client.
// The unique keys decide: documents.file_sha256 (no duplicate in the catalogue)
// and contribution_rewards.upload_id (one reward per upload).

export const CONTRIBUTION_REWARD_COINS = 50; // = CONTRIBUTION_REWARD in pricing.ts (test)

export class PublishError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PublishError';
    this.status = status;
  }
}

type Query = (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, any>[] }>;
export type PublishClient = { query: Query };

export type PublishResult = {
  documentId: string;
  credited: boolean;
  alreadyPublished: boolean;
  contributorId: string | null;
  title: string;
};

const str = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;

export const publishUpload = async (
  client: PublishClient,
  options: { uploadId: string; adminAppUserId: string; force?: boolean },
): Promise<PublishResult> => {
  await client.query('begin');
  try {
    const { rows } = await client.query('select * from public.pdf_uploads where id = $1 for update', [options.uploadId]);
    const upload = rows[0];
    if (!upload) throw new PublishError('Envoi introuvable.', 404);
    const sheet = (upload.ai_sheet ?? {}) as Record<string, unknown>;
    const title = str(sheet.title, 200) || upload.original_name;

    if (upload.status === 'published') {
      await client.query('commit');
      return { documentId: upload.document_id, credited: false, alreadyPublished: true, contributorId: null, title };
    }
    if (!['ready', 'pending_review', 'probable_duplicate'].includes(upload.status)) {
      throw new PublishError('Cet envoi ne peut pas être publié.', 409);
    }
    const needsConfirmation = upload.status === 'probable_duplicate' || upload.copyright_flag || upload.personal_data_flag;
    if (needsConfirmation && !options.force) throw new PublishError('Confirmation explicite requise.', 409);
    if (!upload.storage_url) throw new PublishError("Le fichier de cet envoi n'est pas stocké.", 409);

    const documentId = `pdf_${crypto.randomBytes(9).toString('hex')}`;
    const student = upload.source === 'student';
    const keywords = Array.isArray(sheet.keywords) ? sheet.keywords.filter((k) => typeof k === 'string').slice(0, 8) : [];
    const kind = str(sheet.kind, 20) || 'autre';
    await client.query('savepoint doc');
    try {
      await client.query(
        `insert into public.documents
           (id, title, description, university, faculty, subject, level, academic_year, price_coins, page_count,
            file_path, preview_path, file_size, status, ai_summary, ai_tags, kind, always_free,
            file_sha256, text_fingerprint, minhash, source, contributor_id, updated_at)
         values ($1,$2,$3,$4,'',$5,$6,$7,0,$8,$9,$9,$10,'published',$11,$12::jsonb,$13,$14,$15,$16,$17,$18,$19,now())`,
        [
          documentId,
          title,
          str(sheet.summary, 800) || title,
          str(sheet.school, 160),
          str(sheet.subject, 120),
          str(sheet.level, 80),
          str(sheet.year, 9),
          Math.max(1, Number(upload.page_count) || 1),
          upload.storage_url,
          formatSize(Number(upload.file_size) || 0),
          str(sheet.summary, 800),
          JSON.stringify(keywords),
          kind,
          student, // D27.6 : un PDF partagé par un étudiant reste gratuit.
          upload.file_sha256,
          upload.text_fingerprint,
          upload.minhash,
          upload.source,
          student ? upload.uploader_id : null,
        ],
      );
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error;
      await client.query('rollback to savepoint doc');
      await client.query(
        `update public.pdf_uploads set status = 'duplicate', reject_reason = 'Ce PDF existe déjà dans le catalogue.',
                updated_at = now() where id = $1`,
        [options.uploadId],
      );
      await client.query('commit');
      throw new PublishError('Ce PDF existe déjà dans le catalogue.', 409);
    }

    let credited = false;
    if (student) {
      const reward = await client.query(
        `insert into public.contribution_rewards (upload_id, user_id, amount_coins) values ($1, $2, $3)
         on conflict (upload_id) do nothing returning upload_id`,
        [options.uploadId, upload.uploader_id, CONTRIBUTION_REWARD_COINS],
      );
      if (reward.rows.length > 0) {
        await client.query(
          `insert into public.app_wallets (user_id, balance_coins) values ($1, $2)
           on conflict (user_id) do update set balance_coins = public.app_wallets.balance_coins + excluded.balance_coins, updated_at = now()`,
          [upload.uploader_id, CONTRIBUTION_REWARD_COINS],
        );
        await client.query(
          `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status, note)
           values ($1, 'contribution_reward', $2, $3, 'success', $4)`,
          [upload.uploader_id, CONTRIBUTION_REWARD_COINS, `contribution:${options.uploadId}`, title.slice(0, 500)],
        );
        credited = true;
      }
    }

    await client.query(
      `update public.pdf_uploads set status = 'published', document_id = $2,
              reviewed_by = $3, reviewed_at = now(), updated_at = now() where id = $1`,
      [options.uploadId, documentId, options.adminAppUserId],
    );
    await client.query('commit');
    return { documentId, credited, alreadyPublished: false, contributorId: student ? upload.uploader_id : null, title };
  } catch (error) {
    if (!(error instanceof PublishError && error.status === 409 && /existe déjà/.test(error.message))) {
      await client.query('rollback').catch(() => undefined);
    }
    throw error;
  }
};

export const rejectUpload = async (client: PublishClient, options: { uploadId: string; adminAppUserId: string; reason: string }) => {
  const reason = options.reason.trim();
  if (reason.length < 3 || reason.length > 300) throw new PublishError('Indiquez une raison (3 à 300 caractères).', 400);
  const { rows } = await client.query(
    `update public.pdf_uploads set status = 'rejected', reject_reason = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now()
      where id = $1 and status in ('analyzing', 'ready', 'pending_review', 'probable_duplicate') returning id`,
    [options.uploadId, reason, options.adminAppUserId],
  );
  if (!rows.length) throw new PublishError('Cet envoi ne peut pas être refusé.', 409);
};
