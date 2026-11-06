import { authFetchRaw } from '../auth/betterAuth';
import type { CvStyle, CvTemplateId } from '../stages/cvHtml';
import type { OfficialCvData } from '../../types';
import type { CareerOffer } from './careerContextApi';

// Client of the CV jury (mobile-api: documents/cv-review, cv-suggest, cv-fill).

export type Gravite = 'bloquant' | 'majeur' | 'mineur';

export type CvReview = {
  score: number;
  total: number;
  at: string;
  ats: {
    verdict: 'PASSE LE FILTRE' | 'FILTRÉ';
    note: number;
    couverture: number | null;
    motsCles: { motCle: string; etat: 'exact' | 'autre_forme' | 'absent'; trouve?: string }[];
    problemes: { gravite: Gravite; message: string }[];
  };
  jury: {
    posteVise: string;
    juges: { id: string; nom: string; verdict: 'RETENU' | 'REJETÉ'; note: number; raisons: { citation: string; raison: string }[] }[];
    erreurs: { gravite: Gravite; citation: string; juges: string[]; correction: string }[];
    questions: string[];
  };
};

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
// or the correction: it stays on the phone.
const withoutPhoto = (cv: OfficialCvData): OfficialCvData => {
  const { photoUrl: _photo, ...rest } = cv;
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
  const { free, creditsUsed, remainingCredits, score, total, ats, jury } = data;
  return { review: { score, total, ats, jury, at: new Date().toISOString() }, free, creditsUsed, remainingCredits };
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

export async function suggestMissions(poste: string): Promise<string[]> {
  const data = await post<{ items: string[] }>('/api/mobile/documents/cv-suggest', { poste });
  return data.items;
}

/** Minimal offer for a CV kept without one: the jury then judges against its title. */
export const offerFromTitle = (title: string, company = ''): CareerOffer => ({
  kind: 'stage', title, company, location: '', duration: '', description: '', requirements: [], deadline: '',
});

export type { CvStyle };
