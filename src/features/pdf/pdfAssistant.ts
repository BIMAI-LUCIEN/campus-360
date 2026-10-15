import type { CampusDocument } from '../../types';
import { authFetchRaw } from '../auth/betterAuth';

export type PdfAssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

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

export const askPdfAssistant = async ({
  document,
  question,
  messages,
}: {
  document: CampusDocument;
  question: string;
  messages: PdfAssistantMessage[];
}) => {
  const UNAVAILABLE = "L'assistant est indisponible pour le moment. Réessaie plus tard.";
  let response: Response;
  try {
    response = await authFetchRaw('/api/ai/pdf-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        pdfContext: buildPdfStudyContext(document),
        messages: messages.slice(-8).map(({ role, content }) => ({ role, content })),
      }),
    });
  } catch {
    throw new Error(UNAVAILABLE);
  }

  const payload = (await response.json().catch(() => null)) as { answer?: string; error?: string; message?: string } | null;
  if (!response.ok) {
    // Out of credits, rate-limited: the server message is actionable.
    if ((response.status === 403 || response.status === 429) && (payload?.message || payload?.error)) {
      throw new Error(payload.message || payload.error);
    }
    throw new Error(UNAVAILABLE);
  }
  if (!payload?.answer) throw new Error(UNAVAILABLE);
  return payload.answer;
};
