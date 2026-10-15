// Default outlines of internship reports and theses, by field of study. Every
// outline shares the same frame (cover, preliminary pages, introduction,
// chapters, conclusion, references, appendices); only the chapters change, and
// the section titles are what `classifySection` recognises for the layout.
// This file exists twice, identical: mobile-api/lib/document-outlines.ts and
// src/features/documents/documentOutlines.ts (a test compares them).

export const STUDY_FIELDS = ['informatique', 'gestion', 'marketing', 'btp', 'droit'] as const;
export type StudyField = (typeof STUDY_FIELDS)[number];

export const STUDY_FIELD_LABELS: Record<StudyField, string> = {
  informatique: 'Informatique et réseaux',
  gestion: 'Gestion et comptabilité',
  marketing: 'Marketing et commerce',
  btp: 'BTP et génie',
  droit: 'Droit et sciences sociales',
};

export const DEFAULT_FIELD: StudyField = 'gestion';

export const isStudyField = (value: unknown): value is StudyField =>
  typeof value === 'string' && (STUDY_FIELDS as readonly string[]).includes(value);

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Best guess from the profile (faculty, speciality, level). Null when nothing matches.
export const fieldFromProfile = (...hints: (string | null | undefined)[]): StudyField | null => {
  const t = fold(hints.filter(Boolean).join(' '));
  if (!t.trim()) return null;
  if (/(informati|genie logiciel|reseau|telecom|data|developpe|numerique|\bia\b|\bsi\b|systemes? d.information)/.test(t)) return 'informatique';
  if (/(btp|genie civil|batiment|travaux publics|architect|electrotech|mecaniq|industriel|genie electrique|topograph)/.test(t)) return 'btp';
  if (/(marketing|commerce|commercial|vente|communication|logistique|transport)/.test(t)) return 'marketing';
  if (/(droit|juridi|sciences? (sociales|politiques)|sociolog|sciences humaines|relations internationales)/.test(t)) return 'droit';
  if (/(gestion|comptab|finance|banque|audit|economi|ressources humaines|\bgrh\b|management|fiscal)/.test(t)) return 'gestion';
  return null;
};

const REPORT_CHAPTERS: Record<StudyField, string[]> = {
  informatique: [
    'Chapitre 1 : Présentation de la structure d’accueil',
    'Chapitre 2 : Déroulement du stage et missions',
    'Chapitre 3 : Analyse du besoin et conception',
    'Chapitre 4 : Réalisation, tests et résultats',
    'Chapitre 5 : Bilan du stage et recommandations',
  ],
  gestion: [
    'Chapitre 1 : Présentation de la structure d’accueil',
    'Chapitre 2 : Organisation du service et déroulement du stage',
    'Chapitre 3 : Travaux réalisés et procédures observées',
    'Chapitre 4 : Analyse critique et recommandations',
  ],
  marketing: [
    'Chapitre 1 : Présentation de l’entreprise et de son marché',
    'Chapitre 2 : Organisation commerciale et déroulement du stage',
    'Chapitre 3 : Actions menées et résultats obtenus',
    'Chapitre 4 : Analyse critique et recommandations',
  ],
  btp: [
    'Chapitre 1 : Présentation de l’entreprise et du projet',
    'Chapitre 2 : Organisation du chantier et déroulement du stage',
    'Chapitre 3 : Travaux suivis, méthodes et calculs',
    'Chapitre 4 : Difficultés rencontrées et recommandations',
  ],
  droit: [
    'Chapitre 1 : Présentation de la structure d’accueil',
    'Chapitre 2 : Déroulement du stage et activités menées',
    'Chapitre 3 : Analyse d’un dossier ou d’une question étudiée',
    'Chapitre 4 : Bilan du stage et recommandations',
  ],
};

const MEMOIR_CHAPTERS: Record<StudyField, string[]> = {
  informatique: [
    'Chapitre 1 : Contexte et problématique',
    'Chapitre 2 : État de l’art',
    'Chapitre 3 : Analyse et conception',
    'Chapitre 4 : Réalisation de la solution',
    'Chapitre 5 : Tests, évaluation et discussion',
  ],
  gestion: [
    'Chapitre 1 : Cadre théorique et revue de littérature',
    'Chapitre 2 : Présentation du terrain d’étude',
    'Chapitre 3 : Méthodologie de la recherche',
    'Chapitre 4 : Présentation et analyse des résultats',
    'Chapitre 5 : Discussion et recommandations',
  ],
  marketing: [
    'Chapitre 1 : Cadre théorique et revue de littérature',
    'Chapitre 2 : Présentation du marché et de l’entreprise étudiée',
    'Chapitre 3 : Méthodologie de l’étude',
    'Chapitre 4 : Résultats de l’étude',
    'Chapitre 5 : Discussion et recommandations',
  ],
  btp: [
    'Chapitre 1 : Présentation du projet et problématique',
    'Chapitre 2 : Revue des normes et des méthodes',
    'Chapitre 3 : Études techniques et dimensionnement',
    'Chapitre 4 : Résultats, coûts et planning',
    'Chapitre 5 : Discussion et recommandations',
  ],
  droit: [
    'Chapitre 1 : Cadre juridique et conceptuel',
    'Chapitre 2 : État de la question et revue de littérature',
    'Chapitre 3 : Méthodologie',
    'Chapitre 4 : Analyse et résultats',
    'Chapitre 5 : Discussion et propositions',
  ],
};

export type OutlineKind = 'stage' | 'memoire';

export const outlineFor = (kind: OutlineKind, field: StudyField): string[] => {
  const memoir = kind === 'memoire';
  return [
    'Page de garde',
    'Dédicace',
    'Remerciements',
    ...(memoir ? ['Résumé', 'Abstract'] : ['Avant-propos']),
    'Sommaire',
    'Liste des abréviations',
    'Liste des figures et tableaux',
    ...(memoir ? [] : ['Fiche d’identification du stage']),
    'Introduction générale',
    ...(memoir ? MEMOIR_CHAPTERS[field] : REPORT_CHAPTERS[field]),
    'Conclusion générale',
    'Bibliographie',
    'Annexes',
  ];
};
