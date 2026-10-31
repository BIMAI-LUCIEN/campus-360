import type { CampusDocument } from '../../types';
import { authFetchRaw } from '../auth/betterAuth';

export type PdfAssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // Page of the circled zone the question was about (the image itself is never stored).
  zonePage?: number;
};

// Zone circled in the PDF viewer (Module 30): JPEG data URL cropped from the page.
export type PdfZone = { page: number; image: string };

export const buildPdfStudyContext = (document: CampusDocument) =>
  [
    `Titre: ${document.title}`,
    `Matiere: ${document.subject}`,
    `Niveau: ${document.level}`,
    `Enseignant: ${document.teacher}`,
    `Universite: ${document.university}`,
    `Description: ${document.description}`,
    `Resume IA: ${document.aiSummary ?? ''}`,
    `Tags: ${(document.aiTags ?? []).join(', ')}`,
    `Difficulte: ${document.aiDifficulty ?? 'standard'}`,
    `Plan: ${(document.studyPlan ?? []).join(' | ')}`,
    `Quiz: ${(document.quiz ?? []).map((item) => `${item.question} -> ${item.answer}`).join(' | ')}`,
    `Annee: ${document.academicYear}`,
    `Pages: ${document.pageCount}`,
  ].join('\n');

// Raised when the 3 free AI actions of the day are used and no Revision Pass is active.
export class PassRequiredError extends Error {}

export type PdfAssistantAnswer = { answer: string; freeActionsLeft: number | null; passActive: boolean };

export const askPdfAssistant = async ({
  document,
  question,
  messages,
  zone,
}: {
  document: CampusDocument;
  question: string;
  messages: PdfAssistantMessage[];
  zone?: PdfZone;
}): Promise<PdfAssistantAnswer> => {
  const UNAVAILABLE = "L'assistant est indisponible pour le moment. Réessaie plus tard.";
  let response: Response;
  try {
    response = await authFetchRaw('/api/ai/pdf-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        action: 'question',
        pdfContext: buildPdfStudyContext(document),
        messages: messages.slice(-8).map(({ role, content }) => ({ role, content })),
        ...(zone ? { zone } : {}),
      }),
    });
  } catch {
    throw new Error(UNAVAILABLE);
  }

  const payload = (await response.json().catch(() => null)) as {
    answer?: string;
    error?: string;
    message?: string;
    freeActionsLeft?: number;
    passActive?: boolean;
  } | null;
  if (response.status === 402) throw new PassRequiredError(payload?.error || payload?.message || UNAVAILABLE);
  if (response.status === 401) throw new Error('Ta session a expiré. Reconnecte-toi pour poser ta question.');
  if (!response.ok) {
    // Out of credits, rate-limited, invalid or unreadable zone: the server message is actionable.
    if ([400, 403, 429, 503].includes(response.status) && (payload?.message || payload?.error)) {
      throw new Error(payload.message || payload.error);
    }
    throw new Error(UNAVAILABLE);
  }
  if (!payload?.answer) throw new Error(UNAVAILABLE);
  return {
    answer: payload.answer,
    freeActionsLeft: typeof payload.freeActionsLeft === 'number' ? payload.freeActionsLeft : null,
    passActive: payload.passActive === true,
  };
};
