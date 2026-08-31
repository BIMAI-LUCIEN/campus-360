export type Transaction = {
  id: string;
  label: string;
  amount: number;
  type: 'topup' | 'purchase' | 'withdrawal' | 'commission' | 'report' | 'stage_token' | 'subscription';
  status: 'success' | 'pending' | 'failed';
  date: string;
};

export type CompanyStatus = 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED';
export type ApplyMethod = 'WHATSAPP' | 'EMAIL' | 'PHYSICAL';
export type JobSource = 'INTERNAL' | 'SCRAPED';
export type AppStatus = 'PENDING' | 'REVIEWING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';

export type StageCompany = {
  id: string;
  name: string;
  industry: string;
  address: string;
  contactEmail: string;
  contactWhatsapp?: string;
  kybScore: number;
  status: CompanyStatus;
  isPremium: boolean;
  logoUrl?: string;
};

export type StageJob = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  requirements: string[];
  applyMethod: ApplyMethod;
  isSponsored: boolean;
  source: JobSource;
  createdAt: string;
  expiresAt: string;
  location?: string;
  duration?: string; // ex: '3 mois', '6 mois'
  stipend?: string; // ex: 'Rémunéré (50 000 FCFA/mois)', 'Non rémunéré'
  company?: StageCompany;
  matchScore?: number; // Calculé dynamiquement (ex: 85)
  matchingSkills?: string[];
  flyerUrl?: string;
  videoUrl?: string;
};

export type StageApplication = {
  id: string;
  studentId: string;
  jobId: string;
  status: AppStatus;
  appliedAt: string;
  cvFileUrl?: string;
  letterFileUrl?: string;
  generatedCvText?: string;
  generatedLetterText?: string;
  lastRemindedAt?: string;
  job?: StageJob;
  notes?: string;
};

export type StudentProfileData = {
  id: string;
  authId: string;
  fullName: string;
  phoneWhatsapp?: string;
  email: string;
  educationLevel: string;
  major: string;
  skills: string[];
  portfolioUrl?: string;
  tokens: number;
  isPremium: boolean;
  boostEndsAt?: string;
  completionRate?: number;
  createdAt: string;
};

export type CampusDocument = {
  id: string;
  title: string;
  description: string;
  university: string;
  faculty: string;
  subject: string;
  teacher: string;
  level: string;
  academicYear: string;
  price: number;
  pageCount: number;
  filePath: string;
  previewPath?: string;
  fileSize: string;
  previewPages: number;
  rating: number;
  sales: number;
  downloads: number;
  uploaderName: string;
  status: 'draft' | 'analyzing' | 'needs_review' | 'published' | 'archived';
  commissionRate: number;
  createdAt: string;
  aiSummary?: string;
  aiTags?: string[];
  aiDifficulty?: string;
  suggestedPrice?: number;
  qualityScore?: number;
  studyPlan?: string[];
  quiz?: Array<{ question: string; answer: string }>;
};

export type CampusPdfPack = {
  id: string;
  title: string;
  description: string;
  university: string;
  faculty: string;
  level: string;
  semester: string;
  packType: 'semester' | 'exam_prep' | 'corrections' | 'course_bundle' | 'catch_up' | 'transversal';
  price: number;
  originalPrice: number;
  discountPercent: number;
  documentIds: string[];
  documentCount: number;
  pageCount: number;
  status: 'draft' | 'needs_review' | 'published' | 'archived';
  sales: number;
  revenue: number;
  aiSummary?: string;
  aiConfidence?: number;
  createdAt: string;
};

