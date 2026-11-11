import { authFetchRaw } from '../auth/betterAuth';
import { normalizeCv, type CvStyle, type CvTemplateId } from '../stages/cvHtml';
import type { OfficialCvData } from '../../types';
import type { CareerOffer } from './careerContextApi';

// Client of the CV jury (mobile-api: documents/cv-review, cv-suggest, cv-fill).

export type Gravite = 'bloquant' | 'majeur' | 'mineur';

export type JuryJudgeVerdict = {
  id: string;
  nom: string;
  verdict: 'RETENU' | 'REJETÉ';
  note: number;
  /** Estimated note if the student answers the questions (absent on older reviews). */
  potentiel?: number;
  raisons: { citation: string; raison: string }[];
};

export type CvReview = {
  score: number;
  total: number;
  at: string;
  /** "Up to Z/7 if you answer questions N, N, N" (absent on older reviews). */
  potentiel?: { score: number; questions: number[] };
  /** The review before the last correction, judge by judge (kept in "Mes CV"). */
  avant?: { score: number; juges: JudgeSnapshot[] };
  ats: {
    verdict: 'PASSE LE FILTRE' | 'FILTRÉ';
    note: number;
    couverture: number | null;
    motsCles: { motCle: string; etat: 'exact' | 'autre_forme' | 'absent'; trouve?: string }[];
    problemes: { gravite: Gravite; message: string }[];
  };
  jury: {
    posteVise: string;
    juges: JuryJudgeVerdict[];
    erreurs: { gravite: Gravite; citation: string; juges: string[]; correction: string }[];
    /** Sorted by gain, highest first. */
    questions: string[];
    questionsDetail?: { question: string; juges: string[]; gain: number }[];
    criteres?: { type: string; exigence: string; present: boolean; preuve: string }[];
  };
};

/** One judge before and after a correction, for the before / after table. */
export type JudgeSnapshot = { id: string; nom: string; note: number; verdict: string };

/** The 7 judges of a review (the ATS first), as kept to compare after a correction. */
export const judgeSnapshot = (review: CvReview): JudgeSnapshot[] => [
  { id: 'ats', nom: 'Le logiciel de tri (ATS)', note: review.ats.note, verdict: review.ats.verdict === 'PASSE LE FILTRE' ? 'RETENU' : 'REJETÉ' },
  ...review.jury.juges.map((j) => ({ id: j.id, nom: j.nom, note: j.note, verdict: j.verdict })),
];

export type PrecisionTarget = 'experience' | 'disponibilite' | 'langue' | 'ville' | 'lien' | 'autre';
export type PrecisionQuestion = { id: string; cible: PrecisionTarget; question: string; appui: string };

/** Error with the HTTP status, so the screen can tell "no credits" from a failure. */
export class JuryApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const post = async <T,>(path: string, body: unknown): Promise<T> => {
  let res: Response;
  try {
    res = await authFetchRaw(path, { method: 'POST', body: JSON.stringify(body) });
  } catch {
    throw new JuryApiError('Connexion impossible. Vérifie ta connexion et réessaie.', 0);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) throw new JuryApiError(data?.error || `Erreur serveur (${res.status}).`, res.status);
  return data;
};

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// The photo (an inline image of several hundred KB) is never read by the jury
// or the correction: it stays on the phone. A link still being typed (not https
// yet) is left out: the server refuses anything but https.
const withoutPhoto = (cv: OfficialCvData): OfficialCvData => {
  const { photoUrl: _photo, ...rest } = normalizeCv(cv);
  return rest;
};

export type ReviewResult = { review: CvReview; free: boolean; creditsUsed: number; remainingCredits: number };

export async function reviewCv(input: {
  cv: OfficialCvData;
  template: CvTemplateId;
  offer?: CareerOffer | null;
  sourceGenerationId?: string;
}): Promise<ReviewResult> {
  const data = await post<Omit<CvReview, 'at'> & { free: boolean; creditsUsed: number; remainingCredits: number }>(
    '/api/mobile/documents/cv-review',
    {
      cv: withoutPhoto(input.cv),
      template: input.template,
      offer: input.offer ?? null,
      generationId: newId('jury'),
      ...(input.sourceGenerationId ? { sourceGenerationId: input.sourceGenerationId } : {}),
    },
  );
  const { free, creditsUsed, remainingCredits, score, total, ats, jury, potentiel } = data;
  return { review: { score, total, ats, jury, ...(potentiel ? { potentiel } : {}), at: new Date().toISOString() }, free, creditsUsed, remainingCredits };
}

/** Rewrites the CV with the student's answers to the jury (a cv-fill generation). */
export async function correctCvWithJury(input: {
  cv: OfficialCvData;
  offer: CareerOffer;
  answers: { question: string; reponse: string }[];
  student: { fullName?: string; university?: string; major?: string; educationLevel?: string; skills?: string[] };
}): Promise<{ cv: Partial<OfficialCvData>; generationId: string; remainingCredits?: number }> {
  const generationId = newId('cv');
  const data = await post<{ cv: Partial<OfficialCvData>; remainingCredits?: number }>('/api/mobile/documents/cv-fill', {
    offer: input.offer,
    student: input.student,
    currentCv: withoutPhoto(input.cv),
    answers: input.answers.filter((a) => a.reponse.trim()),
    generationId,
  });
  return { cv: data.cv, generationId, remainingCredits: data.remainingCredits };
}

/** Questions asked before the CV is written: free, a fixed list when the AI cannot help. */
export async function fetchPrecisions(input: { offer: CareerOffer; background?: unknown; notes?: string }): Promise<{ questions: PrecisionQuestion[]; fallback: boolean }> {
  const data = await post<{ questions: PrecisionQuestion[]; fallback: boolean }>('/api/mobile/documents/cv-precisions', {
    offer: input.offer,
    background: input.background ?? null,
    notes: input.notes?.trim() || undefined,
  });
  return { questions: Array.isArray(data.questions) ? data.questions : [], fallback: Boolean(data.fallback) };
}

/**
 * Answers about the city, a link or the availability are the student's own
 * contact details: written into the CV header as typed (a link only if https).
 */
export const applyPrecisionContacts = (
  cv: OfficialCvData,
  questions: PrecisionQuestion[],
  answers: Record<string, string>,
): OfficialCvData => {
  const details = { ...cv.detailsPersonnels };
  for (const q of questions) {
    const answer = (answers[q.id] || '').trim();
    if (!answer) continue;
    if (q.cible === 'ville') details.ville = answer.slice(0, 120);
    if (q.cible === 'disponibilite') details.disponibilite = answer.slice(0, 200);
    if (q.cible === 'lien') {
      const links = (answer.match(/https:\/\/[^\s"'<>]+/gi) ?? []).map((l) => l.replace(/[.,;)]+$/, ''));
      if (links.length) details.liens = [...new Set([...(details.liens ?? []), ...links])].slice(0, 3);
    }
  }
  return normalizeCv({ ...cv, detailsPersonnels: details });
};

export async function suggestMissions(poste: string): Promise<string[]> {
  const data = await post<{ items: string[] }>('/api/mobile/documents/cv-suggest', { poste });
  return data.items;
}

/** Minimal offer for a CV kept without one: the jury then judges against its title. */
export const offerFromTitle = (title: string, company = ''): CareerOffer => ({
  kind: 'stage', title, company, location: '', duration: '', description: '', requirements: [], deadline: '',
});

export type { CvStyle };
