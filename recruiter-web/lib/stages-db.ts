import { databasePool } from './database';

export type DbStudent = {
  id: string;
  auth_id: string;
  full_name: string;
  phone_whatsapp: string | null;
  email: string;
  education_level: string;
  major: string;
  skills: string[];
  portfolio_url: string | null;
  tokens: number;
  is_premium: boolean;
  boost_ends_at: string | null;
  created_at: string;
};

export type DbCompany = {
  id: string;
  name: string;
  industry: string;
  address: string;
  contact_email: string;
  contact_whatsapp: string | null;
  kyb_score: number;
  status: 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED';
  is_premium: boolean;
  created_at: string;
};

export type DbJob = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  requirements: string[];
  apply_method: 'WHATSAPP' | 'EMAIL' | 'PHYSICAL';
  is_sponsored: boolean;
  source: 'INTERNAL' | 'SCRAPED';
  location: string | null;
  duration: string | null;
  stipend: string | null;
  created_at: string;
  expires_at: string;
  company_name?: string;
  company_industry?: string;
  company_status?: string;
};

export async function listStageJobs(params?: {
  query?: string;
  sector?: string;
  isSponsoredOnly?: boolean;
}): Promise<DbJob[]> {
  try {
    let query = `
      SELECT j.*, c.name as company_name, c.industry as company_industry, c.status as company_status
      FROM stage_jobs j
      JOIN stage_companies c ON j.company_id = c.id
      WHERE j.expires_at > NOW()
    `;
    const values: any[] = [];

    if (params?.sector && params.sector !== 'Tous') {
      values.push(`%${params.sector}%`);
      query += ` AND (c.industry ILIKE $${values.length} OR j.title ILIKE $${values.length})`;
    }

    if (params?.query && params.query.trim()) {
      values.push(`%${params.query.trim()}%`);
      query += ` AND (j.title ILIKE $${values.length} OR j.description ILIKE $${values.length} OR c.name ILIKE $${values.length})`;
    }

    query += ` ORDER BY j.is_sponsored DESC, j.created_at DESC LIMIT 50`;

    const res = await databasePool.query(query, values);
    return res.rows;
  } catch (error) {
    console.warn('[stages-db] Database fallback: tables may not exist yet in Postgres:', error);
    return [];
  }
}

export async function evaluateCompanyKyb(companyName: string, websiteOrSocial: string): Promise<{ score: number; status: 'VERIFIED' | 'UNVERIFIED' }> {
  // KYB anti-fraud simulation or AI analysis
  const hasValidPresence = websiteOrSocial.length > 5;
  const score = hasValidPresence ? 88 : 45;
  return {
    score,
    status: score >= 80 ? 'VERIFIED' : 'UNVERIFIED',
  };
}
