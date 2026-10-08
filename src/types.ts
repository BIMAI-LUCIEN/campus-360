// ── Grille Tarifaire Officielle Campus 360 (Pay-Per-Action en FCFA) ─────
export const PRICE_STAGE_APPLY = 500; // Candidature 1-clic RH (1ère offerte)
export const PRICE_REPORT = 2000;      // Rédaction Rapport de stage IA (25-45 pages)
export const PRICE_THESIS = 5000;      // Rédaction Mémoire de fin d'études IA (50-100 pages)
export const PRICE_PDF = 250;          // Document / épreuve certifiée (Annales 100% gratuites)
export const MIN_WALLET_RECHARGE = 500;// Seuil de recharge minimum Mobile Money

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
export type AppStatus =
  | 'PENDING'
  | 'SENT_PENDING'
  | 'DELIVERED'
  | 'FAILED'
  | 'REVIEWING'
  | 'INTERVIEW'
  | 'ACCEPTED'
  | 'REJECTED';

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
  contractType?: string; // ex: 'Stage PFE', 'Premier Emploi', 'Alternance'
  stipend?: string; // ex: 'Rémunéré (50 000 FCFA/mois)', 'Non rémunéré'
  company?: StageCompany;
  matchScore?: number; // Calculé dynamiquement (ex: 85)
  matchHeadline?: string; // ex: 'Match Exceptionnel (95%)'
  matchBadgeColor?: string; // ex: '#10B981'
  matchReasons?: string[]; // Raisons clés du match
  matchingSkills?: string[];
  flyerUrl?: string;
  videoUrl?: string;
  workspacePhotos?: string[];
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
  officialCv?: OfficialCvData;
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

export type ScrapedStageReport = {
  id: string;
  title: string;
  theme?: string;
  author?: string;
  school?: string;
  company?: string;
  field: string;
  level?: string;
  academic_year?: string;
  abstract?: string;
  table_of_contents?: string[];
  file_url: string;
  source_platform: string;
  source_url: string;
  tags?: string[];
  quality_score: number;
  view_count?: number;
  download_count?: number;
  created_at: string;
};

// ── Official CV Template Types (Gabarit Officiel 2 Colonnes) ─────────────
export type CvPersonalDetails = {
  nom: string;
  prenom: string;
  nationalite: string;
  age: string;
  email: string;
  telephone: string;
  adresse: string;
};

export type CvExperience = {
  poste: string;
  entreprise: string;
  ville: string;
  periode: string;
  missions: string[];
};

export type CvFormation = {
  diplome: string;
  etablissement: string;
  ville: string;
  periode: string;
};

export type CvLogicielCategory = {
  categorie?: string;
  items: string[];
};

export type CvCompetences = {
  professionnelles: string[];
  habilitesRelationnelles: string[];
  logiciels: CvLogicielCategory[];
};

export type CvLangue = {
  langue: string;
  niveau: string;
};

export type OfficialCvData = {
  titrePoste: string;
  photoUrl?: string;
  detailsPersonnels: CvPersonalDetails;
  experiences: CvExperience[];
  formations: CvFormation[];
  competences: CvCompetences;
  langues: CvLangue[];
  loisirs: string[];
};
