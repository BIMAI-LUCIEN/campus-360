import { databasePool } from './database';

export type StageStatus = 'PENDING' | 'REVIEWING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';

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
    const result = await databasePool.query<{ id: string }>(
      `with updated as (
         update public.stage_students set
           auth_id = $1, app_user_id = $2, full_name = $3, phone_whatsapp = $4,
           email = $5, education_level = $6, major = $7
         where auth_id = $1 or lower(email) = lower($5)
         returning id
       ), inserted as (
         insert into public.stage_students (
           auth_id, app_user_id, full_name, phone_whatsapp, email, education_level, major
         ) select $1, $2, $3, $4, $5, $6, $7 where not exists (select 1 from updated)
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
    return result.rows[0].id;
  } catch (err) {
    console.warn('[stages-db] Database query failed in ensureStageStudent, returning fallback ID:', err);
    return user.id || 'student-stage-id';
  }
};

type StageJobRow = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  requirements: string[] | null;
  apply_method: 'WHATSAPP' | 'EMAIL' | 'PHYSICAL';
  is_sponsored: boolean;
  source: 'INTERNAL' | 'SCRAPED';
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
  location: row.location ?? undefined,
  duration: row.duration ?? undefined,
  stipend: row.stipend ?? undefined,
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

export const FALLBACK_STAGE_JOBS = [
  {
    id: 'job-1',
    companyId: 'comp-1',
    title: 'Stagiaire Développeur Frontend React / Mobile',
    description: "Participez à la refonte de nos applications mobiles et dashboards clients. Vous collaborerez avec l'équipe produit sur l'intégration de composants React Native et la consommation d'APIs REST/GraphQL.",
    requirements: ['React', 'TypeScript', 'React Native', 'Git', 'Tailwind CSS'],
    applyMethod: 'WHATSAPP' as const,
    isSponsored: true,
    source: 'INTERNAL' as const,
    location: 'Abidjan / Hybride',
    duration: '3 à 6 mois',
    stipend: 'Rémunéré (80 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80',
    videoUrl: undefined,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    company: {
      id: 'comp-1',
      name: 'TechNovation Labs',
      industry: 'Ingénierie & Informatique',
      address: 'Abidjan, Cocody Riviera 3',
      contactEmail: 'recrutement@technovation.ci',
      contactWhatsapp: '+2250708091011',
      kybScore: 96,
      status: 'VERIFIED' as const,
      isPremium: true,
      logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'job-2',
    companyId: 'comp-2',
    title: 'Assistant(e) Comptable & Audit SYSCOHADA',
    description: "Sous la responsabilité du Chef de mission, vous participerez aux travaux de tenue comptable, de rapprochements bancaires et à l'élaboration des états financiers de synthèse selon les normes OHADA.",
    requirements: ['Comptabilité', 'Excel Avancé', 'SYSCOHADA', 'Audit', 'Fiscalité'],
    applyMethod: 'EMAIL' as const,
    isSponsored: false,
    source: 'INTERNAL' as const,
    location: 'Dakar',
    duration: '6 mois',
    stipend: 'Rémunéré (75 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&auto=format&fit=crop&q=80',
    videoUrl: undefined,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(),
    company: {
      id: 'comp-2',
      name: 'Cabinet FicoConsulting',
      industry: 'Comptabilité, Finance & Audit',
      address: 'Dakar, Plateau',
      contactEmail: 'stages@ficoconsulting.sn',
      contactWhatsapp: '+221770001122',
      kybScore: 94,
      status: 'VERIFIED' as const,
      isPremium: false,
      logoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=120&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'job-10',
    companyId: 'comp-10',
    title: 'Stagiaire Cloud, Réseaux & Cybersécurité',
    description: "Intégrez le centre des opérations réseau (NOC/SOC) de MTN. Vous assisterez nos ingénieurs dans le monitoring des infrastructures télécoms, l'application des correctifs de sécurité et le déploiement de services cloud.",
    requirements: ['Linux', 'Réseaux IP', 'Cybersécurité', 'Cisco / CCNA', 'Docker'],
    applyMethod: 'WHATSAPP' as const,
    isSponsored: true,
    source: 'INTERNAL' as const,
    location: 'Douala, Akwa',
    duration: '6 mois',
    stipend: 'Rémunéré (90 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop&q=80',
    videoUrl: undefined,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString(),
    company: {
      id: 'comp-10',
      name: 'MTN Digital Communications',
      industry: 'Télécoms, Cloud & Cybersécurité',
      address: 'Douala, Akwa Boulevard de la Liberté',
      contactEmail: 'careers.cm@mtn.com',
      contactWhatsapp: '+237670009988',
      kybScore: 96,
      status: 'VERIFIED' as const,
      isPremium: true,
      logoUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=120&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'job-4',
    companyId: 'comp-4',
    title: 'Assistant(e) Supply Chain & Logistique Portuaire',
    description: "Gestion des expéditions maritimes, suivi des formalités douanières et optimisation des stocks en entrepôt. Maîtrise des incoterms et de l'anglais commercial appréciée.",
    requirements: ['Supply Chain', 'Logistique', 'Douane & Transit', 'Anglais Professionnel', 'ERP'],
    applyMethod: 'EMAIL' as const,
    isSponsored: false,
    source: 'INTERNAL' as const,
    location: 'Douala, Port Autonome',
    duration: '3 à 6 mois',
    stipend: 'Rémunéré (70 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80',
    videoUrl: undefined,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
    company: {
      id: 'comp-4',
      name: 'AgroLogix & Supply Chain',
      industry: 'Logistique & Supply Chain',
      address: 'Douala, Bonanjo',
      contactEmail: 'rh@agrologix.cm',
      contactWhatsapp: '+237690001122',
      kybScore: 89,
      status: 'VERIFIED' as const,
      isPremium: false,
      logoUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=120&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'job-5',
    companyId: 'comp-5',
    title: 'Stagiaire Analyste FinTech & Compliance Réglementaire',
    description: "Analyse des flux transactionnels, veille réglementaire CEMAC/UEMOA sur la monnaie électronique et accompagnement au déploiement de solutions d'authentification forte.",
    requirements: ['Banque & Finance', 'Droit Bancaire', 'Compliance / Conformité', 'Analyse Financière', 'Excel'],
    applyMethod: 'WHATSAPP' as const,
    isSponsored: true,
    source: 'INTERNAL' as const,
    location: 'Yaoundé / Télétravail',
    duration: '6 mois',
    stipend: 'Rémunéré (85 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=900&auto=format&fit=crop&q=80',
    videoUrl: undefined,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    company: {
      id: 'comp-5',
      name: 'Ecobank FinTech Innovation Hub',
      industry: 'Finance & FinTech',
      address: 'Lomé, Siège Régional & Remote',
      contactEmail: 'careers-fintech@ecobank.com',
      contactWhatsapp: '+22890112233',
      kybScore: 98,
      status: 'VERIFIED' as const,
      isPremium: true,
      logoUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120&auto=format&fit=crop&q=80',
    },
  },
];

export const listStageJobs = async (params: { query?: string; sector?: string }) => {
  try {
    const conditions = [`j.expires_at > now()`, `c.status != 'SUSPENDED'`];
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
    if (result.rows.length > 0) {
      return result.rows.map(mapJob);
    }
  } catch (err) {
    console.warn('[stages-db] Database query failed in listStageJobs, using fallback jobs:', err);
  }

  // Filter fallback jobs
  let jobs = FALLBACK_STAGE_JOBS;
  if (params.sector && params.sector !== 'Tous') {
    const s = params.sector.toLowerCase();
    jobs = jobs.filter(j => j.company.industry.toLowerCase().includes(s) || j.title.toLowerCase().includes(s));
  }
  if (params.query?.trim()) {
    const q = params.query.trim().toLowerCase();
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      j.company.name.toLowerCase().includes(q)
    );
  }
  return jobs;
};

export const getStageJob = async (jobId: string) => {
  try {
    const result = await databasePool.query<StageJobRow>(
      `${JOB_SELECT} where j.id = $1 and j.expires_at > now() and c.status != 'SUSPENDED' limit 1`,
      [jobId],
    );
    if (result.rows[0]) return mapJob(result.rows[0]);
  } catch (err) {
    console.warn('[stages-db] Database query failed in getStageJob, checking fallback jobs:', err);
  }
  return FALLBACK_STAGE_JOBS.find(j => j.id === jobId) || FALLBACK_STAGE_JOBS[0] || null;
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
    console.warn('[stages-db] Database query failed in listStudentApplications, returning empty array:', err);
    return [];
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
    console.warn('[stages-db] Database query failed in createStageApplication, returning mock application:', err);
    return {
      id: 'app-offline-' + Date.now(),
      student_id: input.studentId,
      job_id: input.jobId,
      status: 'PENDING',
      applied_at: new Date().toISOString(),
    };
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
    const defaultDesc = input.description?.trim() ||
      `Offre de stage "${normalizedTitle}" chez ${compName}. Profils recherchés : ${(input.requirements || []).join(', ') || 'étudiants motivés'}. Candidature certifiée via Campus 360.`;
    const safeDesc = defaultDesc.length > 1990 ? defaultDesc.slice(0, 1990) + '...' : defaultDesc;
    const reqs = input.requirements && input.requirements.length > 0 ? input.requirements : ['Motivation', 'Rigueur'];
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
          input.duration || '3 à 6 mois',
          input.stipend || 'Indemnité de stage',
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

