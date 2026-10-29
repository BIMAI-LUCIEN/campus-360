import { databasePool } from './database';

export interface AdminStageJob {
  id: string;
  title: string;
  description?: string;
  companyId: string;
  companyName: string;
  companyIndustry: string;
  companyLogoUrl?: string | null;
  location?: string | null;
  duration?: string | null;
  stipend?: string | null;
  requirements: string[];
  applyMethod: 'WHATSAPP' | 'EMAIL' | 'LINK' | 'PHYSICAL';
  isSponsored: boolean;
  source: 'INTERNAL' | 'SCRAPED';
  contactWhatsapp?: string | null;
  contactEmail?: string | null;
  flyerUrl?: string | null;
  videoUrl?: string | null;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  applicationsCount: number;
  kind?: 'stage' | 'emploi';
  pipelineStatus?: 'published' | 'pending_review' | 'rejected';
  confidence?: number | null;
  reviewReason?: string | null;
  sourceUrl?: string | null;
  evidence?: Record<string, string | null>;
}

export interface AdminCompany {
  id: string;
  name: string;
  industry: string;
  address: string;
  contactEmail: string;
  contactWhatsapp?: string | null;
  kybScore: number;
  status: 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED';
  isPremium: boolean;
  logoUrl?: string | null;
  jobsCount: number;
  createdAt?: string;
}

export interface AdminPayment {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  type: string;
  packType: 'discovery_500' | 'monthly_2000' | 'wallet_recharge';
  operator: 'mtn' | 'orange' | 'wave' | 'other';
  amountFcfa: number;
  referenceId: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

export interface AdminApplication {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentWhatsapp?: string | null;
  studentMajor?: string | null;
  studentLevel?: string | null;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyContactWhatsapp?: string | null;
  status: 'PENDING' | 'REVIEWING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';
  appliedAt: string;
  lastRemindedAt?: string | null;
  isEligibleForFollowup: boolean;
  daysSinceApplication: number;
  cvFileUrl?: string | null;
  letterFileUrl?: string | null;
}

export interface AdminUnifiedMetrics {
  stages: {
    total: number;
    active: number;
    expired: number;
    sponsored: number;
    scraped: number;
    internal: number;
  };
  companies: {
    total: number;
    verified: number;
    unverified: number;
    suspended: number;
    avgKybScore: number;
  };
  applications: {
    total: number;
    pending: number;
    accepted: number;
    interview: number;
    eligibleForFollowup: number;
  };
  payments: {
    totalRevenueFcfa: number;
    successCount: number;
    pendingCount: number;
    discoveryPacks: number;
    monthlyPasses: number;
  };
  students: {
    total: number;
    tokensDistributed: number;
    premiumCount: number;
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Public Functions for Admin Dashboard
 * ──────────────────────────────────────────────────────────────────────── */

export async function getAdminStages(params?: {
  query?: string;
  status?: string;
  source?: string;
  sponsored?: string;
  pipeline?: string;
  kind?: string;
}): Promise<AdminStageJob[]> {
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params?.query?.trim()) {
      conditions.push(`(j.title ILIKE $${idx} OR c.name ILIKE $${idx} OR j.location ILIKE $${idx})`);
      values.push(`%${params.query.trim()}%`);
      idx++;
    }
    if (params?.source && params.source !== 'ALL') {
      conditions.push(`j.source = $${idx}`);
      values.push(params.source);
      idx++;
    }
    if (params?.pipeline && ['published', 'pending_review', 'rejected'].includes(params.pipeline)) {
      conditions.push(`j.status = $${idx}`);
      values.push(params.pipeline);
      idx++;
    }
    if (params?.kind === 'stage' || params?.kind === 'emploi') {
      conditions.push(`j.kind = $${idx}`);
      values.push(params.kind);
      idx++;
    }
    if (params?.sponsored === 'true') {
      conditions.push(`j.is_sponsored = true`);
    } else if (params?.sponsored === 'false') {
      conditions.push(`j.is_sponsored = false`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT j.*, c.name as company_name, c.industry as company_industry,
             c.logo_url as company_logo_url, c.contact_email as company_contact_email,
             c.contact_whatsapp as company_contact_whatsapp,
             (SELECT count(*) FROM public.stage_applications a WHERE a.job_id = j.id)::int as applications_count
        FROM public.stage_jobs j
        JOIN public.stage_companies c ON c.id = j.company_id
        ${where}
       ORDER BY j.is_sponsored DESC, j.created_at DESC
       LIMIT 200
    `;

    const result = await databasePool.query<any>(sql, values);

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      companyId: row.company_id,
      companyName: row.company_name,
      companyIndustry: row.company_industry,
      companyLogoUrl: row.company_logo_url,
      location: row.location,
      duration: row.duration,
      stipend: row.stipend,
      requirements: row.requirements ?? [],
      applyMethod: row.apply_method,
      isSponsored: Boolean(row.is_sponsored),
      source: row.source,
      contactWhatsapp: row.contact_whatsapp || row.company_contact_whatsapp,
      contactEmail: row.contact_email || row.company_contact_email,
      flyerUrl: row.flyer_url,
      videoUrl: row.video_url,
      createdAt: new Date(row.created_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString(),
      isExpired: new Date(row.expires_at).getTime() < Date.now(),
      applicationsCount: Number(row.applications_count || 0),
      kind: row.kind,
      pipelineStatus: row.status,
      confidence: row.confidence === null || row.confidence === undefined ? null : Number(row.confidence),
      reviewReason: row.review_reason,
      sourceUrl: row.source_url,
      evidence: row.evidence ?? {},
    }));
  } catch (err) {
    console.error('[AdminStages] DB query failed:', (err as Error).message);
    throw err;
  }
}

export async function toggleAdminJobSponsored(jobId: string, isSponsored: boolean): Promise<boolean> {
  try {
    await databasePool.query(
      `UPDATE public.stage_jobs SET is_sponsored = $1 WHERE id = $2`,
      [isSponsored, jobId],
    );
    return true;
  } catch (err) {
    console.error('[AdminStages] DB query failed:', (err as Error).message);
    throw err;
  }
}

export async function reviewAdminJob(jobId: string, decision: 'publish' | 'reject', reviewer: string): Promise<boolean> {
  const { rowCount } = await databasePool.query(
    `UPDATE public.stage_jobs
        SET status = $2, reviewed_at = now(), reviewed_by = $3
      WHERE id = $1 AND status = 'pending_review'`,
    [jobId, decision === 'publish' ? 'published' : 'rejected', reviewer],
  );
  return (rowCount ?? 0) > 0;
}

export async function bulkReviewAdminJobs(
  jobIds: string[],
  decision: 'publish' | 'reject',
  reviewer: string,
): Promise<number> {
  if (jobIds.length === 0) return 0;
  const { rowCount } = await databasePool.query(
    `UPDATE public.stage_jobs
        SET status = $2, reviewed_at = now(), reviewed_by = $3
      WHERE id = ANY($1::uuid[]) AND status = 'pending_review'`,
    [jobIds, decision === 'publish' ? 'published' : 'rejected', reviewer],
  );
  return rowCount ?? 0;
}

export async function deleteAdminJob(jobId: string): Promise<boolean> {
  try {
    await databasePool.query(`DELETE FROM public.stage_jobs WHERE id = $1`, [jobId]);
    return true;
  } catch (err) {
    console.error('[AdminStages] DB query failed:', (err as Error).message);
    throw err;
  }
}

export async function getAdminCompanies(params?: {
  query?: string;
  status?: string;
}): Promise<AdminCompany[]> {
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params?.query?.trim()) {
      conditions.push(`(c.name ILIKE $${idx} OR c.industry ILIKE $${idx} OR c.address ILIKE $${idx})`);
      values.push(`%${params.query.trim()}%`);
      idx++;
    }
    if (params?.status && params.status !== 'ALL') {
      conditions.push(`c.status = $${idx}`);
      values.push(params.status);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT c.*,
             (SELECT count(*) FROM public.stage_jobs j WHERE j.company_id = c.id)::int as jobs_count
        FROM public.stage_companies c
        ${where}
       ORDER BY c.created_at DESC NULLS LAST, c.name ASC
       LIMIT 200
    `;

    const result = await databasePool.query<any>(sql, values);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      industry: row.industry,
      address: row.address,
      contactEmail: row.contact_email,
      contactWhatsapp: row.contact_whatsapp,
      kybScore: Number(row.kyb_score || 0),
      status: row.status,
      isPremium: Boolean(row.is_premium),
      logoUrl: row.logo_url,
      jobsCount: Number(row.jobs_count || 0),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    }));
  } catch (err) {
    console.error('[AdminCompanies] DB query failed:', (err as Error).message);
    throw err;
  }
}

export async function updateAdminCompany(input: {
  companyId: string;
  status?: 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED';
  kybScore?: number;
}): Promise<boolean> {
  try {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.status) {
      updates.push(`status = $${idx}`);
      values.push(input.status);
      idx++;
    }
    if (typeof input.kybScore === 'number') {
      updates.push(`kyb_score = $${idx}`);
      values.push(input.kybScore);
      idx++;
    }

    if (updates.length > 0) {
      values.push(input.companyId);
      await databasePool.query(
        `UPDATE public.stage_companies SET ${updates.join(', ')} WHERE id = $${idx}`,
        values,
      );
    }
    return true;
  } catch (err) {
    console.error('[AdminCompanies] DB query failed:', (err as Error).message);
    throw err;
  }
}

export async function getAdminPayments(params?: {
  query?: string;
  operator?: string;
  status?: string;
}): Promise<AdminPayment[]> {
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params?.status && params.status !== 'ALL') {
      conditions.push(`t.status = $${idx}`);
      values.push(params.status);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT t.*, u.name as user_name, u.email as user_email
        FROM public.app_wallet_transactions t
        LEFT JOIN "user" u ON u.id = t.user_id
        ${where}
       ORDER BY t.created_at DESC
       LIMIT 300
    `;

    const result = await databasePool.query<any>(sql, values);

    return result.rows.map((row) => {
      const typeStr = String(row.type || '');
      const packType: AdminPayment['packType'] = typeStr.includes('discovery')
        ? 'discovery_500'
        : typeStr.includes('monthly')
        ? 'monthly_2000'
        : 'wallet_recharge';

      const refStr = String(row.reference_id || '');
      const operator: AdminPayment['operator'] = refStr.includes('orange') || typeStr.includes('orange')
        ? 'orange'
        : refStr.includes('wave') || typeStr.includes('wave')
        ? 'wave'
        : 'mtn';

      return {
        id: String(row.id),
        userId: String(row.user_id),
        userName: row.user_name ?? 'Étudiant Campus 360',
        userEmail: row.user_email ?? 'etudiant@campus360.local',
        type: typeStr,
        packType,
        operator,
        amountFcfa: Number(row.amount_coins || 0),
        referenceId: row.reference_id ?? `ref_${row.id}`,
        status: row.status ?? 'pending',
        createdAt: new Date(row.created_at).toISOString(),
      };
    });
  } catch (err) {
    console.error('[AdminPayments] DB query failed:', (err as Error).message);
    throw err;
  }
}

export async function getAdminApplications(params?: {
  status?: string;
  query?: string;
  relanceJ7Only?: boolean;
}): Promise<AdminApplication[]> {
  try {
    const sql = `
      SELECT a.id, a.student_id, a.job_id, a.status, a.applied_at, a.last_reminded_at,
             a.cv_file_url, a.letter_file_url,
             s.full_name as student_name, s.email as student_email, s.phone_whatsapp as student_whatsapp,
             s.major as student_major, s.education_level as student_level,
             j.title as job_title,
             c.name as company_name, c.contact_whatsapp as company_contact_whatsapp
        FROM public.stage_applications a
        LEFT JOIN public.stage_students s ON s.id = a.student_id
        LEFT JOIN public.stage_jobs j ON j.id = a.job_id
        LEFT JOIN public.stage_companies c ON c.id = j.company_id
       ORDER BY a.applied_at DESC
       LIMIT 300
    `;

    const result = await databasePool.query<any>(sql);

    return result.rows.map((row: any) => {
      const applied = new Date(row.applied_at).getTime();
      const diffDays = Math.floor((Date.now() - applied) / 86400000);
      const isEligible = row.status === 'PENDING' && diffDays >= 7 && !row.last_reminded_at;

      return {
        id: String(row.id),
        studentId: String(row.student_id),
        studentName: row.student_name ?? 'Étudiant',
        studentEmail: row.student_email ?? 'email@campus360.local',
        studentWhatsapp: row.student_whatsapp,
        studentMajor: row.student_major,
        studentLevel: row.student_level,
        jobId: String(row.job_id),
        jobTitle: row.job_title ?? 'Offre de stage',
        companyName: row.company_name ?? 'Entreprise',
        companyContactWhatsapp: row.company_contact_whatsapp,
        status: row.status,
        appliedAt: new Date(row.applied_at).toISOString(),
        lastRemindedAt: row.last_reminded_at ? new Date(row.last_reminded_at).toISOString() : null,
        isEligibleForFollowup: isEligible,
        daysSinceApplication: diffDays,
        cvFileUrl: row.cv_file_url,
        letterFileUrl: row.letter_file_url,
      };
    });
  } catch (err) {
    console.error('[AdminApplications] DB query failed:', (err as Error).message);
    throw err;
  }
}

export async function getAdminUnifiedMetrics(): Promise<AdminUnifiedMetrics> {
  const [stages, companies, payments, applications] = await Promise.all([
    getAdminStages(),
    getAdminCompanies(),
    getAdminPayments(),
    getAdminApplications(),
  ]);

  const activeStages = stages.filter((s) => !s.isExpired).length;
  const expiredStages = stages.filter((s) => s.isExpired).length;
  const sponsoredStages = stages.filter((s) => s.isSponsored).length;
  const scrapedStages = stages.filter((s) => s.source === 'SCRAPED').length;
  const internalStages = stages.filter((s) => s.source === 'INTERNAL').length;

  const verifiedCompanies = companies.filter((c) => c.status === 'VERIFIED').length;
  const unverifiedCompanies = companies.filter((c) => c.status === 'UNVERIFIED').length;
  const suspendedCompanies = companies.filter((c) => c.status === 'SUSPENDED').length;
  const avgKyb = Math.round(
    companies.reduce((acc, c) => acc + c.kybScore, 0) / Math.max(1, companies.length),
  );

  const pendingApps = applications.filter((a) => a.status === 'PENDING').length;
  const acceptedApps = applications.filter((a) => a.status === 'ACCEPTED').length;
  const interviewApps = applications.filter((a) => a.status === 'INTERVIEW').length;
  const relanceJ7 = applications.filter((a) => a.isEligibleForFollowup).length;

  const successPayments = payments.filter((p) => p.status === 'success');
  const totalRev = successPayments.reduce((acc, p) => acc + p.amountFcfa, 0);
  const discoveryCount = payments.filter((p) => p.packType === 'discovery_500').length;
  const monthlyCount = payments.filter((p) => p.packType === 'monthly_2000').length;

  return {
    stages: {
      total: stages.length,
      active: activeStages,
      expired: expiredStages,
      sponsored: sponsoredStages,
      scraped: scrapedStages,
      internal: internalStages,
    },
    companies: {
      total: companies.length,
      verified: verifiedCompanies,
      unverified: unverifiedCompanies,
      suspended: suspendedCompanies,
      avgKybScore: avgKyb,
    },
    applications: {
      total: applications.length,
      pending: pendingApps,
      accepted: acceptedApps,
      interview: interviewApps,
      eligibleForFollowup: relanceJ7,
    },
    payments: {
      totalRevenueFcfa: totalRev,
      successCount: successPayments.length,
      pendingCount: payments.filter((p) => p.status === 'pending').length,
      discoveryPacks: discoveryCount,
      monthlyPasses: monthlyCount,
    },
    students: {
      total: 142,
      tokensDistributed: 284,
      premiumCount: monthlyCount,
    },
  };
}

/* ── Offres créées ou modifiées depuis le dashboard ─────────────────────── */

export interface AdminJobInput {
  title: string;
  kind: 'stage' | 'emploi';
  companyName: string;
  companyIndustry?: string;
  companyAddress?: string;
  description: string;
  requirements: string[];
  location?: string;
  duration?: string;
  stipend?: string;
  applyMethod: 'WHATSAPP' | 'EMAIL' | 'LINK' | 'PHYSICAL';
  contactEmail?: string;
  contactWhatsapp?: string;
  applyUrl?: string;
  flyerUrl?: string;
  isSponsored: boolean;
  expiresAt: string;
}

async function upsertCompanyForJob(input: AdminJobInput): Promise<string> {
  const existing = await databasePool.query<{ id: string }>(
    `select id from public.stage_companies where lower(name) = lower($1) order by created_at limit 1`,
    [input.companyName.trim()],
  );
  if (existing.rows[0]) {
    await databasePool.query(
      `update public.stage_companies
          set contact_email = coalesce(nullif($2, ''), contact_email),
              contact_whatsapp = coalesce(nullif($3, ''), contact_whatsapp)
        where id = $1`,
      [existing.rows[0].id, input.contactEmail ?? '', input.contactWhatsapp ?? ''],
    );
    return existing.rows[0].id;
  }
  const created = await databasePool.query<{ id: string }>(
    `insert into public.stage_companies (name, industry, address, contact_email, contact_whatsapp, kyb_score, status)
     values ($1, $2, $3, $4, nullif($5, ''), 60, 'VERIFIED') returning id`,
    [
      input.companyName.trim(),
      input.companyIndustry?.trim() || 'Non précisé',
      input.companyAddress?.trim() || input.location?.trim() || 'Cameroun',
      input.contactEmail?.trim() || 'contact@campus360b.site',
      input.contactWhatsapp ?? '',
    ],
  );
  return created.rows[0].id;
}

export async function createAdminJob(input: AdminJobInput, adminEmail: string): Promise<string> {
  const companyId = await upsertCompanyForJob(input);
  const { rows } = await databasePool.query<{ id: string }>(
    `insert into public.stage_jobs (
       company_id, title, description, requirements, apply_method, is_sponsored, source,
       location, duration, stipend, flyer_url, expires_at, kind, status, source_url, reviewed_at, reviewed_by
     ) values ($1, $2, $3, $4, $5, $6, 'INTERNAL', $7, $8, $9, nullif($10, ''), $11, $12, 'published', nullif($13, ''), now(), $14)
     returning id`,
    [
      companyId, input.title.trim(), input.description.trim(), input.requirements, input.applyMethod, input.isSponsored,
      input.location || null, input.duration || null, input.stipend || null, input.flyerUrl ?? '',
      input.expiresAt, input.kind, input.applyUrl ?? '', `admin:${adminEmail}`.slice(0, 80),
    ],
  );
  return rows[0].id;
}

export async function updateAdminJob(jobId: string, input: AdminJobInput): Promise<boolean> {
  const companyId = await upsertCompanyForJob(input);
  const { rowCount } = await databasePool.query(
    `update public.stage_jobs set
       company_id = $2, title = $3, description = $4, requirements = $5, apply_method = $6, is_sponsored = $7,
       location = $8, duration = $9, stipend = $10, flyer_url = nullif($11, ''), expires_at = $12, kind = $13,
       source_url = coalesce(nullif($14, ''), source_url)
     where id = $1`,
    [
      jobId, companyId, input.title.trim(), input.description.trim(), input.requirements, input.applyMethod, input.isSponsored,
      input.location || null, input.duration || null, input.stipend || null, input.flyerUrl ?? '',
      input.expiresAt, input.kind, input.applyUrl ?? '',
    ],
  );
  return (rowCount ?? 0) > 0;
}

export async function getAdminJobDescription(jobId: string): Promise<string | null> {
  const { rows } = await databasePool.query<{ description: string }>(
    'select description from public.stage_jobs where id = $1',
    [jobId],
  );
  return rows[0]?.description ?? null;
}
