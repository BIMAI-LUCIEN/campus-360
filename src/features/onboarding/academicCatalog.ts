// Shared academic reference lists (onboarding, application sheet, profile).
// Every list is used with SelectWithOther, so a missing value can always be typed manually.

export const UNIVERSITIES = [
  'Université de Yaoundé I',
  'Université de Yaoundé II (Soa)',
  'Université de Douala',
  'Université de Dschang',
  'Université de Buea',
  'Université de Bamenda',
  'Université de Ngaoundéré',
  'Université de Maroua',
  'Université de Bertoua',
  'Université de Garoua',
  'École Nationale Supérieure Polytechnique de Yaoundé (ENSP)',
  'École Nationale Supérieure Polytechnique de Douala (ENSPD)',
  'ESSEC Douala',
  'IUT de Douala',
  'IUT Fotso Victor de Bandjoun',
  'ENAM',
  'Université Catholique d’Afrique Centrale (UCAC)',
  'Institut Universitaire de la Côte (IUC)',
  'Institut Universitaire du Golfe de Guinée (IUG)',
  'IAI-Cameroun',
  'Institut Siantou',
] as const;

export const LEVELS = [
  'BTS 1ère année',
  'BTS 2ème année',
  'Licence 1',
  'Licence 2',
  'Licence 3',
  'Master 1',
  'Master 2',
  'Cycle ingénieur',
  'Doctorat',
] as const;

export interface FacultyItem {
  name: string;
  skills: readonly string[];
}

export const FACULTIES: readonly FacultyItem[] = [
  {
    name: 'Informatique & Génie Logiciel',
    skills: ['React / React Native', 'TypeScript', 'Node.js & APIs', 'SQL & bases de données', 'Git & CI/CD', 'Python'],
  },
  {
    name: 'Réseaux & Télécommunications',
    skills: ['Administration réseaux', 'Cisco / CCNA', 'Linux', 'Cybersécurité', 'Fibre optique', 'Virtualisation'],
  },
  {
    name: 'Data & Intelligence Artificielle',
    skills: ['Python & Pandas', 'Machine Learning', 'SQL', 'Power BI', 'Statistiques', 'Prompt engineering'],
  },
  {
    name: 'Génie Électrique & Énergie',
    skills: ['Électricité industrielle', 'Automatismes & API', 'Énergies renouvelables', 'AutoCAD Électrique', 'Maintenance industrielle', 'QHSE'],
  },
  {
    name: 'Génie Civil & BTP',
    skills: ['AutoCAD & BIM', 'Calcul de structures', 'Gestion de chantier', 'Topographie', 'Devis quantitatif', 'QHSE'],
  },
  {
    name: 'Comptabilité, Finance & Audit',
    skills: ['SYSCOHADA', 'Analyse financière', 'Excel avancé', 'Audit & contrôle de gestion', 'Fiscalité', 'Trésorerie'],
  },
  {
    name: 'Marketing, Communication & Commerce',
    skills: ['Marketing digital', 'Réseaux sociaux', 'SEO', 'Vente & négociation', 'Copywriting', 'Google Analytics'],
  },
  {
    name: 'Gestion des Ressources Humaines',
    skills: ['Recrutement', 'Paie', 'Droit du travail', 'Gestion administrative', 'Communication interne', 'Excel'],
  },
  {
    name: 'Droit & Sciences Politiques',
    skills: ['Droit OHADA', 'Rédaction de contrats', 'Droit du travail', 'Contentieux', 'Veille juridique', 'Conformité'],
  },
  {
    name: 'Logistique & Transport',
    skills: ['Gestion des stocks', 'Supply chain', 'Transit & douane', 'ERP', 'Transport international', 'Excel'],
  },
  {
    name: 'Économie & Gestion',
    skills: ['Gestion de projet', 'Analyse de marché', 'Économétrie', 'Comptabilité', 'Statistiques', 'Excel'],
  },
  {
    name: 'Médecine, Pharmacie & Santé',
    skills: ['Santé publique', 'Pharmacologie', 'Biologie médicale', 'Gestion hospitalière', 'Contrôle qualité', 'Épidémiologie'],
  },
  {
    name: 'Agronomie & Agro-industrie',
    skills: ['Production végétale', 'Agro-alimentaire', 'Gestion d’exploitation', 'Contrôle qualité', 'Irrigation', 'Élevage'],
  },
  {
    name: 'Design & Multimédia',
    skills: ['Figma', 'Photoshop & Illustrator', 'UI/UX', 'Montage vidéo', 'Branding', 'Motion design'],
  },
];

export const FACULTY_NAMES = FACULTIES.map((faculty) => faculty.name);

export const GENERAL_SKILLS = [
  'Gestion de projet',
  'Communication',
  'Anglais professionnel',
  'Travail d’équipe',
  'Pack Office',
  'Résolution de problèmes',
] as const;

export const MAX_SKILLS = 8;

/** Skills suggested for a faculty (custom faculties only get the general skills). */
export const suggestedSkillsFor = (faculty: string): string[] => {
  const match = FACULTIES.find((item) => item.name === faculty);
  return Array.from(new Set([...(match?.skills ?? []), ...GENERAL_SKILLS]));
};
