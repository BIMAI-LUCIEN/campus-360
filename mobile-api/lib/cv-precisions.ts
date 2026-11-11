// Questions asked before the CV is written (module 36, decision of 2026-11-11:
// written by the AI, free under the AI quota, cached per reference CV and offer).
// They target what the jury penalises: volumes, scope and results of each
// experience, availability, language levels, city, links. Each question must
// lean on a real excerpt of the reference CV or of the offer ("appui"), else it
// is dropped; when the AI gives nothing usable, a fixed list on the same themes
// is returned instead. The answers are the student's words (cv-fill).

import { createHash } from 'node:crypto';

import type { LlmMessage } from './llm';

export const PRECISION_TARGETS = ['experience', 'disponibilite', 'langue', 'ville', 'lien', 'autre'] as const;
export type PrecisionTarget = (typeof PRECISION_TARGETS)[number];

export type PrecisionQuestion = { id: string; cible: PrecisionTarget; question: string; appui: string };

export type PrecisionOffer = { title: string; company?: string; location?: string; duration?: string; description?: string; requirements?: string[] };

export const MAX_PRECISION_QUESTIONS = 8;

/** Same themes as the AI questions, asked when the AI fails or has nothing to lean on. */
export const FALLBACK_PRECISION_QUESTIONS: PrecisionQuestion[] = [
  { id: 'q-volume', cible: 'experience', question: 'Dans ton expérience la plus récente, combien en traitais-tu (factures, clients, dossiers…) et pendant combien de temps ?', appui: '' },
  { id: 'q-resultat', cible: 'experience', question: 'Qu’est-ce que ton travail a apporté de concret (délai gagné, erreur évitée, ventes, satisfaction) ?', appui: '' },
  { id: 'q-dispo', cible: 'disponibilite', question: 'Quand es-tu disponible, pour combien de temps et à quel rythme (temps plein, alternance) ?', appui: '' },
  { id: 'q-langues', cible: 'langue', question: 'Quel est ton niveau dans chaque langue (A2, B1, B2, C1, ou un score de test) ?', appui: '' },
  { id: 'q-ville', cible: 'ville', question: 'Dans quelle ville habites-tu, et peux-tu te déplacer pour ce poste ?', appui: '' },
  { id: 'q-lien', cible: 'lien', question: 'As-tu un profil LinkedIn ou un portfolio ? Colle le lien (https://…).', appui: '' },
];

const fold = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[«»"“”‘’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** True when the excerpt is in the text, ignoring case, accents and punctuation. */
export const excerptIn = (text: string, excerpt: string): boolean => {
  const needle = fold(excerpt.replace(/^(\.\.\.|…)|(\.\.\.|…)$/g, ''));
  return needle.length >= 3 && ` ${fold(text)} `.includes(` ${needle} `);
};

const offerText = (offer: PrecisionOffer): string =>
  [offer.title, offer.company, offer.location, offer.duration, ...(offer.requirements ?? []), offer.description?.slice(0, 1500)].filter(Boolean).join('\n');

export const buildPrecisionMessages = (reference: string, offer: PrecisionOffer): LlmMessage[] => [
  {
    role: 'system',
    content: [
      'Tu prépares les questions à poser à un étudiant camerounais avant de rédiger son CV pour une offre.',
      'Un jury de recruteurs rejette un CV sans chiffres, sans périmètre (volume, durée, équipe), sans résultat, sans disponibilité, sans niveau de langue, sans ville.',
      `Pose au plus ${MAX_PRECISION_QUESTIONS} questions courtes, en tutoyant, une seule information par question, sur ce qui manque dans SON CV de référence pour CETTE offre.`,
      'Priorité : les expériences liées à l’offre (combien, pendant combien de temps, avec qui, quel résultat), puis disponibilité et durée du stage, niveaux de langue, ville, lien LinkedIn ou portfolio.',
      'Ne pose pas de question dont la réponse est déjà dans le CV. N’invente aucun fait et ne suggère aucun chiffre.',
      '"appui" : un extrait exact et court (12 mots au plus) du CV ou de l’offre sur lequel la question s’appuie ; vide seulement pour disponibilite, ville ou lien.',
      `"cible" : une valeur parmi ${PRECISION_TARGETS.join(', ')}.`,
      'Réponds uniquement par un tableau JSON, sans markdown : [{"cible":"experience","question":"","appui":""}]',
    ].join('\n'),
  },
  {
    role: 'user',
    content: [
      `OFFRE\n${offerText(offer)}`,
      '',
      `CV DE RÉFÉRENCE ET NOTES DE L’ÉTUDIANT\n${reference.slice(0, 6000) || '(aucun)'}`,
    ].join('\n'),
  },
];

const NO_ANCHOR_NEEDED: PrecisionTarget[] = ['disponibilite', 'ville', 'lien'];

/** Reads the model answer: questions grounded in the CV or the offer, deduplicated, 8 at most. */
export const parsePrecisionQuestions = (raw: string | null, reference: string, offer: PrecisionOffer): PrecisionQuestion[] => {
  if (!raw) return [];
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  let items: unknown;
  try {
    items = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];
  const sources = `${reference}\n${offerText(offer)}`;
  const seen = new Set<string>();
  const out: PrecisionQuestion[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const { cible, question, appui } = item as Record<string, unknown>;
    if (typeof question !== 'string' || !PRECISION_TARGETS.includes(cible as PrecisionTarget)) continue;
    const q = question.trim().replace(/\s+/g, ' ');
    const anchor = typeof appui === 'string' ? appui.trim().slice(0, 160) : '';
    if (q.length < 10 || q.length > 220) continue;
    // A question about something the student never wrote and the offer never asks is noise.
    if (anchor ? !excerptIn(sources, anchor) : !NO_ANCHOR_NEEDED.includes(cible as PrecisionTarget)) continue;
    const key = fold(q);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: `q-${out.length + 1}`, cible: cible as PrecisionTarget, question: q, appui: anchor });
    if (out.length >= MAX_PRECISION_QUESTIONS) break;
  }
  return out;
};

type Entry = { questions: PrecisionQuestion[]; at: number };
const TTL_MS = 7 * 24 * 3600 * 1000;
const MAX_ENTRIES = 500;
const cache = new Map<string, Entry>();

export const clearPrecisionCache = (): void => cache.clear();

/** Same reference CV and same offer → same key (no new AI call). */
export const precisionCacheKey = (reference: string, offer: PrecisionOffer): string =>
  createHash('sha256').update(`${fold(reference)}\u0000${fold(offerText(offer))}`).digest('hex');

/**
 * Questions for one reference CV and one offer: from the cache when already
 * asked in the last 7 days, else one model call. An answer with no usable
 * question gives the fixed list, which is not cached (the next call retries).
 */
export const askPrecisions = async (
  reference: string,
  offer: PrecisionOffer,
  deps: { beforeAiCall: () => Promise<void>; callModel: (messages: LlmMessage[]) => Promise<string | null>; now?: () => number },
): Promise<{ questions: PrecisionQuestion[]; cached: boolean; fallback: boolean }> => {
  const key = precisionCacheKey(reference, offer);
  const now = deps.now?.() ?? Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return { questions: hit.questions, cached: true, fallback: false };

  await deps.beforeAiCall();
  const questions = parsePrecisionQuestions(await deps.callModel(buildPrecisionMessages(reference, offer)), reference, offer);
  if (!questions.length) return { questions: FALLBACK_PRECISION_QUESTIONS, cached: false, fallback: true };
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(key, { questions, at: now });
  return { questions, cached: false, fallback: false };
};
