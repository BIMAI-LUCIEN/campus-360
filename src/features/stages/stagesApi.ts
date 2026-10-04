import type { StageJob, StageApplication, StageCompany, StudentProfileData, AppStatus, ApplyMethod, OfficialCvData } from '../../types';
import { authFetch, authFetchRaw, authBaseUrl } from '../auth/betterAuth';

export const SEED_COMPANIES: StageCompany[] = [
  {
    id: 'comp-1',
    name: 'MTN Digital Communications Cameroun',
    industry: 'Télécoms, Cloud & Cybersécurité',
    address: 'Douala, Akwa Boulevard de la Liberté',
    contactEmail: 'recrutement@mtn.cm',
    contactWhatsapp: '+237670009988',
    kybScore: 98,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-2',
    name: 'Communauté Urbaine de Douala (CUD)',
    industry: 'Administration, Urbanisme & Gestion',
    address: 'Douala, Bonanjo',
    contactEmail: 'stages@cud.cm',
    contactWhatsapp: '+237699001122',
    kybScore: 96,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-3',
    name: 'Source du Pays (Promote 2026)',
    industry: 'Marketing, Ventes & Événementiel',
    address: 'Yaoundé, Quartier Bastos',
    contactEmail: 'rh@sourcedupays.cm',
    contactWhatsapp: '+237677112233',
    kybScore: 94,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-4',
    name: 'AgroLogix & Transit Portuaire',
    industry: 'Logistique, Transit & Supply Chain',
    address: 'Douala, Bonanjo Zone Portuaire',
    contactEmail: 'rh@agrologix.cm',
    contactWhatsapp: '+237690001122',
    kybScore: 92,
    status: 'VERIFIED',
    isPremium: false,
    logoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-5',
    name: 'Afriland First Bank Cameroun',
    industry: 'Banque, Finance & FinTech',
    address: 'Yaoundé, Hippodrome',
    contactEmail: 'talents@afrilandfirstbank.com',
    contactWhatsapp: '+237699887766',
    kybScore: 99,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-6',
    name: 'IBABEAUTY CAMEROON',
    industry: 'Cosmétique, Logistique & Distribution',
    address: 'Douala, Akwa',
    contactEmail: 'recrutement@ibabeauty.cm',
    contactWhatsapp: '+237691234567',
    kybScore: 93,
    status: 'VERIFIED',
    isPremium: false,
    logoUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-7',
    name: 'Orange Digital Center Cameroun',
    industry: 'Développement Web, Mobile & IA',
    address: 'Douala, Boulevard de la Liberté',
    contactEmail: 'digitalcenter@orange.cm',
    contactWhatsapp: '+237655001122',
    kybScore: 97,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-8',
    name: 'Cabinet JurisConsult Cameroun & CEMAC',
    industry: 'Droit OHADA & Fiscalité des Affaires',
    address: 'Yaoundé, Centre Administratif',
    contactEmail: 'stages@juriscameroun.cm',
    contactWhatsapp: '+237678123456',
    kybScore: 95,
    status: 'VERIFIED',
    isPremium: false,
    logoUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-9',
    name: 'Laboratoires SantéPlus Cameroun',
    industry: 'Pharmacie, Santé & Analyse Biomédicale',
    address: 'Yaoundé, Quartier Bastos',
    contactEmail: 'rh@santeplus.cm',
    contactWhatsapp: '+237677112233',
    kybScore: 91,
    status: 'VERIFIED',
    isPremium: false,
    logoUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-10',
    name: 'World Service Cameroun',
    industry: 'Services, Secrétariat & Éducation',
    address: 'Yaoundé, Melen',
    contactEmail: 'stages@worldservice.cm',
    contactWhatsapp: '+237672364124',
    kybScore: 90,
    status: 'VERIFIED',
    isPremium: false,
    logoUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-11',
    name: 'Camtel Télécoms & Réseaux',
    industry: 'Fibre Optique, Réseaux & Infrastructure',
    address: 'Yaoundé, Boulevard du 20 Mai',
    contactEmail: 'rh@camtel.cm',
    contactWhatsapp: '+237622334455',
    kybScore: 94,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'comp-12',
    name: 'Société Générale Cameroun (SGC)',
    industry: 'Banque, Finance & Audit',
    address: 'Douala, Bonanjo',
    contactEmail: 'recrutement.cameroun@socgen.com',
    contactWhatsapp: '+237693001122',
    kybScore: 97,
    status: 'VERIFIED',
    isPremium: true,
    logoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=120&auto=format&fit=crop&q=80',
  },
];

export const SEED_JOBS: StageJob[] = [
  {
    id: 'job-1',
    companyId: 'comp-1',
    title: 'Stagiaire Développeur Frontend React Native / Mobile',
    description: "Intégrez la Digital Factory de MTN Cameroun. Vous participerez à l'optimisation des applications mobiles grand public (MoMo, Ayoba), à l'intégration d'APIs REST résilientes et aux tests d'expérience utilisateur.",
    requirements: ['React Native', 'TypeScript', 'Git', 'APIs REST', 'Mobile Money'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Douala, Akwa',
    duration: '3 à 6 mois',
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (85 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[0],
  },
  {
    id: 'job-2',
    companyId: 'comp-2',
    title: 'Stagiaire Assistant Administratif & Gestion des Projets',
    description: "Appui aux services techniques et administratifs de la Communauté Urbaine de Douala (CUD). Traitement des dossiers d'aménagement urbain, numérisation des archives et accueil des usagers.",
    requirements: ['Administration', 'Bureautique Word/Excel', 'Organisation', 'Communication'],
    applyMethod: 'WHATSAPP',
    isSponsored: false,
    source: 'SCRAPED',
    location: 'Douala, Bonanjo',
    duration: '3 mois',
    contractType: 'Stage Académique',
    stipend: 'Rémunéré (60 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[1],
  },
  {
    id: 'job-3',
    companyId: 'comp-3',
    title: 'Offre de stage professionnel à Promote 2026',
    description: "Représentation de la marque, accueil des partenaires économiques et animation commerciale des stands pendant le salon international Promote 2026 à Yaoundé.",
    requirements: ['Marketing', 'Communication', 'Sens Commercial', 'Dynamisme', 'Anglais'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'SCRAPED',
    location: 'Yaoundé, Palais des Congrès',
    duration: '2 mois',
    contractType: 'Stage Professionnel',
    stipend: 'Rémunéré (90 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[2],
  },
  {
    id: 'job-4',
    companyId: 'comp-4',
    title: 'Assistant(e) Logistique, Transit & Supply Chain',
    description: "Suivi des déclarations douanières en zone portuaire de Douala, contrôle des manifestes de fret et gestion informatisée des stocks en entrepôt.",
    requirements: ['Logistique', 'Transit Douane', 'Excel', 'Gestion de stocks', 'Organisation'],
    applyMethod: 'EMAIL',
    isSponsored: false,
    source: 'INTERNAL',
    location: 'Douala, Zone Portuaire',
    duration: '6 mois',
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (80 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[3],
  },
  {
    id: 'job-5',
    companyId: 'comp-5',
    title: 'Stagiaire Analyste FinTech & Conformité Réglementaire',
    description: "Participation à l'analyse des flux de transactions de paiement, veille sur les directives COBAC/CEMAC et élaboration de synthèses pour la direction des risques.",
    requirements: ['Banque & Finance', 'Analyse Financière', 'Réglementation CEMAC', 'Excel Avancé', 'SQL'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Yaoundé, Hippodrome',
    duration: '6 mois',
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (100 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[4],
  },
  {
    id: 'job-6',
    companyId: 'comp-6',
    title: 'Avis de recrutement des STAGIAIRES en Logistique',
    description: "IBABEAUTY CAMEROON recherche des stagiaires motivés pour soutenir son réseau de distribution de produits de beauté à Douala et Yaoundé. Préparation de commandes et inventaires.",
    requirements: ['Logistique', 'Rigueur', 'Distribution', 'Gestion de stocks', 'Sens du détail'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'SCRAPED',
    location: 'Douala, Akwa',
    duration: '3 à 6 mois',
    contractType: 'Stage Académique',
    stipend: 'Rémunéré (70 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 35 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[5],
  },
  {
    id: 'job-7',
    companyId: 'comp-7',
    title: 'Stagiaire Développeur Full-Stack Web & Mobile',
    description: "Projets à impact au sein d'Orange Digital Center Cameroun : conception d'applications React Native et Node.js pour des start-ups incubées et des PME camerounaises.",
    requirements: ['React Native', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Douala, Boulevard de la Liberté',
    duration: '6 mois',
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (110 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[6],
  },
  {
    id: 'job-8',
    companyId: 'comp-8',
    title: 'Juriste Stagiaire Droit des Affaires & Droit OHADA',
    description: "Recherches juridiques, rédaction d'actes sous seing privé, suivi du contentieux commercial et fiscalité d'entreprises selon les normes OHADA au Cameroun.",
    requirements: ['Droit des Affaires OHADA', 'Rédaction Juridique', 'Fiscalité Camerounaise', 'Rigueur'],
    applyMethod: 'EMAIL',
    isSponsored: false,
    source: 'INTERNAL',
    location: 'Yaoundé, Centre Administratif',
    duration: '3 mois',
    contractType: 'Stage Académique',
    stipend: 'Rémunéré (75 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[7],
  },
  {
    id: 'job-9',
    companyId: 'comp-9',
    title: 'Stagiaire Assistant Qualité Biomédicale & Pharmacie',
    description: "Contrôle de conformité des intrants pharmaceutiques, participation à la démarche qualité ISO et mise à jour des registres d'analyses biomédicales.",
    requirements: ['Biologie / Biochimie', 'Contrôle Qualité', 'Normes Sanitaires', 'Méthode'],
    applyMethod: 'PHYSICAL',
    isSponsored: false,
    source: 'INTERNAL',
    location: 'Yaoundé, Bastos',
    duration: '6 mois',
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (85 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 18 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[8],
  },
  {
    id: 'job-10',
    companyId: 'comp-10',
    title: "Stage d'été 'Vacances Utiles' & Secrétariat",
    description: "Accueil physique et orientation, saisie informatique de dossiers étudiants, classement et gestion du courrier pour le programme Vacances Utiles à Yaoundé.",
    requirements: ['Secrétariat', 'Saisie Rapide', 'Accueil & Courtoisie', 'Word & Excel'],
    applyMethod: 'WHATSAPP',
    isSponsored: false,
    source: 'SCRAPED',
    location: 'Yaoundé, Melen',
    duration: '2 mois',
    contractType: 'Stage Académique',
    stipend: 'Rémunéré (55 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[9],
  },
  {
    id: 'job-11',
    companyId: 'comp-11',
    title: 'Ingénieur Stagiaire Réseaux IP & Fibre Optique',
    description: "Participation au raccordement fibre, supervision des points d'accès haut débit et configuration des équipements réseaux de transport Camtel.",
    requirements: ['Réseaux Télécoms', 'Fibre Optique', 'Routage IP', 'Cisco / Linux', 'Sécurité'],
    applyMethod: 'EMAIL',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Yaoundé, Boulevard du 20 Mai',
    duration: '6 mois',
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (95 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    company: SEED_COMPANIES[10],
  },
  {
    id: 'job-12',
    companyId: 'comp-12',
    title: 'Assistant(e) Contrôle de Gestion & Audit Interne',
    description: "Participation aux travaux de cadrage budgétaire, revue des procédures internes et élaboration des reportings financiers pour la direction générale Cameroun.",
    requirements: ['Audit', 'Contrôle de Gestion', 'Comptabilité Bancaire', 'Excel Avancé', 'Analyse Financière'],
    applyMethod: 'WHATSAPP',
    isSponsored: true,
    source: 'INTERNAL',
    location: 'Douala, Bonanjo',
    duration: '6 mois',
    contractType: 'Stage PFE',
    stipend: 'Rémunéré (120 000 FCFA/mois)',
    flyerUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=900&auto=format&fit=crop&q=80',
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

const SEED_OFFICIAL_CV_1: OfficialCvData = {
  titrePoste: 'Développeur Frontend React Native & Web Junior',
  photoUrl: undefined,
  detailsPersonnels: {
    nom: 'KAMENI',
    prenom: 'Dave Lionel',
    nationalite: 'Camerounaise',
    age: '22 ans',
    email: 'dave.kameni@polytechnique.cm',
    telephone: '672364124',
    adresse: 'Yaoundé, Melen',
  },
  experiences: [
    {
      poste: 'Développeur Web & Mobile Stagiaire',
      entreprise: 'Laboratoire d’Informatique Appliquée',
      ville: 'Yaoundé',
      periode: '2023 - 2024',
      missions: [
        'Conception d’écrans d’authentification et de formulaires dynamiques avec TypeScript & React Native.',
        'Intégration d’API RESTful et gestion du cache d’état hors-ligne.',
        'Mise en place de tests unitaires et vérification de la compatibilité multi-plateformes.',
      ],
    },
  ],
  formations: [
    {
      diplome: 'Licence 3 / Master 1 en Génie Logiciel',
      etablissement: 'École Nationale Supérieure Polytechnique de Yaoundé',
      ville: 'Yaoundé',
      periode: '2022 - 2025',
    },
  ],
  competences: {
    professionnelles: [
      'React Native, Expo, React.js & TypeScript',
      'Intégration d’APIs REST & WebSocket',
      'Conception UI moderne et responsive',
      'Architecture logicielle propre et composants réutilisables',
      'Git, GitHub Actions & tests automatisés',
    ],
    habilitesRelationnelles: [
      'assidu',
      'attentif',
      'autonome',
      'compréhensif',
      'conciliant',
      'consciencieux',
      'courtois',
      'créatif',
      'curieux',
    ],
    logiciels: [
      {
        categorie: 'Langages & Frameworks',
        items: ['TypeScript', 'JavaScript ES6+', 'React Native', 'React', 'Node.js', 'TailwindCSS'],
      },
      {
        categorie: 'Outils & Environnements',
        items: ['VS Code', 'Git/GitHub', 'Postman', 'Figma', 'Expo CLI'],
      },
    ],
  },
  langues: [
    { langue: 'Français', niveau: 'langue maternelle' },
    { langue: 'Anglais', niveau: 'courant (B2/C1)' },
  ],
  loisirs: ['hackathons', 'développement open-source', 'football', 'veille technologique'],
};

const SEED_OFFICIAL_CV_2: OfficialCvData = {
  titrePoste: 'Assistant Designer UI/UX & Brand Content',
  photoUrl: undefined,
  detailsPersonnels: {
    nom: 'KAMENI',
    prenom: 'Dave Lionel',
    nationalite: 'Camerounaise',
    age: '22 ans',
    email: 'dave.kameni@polytechnique.cm',
    telephone: '672364124',
    adresse: 'Yaoundé, Melen',
  },
  experiences: [
    {
      poste: 'Designer Graphique & Prototype Junior',
      entreprise: 'Studio Créatif Digital',
      ville: 'Douala',
      periode: '2023',
      missions: [
        'Création de wireframes et prototypes interactifs Figma haute fidélité.',
        'Élaboration de chartes graphiques et guidelines de composants design system.',
        'Réalisation de visuels promotionnels réseaux sociaux sous Figma et Illustrator.',
      ],
    },
  ],
  formations: [
    {
      diplome: 'Licence en Informatique & Multimédia',
      etablissement: 'Université de Yaoundé I',
      ville: 'Yaoundé',
      periode: '2022 - 2024',
    },
  ],
  competences: {
    professionnelles: [
      'Figma (Design System, Autolayout, Tokens)',
      'Adobe XD, Illustrator & Photoshop',
      'Recherche utilisateur et tests d’ergonomie',
      'Storytelling visuel & Brand Content',
    ],
    habilitesRelationnelles: [
      'créatif',
      'sens de l’écoute',
      'empathique',
      'méthodique',
      'force de proposition',
    ],
    logiciels: [
      {
        categorie: 'Design & Prototypage',
        items: ['Figma', 'Adobe Creative Cloud', 'Canva Pro', 'Principle'],
      },
    ],
  },
  langues: [
    { langue: 'Français', niveau: 'langue maternelle' },
    { langue: 'Anglais', niveau: 'professionnel' },
  ],
  loisirs: ['photographie', 'arts visuels', 'cinéma'],
};

const SEED_LETTER_1 = `Madame, Monsieur le Responsable du Recrutement,

Actuellement étudiant en Génie Logiciel à l’École Nationale Supérieure Polytechnique de Yaoundé, je vous soumets avec enthousiasme ma candidature pour le poste de "Développeur Frontend React Native & Web Junior" chez TechNovation Labs.

Fort de mes projets académiques et personnels en TypeScript et React Native, j’ai développé une solide rigueur dans la conception d'interfaces fluides, accessibles et connectées à des APIs performantes. Votre vision de l'innovation technologique en Afrique correspond exactement à mes aspirations professionnelles.

Intégrer vos équipes représente pour moi une opportunité unique d'apporter ma réactivité et mes compétences tout en contribuant activement à vos déploiements de pointe.

Je me tiens à votre entière disposition pour tout entretien d'évaluation.

Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.

Dave Lionel KAMENI`;

const SEED_LETTER_2 = `Madame, Monsieur le Responsable des Talents,

Passionné par le design d’interaction et la création d’identités visuelles percutantes, je vous présente ma candidature pour le stage d’"Assistant Designer UI/UX & Brand Content" au sein d'AfriDigital Agency & Studios.

Ma maîtrise de Figma et ma sensibilité pour l'expérience utilisateur mobile me permettent de concevoir des parcours utilisateurs intuitifs adaptés aux réalités du marché africain. Rejoindre votre agence me permettrait de valoriser ma créativité au service de marques d’envergure.

Restant à votre disposition pour vous présenter mon portfolio interactif lors d'un prochain échange.

Cordialement,
Dave Lionel KAMENI`;

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
    officialCv: SEED_OFFICIAL_CV_1,
    generatedCvText: `CURRICULUM VITAE — DAVE LIONEL KAMENI
Développeur Frontend React Native & Web Junior
Yaoundé, Melen | 672364124 | dave.kameni@polytechnique.cm

EXPÉRIENCE :
Développeur Web & Mobile Stagiaire (Laboratoire d’Informatique Appliquée, 2023 - 2024)
- Développement d’applications React Native & TypeScript.
- Intégration d’APIs REST et synchronisation hors-ligne.

FORMATION :
Licence 3 / Master 1 Génie Logiciel — École Nationale Supérieure Polytechnique de Yaoundé (2022 - 2025)

COMPÉTENCES :
React Native, Expo, TypeScript, REST API, Git, Figma.`,
    generatedLetterText: SEED_LETTER_1,
    notes: 'Entretien visio Google Meet prévu ce jeudi à 15h00 avec le Lead Tech.',
  },
  {
    id: 'app-seed-2',
    studentId: 'student-current',
    jobId: 'job-3',
    status: 'PENDING',
    appliedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    lastRemindedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    job: SEED_JOBS[2],
    officialCv: SEED_OFFICIAL_CV_2,
    generatedCvText: `CURRICULUM VITAE — DAVE LIONEL KAMENI
Assistant Designer UI/UX & Brand Content
Yaoundé | 672364124 | dave.kameni@polytechnique.cm`,
    generatedLetterText: SEED_LETTER_2,
    notes: 'Dossier transmis par WhatsApp au Directeur Artistique.',
  },
  {
    id: 'app-seed-3',
    studentId: 'student-current',
    jobId: 'job-5',
    status: 'PENDING',
    appliedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    job: SEED_JOBS[4],
    officialCv: SEED_OFFICIAL_CV_1,
    generatedCvText: `CURRICULUM VITAE — DAVE LIONEL KAMENI
Stagiaire Analyste FinTech & Data Junior`,
    generatedLetterText: SEED_LETTER_1,
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

    // 1. Tenter avec authFetchRaw (envoie le Bearer token si présent sans bloquer)
    let response = await authFetchRaw(`/api/mobile/stages${suffix}`).catch(() => null);

    // 2. Si non-ok, tenter un fetch direct sur l'URL publique
    if (!response || !response.ok) {
      const directUrl = `${authBaseUrl}/api/mobile/stages${suffix}`;
      response = await fetch(directUrl).catch(() => null);
    }

    if (response && response.ok) {
      const payload = (await response.json()) as { jobs?: StageJob[] };
      if (Array.isArray(payload?.jobs) && payload.jobs.length > 0) {
        jobsList = payload.jobs;
      }
    }
  } catch (err) {
    console.warn('[stagesApi] Erreur lors de la récupération des offres distantes:', err);
  }

  // Si l'API retourne vide ou est hors-ligne, repli sur le catalogue Cameroun seed
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
  officialCv?: OfficialCvData;
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

  const nameParts = (student.fullName || '').trim().split(/\s+/).filter(Boolean);
  let nom = 'KAMENI';
  let prenom = 'Dave Lionel';
  if (nameParts.length >= 2) {
    nom = nameParts[0].toUpperCase();
    prenom = nameParts.slice(1).join(' ');
  } else if (nameParts.length === 1 && nameParts[0].toLowerCase() !== 'étudiant') {
    nom = nameParts[0].toUpperCase();
    prenom = 'Dave Lionel';
  }
  const ville = job.location ? job.location.split('/')[0].trim() : 'Yaoundé';

  const officialCv: OfficialCvData = {
    titrePoste: job.title,
    photoUrl: undefined,
    detailsPersonnels: {
      nom,
      prenom,
      nationalite: 'Camerounaise',
      age: '22 ans',
      email: student.email,
      telephone: student.phoneWhatsapp || '672364124',
      adresse: ville,
    },
    experiences: [
      {
        poste: `Stagiaire ${student.major}`,
        entreprise: 'Projets Académiques & Travaux Pratiques',
        ville,
        periode: '2023 - 2024',
        missions: [
          `Application des méthodologies de ${student.major} sur des cas pratiques d'entreprise`,
          `Mise en œuvre des compétences clés : ${student.skills.slice(0, 3).join(', ') || 'analyse et développement'}`,
          `Travail collaboratif et respect des spécifications fonctionnelles formulées`,
        ],
      },
    ],
    formations: [
      {
        diplome: `${student.educationLevel} en ${student.major}`,
        etablissement: 'Université / Grande École',
        ville,
        periode: 'En cours',
      },
    ],
    competences: {
      professionnelles: [
        ...job.requirements.slice(0, 3),
        'Résolution de problèmes et analyse fonctionnelle',
        'Gestion du temps et esprit critique',
      ],
      habilitesRelationnelles: [
        'assidu',
        'attentif',
        'autonome',
        'compréhensif',
        'conciliant',
        'consciencieux',
        'courtois',
        'créatif',
        'curieux',
      ],
      logiciels: [
        {
          categorie: 'Bureautique & Outils de Gestion',
          items: ['Suite Office (Word, Excel, PowerPoint)', 'Google Workspace', 'Git'],
        },
        {
          categorie: 'Technologies & Outils Spécialisés',
          items: student.skills.length > 0 ? student.skills : ['Outils métiers'],
        },
      ],
    },
    langues: [
      { langue: 'Français', niveau: 'expérimenté' },
      { langue: 'Anglais', niveau: 'intermédiaire' },
    ],
    loisirs: ['sport', 'lecture', 'veille technologique'],
  };

  const cvText = `CURRICULUM VITAE — ${nom} ${prenom}
${job.title.toUpperCase()}

DÉTAILS PERSONNELS :
Nom : ${nom} | Prénom : ${prenom}
Nationalité : ${officialCv.detailsPersonnels.nationalite} | Âge : ${officialCv.detailsPersonnels.age}
Email : ${student.email} | Téléphone : ${officialCv.detailsPersonnels.telephone}
Adresse : ${officialCv.detailsPersonnels.adresse}

EXPÉRIENCE PROFESSIONNELLE :
${officialCv.experiences.map(e => `• ${e.poste} — ${e.entreprise}, ${e.ville} (${e.periode})\n  ${e.missions.map(m => '- ' + m).join('\n  ')}`).join('\n')}

FORMATION :
${officialCv.formations.map(f => `• ${f.diplome} — ${f.etablissement}, ${f.ville} (${f.periode})`).join('\n')}

COMPÉTENCES PROFESSIONNELLES :
• ${officialCv.competences.professionnelles.join('\n• ')}

HABILITÉS PERSONNELLES ET RELATIONNELLES :
${officialCv.competences.habilitesRelationnelles.join(', ')}

MAÎTRISE DES LOGICIELS :
${officialCv.competences.logiciels.map(l => `• ${l.categorie} : ${l.items.join(', ')}`).join('\n')}

LANGUES :
${officialCv.langues.map(l => `• ${l.langue} : ${l.niveau}`).join('\n')}

AUTRES INFORMATIONS IMPORTANTES :
Loisirs : ${officialCv.loisirs.join(', ')}`.trim();

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
    officialCv,
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
  officialCv?: OfficialCvData,
): Promise<string> {
  let appId = '';
  try {
    const response = await authFetch('/api/mobile/stages/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, cvText, letterText }),
    });
    if (response.ok) {
      const payload = (await response.json()) as { application?: { id: string } };
      if (payload?.application?.id) {
        appId = payload.application.id;
      }
    }
  } catch (e) {
    console.warn('Network submit fallback to local memory:', e);
  }

  if (!appId) {
    appId = `app-local-${Date.now()}`;
  }

  // Always keep local list updated for instantaneous UI feedback
  const targetJob = SEED_JOBS.find((j) => j.id === jobId) || SEED_JOBS[0];
  const newApplication: StageApplication = {
    id: appId,
    studentId: 'student-current',
    jobId,
    status: 'PENDING',
    appliedAt: new Date().toISOString(),
    job: targetJob,
    generatedCvText: cvText,
    generatedLetterText: letterText,
    officialCv,
    notes: 'Candidature IA générée & transmise avec succès.',
  };

  localApplications = [newApplication, ...localApplications.filter((a) => a.id !== appId)];
  persistApplicationsLocally(localApplications);

  return appId;
}

const APPLICATIONS_STORAGE_KEY = 'campus360_student_applications';

function getStoredApplications(): StageApplication[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

function persistApplicationsLocally(apps: StageApplication[]) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(apps));
    } catch {}
  }
}

export async function fetchStudentApplications(): Promise<StageApplication[]> {
  try {
    const response = await authFetch('/api/mobile/stages/applications');
    if (response.ok) {
      const payload = (await response.json()) as { applications?: StageApplication[] };
      if (Array.isArray(payload?.applications) && payload.applications.length > 0) {
        return payload.applications;
      }
    }
  } catch (e) {
    console.warn('Fetch applications fallback to local store:', e);
  }

  const stored = getStoredApplications();
  if (stored.length > 0) {
    const storedIds = new Set(stored.map((a) => a.id));
    const merged = [...stored, ...localApplications.filter((a) => !storedIds.has(a.id))];
    localApplications = merged;
    return merged;
  }

  return localApplications;
}

export async function updateApplicationStatus(applicationId: string, status: AppStatus): Promise<boolean> {
  try {
    await authFetch('/api/mobile/stages/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, status }),
    });
  } catch (e) {
    console.warn('Update status fallback to local store:', e);
  }
  localApplications = localApplications.map((a) =>
    a.id === applicationId ? { ...a, status } : a
  );
  persistApplicationsLocally(localApplications);
  return true;
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
  if (app.status !== 'PENDING') return false;
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
