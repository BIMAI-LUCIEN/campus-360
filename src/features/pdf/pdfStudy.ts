import { authFetchRaw } from '../auth/betterAuth';
import { PassRequiredError } from './pdfAssistant';

export type StudyKind = 'summary' | 'plan' | 'quiz';

export type StudyQuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type StudyResponse = {
  summary?: string;
  plan?: string[];
  quiz?: StudyQuizQuestion[];
  /** Already written for this PDF: no AI action was counted. */
  stored?: boolean;
  freeActionsLeft?: number;
  passActive?: boolean;
};

const UNAVAILABLE = "L'IA n'a pas pu préparer ce contenu. Réessaie dans un instant.";

/** Summary, revision plan or a new quiz, written by the AI from the PDF's text. */
export const generatePdfStudy = async ({
  documentId,
  kind,
  avoid = [],
}: {
  documentId: string;
  kind: StudyKind;
  avoid?: string[];
}): Promise<StudyResponse> => {
  let response: Response;
  try {
    response = await authFetchRaw('/api/ai/pdf-study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, kind, avoid: avoid.slice(-40) }),
    });
  } catch {
    throw new Error(UNAVAILABLE);
  }
  const payload = (await response.json().catch(() => null)) as (StudyResponse & { error?: string }) | null;
  if (response.status === 402) throw new PassRequiredError(payload?.error || UNAVAILABLE);
  if (response.status === 401) throw new Error('Ta session a expiré. Reconnecte-toi.');
  if (!response.ok || !payload) throw new Error(payload?.error || UNAVAILABLE);
  return payload;
};
