export type PdfIntelligenceInput = {
  fileName?: string;
  title?: string;
  description?: string;
  university?: string;
  faculty?: string;
  subject?: string;
  teacher?: string;
  level?: string;
  academicYear?: string;
  pageCount?: number;
  priceCoins?: number;
  rawText?: string;
};

export type PdfIntelligenceResult = {
  title: string;
  description: string;
  university: string;
  faculty: string;
  subject: string;
  teacher: string;
  level: string;
  academicYear: string;
  pageCount: number;
  aiSummary: string;
  aiTags: string[];
  aiDifficulty: string;
  suggestedPriceCoins: number;
  qualityScore: number;
  aiStudyPlan: string[];
  aiQuiz: Array<{ question: string; answer: string }>;
  extractedText: string;
};

const clean = (value?: string) =>
  value
    ?.replace(/\s+/g, ' ')
    .replace(/[|:;,.]+$/g, '')
    .trim() ?? '';

const titleFromFileName = (fileName?: string) =>
  clean(
    (fileName || 'document-pdf')
      .replace(/\.pdf$/i, '')
      .replace(/[-_]+/g, ' '),
  );

const firstMatch = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = clean(match?.[1] ?? match?.[0]);
    if (value) return value;
  }
  return '';
};

const inferSubject = (text: string, fallback: string) => {
  const lower = text.toLowerCase();
  const subjects = [
    'Mathematiques',
    'Analyse',
    'Algebre',
    'Informatique',
    'Algorithmique',
    'Programmation',
    'Droit OHADA',
    'Droit',
    'Comptabilite',
    'Economie',
    'Physique',
    'Chimie',
    'Anglais',
  ];

  return subjects.find((subject) => lower.includes(subject.toLowerCase())) ?? clean(fallback).split(' ').slice(0, 3).join(' ');
};

export const inferPdfIntelligence = (input: PdfIntelligenceInput): PdfIntelligenceResult => {
  const extractedText = clean(input.rawText).slice(0, 6000);
  const text = [input.title, input.description, input.subject, input.level, input.faculty, extractedText]
    .filter(Boolean)
    .join(' ');
  const lines = (input.rawText || input.description || input.title || '')
    .split(/\r?\n/)
    .map((line) => clean(line))
    .filter((line) => line.length >= 4);
  const fallbackTitle = clean(input.title) || titleFromFileName(input.fileName);
  const heading = lines.find((line) => !/page\s+\d+/i.test(line) && line.length <= 90);
  const level =
    clean(input.level) ||
    firstMatch(text, [
      /\b((?:L|Licence)\s?[1-3]\s?[A-Za-z ]{0,35})\b/i,
      /\b((?:M|Master)\s?[1-2]\s?[A-Za-z ]{0,35})\b/i,
      /\b((?:BTS|DUT)\s?[A-Za-z ]{0,35})\b/i,
    ]);
  const faculty =
    clean(input.faculty) ||
    firstMatch(text, [
      /\b(Faculte\s+(?:des?|de|d')\s+[\p{L} ]{3,60})/iu,
      /\b(Ecole\s+(?:nationale|superieure)?\s*[\p{L} ]{3,60})/iu,
      /\b(Institut\s+[\p{L} ]{3,60})/iu,
    ]);
  const subject = clean(input.subject) || inferSubject(text, fallbackTitle);
  const pageCount = Math.max(1, Number(input.pageCount || 1));
  const tags = Array.from(
    new Set(
      [
        subject,
        level,
        faculty,
        firstMatch(text, [/\b(examen|controle|td|tp|corrige|resume|cours)\b/i]),
        pageCount > 45 ? 'long format' : 'revision',
      ]
        .map(clean)
        .filter(Boolean),
    ),
  ).slice(0, 8);
  const aiDifficulty = /master|m2|m1|l3|niveau\s?3/i.test(text)
    ? 'avance'
    : /l2|niveau\s?2|droit|analyse/i.test(text)
      ? 'intermediaire'
      : 'standard';
  const suggestedPriceCoins = Math.max(
    100,
    Math.min(1000, Math.round((pageCount * 8 + tags.length * 25) / 50) * 50 || Number(input.priceCoins || 300)),
  );
  const qualityScore = Math.min(
    100,
    25 +
      (fallbackTitle ? 10 : 0) +
      (subject ? 15 : 0) +
      (level ? 15 : 0) +
      (faculty ? 10 : 0) +
      (pageCount > 1 ? 10 : 0) +
      (tags.length >= 3 ? 10 : 0) +
      (extractedText.length > 400 ? 5 : 0),
  );
  const title = heading || fallbackTitle;
  const description = clean(input.description) || lines.slice(0, 4).join(' - ').slice(0, 240) || `Document ${title}`;
  const aiSummary =
    lines.slice(0, 5).join(' ').slice(0, 420) ||
    `${title}. Document de ${subject || 'cours'} pour ${level || 'niveau non precise'}.`;

  return {
    title,
    description,
    university:
      clean(input.university) ||
      firstMatch(text, [/\b(Universite\s+(?:de|d')\s+[\p{L} -]{3,60})/iu, /\b(University\s+of\s+[\p{L} -]{3,60})/iu]),
    faculty,
    subject,
    teacher:
      clean(input.teacher) ||
      firstMatch(text, [
        /\b((?:Pr|Prof|Professeur|Dr|Docteur)\.?\s+\p{Lu}[\p{L} -]{2,50})/iu,
        /\b(Enseignant\s*:?\s*\p{Lu}[\p{L} -]{2,50})/iu,
      ]).replace(/^Enseignant\s*:?\s*/i, ''),
    level,
    academicYear: clean(input.academicYear) || firstMatch(text, [/\b(20\d{2}\s*[-/]\s*20\d{2})\b/, /\b(20\d{2})\b/]),
    pageCount,
    aiSummary,
    aiTags: tags,
    aiDifficulty,
    suggestedPriceCoins,
    qualityScore,
    aiStudyPlan: [
      `Lire le resume et identifier les notions cles de ${subject || 'la matiere'}.`,
      `Faire une fiche courte pour ${level || 'le niveau cible'}.`,
      'Traiter les exercices ou exemples, puis noter les erreurs frequentes.',
      'Finir par le quiz IA et relire les parties faibles.',
    ],
    aiQuiz: [
      {
        question: `Quel est le theme principal de "${title}" ?`,
        answer: subject || 'Le theme doit etre confirme apres lecture du document.',
      },
      {
        question: 'Quelle est la meilleure facon de reviser ce PDF ?',
        answer: 'Lire le resume, faire une fiche, pratiquer les exercices, puis verifier avec le quiz.',
      },
      {
        question: 'Quel niveau doit etre vise par ce document ?',
        answer: level || 'Le niveau doit etre complete dans le dashboard admin.',
      },
    ],
    extractedText,
  };
};
