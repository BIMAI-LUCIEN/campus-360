// Summary, revision plan and quiz of a catalogue PDF, generated on demand from
// the PDF's own text (most PDFs were published without them). Self-contained
// (no imports) so the prompts and the parsing are tested without a model.

export type StudyKind = 'summary' | 'plan' | 'quiz';

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type StudyResult =
  | { kind: 'summary'; summary: string }
  | { kind: 'plan'; plan: string[] }
  | { kind: 'quiz'; quiz: QuizQuestion[] };

export type StudyDocument = { title: string; subject: string; level: string; description: string };

export class StudyOutputError extends Error {}

export const QUIZ_SIZE = 8;
/** Text handed to the model: enough to cover a whole course without blowing the context. */
export const MAX_COURSE_CHARS = 24_000;
export const MAX_AVOID = 40;

/**
 * Keeps up to `maxChars` of the course, spread over the whole document: a long
 * PDF is sampled page by page instead of cut after its first chapters.
 */
export const pickCourseText = (pages: { page: number; text: string }[], maxChars = MAX_COURSE_CHARS): string => {
  const cleaned = pages
    .map((p) => ({ page: p.page, text: p.text.replace(/\s+/g, ' ').trim() }))
    .filter((p) => p.text.length > 0);
  const total = cleaned.reduce((sum, p) => sum + p.text.length, 0);
  if (total === 0) return '';
  // Room left once each page has its "[p.N] " marker and line break.
  const room = Math.max(0, maxChars - cleaned.length * 10);
  const ratio = Math.min(1, room / total);
  return cleaned
    .map((p) => `[p.${p.page}] ${ratio < 1 ? p.text.slice(0, Math.floor(p.text.length * ratio)) : p.text}`)
    .join('\n')
    .slice(0, maxChars);
};

const TASKS: Record<StudyKind, string> = {
  summary: [
    'Rédige le RÉSUMÉ de ce cours pour un étudiant qui révise.',
    'Format JSON exact : {"summary": "..."}',
    'Le résumé fait 150 à 300 mots, en Markdown simple : une phrase d’introduction, puis les notions clés en liste à puces (mots importants en **gras**), puis une phrase sur ce qu’il faut retenir pour l’examen.',
  ].join('\n'),
  plan: [
    'Construis un PLAN DE RÉVISION de ce cours, étape par étape.',
    'Format JSON exact : {"plan": ["étape 1", "étape 2", ...]}',
    'De 5 à 8 étapes, dans l’ordre du cours. Chaque étape (1 ou 2 phrases) nomme les notions précises à travailler et une action concrète (refaire tel exercice, apprendre telle définition, etc.).',
  ].join('\n'),
  quiz: [
    `Crée un QUIZ de ${QUIZ_SIZE} questions à choix multiple sur ce cours.`,
    'Format JSON exact : {"quiz": [{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]}',
    'Chaque question a exactement 4 options, une seule bonne réponse (correctIndex de 0 à 3, varie sa position), et une explication courte qui dit pourquoi.',
    'Les questions portent sur le contenu réel du cours (définitions, formules, raisonnements, applications), de difficulté variée.',
  ].join('\n'),
};

export const buildStudyMessages = (kind: StudyKind, document: StudyDocument, courseText: string, avoid: string[] = []) => {
  const system = [
    'Tu es le tuteur de révision de Campus 360. Tu travailles UNIQUEMENT à partir du texte du cours fourni : n’invente aucune notion absente du cours.',
    'Tu écris en français clair. Tu réponds par un seul objet JSON valide, sans texte autour ni bloc de code.',
  ].join('\n');
  const avoidBlock =
    kind === 'quiz' && avoid.length
      ? `\nINTERDIT de reposer ces questions, déjà faites par l’étudiant (même reformulées) : pose de NOUVELLES questions, sur d’autres notions, d’autres détails ou d’autres applications du cours.\n- ${avoid
          .slice(-MAX_AVOID)
          .join('\n- ')}\n`
      : '';
  const user = [
    TASKS[kind],
    avoidBlock,
    `Titre : ${document.title}`,
    `Matière : ${document.subject}`,
    `Niveau : ${document.level}`,
    document.description ? `Description : ${document.description}` : '',
    '',
    '=== TEXTE DU COURS ===',
    courseText,
    '======================',
  ]
    .filter((line) => line !== '')
    .join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
};

// The model sometimes wraps the JSON in a code block or adds a sentence around it.
const extractJson = (raw: string): unknown => {
  const text = raw.replace(/```(?:json)?/gi, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new StudyOutputError('Réponse IA sans JSON.');
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new StudyOutputError('Réponse IA illisible.');
  }
};

const cleanString = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Reads the model output; throws StudyOutputError when it is unusable. A quiz
 * drops the questions listed in `avoid` (already taken by the student).
 */
export const parseStudyOutput = (kind: StudyKind, raw: string, avoid: string[] = []): StudyResult => {
  const data = extractJson(raw) as Record<string, unknown>;
  if (kind === 'summary') {
    const summary = cleanString(data.summary, 6_000);
    if (summary.length < 40) throw new StudyOutputError('Résumé vide.');
    return { kind, summary };
  }
  if (kind === 'plan') {
    const plan = (Array.isArray(data.plan) ? data.plan : [])
      .map((step) => cleanString(step, 600))
      .filter(Boolean)
      .slice(0, 12);
    if (plan.length < 3) throw new StudyOutputError('Plan trop court.');
    return { kind, plan };
  }
  const asked = new Set(avoid.map(normalize));
  const quiz = (Array.isArray(data.quiz) ? data.quiz : [])
    .map((item): QuizQuestion | null => {
      if (!item || typeof item !== 'object') return null;
      const q = item as Record<string, unknown>;
      const question = cleanString(q.question, 500);
      const options = (Array.isArray(q.options) ? q.options : []).map((o) => cleanString(o, 300)).filter(Boolean);
      const correctIndex = Number(q.correctIndex);
      if (!question || options.length < 2 || options.length > 6) return null;
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) return null;
      return { question, options, correctIndex, explanation: cleanString(q.explanation, 800) };
    })
    .filter((q): q is QuizQuestion => q !== null)
    .filter((q) => !asked.has(normalize(q.question)))
    .slice(0, 12);
  if (quiz.length < 3) throw new StudyOutputError('Quiz trop court.');
  return { kind, quiz };
};
