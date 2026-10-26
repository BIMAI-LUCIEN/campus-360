import type { StageJob, StageApplication, StudentProfileData, AppStatus, OfficialCvData, JobKind } from '../../types';
import { authFetch, authFetchRaw } from '../auth/betterAuth';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { analyzeJobMatch } from './aiMatchEngine';
import { fitSecureStoreBudget, getUtf8ByteLength, pruneBulkyApplicationFields, purgeFakeApplications } from './applicationsCache';
import { companyEmail, companyWhatsapp } from './contactTargets';
import { fetchCvPhoto } from './cvPhoto';

export { fitSecureStoreBudget, getUtf8ByteLength, pruneBulkyApplicationFields, purgeFakeApplications };

// Applications created during this session; the server stays the source of truth.
let localApplications: StageApplication[] = [];
// Set once the server list has been read, so screens can show it again instantly.
let applicationsLoaded = false;

/** Applications already read from the server during this session, or null before the first load. */
export function peekStudentApplications(): StageApplication[] | null {
  return applicationsLoaded ? localApplications : null;
}

export function calculateMatchScore(
  userSkills: string[] = [],
  jobReqs: string[] = [],
  context?: {
    major?: string;
    educationLevel?: string;
    location?: string;
    jobTitle?: string;
    jobIndustry?: string;
  }
): { score: number; matchingSkills: string[]; headline?: string; badgeColor?: string } {
  const dummyJob: StageJob = {
    id: 'eval-job',
    companyId: 'eval-comp',
    title: context?.jobTitle || 'Stage',
    description: '',
    requirements: jobReqs,
    applyMethod: 'WHATSAPP',
    isSponsored: false,
    source: 'INTERNAL',
    createdAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    location: context?.location,
    company: context?.jobIndustry
      ? {
          id: 'eval-comp',
          name: 'Entreprise',
          industry: context.jobIndustry,
          address: context.location || 'Douala',
          contactEmail: 'contact@eval.cm',
          kybScore: 90,
          status: 'VERIFIED',
          isPremium: false,
        }
      : undefined,
  };

  const match = analyzeJobMatch(dummyJob, {
    skills: userSkills,
    major: context?.major,
    educationLevel: context?.educationLevel,
    location: context?.location,
  });

  return {
    score: match.score,
    matchingSkills: match.keyStrengths,
    headline: match.headline,
    badgeColor: match.badgeColor,
  };
}

export type StageJobsParams = {
  query?: string;
  sector?: string;
  contractType?: string;
  kind?: 'Tous' | JobKind;
  duration?: string;
  userSkills?: string[];
  studentProfile?: {
    major?: string;
    educationLevel?: string;
    skills?: string[];
    location?: string;
    address?: string;
  };
  /** Skip the cache (pull-to-refresh). */
  force?: boolean;
};

// Offers change a few times a day: keep the server list in memory so switching
// tabs shows it instantly instead of refetching every time.
const STAGE_JOBS_TTL_MS = 5 * 60 * 1000;
const stageJobsCache = new Map<string, { at: number; jobs: StageJob[] }>();
const stageJobsInFlight = new Map<string, Promise<StageJob[]>>();

const stageJobsSuffix = (params?: StageJobsParams) => {
  const search = new URLSearchParams();
  if (params?.query?.trim()) search.set('q', params.query.trim());
  if (params?.sector && params.sector !== 'Tous') search.set('sector', params.sector);
  return search.toString() ? `?${search.toString()}` : '';
};

async function loadServerStageJobs(suffix: string, force: boolean): Promise<StageJob[]> {
  const cached = stageJobsCache.get(suffix);
  if (!force && cached && Date.now() - cached.at < STAGE_JOBS_TTL_MS) return cached.jobs;
  const pending = stageJobsInFlight.get(suffix);
  if (pending) return pending;

  const request = (async () => {
    let response: Response;
    try {
      response = await authFetchRaw(`/api/mobile/stages${suffix}`);
    } catch {
      throw new Error('Pas de connexion au serveur. Vérifie ta connexion et réessaie.');
    }
    const payload = (await response.json().catch(() => ({}))) as { jobs?: StageJob[]; error?: string };
    if (!response.ok) {
      throw new Error(payload.error || 'Offres indisponibles pour le moment.');
    }
    const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
    stageJobsCache.set(suffix, { at: Date.now(), jobs });
    return jobs;
  })();
  stageJobsInFlight.set(suffix, request);
  try {
    return await request;
  } finally {
    stageJobsInFlight.delete(suffix);
  }
}

/** Ranked offers already in memory for these filters, or null when nothing is cached yet. */
export function peekStageJobs(params?: StageJobsParams): StageJob[] | null {
  const cached = stageJobsCache.get(stageJobsSuffix(params));
  return cached ? rankStageJobs(cached.jobs, params) : null;
}

/** True when the cached list for these filters is recent enough to skip the network. */
export function isStageJobsCacheFresh(params?: StageJobsParams): boolean {
  const cached = stageJobsCache.get(stageJobsSuffix(params));
  return Boolean(cached && Date.now() - cached.at < STAGE_JOBS_TTL_MS);
}

export async function fetchStageJobs(params?: StageJobsParams): Promise<StageJob[]> {
  const jobs = await loadServerStageJobs(stageJobsSuffix(params), Boolean(params?.force));
  return rankStageJobs(jobs, params);
}

function rankStageJobs(source: StageJob[], params?: StageJobsParams): StageJob[] {
  let jobsList = source;

  // Filtrage local par mot-clé
  if (params?.query?.trim()) {
    const q = params.query.toLowerCase().trim();
    jobsList = jobsList.filter(
      (job) =>
        job.title.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.company?.name.toLowerCase().includes(q) ||
        job.location?.toLowerCase().includes(q) ||
        job.requirements.some((r) => r.toLowerCase().includes(q))
    );
  }

  // Filtrage local par secteur
  if (params?.sector && params.sector !== 'Tous') {
    const s = params.sector.toLowerCase().trim();
    jobsList = jobsList.filter(
      (job) =>
        job.company?.industry.toLowerCase().includes(s) ||
        job.title.toLowerCase().includes(s) ||
        job.requirements.some((r) => r.toLowerCase().includes(s))
    );
  }

  // Filtrage local stage / emploi
  if (params?.kind && params.kind !== 'Tous') {
    jobsList = jobsList.filter((job) => (job.kind ?? 'stage') === params.kind);
  }

  // Filtrage local par type de contrat
  if (params?.contractType && params.contractType !== 'Tous') {
    const ct = params.contractType.toLowerCase().trim();
    jobsList = jobsList.filter(
      (job) => job.contractType?.toLowerCase().includes(ct)
    );
  }

  return jobsList
    .map((job) => {
      const match = analyzeJobMatch(job, {
        skills: params?.userSkills || params?.studentProfile?.skills || [],
        major: params?.studentProfile?.major,
        educationLevel: params?.studentProfile?.educationLevel,
        location: params?.studentProfile?.location || params?.studentProfile?.address,
      });
      return {
        ...job,
        matchScore: match.score,
        matchHeadline: match.headline,
        matchBadgeColor: match.badgeColor,
        matchReasons: match.matchedPoints,
        matchingSkills: match.keyStrengths,
      };
    })
    .sort((a, b) => {
      if (a.isSponsored && !b.isSponsored) return -1;
      if (!a.isSponsored && b.isSponsored) return 1;
      return (b.matchScore || 0) - (a.matchScore || 0);
    });
}

export type GeneratedApplicationResult = {
  applicationId: string;
  cvText: string;
  letterText: string;
  officialCv?: OfficialCvData;
  pdfDownloadUrl?: string;
  whatsappUrl?: string;
  emailSubject: string;
  emailBody: string;
  recipientEmail?: string;
  recipientWhatsapp?: string;
};

const orTodo = (text: string) => text.trim() || '[à compléter]';

// Plain-text version of the CV (copy, "Modifier" tab, application record).
export const buildCvText = (officialCv: OfficialCvData): string => {
  const { nom, prenom, email, telephone } = officialCv.detailsPersonnels;
  return `CURRICULUM VITAE — ${nom} ${prenom}
${officialCv.titrePoste.toUpperCase()}${officialCv.profil ? `

PROFIL :
${officialCv.profil}` : ''}

DÉTAILS PERSONNELS :
Nom : ${nom} | Prénom : ${prenom}
Email : ${email || '[à compléter]'} | Téléphone : ${telephone || '[à compléter]'}

EXPÉRIENCE PROFESSIONNELLE :
${orTodo(officialCv.experiences.map(e => `• ${e.poste} — ${e.entreprise}, ${e.ville} (${e.periode})\n  ${e.missions.map(m => '- ' + m).join('\n  ')}`).join('\n'))}

FORMATION :
${orTodo(officialCv.formations.map(f => `• ${[f.diplome, f.etablissement, f.ville].filter(Boolean).join(' — ')} (${f.periode})`).join('\n'))}

COMPÉTENCES PROFESSIONNELLES :
${orTodo(officialCv.competences.professionnelles.map(x => '• ' + x).join('\n'))}

HABILITÉS PERSONNELLES ET RELATIONNELLES :
${orTodo(officialCv.competences.habilitesRelationnelles.join(', '))}

MAÎTRISE DES LOGICIELS :
${orTodo(officialCv.competences.logiciels.map(l => `• ${l.categorie} : ${l.items.join(', ')}`).join('\n'))}

LANGUES :
${orTodo(officialCv.langues.map(l => `• ${l.langue}${l.niveau ? ` : ${l.niveau}` : ''}`).join('\n'))}

AUTRES INFORMATIONS IMPORTANTES :
Loisirs : ${orTodo(officialCv.loisirs.join(', '))}`.trim();
};

/**
 * Asks the AI to fill the CV from the profile and the student's notes, targeted
 * at the offer (mobile-api /api/mobile/stages/cv). Only the written parts come
 * back: merge them with mergeAiCv. Throws when the AI is unavailable.
 */
export async function fillCvWithAi(
  job: StageJob,
  student: { fullName: string; university?: string; major: string; educationLevel: string; skills: string[] },
  notes: string,
): Promise<Partial<OfficialCvData>> {
  const response = await authFetch('/api/mobile/stages/cv', {
    method: 'POST',
    body: JSON.stringify({
      job: {
        title: job.title,
        company: job.company?.name,
        description: job.description?.slice(0, 4000),
        requirements: job.requirements?.slice(0, 30),
      },
      student: {
        fullName: student.fullName,
        university: student.university || undefined,
        major: student.major && student.major !== 'Non renseigné' ? student.major : undefined,
        educationLevel: student.educationLevel || undefined,
        skills: student.skills.slice(0, 40),
      },
      notes: notes.trim().slice(0, 4000) || undefined,
    }),
  });
  const payload = (await response.json()) as { cv?: Partial<OfficialCvData> };
  if (!payload.cv) throw new Error("L'IA n'a pas pu remplir le CV.");
  return payload.cv;
}

export async function generateIaApplication(
  job: StageJob,
  student: {
    fullName: string;
    email: string;
    phoneWhatsapp?: string;
    university?: string;
    major: string;
    educationLevel: string;
    skills: string[];
    portfolioUrl?: string;
  }
): Promise<GeneratedApplicationResult> {
  const companyName = job.company?.name || "l'entreprise";
  const matchingSkillsStr = student.skills.slice(0, 3).join(', ') || 'mes compétences';

  const nameParts = (student.fullName || '').trim().split(/\s+/).filter(Boolean);
  if (nameParts.length === 0) {
    throw new Error('Ajoute ton nom dans ton profil avant de préparer une candidature.');
  }
  const nom = nameParts[0].toUpperCase();
  const prenom = nameParts.slice(1).join(' ');
  const level = (student.educationLevel || '').trim();
  const major = (student.major || '').trim();

  // Only what the student told us. Missing parts print as "[à compléter]" in the CV.
  const officialCv: OfficialCvData = {
    titrePoste: job.title,
    // The photo is optional: an unreachable account never blocks the application.
    photoUrl: await fetchCvPhoto().catch(() => null) || undefined,
    detailsPersonnels: {
      nom,
      prenom,
      email: student.email,
      telephone: student.phoneWhatsapp || '',
    },
    experiences: [],
    formations: level || major
      ? [{ diplome: [level, major].filter(Boolean).join(' en '), etablissement: student.university?.trim() || '', ville: '', periode: 'En cours' }]
      : [],
    competences: {
      professionnelles: student.skills,
      habilitesRelationnelles: [],
      logiciels: [],
    },
    langues: [],
    loisirs: [],
  };

  const cvText = buildCvText(officialCv);

  const letterText = `À l'attention du Responsable des Recrutements,
${companyName}

Objet : Candidature pour le poste de ${job.title}

Madame, Monsieur,

Actuellement en ${student.educationLevel} en ${student.major}, c'est avec un vif intérêt que je vous adresse ma candidature pour l'opportunité de "${job.title}" au sein de ${companyName}.

Votre recherche de profils maîtrisant ${job.requirements.slice(0, 3).join(', ')} correspond étroitement à mon parcours académique et à mes réalisations pratiques. Au cours de ma formation, j'ai notamment consolidé mon expertise en ${matchingSkillsStr}, ce qui me permet d'être rapidement opérationnel(le) et force de proposition dans vos missions.

Rejoindre ${companyName} représente pour moi l'opportunité idéale d'apporter ma rigueur, ma créativité et mon dynamisme tout en contribuant concrètement à vos projets d'envergure.

Je reste à votre entière disposition pour tout échange ou entretien.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${student.fullName}
${student.phoneWhatsapp ? 'WhatsApp : ' + student.phoneWhatsapp : ''}
${student.email}`.trim();

  const companyPhone = companyWhatsapp(job.company);
  const whatsappMessage = encodeURIComponent(
    `Bonjour ${companyName}, je suis ${student.fullName}, étudiant en ${student.major}. Je vous transmets ma candidature pour le poste de "${job.title}".`
  );
  const whatsappUrl = companyPhone ? `https://wa.me/${companyPhone}?text=${whatsappMessage}` : undefined;

  const emailSubject = encodeURIComponent(`Candidature : ${job.title} — ${student.fullName}`);
  const emailBody = encodeURIComponent(letterText);

  return {
    applicationId: '',
    cvText,
    letterText,
    officialCv,
    whatsappUrl,
    emailSubject,
    emailBody,
    recipientEmail: companyEmail(job.company) ?? undefined,
    recipientWhatsapp: job.company?.contactWhatsapp,
  };
}

export async function submitStageApplication(
  job: StageJob,
  cvText: string,
  letterText: string,
  officialCv?: OfficialCvData,
): Promise<string> {
  let response: Response;
  try {
    response = await authFetchRaw('/api/mobile/stages/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, cvText, letterText }),
    });
  } catch {
    throw new Error('Pas de connexion au serveur. Vérifie ta connexion et réessaie.');
  }
  const payload = (await response.json().catch(() => ({}))) as { application?: { id?: string }; error?: string };
  const appId = payload.application?.id;
  if (!response.ok || !appId) {
    throw new Error(payload.error || "Ta candidature n'a pas pu être enregistrée.");
  }

  const newApplication: StageApplication = {
    id: appId,
    studentId: 'student-current',
    jobId: job.id,
    status: 'PENDING',
    appliedAt: new Date().toISOString(),
    job,
    generatedCvText: cvText,
    generatedLetterText: letterText,
    officialCv,
  };

  localApplications = [newApplication, ...localApplications.filter((a) => a.id !== appId)];
  persistApplicationsLocally(localApplications);

  return appId;
}

export interface DispatchStageApplicationParams {
  jobId: string;
  channel: 'whatsapp' | 'email';
  whatsappPitch?: string;
  letterText?: string;
  cvPdfBase64?: string;
  cvPdfUrl?: string;
  studentNotes?: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  phoneNumber?: string;
  officialCv?: OfficialCvData;
  cvText?: string;
  job?: StageJob;
}

export interface DispatchStageApplicationResult {
  success: boolean;
  applicationId: string;
  status: AppStatus;
  cvUrl?: string;
  message: string;
}

/**
 * Expédie la candidature en 1-Clic via l'API backend /api/mobile/stages/dispatch (Evolution API & N8N SMTP)
 * et persiste le dossier localement et sur le serveur.
 */
export async function dispatchStageApplication(
  params: DispatchStageApplicationParams
): Promise<DispatchStageApplicationResult> {
  const phone = params.studentPhone || params.phoneNumber || '';

  let response: Response;
  try {
    response = await authFetchRaw('/api/mobile/stages/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: params.jobId,
        channel: params.channel,
        whatsappPitch: params.whatsappPitch || '',
        letterText: params.letterText || '',
        cvPdfBase64: params.cvPdfBase64 || '',
        cvPdfUrl: params.cvPdfUrl?.trim() || undefined,
        studentNotes: params.studentNotes?.trim() || undefined,
        studentName: params.studentName?.trim() || undefined,
        studentEmail: params.studentEmail?.trim() || undefined,
        studentPhone: phone?.trim() || undefined,
        phoneNumber: phone?.trim() || undefined,
      }),
    });
  } catch {
    throw new Error('Pas de connexion au serveur. Vérifie ta connexion et réessaie.');
  }

  const payload = (await response.json().catch(() => ({}))) as {
    applicationId?: string;
    status?: AppStatus;
    cvUrl?: string;
    message?: string;
    error?: string;
  };
  if (!response.ok || !payload.applicationId) {
    throw new Error(payload.error || "L'envoi a échoué. Réessaie.");
  }

  const appId = payload.applicationId;
  const status: AppStatus = payload.status || 'SENT_PENDING';
  const cvUrl = payload.cvUrl || params.cvPdfUrl;

  if (params.job) {
    const newApplication: StageApplication = {
      id: appId,
      studentId: 'student-current',
      jobId: params.jobId,
      status,
      appliedAt: new Date().toISOString(),
      job: params.job,
      cvFileUrl: cvUrl,
      generatedCvText: params.cvText,
      generatedLetterText: params.letterText,
      officialCv: params.officialCv,
      notes: `Candidature 1-Clic via ${params.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}.`,
    };
    localApplications = [newApplication, ...localApplications.filter((a) => a.id !== appId)];
    persistApplicationsLocally(localApplications);
  }

  return {
    success: true,
    applicationId: appId,
    status,
    cvUrl,
    message: payload.message || (params.channel === 'whatsapp' ? 'Candidature envoyée par WhatsApp.' : 'Candidature envoyée par e-mail.'),
  };
}

const APPLICATIONS_STORAGE_KEY = 'campus360_student_applications';

export async function getStoredApplicationsAsync(): Promise<StageApplication[]> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
      }
    } else {
      raw = await SecureStore.getItemAsync(APPLICATIONS_STORAGE_KEY).catch(() => null);
    }
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const stored = parsed as StageApplication[];
        const clean = purgeFakeApplications(stored);
        // Old builds stored sample seeds and offline placeholders: rewrite without them.
        if (clean.length !== stored.length) persistApplicationsLocally(clean);
        return clean;
      }
    }
  } catch (err) {
    console.warn('[stagesApi] Error reading stored applications:', err);
  }
  return [];
}

export function persistApplicationsLocally(apps: StageApplication[]): void {
  try {
    const leanApps = apps.map(pruneBulkyApplicationFields);
    const raw = JSON.stringify(leanApps);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(APPLICATIONS_STORAGE_KEY, raw);
      }
    } else {
      const safePayload = fitSecureStoreBudget(apps, 1800);
      SecureStore.setItemAsync(APPLICATIONS_STORAGE_KEY, safePayload).catch(() => {});
    }
  } catch (err) {
    console.warn('[stagesApi] Error persisting applications locally:', err);
  }
}

export async function fetchStudentApplications(): Promise<StageApplication[]> {
  let response: Response;
  try {
    response = await authFetchRaw('/api/mobile/stages/applications');
  } catch {
    throw new Error('Pas de connexion au serveur. Vérifie ta connexion et réessaie.');
  }
  const payload = (await response.json().catch(() => ({}))) as { applications?: StageApplication[]; error?: string };
  if (!response.ok || !Array.isArray(payload.applications)) {
    throw new Error(payload.error || 'Candidatures indisponibles pour le moment.');
  }
  // The server is the source of truth, including when the student has no application yet.
  localApplications = payload.applications;
  applicationsLoaded = true;
  persistApplicationsLocally(localApplications);
  return payload.applications;
}

export async function updateApplicationStatus(applicationId: string, status: AppStatus): Promise<boolean> {
  try {
    const response = await authFetchRaw('/api/mobile/stages/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, status }),
    });
    if (!response.ok) return false;
  } catch {
    return false;
  }
  localApplications = localApplications.map((a) =>
    a.id === applicationId ? { ...a, status } : a
  );
  persistApplicationsLocally(localApplications);
  return true;
}

export async function withdrawStageApplication(applicationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authFetchRaw('/api/mobile/stages/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, status: 'WITHDRAWN' }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return { success: false, error: data?.error || 'Impossible de retirer la candidature.' };
    }
    localApplications = localApplications.map((a) =>
      a.id === applicationId ? { ...a, status: 'WITHDRAWN' } : a
    );
    persistApplicationsLocally(localApplications);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur réseau.' };
  }
}

export async function updateApplicationNotes(applicationId: string, notes: string): Promise<boolean> {
  localApplications = localApplications.map((a) =>
    a.id === applicationId ? { ...a, notes } : a
  );
  persistApplicationsLocally(localApplications);
  return true;
}

export function getDaysSinceApplication(appliedAt: string): number {
  const appliedDate = new Date(appliedAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - appliedDate);
  return Math.floor(diffMs / (24 * 3600 * 1000));
}

export function isEligibleForFollowup(app: StageApplication): boolean {
  if (app.status !== 'PENDING' && app.status !== 'SENT_PENDING' && app.status !== 'DELIVERED') return false;
  return getDaysSinceApplication(app.appliedAt) >= 7;
}

export function generateFollowupReminderMessage(app: StageApplication, studentName: string): string {
  const company = app.job?.company?.name || "l'Entreprise";
  const jobTitle = app.job?.title || 'le stage';
  const appliedDateStr = new Date(app.appliedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `Bonjour ${company}, je me permets de faire suite à ma candidature du ${appliedDateStr} pour le poste de "${jobTitle}". Toujours très motivé pour rejoindre vos équipes, je me tiens à votre disposition pour échanger. Bien cordialement, ${studentName}.`;
}

export async function recordApplicationReminder(applicationId: string): Promise<boolean> {
  const app = localApplications.find((a) => a.id === applicationId);
  if (app) {
    app.lastRemindedAt = new Date().toISOString();
    persistApplicationsLocally(localApplications);
    return true;
  }
  return false;
}

export async function directReachRecruiter(jobId: string, customNotes?: string) {
  const response = await authFetch('/api/mobile/stages/direct-reach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, customNotes }),
  });
  return response.json();
}
