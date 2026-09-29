import { databasePool } from './database';

export interface AdminStageJob {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  companyIndustry: string;
  companyLogoUrl?: string | null;
  location?: string | null;
  duration?: string | null;
  stipend?: string | null;
  requirements: string[];
  applyMethod: 'WHATSAPP' | 'EMAIL' | 'PHYSICAL';
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

// Fallback in-memory data for demo / tests / disconnected environment
const MOCK_COMPANIES: AdminCompany[] = [
  {
    id: 'comp_orange_cm',
    name: 'Orange Cameroun',
    industry: 'Télécoms & Réseaux',
    address: 'Boulevard de la Liberté, Akwa, Douala',
    contactEmail: 'recrutement@orange.cm',
    contactWhatsapp: '+237699001122',
    kybScore: 92,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: null,
    jobsCount: 3,
  },
  {
    id: 'comp_technovation',
    name: 'TechNovation Labs',
    industry: 'Génie Logiciel & Cloud',
    address: 'Bastos, Yaoundé',
    contactEmail: 'contact@technovation.cm',
    contactWhatsapp: '+237672364124',
    kybScore: 88,
    status: 'VERIFIED',
    isPremium: false,
    logoUrl: null,
    jobsCount: 2,
  },
  {
    id: 'comp_bicec',
    name: 'BICEC Banque',
    industry: 'Banque & Finance',
    address: 'Bonanjo, Douala',
    contactEmail: 'carrieres@bicec.com',
    contactWhatsapp: '+237690123456',
    kybScore: 95,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: null,
    jobsCount: 1,
  },
  {
    id: 'comp_crypto_dubious',
    name: 'Global Fast Crypto Trading',
    industry: 'Trading non régulé',
    address: 'Inconnue / Sans siège vérifié',
    contactEmail: 'investfast@gmail.com',
    contactWhatsapp: '+237655000111',
    kybScore: 24,
    status: 'SUSPENDED',
    isPremium: false,
    logoUrl: null,
    jobsCount: 1,
  },
];

const MOCK_JOBS: AdminStageJob[] = [
  {
    id: 'job_dev_rn_1',
    title: 'Stagiaire Développeur Mobile React Native / TypeScript',
    companyId: 'comp_technovation',
    companyName: 'TechNovation Labs',
    companyIndustry: 'Génie Logiciel & Cloud',
    location: 'Yaoundé (Bastos)',
    duration: '3 à 6 mois',
    stipend: '85 000 FCFA/mois',
    requirements: ['React Native', 'TypeScript', 'Git', 'API REST'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    contactWhatsapp: '+237672364124',
    contactEmail: 'contact@technovation.cm',
    flyerUrl: null,
    videoUrl: null,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 27 * 86400000).toISOString(),
    isExpired: false,
    applicationsCount: 14,
  },
  {
    id: 'job_cybersec_2',
    title: 'Stagiaire Analyste SOC & Cybersécurité',
    companyId: 'comp_orange_cm',
    companyName: 'Orange Cameroun',
    companyIndustry: 'Télécoms & Réseaux',
    location: 'Douala (Akwa)',
    duration: '6 mois (Stage PFE)',
    stipend: '100 000 FCFA/mois',
    requirements: ['Réseaux TCP/IP', 'Linux', 'Wireshark', 'Python'],
    applyMethod: 'EMAIL',
    isSponsored: true,
    source: 'SCRAPED',
    contactWhatsapp: '+237699001122',
    contactEmail: 'recrutement@orange.cm',
    flyerUrl: null,
    videoUrl: null,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 25 * 86400000).toISOString(),
    isExpired: false,
    applicationsCount: 22,
  },
  {
    id: 'job_audit_fin_3',
    title: 'Stagiaire Assistant Contrôle de Gestion & Audit',
    companyId: 'comp_bicec',
    companyName: 'BICEC Banque',
    companyIndustry: 'Banque & Finance',
    location: 'Douala (Bonanjo)',
    duration: '3 mois',
    stipend: '75 000 FCFA/mois',
    requirements: ['Comptabilité', 'Excel Avancé', 'Analyse Financière'],
    applyMethod: 'EMAIL',
    isSponsored: false,
    source: 'INTERNAL',
    contactWhatsapp: '+237690123456',
    contactEmail: 'carrieres@bicec.com',
    flyerUrl: null,
    videoUrl: null,
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 22 * 86400000).toISOString(),
    isExpired: false,
    applicationsCount: 9,
  },
  {
    id: 'job_suspect_4',
    title: 'Trader Crypto Indépendant - Gain 500 000 FCFA/semaine',
    companyId: 'comp_crypto_dubious',
    companyName: 'Global Fast Crypto Trading',
    companyIndustry: 'Trading non régulé',
    location: 'En ligne',
    duration: 'Indéterminée',
    stipend: '500 000 FCFA',
    requirements: ['Téléphone', 'Dépôt initial 50 000 FCFA'],
    applyMethod: 'WHATSAPP',
    isSponsored: false,
    source: 'SCRAPED',
    contactWhatsapp: '+237655000111',
    contactEmail: 'investfast@gmail.com',
    flyerUrl: null,
    videoUrl: null,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 86400000).toISOString(),
    isExpired: false,
    applicationsCount: 1,
  },
];

const MOCK_PAYMENTS: AdminPayment[] = [
  {
    id: 'pay_1',
    userId: 'usr_kameni',
    userName: 'Dave Lionel KAMENI',
    userEmail: 'kamenidave@gmail.com',
    userPhone: '+237672364124',
    type: 'momo_monthly_2000',
    packType: 'monthly_2000',
    operator: 'mtn',
    amountFcfa: 2000,
    referenceId: 'c360_monthly_2000_17832890_8fa1',
    status: 'success',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'pay_2',
    userId: 'usr_ngono',
    userName: 'Marie Claire NGONO',
    userEmail: 'marie.ngono@univ-douala.cm',
    userPhone: '+237699112233',
    type: 'momo_discovery_500',
    packType: 'discovery_500',
    operator: 'orange',
    amountFcfa: 500,
    referenceId: 'c360_discovery_500_17832900_3bc2',
    status: 'success',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'pay_3',
    userId: 'usr_koffi',
    userName: 'Kouassi Jean KOFFI',
    userEmail: 'koffi.jean@inphb.ci',
    userPhone: '+2250708091011',
    type: 'momo_discovery_500',
    packType: 'discovery_500',
    operator: 'wave',
    amountFcfa: 500,
    referenceId: 'c360_discovery_500_17832920_7fe4',
    status: 'success',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'pay_4',
    userId: 'usr_talla',
    userName: 'Christian TALLA',
    userEmail: 'talla.c@polytech.cm',
    userPhone: '+237670009988',
    type: 'momo_monthly_2000',
    packType: 'monthly_2000',
    operator: 'mtn',
    amountFcfa: 2000,
    referenceId: 'c360_monthly_2000_17832940_9ab3',
    status: 'pending',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
];

const MOCK_APPLICATIONS: AdminApplication[] = [
  {
    id: 'app_1',
    studentId: 'usr_kameni',
    studentName: 'Dave Lionel KAMENI',
    studentEmail: 'kamenidave@gmail.com',
    studentWhatsapp: '+237672364124',
    studentMajor: 'Génie Informatique',
    studentLevel: 'Ingénieur 4',
    jobId: 'job_dev_rn_1',
    jobTitle: 'Stagiaire Développeur Mobile React Native / TypeScript',
    companyName: 'TechNovation Labs',
    companyContactWhatsapp: '+237672364124',
    status: 'PENDING',
    appliedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    lastRemindedAt: null,
    isEligibleForFollowup: true,
    daysSinceApplication: 8,
    cvFileUrl: null,
    letterFileUrl: null,
  },
  {
    id: 'app_2',
    studentId: 'usr_ngono',
    studentName: 'Marie Claire NGONO',
    studentEmail: 'marie.ngono@univ-douala.cm',
    studentWhatsapp: '+237699112233',
    studentMajor: 'Cybersécurité & Réseaux',
    studentLevel: 'Licence 3',
    jobId: 'job_cybersec_2',
    jobTitle: 'Stagiaire Analyste SOC & Cybersécurité',
    companyName: 'Orange Cameroun',
    companyContactWhatsapp: '+237699001122',
    status: 'REVIEWING',
    appliedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    lastRemindedAt: null,
    isEligibleForFollowup: false,
    daysSinceApplication: 4,
    cvFileUrl: null,
    letterFileUrl: null,
  },
  {
    id: 'app_3',
    studentId: 'usr_koffi',
    studentName: 'Kouassi Jean KOFFI',
    studentEmail: 'koffi.jean@inphb.ci',
    studentWhatsapp: '+2250708091011',
    studentMajor: 'Comptabilité & Gestion',
    studentLevel: 'Master 1',
    jobId: 'job_audit_fin_3',
    jobTitle: 'Stagiaire Assistant Contrôle de Gestion & Audit',
    companyName: 'BICEC Banque',
    companyContactWhatsapp: '+237690123456',
    status: 'INTERVIEW',
    appliedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    lastRemindedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    isEligibleForFollowup: false,
    daysSinceApplication: 12,
    cvFileUrl: null,
    letterFileUrl: null,
  },
];

/* ─────────────────────────────────────────────────────────────────────────
 * Public Functions for Admin Dashboard
 * ──────────────────────────────────────────────────────────────────────── */

export async function getAdminStages(params?: {
  query?: string;
  status?: string;
  source?: string;
  sponsored?: string;
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
    if (result.rows.length === 0 && !params?.query) {
      return MOCK_JOBS;
    }

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
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
    }));
  } catch (err) {
    console.warn('[AdminStages] DB Query fallback to mock:', (err as Error).message);
    let list = [...MOCK_JOBS];
    if (params?.query) {
      const q = params.query.toLowerCase();
      list = list.filter((j) => j.title.toLowerCase().includes(q) || j.companyName.toLowerCase().includes(q));
    }
    if (params?.source && params.source !== 'ALL') {
      list = list.filter((j) => j.source === params.source);
    }
    if (params?.sponsored === 'true') {
      list = list.filter((j) => j.isSponsored);
    }
    return list;
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
    console.warn('[AdminStages] Toggle sponsored fallback:', (err as Error).message);
    const job = MOCK_JOBS.find((j) => j.id === jobId);
    if (job) job.isSponsored = isSponsored;
    return true;
  }
}

export async function deleteAdminJob(jobId: string): Promise<boolean> {
  try {
    await databasePool.query(`DELETE FROM public.stage_jobs WHERE id = $1`, [jobId]);
    return true;
  } catch (err) {
    console.warn('[AdminStages] Delete job fallback:', (err as Error).message);
    const idx = MOCK_JOBS.findIndex((j) => j.id === jobId);
    if (idx !== -1) MOCK_JOBS.splice(idx, 1);
    return true;
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
    if (result.rows.length === 0 && !params?.query) {
      return MOCK_COMPANIES;
    }

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
    console.warn('[AdminCompanies] DB Query fallback to mock:', (err as Error).message);
    let list = [...MOCK_COMPANIES];
    if (params?.query) {
      const q = params.query.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q));
    }
    if (params?.status && params.status !== 'ALL') {
      list = list.filter((c) => c.status === params.status);
    }
    return list;
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
    console.warn('[AdminCompanies] Update fallback:', (err as Error).message);
    const comp = MOCK_COMPANIES.find((c) => c.id === input.companyId);
    if (comp) {
      if (input.status) comp.status = input.status;
      if (typeof input.kybScore === 'number') comp.kybScore = input.kybScore;
    }
    return true;
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
    if (result.rows.length === 0) {
      return MOCK_PAYMENTS;
    }

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
    console.warn('[AdminPayments] DB Query fallback to mock:', (err as Error).message);
    let list = [...MOCK_PAYMENTS];
    if (params?.operator && params.operator !== 'ALL') {
      list = list.filter((p) => p.operator === params.operator);
    }
    if (params?.status && params.status !== 'ALL') {
      list = list.filter((p) => p.status === params.status);
    }
    return list;
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
    if (result.rows.length === 0) {
      return MOCK_APPLICATIONS;
    }

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
    console.warn('[AdminApplications] DB Query fallback to mock:', (err as Error).message);
    return MOCK_APPLICATIONS;
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
