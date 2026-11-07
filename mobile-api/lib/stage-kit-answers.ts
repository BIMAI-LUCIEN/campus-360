// Pure prompts, validation, parsing and grounding for LINK application kit answers
// (contexte.md §22). Uses the same numbersGrounded rule as cv-fill: any sentence
// containing a number absent from the student's profile or notes is dropped.

import { z } from 'zod';

import { numbersGrounded } from './cv-fill';
import type { LlmMessage } from './llm';
import type { KitReadyAnswers } from './stage-kits-core';

const text = (max: number) => z.string().trim().max(max);

export const kitAnswersRequestSchema = z
  .object({
    jobId: z.string().trim().min(1).max(200),
    question: z.string().trim().min(1).max(500).optional(),
    student: z
      .object({
        fullName: text(200).optional(),
        university: text(200).optional(),
        major: text(200).optional(),
        educationLevel: text(100).optional(),
        skills: z.array(text(100)).max(40).optional(),
      })
      .optional(),
    notes: text(4000).optional(),
  })
  .strict();

export type KitAnswersRequest = z.infer<typeof kitAnswersRequestSchema>;

export type KitJobContext = {
  title: string;
  company?: string;
  location?: string;
  duration?: string;
  description?: string;
  requirements?: string[];
};

export type KitStudentContext = {
  fullName?: string;
  university?: string;
  major?: string;
  educationLevel?: string;
  skills?: string[];
  backgroundText?: string;
  notes?: string;
};

/** Everything the student wrote or declared: the only allowed source of numbers. */
export const kitGroundingSource = (student: KitStudentContext): string =>
  [
    student.fullName,
    student.university,
    student.major,
    student.educationLevel,
    ...(student.skills ?? []),
    student.backgroundText,
    student.notes,
  ]
    .filter(Boolean)
    .join('\n');

/**
 * Keeps only sentences whose numbers all appear in `source`. If a sentence has
 * an ungrounded number, that sentence is removed. If everything is removed,
 * strips the ungrounded numbers inline so the answer is never empty by accident.
 */
export const groundKitText = (source: string, answer: string): string => {
  const cleaned = answer.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  if (numbersGrounded(source, cleaned)) return cleaned;

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const groundedSentences = sentences.filter((s) => numbersGrounded(source, s));
  if (groundedSentences.length > 0) {
    return groundedSentences.join(' ').trim();
  }

  // Single-sentence fallback: strip any number token not present in source.
  const knownNumbers = new Set((source.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.')));
  return cleaned
    .replace(/\b\d+(?:[.,]\d+)?\s*%?(?:\s*(?:ans?|mois|semaines?|jours?|heures?|clients?|projets?|fcfa|xaf))?\b/gi, (match) => {
      const num = (match.match(/\d+(?:[.,]\d+)?/) ?? [''])[0].replace(',', '.');
      return knownNumbers.has(num) ? match : '';
    })
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
};

const formatStudentBlock = (student: KitStudentContext): string =>
  [
    student.fullName ? `Nom : ${student.fullName}` : '',
    student.educationLevel || student.major
      ? `Études : ${[student.educationLevel, student.major].filter(Boolean).join(' en ')}`
      : '',
    student.university ? `Établissement : ${student.university}` : '',
    student.skills?.length ? `Compétences déclarées : ${student.skills.join(', ')}` : '',
    student.backgroundText ? `Parcours enregistré : ${student.backgroundText.slice(0, 2500)}` : '',
    student.notes ? `Notes : ${student.notes.slice(0, 1500)}` : '',
  ]
    .filter(Boolean)
    .join('\n') || '(Profil minimal)';

const formatJobBlock = (job: KitJobContext): string =>
  [
    `Poste : ${job.title}`,
    job.company ? `Entreprise : ${job.company}` : '',
    job.location ? `Lieu : ${job.location}` : '',
    job.duration ? `Durée : ${job.duration}` : '',
    job.requirements?.length ? `Exigences : ${job.requirements.join(', ')}` : '',
    job.description ? `Description : ${job.description.slice(0, 1500)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

export const buildReadyAnswersMessages = (
  job: KitJobContext,
  student: KitStudentContext,
): LlmMessage[] => [
  {
    role: 'system',
    content: [
      'Tu aides un étudiant camerounais à remplir un formulaire de candidature en ligne.',
      'Tu rédiges 4 réponses courtes, prêtes à copier-coller, à la première personne (« je ») :',
      '1. "presentation" : présentation en 3 phrases sobres (études, spécialité, objectif lié au poste).',
      '2. "whyThisRole" : pourquoi ce poste et cette entreprise (2 à 3 phrases concrètes liées aux missions de l’offre).',
      '3. "availability" : disponibilité de l’étudiant (indique uniquement ce qui figure dans son profil ou ses notes ; si aucune date précise n’est fournie par l’étudiant, écris « Disponible immédiatement selon le calendrier de l’entreprise, dates exactes à préciser lors de l’entretien » sans inventer de chiffre ni de durée).',
      '4. "keySkills" : compétences clés pour ce poste (uniquement celles présentes dans le profil de l’étudiant, reliées aux besoins de l’offre, en 2 à 3 phrases).',
      'Règle absolue : n’invente AUCUN chiffre, AUCUNE année d’expérience, AUCUNE entreprise passée, AUCUN diplôme ni compétence absents du profil de l’étudiant.',
      'Réponds uniquement par un objet JSON valide, sans markdown :',
      '{"presentation":"","whyThisRole":"","availability":"","keySkills":""}',
    ].join('\n'),
  },
  {
    role: 'user',
    content: `OFFRE\n${formatJobBlock(job)}\n\nÉTUDIANT\n${formatStudentBlock(student)}`,
  },
];

const str = (max: number) =>
  z
    .preprocess((v) => (typeof v === 'string' ? v : ''), z.string())
    .transform((v) => v.trim().slice(0, max));

const readyAnswersSchema = z.object({
  presentation: str(800),
  whyThisRole: str(800),
  availability: str(500),
  keySkills: str(800),
});

export const parseReadyAnswers = (
  raw: string | null,
  student: KitStudentContext,
): KitReadyAnswers | null => {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const parsed = readyAnswersSchema.safeParse(json);
  if (!parsed.success) return null;
  const source = kitGroundingSource(student);
  const ready: KitReadyAnswers = {
    presentation: groundKitText(source, parsed.data.presentation),
    whyThisRole: groundKitText(source, parsed.data.whyThisRole),
    availability: groundKitText(source, parsed.data.availability),
    keySkills: groundKitText(source, parsed.data.keySkills),
  };
  if (!ready.presentation || !ready.whyThisRole || !ready.availability || !ready.keySkills) {
    return null;
  }
  return ready;
};

export const buildCustomQuestionMessages = (
  job: KitJobContext,
  student: KitStudentContext,
  question: string,
): LlmMessage[] => [
  {
    role: 'system',
    content: [
      'Tu aides un étudiant camerounais à répondre à une question d’un formulaire de candidature en ligne.',
      'Rédige une réponse directe, sobre et professionnelle à la première personne (« je »), en 2 à 4 phrases prêtes à coller.',
      'Règle absolue : appuie-toi UNIQUEMENT sur le profil de l’étudiant et l’offre. N’invente AUCUN chiffre, AUCUNE durée, AUCUNE entreprise ni compétence absents du profil. Si la question demande une information factuelle absente du profil (ex. prétentions salariales, date exacte, expérience non mentionnée), reste factuel et indique `[à compléter]` à l’endroit précis plutôt que d’inventer.',
      'Réponds uniquement par un objet JSON valide, sans markdown :',
      '{"answer":""}',
    ].join('\n'),
  },
  {
    role: 'user',
    content: `OFFRE\n${formatJobBlock(job)}\n\nÉTUDIANT\n${formatStudentBlock(student)}\n\nQUESTION DU FORMULAIRE\n${question.trim().slice(0, 500)}`,
  },
];

const customAnswerSchema = z.object({
  answer: str(1200),
});

export const parseCustomQuestionAnswer = (
  raw: string | null,
  student: KitStudentContext,
): string | null => {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  let candidate = '';
  if (start >= 0 && end > start) {
    try {
      const json = JSON.parse(raw.slice(start, end + 1));
      const parsed = customAnswerSchema.safeParse(json);
      if (parsed.success) candidate = parsed.data.answer;
    } catch {
      candidate = '';
    }
  }
  if (!candidate) return null;
  const source = kitGroundingSource(student);
  const grounded = groundKitText(source, candidate);
  return grounded.length >= 2 ? grounded : null;
};
