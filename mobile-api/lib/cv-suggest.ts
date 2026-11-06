// Mission bullets suggested for a job title (decision of 2026-11-06: free, under
// the AI quota, cached per title). They are proposals the student picks one by
// one in the editor: never written into a CV by the server. A bullet with a
// number is dropped, since a volume or a result can only come from the student.

import type { LlmMessage } from './llm';

export const normalizeJobTitle = (title: string): string =>
  title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);

export const buildSuggestMessages = (poste: string): LlmMessage[] => [
  {
    role: 'system',
    content: [
      'Tu proposes des puces de missions pour la rubrique Expérience d’un CV d’étudiant camerounais.',
      'Donne 5 missions typiques et concrètes de ce poste, une phrase courte chacune, qui commence par un nom d’action (« Saisie… », « Suivi… », « Préparation… »).',
      'Aucun chiffre, aucun nom d’entreprise, d’outil propriétaire rare ou de client, aucun résultat : ce sont des propositions génériques que l’étudiant choisira seulement s’il les a vraiment faites.',
      'Réponds uniquement par un tableau JSON de chaînes, sans markdown.',
    ].join('\n'),
  },
  { role: 'user', content: `Poste : ${poste}` },
];

export const parseSuggestions = (raw: string | null): string[] => {
  if (!raw) return [];
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  let items: unknown[] = [];
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1));
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      items = [];
    }
  }
  const seen = new Set<string>();
  return items
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/^[-•*\s]+/, '').trim().replace(/\s+/g, ' '))
    .filter((item) => item.length >= 8 && item.length <= 180 && !/\d/.test(item))
    .filter((item) => {
      const key = normalizeJobTitle(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
};

type Entry = { items: string[]; at: number };
const TTL_MS = 7 * 24 * 3600 * 1000;
const MAX_ENTRIES = 500;
const cache = new Map<string, Entry>();

export const clearSuggestCache = (): void => cache.clear();

/**
 * Suggestions for a title: from the cache when the same title was asked in the
 * last 7 days (no AI call), else one model call. An empty answer is not cached.
 */
export const suggestMissions = async (
  poste: string,
  deps: { beforeAiCall: () => Promise<void>; callModel: (messages: LlmMessage[]) => Promise<string | null>; now?: () => number },
): Promise<{ items: string[]; cached: boolean }> => {
  const key = normalizeJobTitle(poste);
  const now = deps.now?.() ?? Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return { items: hit.items, cached: true };

  await deps.beforeAiCall();
  const items = parseSuggestions(await deps.callModel(buildSuggestMessages(poste.trim().slice(0, 120))));
  if (items.length) {
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
    cache.set(key, { items, at: now });
  }
  return { items, cached: false };
};
