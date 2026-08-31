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

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// A free-tier model by default; overridable via OPENROUTER_MODEL. Kept in sync
// with the mobile assistant route so both features share one model config.
const DEFAULT_FREE_MODEL = 'google/gemini-2.0-flash-exp:free';
const LLM_TIMEOUT_MS = 20_000;

// Best-effort extraction of a JSON object from an LLM response that may wrap it
// in prose or ```json fences.
const parseJsonObject = (raw: string): Record<string, unknown> | null => {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const asString = (value: unknown) => (typeof value === 'string' ? clean(value) : '');
const asStringArray = (value: unknown, max: number) =>
  Array.isArray(value)
    ? value
        .map((v) => (typeof v === 'string' ? clean(v) : ''))
        .filter(Boolean)
        .slice(0, max)
    : [];

/**
 * Enriches the deterministic heuristic result with a real LLM pass via
 * OpenRouter. Non-empty model fields override the heuristic baseline; every
 * field falls back to the heuristic value on missing/invalid output. If no API
 * key is set, or the call fails/times out, the baseline is returned unchanged —
 * so analysis never blocks on the network and never leaves a document stuck.
 */
export const enrichPdfIntelligenceWithLLM = async (
  base: PdfIntelligenceResult,
): Promise<PdfIntelligenceResult> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return base;

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_FREE_MODEL;
  const source = (base.extractedText || `${base.title}\n${base.description}`).slice(0, 8000);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
        'X-OpenRouter-Title': 'Campus 360 Admin',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content:
              "Tu es un assistant qui catalogue des documents academiques pour des etudiants africains francophones. " +
              "Tu reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises Markdown. " +
              "Tu te bases strictement sur le contenu fourni. Si une information est absente, laisse une chaine vide.",
          },
          {
            role: 'user',
            content:
              `Analyse ce document et renvoie un JSON avec exactement ces cles: ` +
              `title (string, titre clair et court), description (string, 1-2 phrases), ` +
              `subject (string, la matiere), aiSummary (string, resume de 3-4 phrases), ` +
              `aiTags (array de 3 a 8 mots-cles), aiDifficulty (une de: "standard", "intermediaire", "avance"), ` +
              `aiStudyPlan (array de 3 a 5 etapes de revision), ` +
              `aiQuiz (array de 3 objets {question, answer}).\n\n` +
              `Titre actuel: ${base.title}\nMatiere supposee: ${base.subject}\nNiveau: ${base.level}\n\n` +
              `Contenu du document (extrait):\n<<<\n${source}\n>>>`,
          },
        ],
      }),
    });

    if (!response.ok) return base;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const parsed = parseJsonObject(payload.choices?.[0]?.message?.content ?? '');
    if (!parsed) return base;

    const tags = asStringArray(parsed.aiTags, 8);
    const studyPlan = asStringArray(parsed.aiStudyPlan, 5);
    const difficulty = asString(parsed.aiDifficulty).toLowerCase();
    const quiz = Array.isArray(parsed.aiQuiz)
      ? (parsed.aiQuiz as unknown[])
          .map((q) => {
            const item = q as Record<string, unknown>;
            return { question: asString(item.question), answer: asString(item.answer) };
          })
          .filter((q) => q.question && q.answer)
          .slice(0, 5)
      : [];

    const enriched: PdfIntelligenceResult = {
      ...base,
      title: asString(parsed.title) || base.title,
      description: asString(parsed.description) || base.description,
      subject: asString(parsed.subject) || base.subject,
      aiSummary: asString(parsed.aiSummary) || base.aiSummary,
      aiTags: tags.length ? tags : base.aiTags,
      aiDifficulty: ['standard', 'intermediaire', 'avance'].includes(difficulty)
        ? difficulty
        : base.aiDifficulty,
      aiStudyPlan: studyPlan.length ? studyPlan : base.aiStudyPlan,
      aiQuiz: quiz.length ? quiz : base.aiQuiz,
    };

    // A successful LLM pass meaningfully raises confidence in the metadata.
    enriched.qualityScore = Math.min(100, base.qualityScore + 15);
    return enriched;
  } catch {
    // Timeout, network error, abort — degrade gracefully to the heuristic.
    return base;
  } finally {
    clearTimeout(timeout);
  }
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
