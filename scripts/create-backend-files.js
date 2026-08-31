const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// 1. Prisma Schema
ensureDir(path.join(__dirname, '..', 'admin-app', 'prisma'));
const prismaSchema = `// Prisma Schema Exhaustif — Campus 360 Matching & Automatisation de Stages
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Student {
  id              String        @id @default(uuid())
  authId          String        @unique // Lié à Better Auth / Supabase Auth
  fullName        String
  phoneWhatsapp   String?       @unique
  email           String        @unique
  educationLevel  String        // ex: IUT, 2ème année / Licence 2
  major           String        // ex: Informatique, Gestion, Droit
  skills          String[]
  portfolioUrl    String?
  tokens          Int           @default(1) // Crédits de postulation IA (1 offert)
  isPremium       Boolean       @default(false)
  boostEndsAt     DateTime?
  createdAt       DateTime      @default(now())
  applications    Application[]
}

model Company {
  id              String        @id @default(uuid())
  name            String
  industry        String
  address         String
  contactEmail    String
  contactWhatsapp String?
  kybScore        Int           @default(0) // Score IA Anti-Fraude 0-100
  status          CompanyStatus @default(UNVERIFIED)
  isPremium       Boolean       @default(false)
  createdAt       DateTime      @default(now())
  jobs            Job[]
}

model Job {
  id              String        @id @default(uuid())
  companyId       String
  title           String
  description     String        // Limité à 1500 caractères
  requirements    String[]
  applyMethod     ApplyMethod   // WHATSAPP, EMAIL, PHYSICAL
  isSponsored     Boolean       @default(false)
  source          JobSource     @default(INTERNAL) // INTERNAL ou SCRAPED
  location        String?
  duration        String?       // ex: '3 mois', '6 mois'
  stipend         String?       // ex: 'Rémunéré (80 000 FCFA/mois)'
  createdAt       DateTime      @default(now())
  expiresAt       DateTime
  company         Company       @relation(fields: [companyId], references: [id])
  applications    Application[]
}

model Application {
  id                  String      @id @default(uuid())
  studentId           String
  jobId               String
  status              AppStatus   @default(PENDING)
  appliedAt           DateTime    @default(now())
  cvFileUrl           String?     // Lien vers le PDF généré
  letterFileUrl       String?
  generatedCvText     String?
  generatedLetterText String?
  lastRemindedAt      DateTime?
  student             Student     @relation(fields: [studentId], references: [id])
  job                 Job         @relation(fields: [jobId], references: [id])
}

enum CompanyStatus {
  UNVERIFIED
  VERIFIED
  SUSPENDED
}

enum ApplyMethod {
  WHATSAPP
  EMAIL
  PHYSICAL
}

enum JobSource {
  INTERNAL
  SCRAPED
}

enum AppStatus {
  PENDING
  REVIEWING
  INTERVIEW
  ACCEPTED
  REJECTED
}
`;

fs.writeFileSync(path.join(__dirname, '..', 'admin-app', 'prisma', 'schema.prisma'), prismaSchema, 'utf8');
console.log('Created admin-app/prisma/schema.prisma');

// 2. docs/STAGES_SUPABASE.sql
ensureDir(path.join(__dirname, '..', 'docs'));
const stagesSql = `-- Migration SQL Exhaustive — Campus 360 Stages & Automatisation IA
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type company_status as enum ('UNVERIFIED', 'VERIFIED', 'SUSPENDED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type apply_method as enum ('WHATSAPP', 'EMAIL', 'PHYSICAL');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type job_source as enum ('INTERNAL', 'SCRAPED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type stage_app_status as enum ('PENDING', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED');
exception when duplicate_object then null;
end $$;

-- Table Students
create table if not exists public.stage_students (
  id uuid primary key default gen_random_uuid(),
  auth_id text unique not null,
  full_name text not null,
  phone_whatsapp text unique,
  email text unique not null,
  education_level text not null default 'Licence 2',
  major text not null default 'Informatique',
  skills text[] not null default '{}',
  portfolio_url text,
  tokens integer not null default 1 check (tokens >= 0),
  is_premium boolean not null default false,
  boost_ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- Table Companies
create table if not exists public.stage_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null,
  address text not null,
  contact_email text not null,
  contact_whatsapp text,
  kyb_score integer not null default 0 check (kyb_score between 0 and 100),
  status company_status not null default 'UNVERIFIED',
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

-- Table Jobs
create table if not exists public.stage_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.stage_companies(id) on delete cascade,
  title text not null,
  description text not null check (char_length(description) <= 2000),
  requirements text[] not null default '{}',
  apply_method apply_method not null default 'WHATSAPP',
  is_sponsored boolean not null default false,
  source job_source not null default 'INTERNAL',
  location text default 'Abidjan / Hybride',
  duration text default '3 à 6 mois',
  stipend text default 'Rémunéré',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

-- Table Applications
create table if not exists public.stage_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.stage_students(id) on delete cascade,
  job_id uuid not null references public.stage_jobs(id) on delete cascade,
  status stage_app_status not null default 'PENDING',
  applied_at timestamptz not null default now(),
  cv_file_url text,
  letter_file_url text,
  generated_cv_text text,
  generated_letter_text text,
  last_reminded_at timestamptz
);

-- Indexes for high performance querying
create index if not exists idx_stage_jobs_company on public.stage_jobs(company_id);
create index if not exists idx_stage_jobs_sponsored on public.stage_jobs(is_sponsored, created_at desc);
create index if not exists idx_stage_apps_student on public.stage_applications(student_id);
create index if not exists idx_stage_apps_job on public.stage_applications(job_id);
create index if not exists idx_stage_apps_pending on public.stage_applications(status, applied_at);
`;

fs.writeFileSync(path.join(__dirname, '..', 'docs', 'STAGES_SUPABASE.sql'), stagesSql, 'utf8');
console.log('Created docs/STAGES_SUPABASE.sql');

// 3. admin-app/lib/stages-db.ts
ensureDir(path.join(__dirname, '..', 'admin-app', 'lib'));
const stagesDbCode = `import { databasePool } from './database';

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
    let query = \`
      SELECT j.*, c.name as company_name, c.industry as company_industry, c.status as company_status
      FROM stage_jobs j
      JOIN stage_companies c ON j.company_id = c.id
      WHERE j.expires_at > NOW()
    \`;
    const values: any[] = [];

    if (params?.sector && params.sector !== 'Tous') {
      values.push(\`%\${params.sector}%\`);
      query += \` AND (c.industry ILIKE $\${values.length} OR j.title ILIKE $\${values.length})\`;
    }

    if (params?.query && params.query.trim()) {
      values.push(\`%\${params.query.trim()}%\`);
      query += \` AND (j.title ILIKE $\${values.length} OR j.description ILIKE $\${values.length} OR c.name ILIKE $\${values.length})\`;
    }

    query += \` ORDER BY j.is_sponsored DESC, j.created_at DESC LIMIT 50\`;

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
`;

fs.writeFileSync(path.join(__dirname, '..', 'admin-app', 'lib', 'stages-db.ts'), stagesDbCode, 'utf8');
console.log('Created admin-app/lib/stages-db.ts');

// 4. admin-app/app/api/mobile/stages/route.ts
ensureDir(path.join(__dirname, '..', 'admin-app', 'app', 'api', 'mobile', 'stages'));
const stagesRouteCode = `import { NextResponse } from 'next/server';
import { listStageJobs } from '../../../../../lib/stages-db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || undefined;
  const sector = searchParams.get('sector') || undefined;

  const jobs = await listStageJobs({ query, sector });
  return NextResponse.json({
    success: true,
    count: jobs.length,
    jobs: jobs,
  });
}
`;

fs.writeFileSync(path.join(__dirname, '..', 'admin-app', 'app', 'api', 'mobile', 'stages', 'route.ts'), stagesRouteCode, 'utf8');
console.log('Created admin-app/app/api/mobile/stages/route.ts');

