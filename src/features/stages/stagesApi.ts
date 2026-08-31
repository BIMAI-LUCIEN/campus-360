import type { StageJob, StageApplication, StageCompany, StudentProfileData, AppStatus, ApplyMethod } from '../../types';

export const SEED_COMPANIES: StageCompany[] = [
  {
    id: 'comp-1',
    name: 'TechNovation Labs',
    industry: 'Ingénierie & Informatique',
    address: 'Abidjan, Cocody Riviera 3',
    contactEmail: 'recrutement@technovation.ci',
    contactWhatsapp: '+2250708091011',
    kybScore: 95,
    status: 'VERIFIED',
    isPremium: true,
  },
  {
    id: 'comp-2',
    name: 'Cabinet FicoConsulting',
    industry: 'Comptabilité, Finance & Audit',
    address: 'Dakar, Plateau',
    contactEmail: 'stages@ficoconsulting.sn',
    contactWhatsapp: '+221770001122',
    kybScore: 92,
    status: 'VERIFIED',
    isPremium: false,
  },
  {
    id: 'comp-3',
    name: 'AfriDigital Agency',
    industry: 'Marketing Digital & Design',
    address: 'Cotonou, Haie Vive',
    contactEmail: 'contact@afridigi.bj',
    contactWhatsapp: '+22997001122',
    kybScore: 88,
    status: 'VERIFIED',
    isPremium: true,
  },
  {
    id: 'comp-4',
    name: 'AgroLogix Solutions',
    industry: 'Logistique & Supply Chain',
    address: 'Douala, Bonanjo',
    contactEmail: 'rh@agrologix.cm',
    contactWhatsapp: '+237690001122',
    kybScore: 84,
    status: 'VERIFIED',
    isPremium: false,
  },
];

export const SEED_JOBS: StageJob[] = [
  {
    id: 'job-1',
    companyId: 'comp-1',
    title: 'Stagiaire Développeur Frontend React / Mobile',
    description: "Participez à la refonte de nos applications mobiles et dashboards clients. Vous collaborerez avec l'équipe produit sur l'intégration de composants React Native et la consommation d'APIs REST/GraphQL.",
    requirements: ['React', 'TypeScript', 'React Native', 'Git', 'Tailwind CSS'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Abidjan / Hybride',
    duration: '3 à 6 mois',
    stipend: 'Rémunéré (80 000 FCFA/mois)',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[0],
  },
  {
    id: 'job-2',
    companyId: 'comp-2',
    title: 'Assistant(e) Comptable & Audit Junior',
    description: "Sous la responsabilité du Chef de mission, vous participerez aux travaux de tenue comptable, de rapprochements bancaires et à l'élaboration des états financiers de synthèse.",
    requirements: ['Comptabilité', 'Excel Avancé', 'SYSCOHADA', 'Audit', 'Fiscalité'],
    applyMethod: 'EMAIL',
    isSponsored: false,
    source: 'INTERNAL',
    location: 'Dakar',
    duration: '6 mois',
    stipend: 'Rémunéré (75 000 FCFA/mois)',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[1],
  },
  {
    id: 'job-3',
    companyId: 'comp-3',
    title: 'Stagiaire UI/UX Designer & Brand Content',
    description: "Conception de maquettes d'applications sous Figma, création de supports visuels promotionnels, refonte de charte graphique et prototypage rapide.",
    requirements: ['Figma', 'UI/UX Design', 'Photoshop', 'Canva', 'Design System'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Cotonou / Télétravail',
    duration: '3 mois',
    stipend: 'Rémunéré (60 000 FCFA/mois)',
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[2],
  },
  {
    id: 'job-4',
    companyId: 'comp-4',
    title: 'Assistant Gestionnaire Logistique & Transport',
    description: "Suivi des flux de stocks, coordination des livraisons régionales, optimisation des bordereaux d'expédition et reporting hebdomadaire des opérations.",
    requirements: ['Gestion de stock', 'Excel', 'Logistique', 'Organisation', 'Transport'],
    applyMethod: 'PHYSICAL',
    isSponsored: false,
    source: 'SCRAPED',
    location: 'Douala, Zone Portuaire',
    duration: '3 à 6 mois',
    stipend: 'Indemnité transport fournie',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[3],
  },
  {
    id: 'job-5',
    companyId: 'comp-1',
    title: 'Stagiaire Développeur Python & Data Scraping',
    description: "Conception de robots d'automatisation de flux de données, intégration des modèles d'IA Gemini et traitement automatisé de documents.",
    requirements: ['Python', 'SQL', 'Git', 'Data', 'API'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Abidjan / Télétravail',
    duration: '6 mois',
    stipend: 'Rémunéré (100 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[0],
  },
  {
    id: 'job-6',
    companyId: 'comp-3',
    title: 'Assistant(e) Communication & Social Media Pitch',
    description: "Gestion des publications LinkedIn/TikTok, création de vidéos courtes de démo et engagement de la communauté.",
    requirements: ['Social Media', 'Canva', 'Rédaction', 'Communication'],
    applyMethod: 'EMAIL',
    isSponsored: false,
    source: 'INTERNAL',
    location: 'Abidjan',
    duration: '3 mois',
    stipend: 'Rémunéré (50 000 FCFA/mois)',
    videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[2],
  },
];

export function getTopThreeMatches(jobs: StageJob[]): StageJob[] {
  return [...jobs]
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, 3);
}

let localApplications: StageApplication[] = [
  {
    id: 'app-seed-1',
    studentId: 'student-current',
    jobId: 'job-1',
    status: 'INTERVIEW',
    appliedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    cvFileUrl: 'https://campus360.app/storage/cv-sample.pdf',
    letterFileUrl: 'https://campus360.app/storage/letter-sample.pdf',
    job: SEED_JOBS[0],
    notes: 'Entretien en visio programmé.',
  },
  {
    id: 'app-seed-2',
    studentId: 'student-current',
    jobId: 'job-3',
    status: 'PENDING',
    appliedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    lastRemindedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    job: SEED_JOBS[2],
  },
];

export function calculateMatchScore(userSkills: string[] = [], jobReqs: string[] = []): { score: number; matchingSkills: string[] } {
  if (!jobReqs.length) return { score: 75, matchingSkills: [] };
  if (!userSkills.length) return { score: 60, matchingSkills: [] };

  const normalizedUser = userSkills.map(s => s.toLowerCase().trim());
  const matching = jobReqs.filter(req => 
    normalizedUser.some(u => req.toLowerCase().includes(u) || u.includes(req.toLowerCase()))
  );

  const ratio = matching.length / jobReqs.length;
  const score = Math.min(98, Math.max(55, Math.round(50 + (ratio * 48))));
  return { score, matchingSkills: matching };
}

export async function fetchStageJobs(params?: {
  query?: string;
  sector?: string;
  duration?: string;
  userSkills?: string[];
}): Promise<StageJob[]> {
  await new Promise(r => setTimeout(r, 200));

  let results = [...SEED_JOBS];

  if (params?.sector && params.sector !== 'Tous') {
    results = results.filter(j => 
      j.company?.industry.toLowerCase().includes(params.sector!.toLowerCase()) ||
      j.title.toLowerCase().includes(params.sector!.toLowerCase())
    );
  }

  if (params?.query && params.query.trim()) {
    const q = params.query.toLowerCase().trim();
    results = results.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      j.company?.name.toLowerCase().includes(q) ||
      j.requirements.some(r => r.toLowerCase().includes(q))
    );
  }

  return results.map(job => {
    const { score, matchingSkills } = calculateMatchScore(params?.userSkills, job.requirements);
    return {
      ...job,
      matchScore: score,
      matchingSkills,
    };
  }).sort((a, b) => {
    if (a.isSponsored && !b.isSponsored) return -1;
    if (!a.isSponsored && b.isSponsored) return 1;
    return (b.matchScore || 0) - (a.matchScore || 0);
  });
}

export async function fetchJobById(jobId: string): Promise<StageJob | null> {
  await new Promise(r => setTimeout(r, 100));
  const job = SEED_JOBS.find(j => j.id === jobId);
  return job || null;
}

export type GeneratedApplicationResult = {
  applicationId: string;
  cvText: string;
  letterText: string;
  pdfDownloadUrl: string;
  whatsappUrl: string;
  emailSubject: string;
  emailBody: string;
  recipientEmail: string;
  recipientWhatsapp?: string;
};

export async function generateIaApplication(
  job: StageJob,
  student: {
    fullName: string;
    email: string;
    phoneWhatsapp?: string;
    major: string;
    educationLevel: string;
    skills: string[];
    portfolioUrl?: string;
  }
): Promise<GeneratedApplicationResult> {
  await new Promise(r => setTimeout(r, 1800));

  const companyName = job.company?.name || "L'Entreprise";
  const matchingSkillsStr = student.skills.slice(0, 3).join(', ') || 'mes compétences techniques';

  const cvText = `CURRICULUM VITAE — ${student.fullName.toUpperCase()}
Filière : ${student.major} (${student.educationLevel})
Contact : ${student.email} | ${student.phoneWhatsapp || 'Non renseigné'}
${student.portfolioUrl ? 'Portfolio / Profil : ' + student.portfolioUrl : ''}

RÉSUMÉ PROFESSIONNEL :
Étudiant(e) dynamique et rigoureux(se) en ${student.major}, passionné(e) par les enjeux de l'industrie ${job.company?.industry || ''}. Doté(e) d'une solide maîtrise de ${matchingSkillsStr}, je souhaite mettre mes compétences au service des projets stratégiques de ${companyName}.

COMPÉTENCES CLÉS CIBLÉES :
• ${student.skills.map(s => 'Maîtrise opérationnelle : ' + s).join('\n• ')}
• Esprit d'équipe, adaptabilité rapide et sens des responsabilités.

FORMATION ACADÉMIQUE :
• ${student.educationLevel} en ${student.major} — En cours de validation.

OBJECTIF DE STAGE :
• Intégrer ${companyName} pour le poste de "${job.title}" et contribuer activement à l'atteinte des objectifs de l'équipe.`.trim();

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

  const rawPhone = (job.company?.contactWhatsapp || '').replace(/[^0-9]/g, '');
  const cleanPhone = rawPhone || '2250708091011';
  const whatsappMessage = encodeURIComponent(
    `Bonjour ${companyName}, je suis ${student.fullName}, étudiant en ${student.major}. Je vous transmets ma candidature pour le poste de "${job.title}". Vous pouvez consulter mon dossier complet et mon CV généré ici : https://campus360.app/candidatures/${student.fullName.toLowerCase().replace(/\s+/g, '-')}`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

  const emailSubject = encodeURIComponent(`Candidature : ${job.title} — ${student.fullName}`);
  const emailBody = encodeURIComponent(letterText);

  const newAppId = 'app-' + Date.now();
  const newApplication: StageApplication = {
    id: newAppId,
    studentId: 'student-current',
    jobId: job.id,
    status: 'PENDING',
    appliedAt: new Date().toISOString(),
    cvFileUrl: `https://campus360.app/storage/cv-${newAppId}.pdf`,
    letterFileUrl: `https://campus360.app/storage/letter-${newAppId}.pdf`,
    generatedCvText: cvText,
    generatedLetterText: letterText,
    job,
  };

  localApplications = [newApplication, ...localApplications];

  return {
    applicationId: newAppId,
    cvText,
    letterText,
    pdfDownloadUrl: `https://campus360.app/storage/cv-${newAppId}.pdf`,
    whatsappUrl,
    emailSubject,
    emailBody,
    recipientEmail: job.company?.contactEmail || 'rh@entreprise.com',
    recipientWhatsapp: job.company?.contactWhatsapp,
  };
}

export async function fetchStudentApplications(): Promise<StageApplication[]> {
  await new Promise(r => setTimeout(r, 150));
  return [...localApplications];
}

export async function updateApplicationStatus(applicationId: string, status: AppStatus): Promise<boolean> {
  await new Promise(r => setTimeout(r, 100));
  const app = localApplications.find(a => a.id === applicationId);
  if (app) {
    app.status = status;
    return true;
  }
  return false;
}

export function generateFollowupReminderMessage(app: StageApplication, studentName: string): string {
  const company = app.job?.company?.name || "l'Entreprise";
  const jobTitle = app.job?.title || 'le stage';
  return `Bonjour ${company}, je me permets de faire un retour concernant ma candidature transmise le ${new Date(app.appliedAt).toLocaleDateString('fr-FR')} pour le poste de "${jobTitle}". Toujours très motivé(e) par l'opportunité de rejoindre votre équipe, je reste à votre entière disposition pour échanger. Cordialement, ${studentName}.`;
}
