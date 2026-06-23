import type { CampusDocument } from '../../types';
import { authFetch } from '../auth/betterAuth';

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

const localAnswer = (document: CampusDocument, question: string) => {
  const normalized = question.toLowerCase();
  if (normalized.includes('resume') || normalized.includes('resumer')) {
    return `Resume rapide: ${document.aiSummary || `"${document.title}" est un PDF de ${document.subject} pour ${document.level}. ${document.description}`}`;
  }
  if (normalized.includes('plan') || normalized.includes('etud')) {
    const plan = document.studyPlan?.length
      ? document.studyPlan.map((item, index) => `${index + 1}) ${item}`).join(' ')
      : `1) lis la preview, 2) note les definitions de ${document.subject}, 3) fais les exercices types, 4) transforme chaque erreur en fiche de revision.`;
    return `Plan d'etude conseille: ${plan}`;
  }
  if (normalized.includes('question') || normalized.includes('quiz')) {
    const quiz = document.quiz?.length
      ? document.quiz.map((item, index) => `${index + 1}) ${item.question} Reponse attendue: ${item.answer}`).join(' ')
      : `Explique l'objectif principal du document. Cite deux notions importantes de ${document.subject}. Donne un exemple d'exercice probable pour ${document.level}.`;
    return `Quiz rapide: ${quiz}`;
  }
  return `Je peux t'aider sur ce PDF. Demande-moi un resume, un plan d'etude, un quiz ou une explication d'une partie. Contexte actuel: ${document.title}, ${document.subject}, ${document.level}.`;
};

export const askPdfAssistant = async ({
  document,
  question,
  messages,
}: {
  document: CampusDocument;
  question: string;
  messages: PdfAssistantMessage[];
}) => {
  const response = await authFetch('/api/ai/pdf-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      pdfContext: buildPdfStudyContext(document),
      messages: messages.slice(-8).map(({ role, content }) => ({ role, content })),
    }),
  }).catch(() => null);

  if (!response?.ok) {
    if (response?.status === 403) {
      const payload = (await response.json().catch(() => null)) as { error?: string, message?: string } | null;
      if (payload?.error === 'CREDITS_EXHAUSTED') {
        throw new Error(payload.message || "Vous n'avez plus de credits IA. Veuillez recharger.");
      }
    }
    return localAnswer(document, question);
  }

  const payload = (await response.json()) as { answer?: string };
  return payload.answer ?? localAnswer(document, question);
};
