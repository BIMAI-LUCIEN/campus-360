import { databasePool } from './database';
import { isFreeLaunch } from './free-launch';
import { isPaidOffer, stageApplyPrice } from './stage-pricing';

export type StageStatus =
  | 'PENDING'
  | 'SENT_PENDING'
  | 'DELIVERED'
  | 'FAILED'
  | 'REVIEWING'
  | 'INTERVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

type StageStudentInput = {
  id: string;
  betterAuthUserId: string;
  email: string;
  name: string;
  phone?: string;
  whatsappPhone?: string;
  university?: string;
  faculty?: string;
  level?: string;
};

export const ensureStageStudent = async (user: StageStudentInput): Promise<string> => {
  try {
    // phone_whatsapp is unique: a number already held by another student is not
    // copied (kept as is on update, null on insert) instead of failing the application.
    const result = await databasePool.query<{ id: string }>(
      `with taken as (
         select exists (
           select 1 from public.stage_students o
            where o.phone_whatsapp = $4
              and o.auth_id is distinct from $1
              and lower(coalesce(o.email, '')) <> lower($5)
         ) as phone_taken
       ), updated as (
         update public.stage_students set
           auth_id = $1, app_user_id = $2, full_name = $3,
           phone_whatsapp = case when (select phone_taken from taken) then phone_whatsapp else $4 end,
           email = $5, education_level = $6, major = $7
         where auth_id = $1 or lower(email) = lower($5)
         returning id
       ), inserted as (
         insert into public.stage_students (
           auth_id, app_user_id, full_name, phone_whatsapp, email, education_level, major
         ) select $1, $2, $3, case when (select phone_taken from taken) then null else $4 end, $5, $6, $7
           where not exists (select 1 from updated)
         returning id
       )
       select id from updated union all select id from inserted limit 1`,
      [
        user.betterAuthUserId,
        user.id,
        user.name,
        user.whatsappPhone ?? user.phone ?? null,
        user.email,
        user.level ?? 'Non renseigné',
        user.faculty ?? user.university ?? 'Non renseigné',
      ],
    );
    if (!result.rows[0]) throw new Error('Stage student could not be created.');
    return result.rows[0].id;
  } catch (err) {
    console.warn('[stages-db] ensureStageStudent failed:', err);
    throw err;
  }
};

type StageJobRow = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  requirements: string[] | null;
  apply_method: 'WHATSAPP' | 'EMAIL' | 'LINK' | 'PHYSICAL';
  source_url: string | null;
  is_sponsored: boolean;
  source: 'INTERNAL' | 'SCRAPED';
  kind: 'stage' | 'emploi';
  location: string | null;
  duration: string | null;
  stipend: string | null;
  flyer_url: string | null;
  video_url: string | null;
  created_at: string;
  expires_at: string;
  company_name: string;
  company_industry: string;
  company_address: string;
  company_contact_email: string;
  company_contact_whatsapp: string | null;
  company_kyb_score: number;
  company_status: 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED';
  company_is_premium: boolean;
  company_logo_url: string | null;
};

const mapJob = (row: StageJobRow) => ({
  id: row.id,
  companyId: row.company_id,
  title: row.title,
  description: row.description,
  requirements: row.requirements ?? [],
  applyMethod: row.apply_method,
  isSponsored: row.is_sponsored,
  source: row.source,
  sourceUrl: row.source_url ?? undefined,
  kind: row.kind,
  location: row.location ?? undefined,
  duration: row.duration ?? undefined,
  stipend: row.stipend ?? undefined,
  isPaid: isPaidOffer(row),
  applyPriceCoins: stageApplyPrice(row, isFreeLaunch()),
  flyerUrl: row.flyer_url ?? undefined,
  videoUrl: row.video_url ?? undefined,
  createdAt: new Date(row.created_at).toISOString(),
  expiresAt: new Date(row.expires_at).toISOString(),
  company: {
    id: row.company_id,
    name: row.company_name,
    industry: row.company_industry,
    address: row.company_address,
    contactEmail: row.company_contact_email,
    contactWhatsapp: row.company_contact_whatsapp ?? undefined,
    kybScore: row.company_kyb_score,
    status: row.company_status,
    isPremium: row.company_is_premium,
    logoUrl: row.company_logo_url ?? undefined,
  },
});

const JOB_SELECT = `
  select j.*, c.name as company_name, c.industry as company_industry,
         c.address as company_address, c.contact_email as company_contact_email,
         c.contact_whatsapp as company_contact_whatsapp, c.kyb_score as company_kyb_score,
         c.status as company_status, c.is_premium as company_is_premium,
         c.logo_url as company_logo_url
    from public.stage_jobs j
    join public.stage_companies c on c.id = j.company_id
`;

export const listStageJobs = async (params: { query?: string; sector?: string }) => {
  const conditions = [`j.expires_at > now()`, `c.status != 'SUSPENDED'`, `j.status = 'published'`];
  const values: string[] = [];
  if (params.sector && params.sector !== 'Tous') {
    values.push(`%${params.sector}%`);
    conditions.push(`(c.industry ilike $${values.length} or j.title ilike $${values.length})`);
  }
  if (params.query?.trim()) {
    values.push(`%${params.query.trim()}%`);
    conditions.push(`(j.title ilike $${values.length} or j.description ilike $${values.length} or c.name ilike $${values.length} or array_to_string(j.requirements, ' ') ilike $${values.length})`);
  }
  const result = await databasePool.query<StageJobRow>(
    `${JOB_SELECT} where ${conditions.join(' and ')} order by j.is_sponsored desc, j.created_at desc limit 100`,
    values,
  );
  return result.rows.map(mapJob);
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getStageJob = async (jobId: string) => {
  if (!UUID_PATTERN.test(jobId)) return null;
  const result = await databasePool.query<StageJobRow>(
    `${JOB_SELECT} where j.id = $1 and j.status = 'published' and j.expires_at > now() and c.status != 'SUSPENDED' limit 1`,
    [jobId],
  );
  return result.rows[0] ? mapJob(result.rows[0]) : null;
};

export const listStudentApplications = async (studentId: string) => {
  try {
    const result = await databasePool.query<StageJobRow & Record<string, unknown>>(
      `select a.id as application_id, a.student_id, a.job_id, a.status as application_status,
              a.applied_at, a.cv_file_url, a.letter_file_url, a.generated_cv_text,
              a.generated_letter_text, a.last_reminded_at, a.notes,
              j.*, c.name as company_name, c.industry as company_industry,
              c.address as company_address, c.contact_email as company_contact_email,
              c.contact_whatsapp as company_contact_whatsapp, c.kyb_score as company_kyb_score,
              c.status as company_status, c.is_premium as company_is_premium,
              c.logo_url as company_logo_url
         from public.stage_applications a
         join public.stage_jobs j on j.id = a.job_id
         join public.stage_companies c on c.id = j.company_id
        where a.student_id = $1
        order by a.applied_at desc`,
      [studentId],
    );
    return result.rows.map((row) => ({
      id: String(row.application_id),
      studentId: String(row.student_id),
      jobId: String(row.job_id),
      status: String(row.application_status) as StageStatus,
      appliedAt: new Date(String(row.applied_at)).toISOString(),
      cvFileUrl: row.cv_file_url ? String(row.cv_file_url) : undefined,
      letterFileUrl: row.letter_file_url ? String(row.letter_file_url) : undefined,
      generatedCvText: row.generated_cv_text ? String(row.generated_cv_text) : undefined,
      generatedLetterText: row.generated_letter_text ? String(row.generated_letter_text) : undefined,
      lastRemindedAt: row.last_reminded_at ? new Date(String(row.last_reminded_at)).toISOString() : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      job: mapJob(row),
    }));
  } catch (err) {
    console.warn('[stages-db] listStudentApplications failed:', err);
    throw err;
  }
};

export const createStageApplication = async (input: {
  studentId: string;
  jobId: string;
  cvText?: string;
  letterText?: string;
  cvFileUrl?: string;
  letterFileUrl?: string;
}) => {
  try {
    const result = await databasePool.query(
      `insert into public.stage_applications (
         student_id, job_id, generated_cv_text, generated_letter_text, cv_file_url, letter_file_url
       ) values ($1, $2, $3, $4, $5, $6)
       on conflict (student_id, job_id) do update set
         generated_cv_text = excluded.generated_cv_text,
         generated_letter_text = excluded.generated_letter_text,
         cv_file_url = coalesce(excluded.cv_file_url, public.stage_applications.cv_file_url),
         letter_file_url = coalesce(excluded.letter_file_url, public.stage_applications.letter_file_url),
         applied_at = now()
       returning id, student_id, job_id, status, applied_at`,
      [input.studentId, input.jobId, input.cvText ?? '', input.letterText ?? '', input.cvFileUrl ?? null, input.letterFileUrl ?? null],
    );
    return result.rows[0];
  } catch (err) {
    console.warn('[stages-db] createStageApplication failed:', err);
    throw err;
  }
};

export const updateStudentApplicationStatus = async (
  studentId: string,
  applicationId: string,
  status: StageStatus,
) => {
  const result = await databasePool.query(
    `update public.stage_applications set status = $1
      where id = $2 and student_id = $3
      returning id, student_id, job_id, status, applied_at`,
    [status, applicationId, studentId],
  );
  return result.rows[0] ?? null;
};

export interface IngestJobInput {
  title: string;
  description?: string;
  companyName: string;
  industry?: string;
  location?: string;
  duration?: string;
  contractType?: string;
  stipend?: string;
  requirements?: string[];
  flyerUrl?: string;
  videoUrl?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  source?: 'INTERNAL' | 'SCRAPED';
  expiresInDays?: number;
}

export const ingestStageJob = async (input: IngestJobInput): Promise<{
  jobId: string;
  companyId: string;
  isNew: boolean;
}> => {
  const client = await databasePool.connect();
  try {
    await client.query('begin');

    const compName = input.companyName.trim();
    const compIndustry = input.industry?.trim() || 'Technologies & Services';
    const compLocation = input.location?.trim() || 'Yaoundé';
    const compEmail = input.contactEmail?.trim() || `recrutement@${compName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'stage'}.org`;
    const compWhatsapp = input.contactWhatsapp?.trim() || null;

    // 1. Ensure company exists or insert it
    const compRes = await client.query<{ id: string }>(
      `select id from public.stage_companies where lower(trim(name)) = lower($1) limit 1`,
      [compName],
    );

    let companyId: string;
    if (compRes.rows.length > 0) {
      companyId = compRes.rows[0].id;
      // Update contact details if provided
      if (compWhatsapp || compEmail) {
        await client.query(
          `update public.stage_companies set
             contact_whatsapp = coalesce($1, contact_whatsapp),
             contact_email = coalesce($2, contact_email)
           where id = $3`,
          [compWhatsapp, compEmail, companyId],
        );
      }
    } else {
      const insertComp = await client.query<{ id: string }>(
        `insert into public.stage_companies (
           name, industry, address, contact_email, contact_whatsapp, kyb_score, status
         ) values ($1, $2, $3, $4, $5, 85, 'VERIFIED')
         returning id`,
        [compName, compIndustry, compLocation, compEmail, compWhatsapp],
      );
      companyId = insertComp.rows[0].id;
    }

    // 2. Check for deduplication (same company + same title + same location)
    const normalizedTitle = input.title.trim();
    const existingJobRes = await client.query<{ id: string }>(
      `select id from public.stage_jobs
        where company_id = $1
          and lower(trim(title)) = lower($2)
          and (location is null or lower(trim(location)) = lower($3))
        limit 1`,
      [companyId, normalizedTitle, compLocation],
    );

    const applyMethod = compWhatsapp ? 'WHATSAPP' : 'EMAIL';
    // The description is stored as published by the source: never summarized nor padded.
    const safeDesc = (input.description ?? '').trim();
    const reqs = input.requirements ?? [];
    const days = input.expiresInDays && input.expiresInDays > 0 ? input.expiresInDays : 30;

    let jobId: string;
    let isNew = false;

    if (existingJobRes.rows.length > 0) {
      // Update existing offer without duplicate
      jobId = existingJobRes.rows[0].id;
      await client.query(
        `update public.stage_jobs set
           requirements = $1,
           flyer_url = coalesce($2, flyer_url),
           video_url = coalesce($3, video_url),
           duration = coalesce($4, duration),
           stipend = coalesce($5, stipend),
           expires_at = now() + ($6 || ' days')::interval
         where id = $7`,
        [reqs, input.flyerUrl || null, input.videoUrl || null, input.duration || null, input.stipend || null, days, jobId],
      );
    } else {
      isNew = true;
      const insertJob = await client.query<{ id: string }>(
        `insert into public.stage_jobs (
           company_id, title, description, requirements, apply_method,
           source, location, duration, stipend, flyer_url, video_url, expires_at
         ) values (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10, $11, now() + ($12 || ' days')::interval
         ) returning id`,
        [
          companyId,
          normalizedTitle,
          safeDesc,
          reqs,
          applyMethod,
          input.source || 'SCRAPED',
          compLocation,
          input.duration || null,
          input.stipend || null,
          input.flyerUrl || null,
          input.videoUrl || null,
          days,
        ],
      );
      jobId = insertJob.rows[0].id;
    }

    await client.query('commit');
    return { jobId, companyId, isNew };
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
};

export interface UploadCvPdfResult {
  url: string;
  filePath: string;
  fallback?: boolean;
}

/**
 * Uploads a base64 encoded CV PDF to Supabase Storage 'cvs' bucket.
 * Target path: ${SUPABASE_URL}/storage/v1/object/cvs/cv-${studentId}-${Date.now()}.pdf
 * Headers: Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}, apikey: ${SUPABASE_SERVICE_ROLE_KEY}
 * Falls back gracefully to data URL or constructed storage URL if upload fails.
 */
export const uploadStageApplicationCvPdf = async (
  studentId: string,
  pdfBase64: string,
): Promise<UploadCvPdfResult> => {
  const cleanStudentId = studentId.replace(/[^a-zA-Z0-9_-]/g, '') || 'student';
  const timestamp = Date.now();
  const filePath = `cv-${cleanStudentId}-${timestamp}.pdf`;

  let cleanBase64 = pdfBase64.trim();
  const prefixMatch = cleanBase64.match(/^data:application\/pdf;base64,(.+)$/i);
  if (prefixMatch) {
    cleanBase64 = prefixMatch[1].trim();
  }

  const rawSupabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_KEY?.trim() ||
    '';

  const baseUrl = rawSupabaseUrl ? rawSupabaseUrl.replace(/\/+$/, '') : 'https://zlzwoqqnkvxndmtnzdsm.supabase.co';
  const uploadUrl = `${baseUrl}/storage/v1/object/cvs/${filePath}`;
  const publicUrl = `${baseUrl}/storage/v1/object/public/cvs/${filePath}`;

  if (!rawSupabaseUrl || !serviceKey || !cleanBase64) {
    console.warn('[stages-db] Supabase credentials or base64 missing for CV upload, using fallback URL.');
    const fallbackUrl = cleanBase64 ? `data:application/pdf;base64,${cleanBase64}` : publicUrl;
    return {
      url: fallbackUrl,
      filePath,
      fallback: true,
    };
  }

  try {
    const pdfBuffer = Buffer.from(cleanBase64, 'base64');

    let uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/pdf',
        'x-upsert': 'true',
      },
      body: pdfBuffer,
      signal: AbortSignal.timeout(10000),
    });

    // If bucket does not exist, attempt to create it (public: true) and retry
    if (uploadRes.status === 404 || uploadRes.status === 400) {
      const errBody = await uploadRes.text().catch(() => '');
      if (errBody.toLowerCase().includes('bucket not found') || uploadRes.status === 404) {
        try {
          await fetch(`${baseUrl}/storage/v1/bucket`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: 'cvs',
              name: 'cvs',
              public: true,
            }),
            signal: AbortSignal.timeout(5000),
          });

          uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
              'Content-Type': 'application/pdf',
              'x-upsert': 'true',
            },
            body: pdfBuffer,
            signal: AbortSignal.timeout(10000),
          });
        } catch (bucketCreateErr) {
          console.warn('[stages-db] Failed to ensure cvs bucket:', bucketCreateErr);
        }
      }
    }

    if (uploadRes.ok) {
      return {
        url: publicUrl,
        filePath,
        fallback: false,
      };
    }

    console.warn(`[stages-db] CV upload failed with status ${uploadRes.status}, falling back to data URL.`);
    return {
      url: `data:application/pdf;base64,${cleanBase64}`,
      filePath,
      fallback: true,
    };
  } catch (err) {
    console.warn('[stages-db] Error uploading CV PDF to Supabase Storage, using fallback:', err);
    return {
      url: `data:application/pdf;base64,${cleanBase64}`,
      filePath,
      fallback: true,
    };
  }
};

export interface DispatchStageApplicationInput {
  studentId: string;
  jobId: string;
  channel: 'whatsapp' | 'email';
  status?: StageStatus;
  cvFileUrl?: string;
  letterFileUrl?: string;
  letterText?: string;
  whatsappPitch?: string;
  studentNotes?: string;
}

export interface DispatchStageApplicationResult {
  id: string;
  studentId: string;
  jobId: string;
  status: StageStatus;
  appliedAt: string;
  cvFileUrl?: string;
}

/**
 * Inserts or updates a stage application record in PostgreSQL with status tracking.
 * Handles schema migration / fallback gracefully if enum type has not yet been altered.
 */
export const dispatchStageApplicationRecord = async (
  input: DispatchStageApplicationInput,
): Promise<DispatchStageApplicationResult> => {
  const desiredStatus: StageStatus = input.status || 'SENT_PENDING';
  const notesContent = [
    input.studentNotes?.trim(),
    input.whatsappPitch ? `Pitch: ${input.whatsappPitch.trim()}` : null,
    `Canal: ${input.channel.toUpperCase()}`,
  ]
    .filter(Boolean)
    .join(' | ');

  // 1. Proactively ensure PostgreSQL enum has new values if permissions allow
  try {
    await databasePool.query(`ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'SENT_PENDING'`);
    await databasePool.query(`ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'DELIVERED'`);
    await databasePool.query(`ALTER TYPE public.stage_app_status ADD VALUE IF NOT EXISTS 'FAILED'`);
  } catch {
    // Non-fatal if ALTER TYPE cannot run inside transaction or lacks DDL rights
  }

  // 2. Insert or update stage application record with desiredStatus
  try {
    const result = await databasePool.query<{
      id: string;
      student_id: string;
      job_id: string;
      status: string;
      applied_at: string;
      cv_file_url: string | null;
    }>(
      `insert into public.stage_applications (
         student_id, job_id, status, cv_file_url, letter_file_url,
         generated_letter_text, notes, applied_at
       ) values ($1, $2, $3, $4, $5, $6, $7, now())
       on conflict (student_id, job_id) do update set
         status = excluded.status,
         cv_file_url = coalesce(excluded.cv_file_url, public.stage_applications.cv_file_url),
         letter_file_url = coalesce(excluded.letter_file_url, public.stage_applications.letter_file_url),
         generated_letter_text = coalesce(excluded.generated_letter_text, public.stage_applications.generated_letter_text),
         notes = coalesce(excluded.notes, public.stage_applications.notes),
         applied_at = now()
       returning id, student_id, job_id, status, applied_at, cv_file_url`,
      [
        input.studentId,
        input.jobId,
        desiredStatus,
        input.cvFileUrl || null,
        input.letterFileUrl || null,
        input.letterText || '',
        notesContent || null,
      ],
    );

    const row = result.rows[0];
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      jobId: String(row.job_id),
      status: (row.status as StageStatus) || desiredStatus,
      appliedAt: new Date(String(row.applied_at)).toISOString(),
      cvFileUrl: row.cv_file_url || undefined,
    };
  } catch (err: any) {
    const errMessage = String(err?.message || '').toLowerCase();
    const isEnumError = errMessage.includes('enum') || errMessage.includes('stage_app_status');

    // 3. Fallback: if enum rejected 'SENT_PENDING', fall back to 'PENDING'
    if (isEnumError && desiredStatus !== 'PENDING') {
      try {
        const fallbackNotes = `[Status: ${desiredStatus}] ${notesContent}`.trim();
        const fallbackRes = await databasePool.query<{
          id: string;
          student_id: string;
          job_id: string;
          status: string;
          applied_at: string;
          cv_file_url: string | null;
        }>(
          `insert into public.stage_applications (
             student_id, job_id, status, cv_file_url, letter_file_url,
             generated_letter_text, notes, applied_at
           ) values ($1, $2, 'PENDING', $3, $4, $5, $6, now())
           on conflict (student_id, job_id) do update set
             status = 'PENDING',
             cv_file_url = coalesce(excluded.cv_file_url, public.stage_applications.cv_file_url),
             letter_file_url = coalesce(excluded.letter_file_url, public.stage_applications.letter_file_url),
             generated_letter_text = coalesce(excluded.generated_letter_text, public.stage_applications.generated_letter_text),
             notes = coalesce(excluded.notes, public.stage_applications.notes),
             applied_at = now()
           returning id, student_id, job_id, status, applied_at, cv_file_url`,
          [
            input.studentId,
            input.jobId,
            input.cvFileUrl || null,
            input.letterFileUrl || null,
            input.letterText || '',
            fallbackNotes || null,
          ],
        );

        const row = fallbackRes.rows[0];
        return {
          id: String(row.id),
          studentId: String(row.student_id),
          jobId: String(row.job_id),
          status: (row.status as StageStatus) || 'PENDING',
          appliedAt: new Date(String(row.applied_at)).toISOString(),
          cvFileUrl: row.cv_file_url || undefined,
        };
      } catch (innerErr) {
        console.warn('[stages-db] Enum fallback query failed:', innerErr);
        throw innerErr;
      }
    }

    console.warn('[stages-db] dispatchStageApplicationRecord failed:', err);
    throw err;
  }
};

/**
 * Updates an application's dispatch status (e.g. from N8N callback to DELIVERED or FAILED).
 */
export const updateApplicationDispatchStatus = async (
  applicationId: string,
  status: StageStatus,
): Promise<{ id: string; status: StageStatus } | null> => {
  try {
    const result = await databasePool.query<{ id: string; status: string }>(
      `update public.stage_applications set status = $1
        where id = $2
        returning id, status`,
      [status, applicationId],
    );
    if (result.rows[0]) {
      return { id: result.rows[0].id, status: result.rows[0].status as StageStatus };
    }
  } catch (err: any) {
    const errMessage = String(err?.message || '').toLowerCase();
    if (errMessage.includes('enum') || errMessage.includes('stage_app_status')) {
      try {
        const fallbackRes = await databasePool.query<{ id: string; status: string }>(
          `update public.stage_applications
              set status = 'PENDING',
                  notes = concat('[Status: ', $1::text, '] ', coalesce(notes, ''))
            where id = $2
            returning id, status`,
          [status, applicationId],
        );
        return fallbackRes.rows[0]
          ? { id: fallbackRes.rows[0].id, status: fallbackRes.rows[0].status as StageStatus }
          : null;
      } catch (innerErr) {
        console.warn('[stages-db] Dispatch status enum fallback failed:', innerErr);
        throw innerErr;
      }
    }
    console.warn('[stages-db] Error updating application dispatch status:', err);
    throw err;
  }
  return null;
};

/**
 * Updates WhatsApp connection status for a student by ID in Supabase PostgreSQL.
 * Errors are propagated to caller.
 */
export const setStageStudentWhatsAppStatusById = async (
  studentId: string,
  instanceName: string,
  connected: boolean,
): Promise<void> => {
  await databasePool.query(
    `UPDATE public.stage_students
     SET whatsapp_connected = $3,
         whatsapp_instance = $2,
         whatsapp_linked_at = (CASE WHEN $3 THEN now() ELSE whatsapp_linked_at END)
     WHERE id = $1`,
    [studentId, instanceName, connected],
  );
};

/**
 * Queries WhatsApp connection status for a student by ID from Supabase PostgreSQL.
 * Errors are propagated to caller.
 */
export const getStageStudentWhatsAppStatusById = async (
  studentId: string,
): Promise<{ connected: boolean; instanceName?: string; linkedAt?: string | null } | null> => {
  const res = await databasePool.query<{
    whatsapp_connected: boolean;
    whatsapp_instance: string | null;
    whatsapp_linked_at: string | null;
  }>(
    `SELECT whatsapp_connected, whatsapp_instance, whatsapp_linked_at
     FROM public.stage_students
     WHERE id = $1
     LIMIT 1`,
    [studentId],
  );

  if (res.rows.length > 0) {
    const row = res.rows[0];
    return {
      connected: Boolean(row.whatsapp_connected),
      instanceName: row.whatsapp_instance || undefined,
      linkedAt: row.whatsapp_linked_at ? new Date(row.whatsapp_linked_at).toISOString() : null,
    };
  }
  return null;
};



// ---------------------------------------------------------------------------
// Human review of scraped offers (pipeline status 'pending_review').
// ---------------------------------------------------------------------------

export type PendingStageJob = {
  id: string;
  title: string;
  kind: 'stage' | 'emploi';
  companyName: string;
  location: string | null;
  confidence: number | null;
  reviewReason: string | null;
  sourceUrl: string | null;
  evidence: Record<string, string | null>;
  createdAt: string;
};

export const listPendingStageJobs = async (limit = 50): Promise<PendingStageJob[]> => {
  const { rows } = await databasePool.query<{
    id: string;
    title: string;
    kind: 'stage' | 'emploi';
    company_name: string;
    location: string | null;
    confidence: string | null;
    review_reason: string | null;
    source_url: string | null;
    evidence: Record<string, string | null> | null;
    created_at: string;
  }>(
    `select j.id, j.title, j.kind, c.name as company_name, j.location, j.confidence,
            j.review_reason, j.source_url, j.evidence, j.created_at
       from public.stage_jobs j
       join public.stage_companies c on c.id = j.company_id
      where j.status = 'pending_review'
      order by j.created_at asc
      limit $1`,
    [limit],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    kind: row.kind,
    companyName: row.company_name,
    location: row.location,
    confidence: row.confidence === null ? null : Number(row.confidence),
    reviewReason: row.review_reason,
    sourceUrl: row.source_url,
    evidence: row.evidence ?? {},
    createdAt: new Date(row.created_at).toISOString(),
  }));
};

/** Publishes or rejects a pending offer. Returns false when it was not pending anymore. */
export const reviewStageJob = async (
  jobId: string,
  decision: 'publish' | 'reject',
  reviewer: string,
): Promise<boolean> => {
  const { rowCount } = await databasePool.query(
    `update public.stage_jobs
        set status = $2, reviewed_at = now(), reviewed_by = $3
      where id = $1 and status = 'pending_review'`,
    [jobId, decision === 'publish' ? 'published' : 'rejected', reviewer],
  );
  return (rowCount ?? 0) > 0;
};
