// Pure scoring of a new offer for one student (no imports, unit-tested in tests/).
// Two signals, because most students have few or no skills saved and some offers
// list no requirements:
//  - skills: share of the offer's requirements they cover, or, without requirements,
//    how many of their skills the offer's text mentions;
//  - field: their field of study (faculty) matches the offer's domain.

export const STRONG_MATCH = 60;

export type AlertStudent = { skills: readonly string[]; faculty?: string | null };
export type AlertJob = {
  title: string;
  description?: string | null;
  requirements: readonly string[];
  industry?: string | null;
};

export const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim();

// Domains of the Cameroonian curricula seen in the app, and the words that reveal them in an
// offer's title, sector or requirements. A word matches the start of a word of the offer
// (« developp » → développeur), a phrase (with a space) must appear as such.
const FIELD_WORDS: { field: RegExp; offer: string[] }[] = [
  { field: /informat|logiciel|programm|web|cloud|data|developp|numerique/, offer: ['informatique', 'developpeur', 'developpement', 'logiciel', 'web', 'data analyst', 'data scientist', 'data engineer', 'programmeur', 'programmation', 'devops', 'cloud', 'fullstack', 'frontend', 'backend', 'react', 'javascript', 'python', 'java', 'php'] },
  { field: /reseau|telecom/, offer: ['reseau', 'reseaux', 'telecom', 'telecoms', 'telecommunications', 'cybersecurite', 'fibre', 'administrateur systeme', 'infrastructure informatique'] },
  { field: /design|ux|ui|graphi|multimedia/, offer: ['design', 'designer', 'ux', 'ui', 'graphiste', 'graphique', 'figma', 'infographiste', 'multimedia'] },
  { field: /financ|compta|audit|gestion|banque|econom/, offer: ['comptable', 'comptabilite', 'finance', 'financier', 'audit', 'auditeur', 'banque', 'bancaire', 'tresorerie', 'fiscal', 'fiscalite', 'controle de gestion'] },
  { field: /marketing|commerc|(^|\s)communication|vente/, offer: ['marketing', 'commercial', 'commerciale', 'communication', 'vente', 'ventes', 'sales', 'community manager'] },
  { field: /droit|jurid/, offer: ['droit', 'juridique', 'juriste', 'contentieux', 'notarial'] },
  { field: /btp|civil|batiment|construction|architect/, offer: ['btp', 'genie civil', 'chantier', 'batiment', 'construction', 'travaux', 'topographe', 'topographie'] },
  { field: /ressources humaines|rh/, offer: ['ressources humaines', 'rh', 'recrutement', 'paie'] },
  { field: /logistique|transport|supply/, offer: ['logistique', 'transport', 'supply', 'transit', 'douane'] },
  { field: /sante|medec|infirm|pharma|biolog/, offer: ['sante', 'medical', 'medecin', 'infirmier', 'infirmiere', 'pharmacie', 'pharmaceutique', 'laboratoire', 'clinique', 'hopital'] },
  { field: /agro|agri|environnement/, offer: ['agronome', 'agronomie', 'agricole', 'agriculture', 'environnement', 'elevage'] },
  { field: /electri|electron|mecani|industri|energie|maintenance/, offer: ['electricite', 'electricien', 'electrique', 'electronique', 'mecanique', 'mecanicien', 'maintenance', 'industriel', 'industrielle', 'energie', 'automatisme'] },
];

const words = (text: string) => normalizeText(text).split(' ').filter(Boolean);

/**
 * Title and sector: what the offer is about. The requirements and the description are too
 * generic for that (« réseaux sociaux » in a marketing offer, « outil informatique » for an
 * accountant); they only count for the skills.
 */
const offerFieldText = (job: AlertJob) => ` ${normalizeText([job.title, job.industry ?? ''].join(' '))} `;

const offerHas = (fieldText: string, tokens: string[], keyword: string) =>
  keyword.includes(' ')
    ? fieldText.includes(` ${keyword} `)
    : tokens.some((token) => token === keyword || (keyword.length >= 5 && token.startsWith(keyword)));

const offerText = (job: AlertJob) =>
  ` ${normalizeText([job.title, job.industry ?? '', job.description ?? '', ...job.requirements].join(' '))} `;

/** Share (0-100) of the requirements covered by the skills (contains or is contained). */
const requirementsCoverage = (skills: string[], requirements: string[]) => {
  if (!skills.length || !requirements.length) return 0;
  const covered = requirements.filter((req) => skills.some((skill) => skill.includes(req) || req.includes(skill))).length;
  return Math.round((covered / requirements.length) * 100);
};

export const fieldMatches = (faculty: string | null | undefined, job: AlertJob): boolean => {
  const field = ` ${normalizeText(faculty ?? '')} `;
  if (!field.trim()) return false;
  const fieldText = offerFieldText(job);
  const tokens = words(fieldText);
  return FIELD_WORDS.some((entry) => entry.field.test(field) && entry.offer.some((keyword) => offerHas(fieldText, tokens, keyword)));
};

/** 0-100: how well a newly published offer fits this student. */
export const scoreJobForStudent = (student: AlertStudent, job: AlertJob): number => {
  const skills = student.skills.map(normalizeText).filter((skill) => skill.length >= 2);
  const requirements = job.requirements.map(normalizeText).filter((req) => req.length >= 2);
  const field = fieldMatches(student.faculty, job) ? 100 : 0;
  if (!skills.length) return field ? 70 : 0;

  let skillPart: number;
  if (requirements.length) {
    skillPart = requirementsCoverage(skills, requirements);
  } else {
    const text = offerText(job);
    const mentioned = skills.filter((skill) => text.includes(` ${skill} `) || (skill.length >= 4 && text.includes(skill))).length;
    skillPart = Math.min(100, mentioned * 35);
  }
  return Math.round(0.65 * skillPart + 0.35 * field);
};
