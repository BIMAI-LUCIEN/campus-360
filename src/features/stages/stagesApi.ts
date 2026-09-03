import type { StageJob, StageApplication, StageCompany, StudentProfileData, AppStatus, ApplyMethod } from '../../types';
import { authFetch } from '../auth/betterAuth';

export const SEED_COMPANIES: StageCompany[] = [
  {
    id: 'comp-1',
    name: 'TechNovation Labs',
    industry: 'Ingénierie & Informatique',
    address: 'Abidjan, Cocody Riviera 3',
    contactEmail: 'recrutement@technovation.ci',
    contactWhatsapp: '+2250708091011',
    kybScore: 96,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-2',
    name: 'Cabinet FicoConsulting',
    industry: 'Comptabilité, Finance & Audit',
    address: 'Dakar, Plateau',
    contactEmail: 'stages@ficoconsulting.sn',
    contactWhatsapp: '+221770001122',
    kybScore: 94,
    status: 'VERIFIED',
    isPremium: false,
    logoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-3',
    name: 'AfriDigital Agency & Studios',
    industry: 'Marketing Digital & Design',
    address: 'Cotonou, Haie Vive',
    contactEmail: 'contact@afridigi.bj',
    contactWhatsapp: '+22997001122',
    kybScore: 91,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-4',
    name: 'AgroLogix & Supply Chain',
    industry: 'Logistique & Supply Chain',
    address: 'Douala, Bonanjo',
    contactEmail: 'rh@agrologix.cm',
    contactWhatsapp: '+237690001122',
    kybScore: 89,
    status: 'VERIFIED',
    isPremium: false,
    logoUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-5',
    name: 'Ecobank FinTech Innovation Hub',
    industry: 'Finance & FinTech',
    address: 'Lomé, Siège Régional & Remote',
    contactEmail: 'careers-fintech@ecobank.com',
    contactWhatsapp: '+22890112233',
    kybScore: 98,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-6',
    name: 'Eiffage / Bouygues BTP Afrique',
    industry: 'Bâtiment, Énergie & Génie Civil',
    address: 'Abidjan, Zone Industrielle Yopougon',
    contactEmail: 'recrutement.btp@eiffage-afrique.com',
    contactWhatsapp: '+2250505112233',
    kybScore: 95,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-7',
    name: 'Wave Mobile Money CI',
    industry: 'FinTech & Télécoms',
    address: 'Abidjan, Marcory Zone 4',
    contactEmail: 'jobs.ci@wave.com',
    contactWhatsapp: '+2250788990011',
    kybScore: 97,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-8',
    name: 'Cabinet LexAfric & Associés',
    industry: 'Droit des Affaires & Fiscalité',
    address: 'Dakar, Almadies',
    contactEmail: 'stages@lexafric-avocats.com',
    contactWhatsapp: '+221781234567',
    kybScore: 93,
    status: 'VERIFIED',
    isPremium: false,
    logoUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-9',
    name: 'Laboratoires SantéPlus Afrique',
    industry: 'Santé, Pharmacie & Biotechnologies',
    address: 'Yaoundé, Quartier Bastos',
    contactEmail: 'rh@santeplus-afrique.org',
    contactWhatsapp: '+237677112233',
    kybScore: 90,
    status: 'VERIFIED',
    isPremium: false,
    logoUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-10',
    name: 'MTN Digital Communications',
    industry: 'Télécoms, Cloud & Cybersécurité',
    address: 'Douala, Akwa Boulevard de la Liberté',
    contactEmail: 'careers.cm@mtn.com',
    contactWhatsapp: '+237670009988',
    kybScore: 96,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-11',
    name: 'TalentAfrik RH Consulting',
    industry: 'Ressources Humaines & Conseil',
    address: 'Abidjan, Deux Plateaux',
    contactEmail: 'recrutement@talentafrik.com',
    contactWhatsapp: '+2250102030405',
    kybScore: 88,
    status: 'VERIFIED',
    isPremium: false,
    logoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-12',
    name: 'InTouch FinTech Solutions',
    industry: 'Paiements & Développement Web',
    address: 'Dakar, Mermoz Pyrotechnie',
    contactEmail: 'talent@intouchgroup.net',
    contactWhatsapp: '+221776543210',
    kybScore: 94,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=120&auto=format&fit=crop&q=80',
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
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (80 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[0],
  },
  {
    id: 'job-2',
    companyId: 'comp-2',
    title: 'Assistant(e) Comptable & Audit SYSCOHADA',
    description: "Sous la responsabilité du Chef de mission, vous participerez aux travaux de tenue comptable, de rapprochements bancaires et à l'élaboration des états financiers de synthèse selon les normes OHADA.",
    requirements: ['Comptabilité', 'Excel Avancé', 'SYSCOHADA', 'Audit', 'Fiscalité'],
    applyMethod: 'EMAIL',
    isSponsored: false,
    source: 'INTERNAL',
    location: 'Dakar',
    duration: '6 mois',
    contractType: 'Stage Académique',
    stipend: 'Rémunéré (75 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[1],
  },
  {
    id: 'job-3',
    companyId: 'comp-3',
    title: 'Stagiaire UI/UX Designer & Conception Produit',
    description: "Conception de maquettes d'applications modernes sur Figma, création de design systems, user flows et tests utilisateurs sur des produits digitaux africains à fort impact.",
    requirements: ['Figma', 'UI/UX Design', 'Design System', 'Prototypage', 'Wireframing'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Cotonou / Télétravail',
    duration: '3 mois',
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (70 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[2],
  },
  {
    id: 'job-4',
    companyId: 'comp-4',
    title: 'Assistant Gestionnaire Logistique & Supply Chain',
    description: "Suivi des flux de stocks, coordination des livraisons régionales, optimisation des bordereaux d'expédition portuaires et gestion de l'approvisionnement des entrepôts.",
    requirements: ['Gestion de stock', 'Excel', 'Logistique', 'Organisation', 'Transport'],
    applyMethod: 'PHYSICAL',
    isSponsored: false,
    source: 'SCRAPED',
    location: 'Douala, Zone Portuaire',
    duration: '6 à 12 mois',
    contractType: 'Premier Emploi',
    stipend: 'Rémunéré (150 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[3],
  },
  {
    id: 'job-5',
    companyId: 'comp-5',
    title: 'Junior Data Analyst & Business Intelligence',
    description: "Exploitation de bases de données transactionnelles bancaires, création de dashboards sous Power BI, requêtes SQL complexes et automatisation de rapports analytiques.",
    requirements: ['SQL', 'Python & Pandas', 'Power BI', 'Statistiques', 'Excel Avancé'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Lomé / Hybride',
    duration: '6 mois',
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (120 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[4],
  },
  {
    id: 'job-6',
    companyId: 'comp-6',
    title: 'Conducteur de Travaux BTP & Génie Civil Junior',
    description: "Participation à la planification et au suivi technique des chantiers d'infrastructures routières et de bâtiments. Contrôle de conformité des plans AutoCAD et gestion des équipes terrain.",
    requirements: ['AutoCAD & Plans BIM', 'Calcul de Structures (RDM)', 'Gestion de Chantiers BTP', 'Sécurité & QHSE'],
    applyMethod: 'PHYSICAL',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Abidjan / Chantiers',
    duration: 'Indéterminée',
    contractType: 'Premier Emploi',
    stipend: 'Rémunéré (180 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f8?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 35 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[5],
  },
  {
    id: 'job-7',
    companyId: 'comp-7',
    title: 'Assistant(e) Marketing Digital, Ads & Growth',
    description: "Pilotage des campagnes d'acquisition digitale (Meta Ads, TikTok Ads), analyse des taux de conversion sur l'application mobile et création de contenus percutants.",
    requirements: ['Facebook & Google Ads', 'Copywriting & Storytelling', 'Canva', 'Social Media', 'Google Analytics'],
    applyMethod: 'EMAIL',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Abidjan, Marcory',
    duration: '6 mois',
    contractType: 'Alternance',
    stipend: 'Rémunéré (95 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[6],
  },
  {
    id: 'job-8',
    companyId: 'comp-8',
    title: 'Juriste Stagiaire Droit des Affaires & Droit OHADA',
    description: "Recherche documentaire juridique, rédaction de contrats commerciaux, préparation de dossiers d'arbitrage et conseils sur la conformité des sociétés de la zone UEMOA.",
    requirements: ['Droit Commercial & Sociétés (OHADA)', 'Rédaction de Contrats', 'Droit du Travail', 'Veille Juridique'],
    applyMethod: 'EMAIL',
    isSponsored: false,
    source: 'INTERNAL',
    location: 'Dakar, Almadies',
    duration: '3 mois',
    contractType: 'Stage Académique',
    stipend: 'Rémunéré (85 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[7],
  },
  {
    id: 'job-9',
    companyId: 'comp-9',
    title: 'Stagiaire Assistant Qualité Biomédicale & Pharmacie',
    description: "Support aux analyses de contrôle qualité sur les lots pharmaceutiques, participation à la veille normative sanitaire et documentation des protocoles d'essais cliniques.",
    requirements: ['Biologie Moléculaire', 'Pharmacologie Clinique', 'Contrôle Qualité & Normes', 'Bio-statistiques'],
    applyMethod: 'PHYSICAL',
    isSponsored: false,
    source: 'SCRAPED',
    location: 'Yaoundé, Bastos',
    duration: '6 mois',
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (90 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 18 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[8],
  },
  {
    id: 'job-10',
    companyId: 'comp-10',
    title: 'Ingénieur Stagiaire Réseaux, Cloud & Cybersécurité',
    description: "Configuration d'équipements réseaux télécoms, surveillance des alertes de sécurité SOC, assistance à la migration d'infrastructures vers des environnements Cloud hybrides.",
    requirements: ['Cybersécurité & Auth', 'Docker & Cloud AWS/GCP', 'Bases de données SQL', 'Git'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Douala, Akwa',
    duration: '6 mois',
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (100 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[9],
  },
  {
    id: 'job-11',
    companyId: 'comp-11',
    title: 'Chargé(e) de Recrutement & RH Junior',
    description: "Sourcing de candidats sur LinkedIn et plateformes spécialisées, pré-qualification téléphonique, organisation des sessions d'entretiens et tenue des dossiers du personnel.",
    requirements: ['Droit du Travail & RH', 'Communication & Pitch', 'Anglais Professionnel', 'Organisation'],
    applyMethod: 'EMAIL',
    isSponsored: false,
    source: 'INTERNAL',
    location: 'Abidjan, Cocody',
    duration: '3 mois',
    contractType: 'Stage Académique',
    stipend: 'Rémunéré (65 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[10],
  },
  {
    id: 'job-12',
    companyId: 'comp-12',
    title: 'Développeur Full-Stack Node.js / Python (CDI Junior)',
    description: "Développement d'APIs de paiement multi-opérateurs hautement résilientes (Mobile Money, Carte bancaire). Tests unitaires, documentation d'architectures microservices.",
    requirements: ['Node.js & Backend APIs', 'TypeScript & Modern JS', 'Python & Pandas', 'Docker & Cloud AWS/GCP'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Dakar / Télétravail',
    duration: 'Indéterminée',
    contractType: 'Premier Emploi',
    stipend: 'Rémunéré (250 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[11],
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
  contractType?: string;
  duration?: string;
  userSkills?: string[];
}): Promise<StageJob[]> {
  let jobsList: StageJob[] = [];

  try {
    const search = new URLSearchParams();
    if (params?.query?.trim()) search.set('q', params.query.trim());
    if (params?.sector && params.sector !== 'Tous') search.set('sector', params.sector);
    const suffix = search.toString() ? `?${search.toString()}` : '';
    const response = await authFetch(`/api/mobile/stages${suffix}`);
    if (response.ok) {
      const payload = (await response.json()) as { jobs?: StageJob[] };
      if (Array.isArray(payload?.jobs) && payload.jobs.length > 0) {
        jobsList = payload.jobs;
      }
    }
  } catch {
    // Repli gracieux sur les données fictives
  }

  // Si l'API retourne vide ou est inaccessible, on utilise les offres fictives enrichies
  if (!jobsList || jobsList.length === 0) {
    jobsList = [...SEED_JOBS];
  }

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

  // Filtrage local par type de contrat
  if (params?.contractType && params.contractType !== 'Tous') {
    const ct = params.contractType.toLowerCase().trim();
    jobsList = jobsList.filter(
      (job) => job.contractType?.toLowerCase().includes(ct)
    );
  }

  return jobsList
    .map((job) => {
      const { score, matchingSkills } = calculateMatchScore(params?.userSkills, job.requirements);
      return {
        ...job,
        matchScore: score,
        matchingSkills,
      };
    })
    .sort((a, b) => {
      if (a.isSponsored && !b.isSponsored) return -1;
      if (!a.isSponsored && b.isSponsored) return 1;
      return (b.matchScore || 0) - (a.matchScore || 0);
    });
}

export async function fetchJobById(jobId: string): Promise<StageJob | null> {
  const jobs = await fetchStageJobs();
  return jobs.find((job) => job.id === jobId) ?? null;
}

export type GeneratedApplicationResult = {
  applicationId: string;
  cvText: string;
  letterText: string;
  pdfDownloadUrl?: string;
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

  return {
    applicationId: '',
    cvText,
    letterText,
    whatsappUrl,
    emailSubject,
    emailBody,
    recipientEmail: job.company?.contactEmail || 'rh@entreprise.com',
    recipientWhatsapp: job.company?.contactWhatsapp,
  };
}

export async function submitStageApplication(
  jobId: string,
  cvText: string,
  letterText: string,
): Promise<string> {
  const response = await authFetch('/api/mobile/stages/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, cvText, letterText }),
  });
  const payload = await response.json() as { application: { id: string } };
  return payload.application.id;
}

export async function fetchStudentApplications(): Promise<StageApplication[]> {
  const payload = await (await authFetch('/api/mobile/stages/applications')).json() as {
    applications: StageApplication[];
  };
  return payload.applications;
}

export async function updateApplicationStatus(applicationId: string, status: AppStatus): Promise<boolean> {
  await authFetch('/api/mobile/stages/applications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId, status }),
  });
  return true;
}

export function generateFollowupReminderMessage(app: StageApplication, studentName: string): string {
  const company = app.job?.company?.name || "l'Entreprise";
  const jobTitle = app.job?.title || 'le stage';
  return `Bonjour ${company}, je me permets de faire un retour concernant ma candidature transmise le ${new Date(app.appliedAt).toLocaleDateString('fr-FR')} pour le poste de "${jobTitle}". Toujours très motivé(e) par l'opportunité de rejoindre votre équipe, je reste à votre entière disposition pour échanger. Cordialement, ${studentName}.`;
}
