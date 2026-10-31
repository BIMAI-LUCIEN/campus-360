// Pure part of the sources context: the prompt blocks built from retrieved
// chunks and the citation list returned to the app. No database access, so it
// can be tested on its own (source-context.ts does the retrieval).

import type { RetrievedChunk } from './document-files-db';

export type Citation = {
  label: number;
  sourceId: string;
  title: string;
  page: number | null;
  excerpt: string;
  sourceUrl: string | null;
  cited: boolean;
  role?: 'reference' | 'personal';
};

export const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const citationTag = (label: number, chunk: RetrievedChunk) =>
  chunk.mime === 'application/pdf' ? `[Source ${label}, p.${chunk.page}]` : `[Source ${label}]`;

// Builds the prompt block and the citation list. Labels follow the order of the
// selected sources, so "Source 2" means the same thing in the app and in the reply.
// `labelOffset` lets a second group continue the numbering of the first.
export const buildSourcesContext = (orderedFileIds: string[], chunks: RetrievedChunk[], labelOffset = 0) => {
  const labelOf = new Map(orderedFileIds.map((id, i) => [id.toLowerCase(), labelOffset + i + 1]));
  const blocks: string[] = [];
  const citations: Citation[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const label = labelOf.get(chunk.file_id.toLowerCase());
    if (!label) continue;
    const paginated = chunk.mime === 'application/pdf';
    blocks.push(`${citationTag(label, chunk)} « ${chunk.title} »\n${chunk.content}`);
    const key = `${chunk.file_id}:${paginated ? chunk.page : 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({
      label,
      sourceId: chunk.file_id,
      title: chunk.title,
      page: paginated ? chunk.page : null,
      excerpt: chunk.content.slice(0, 400),
      sourceUrl: chunk.source_url,
      cited: false,
    });
  }
  return { context: blocks.join('\n\n'), citations };
};

// Marks the citations the model actually used, cited ones first.
export const markCited = (reply: string, citations: Citation[]): Citation[] => {
  const marked = citations.map((c) => {
    const pattern = c.page
      ? new RegExp(`Source\\s+${c.label}\\s*,\\s*p\\.?\\s*${c.page}\\b`, 'i')
      : new RegExp(`Source\\s+${c.label}\\b`, 'i');
    return { ...c, cited: pattern.test(reply) };
  });
  return [...marked.filter((c) => c.cited), ...marked.filter((c) => !c.cited)];
};

export const PERSONAL_HEADING =
  "DOCUMENTS DE L'ÉTUDIANT — ce qu'il a réellement fait (rapports journaliers, comptes rendus, notes, livrables). " +
  "C'est la base factuelle : missions, dates, outils, chiffres et résultats viennent d'ici ou de la discussion, jamais d'ailleurs.";

export const REFERENCE_HEADING =
  "RÉFÉRENCES — documents et liens fournis comme appui (cours, articles, normes, modèle ou consignes de l'encadreur). " +
  "Sers-t'en pour les définitions, le cadre théorique, la méthode, la structure et le vocabulaire attendu ; " +
  "ne leur attribue jamais les faits vécus par l'étudiant.";

// Two labelled blocks, the student's own documents first, then the references.
// Numbering is shared, so each « Source n » points at one source only.
export const buildGroundedContext = (input: {
  personalIds: string[];
  personalChunks: RetrievedChunk[];
  referenceIds: string[];
  referenceChunks: RetrievedChunk[];
}): { context: string; citations: Citation[] } | null => {
  const personal = buildSourcesContext(input.personalIds, input.personalChunks);
  const reference = buildSourcesContext(input.referenceIds, input.referenceChunks, input.personalIds.length);
  const blocks: string[] = [];
  if (personal.context) blocks.push(`### ${PERSONAL_HEADING}\n\n${personal.context}`);
  if (reference.context) blocks.push(`### ${REFERENCE_HEADING}\n\n${reference.context}`);
  if (blocks.length === 0) return null;
  return {
    context: blocks.join('\n\n'),
    citations: [
      ...personal.citations.map((c) => ({ ...c, role: 'personal' as const })),
      ...reference.citations.map((c) => ({ ...c, role: 'reference' as const })),
    ],
  };
};

// Rules added to a writing prompt when sources are attached.
export const SOURCES_GROUNDING_RULES = [
  "- Les extraits ci-dessous sont la matière première : privilégie-les à tes connaissances générales.",
  "- Les documents de l'étudiant décrivent son vécu : reprends ses faits fidèlement (dates, tâches, outils, chiffres), reformulés en prose académique.",
  "- Les références servent d'appui : définitions, cadre, méthode, structure. Cite-les en fin de phrase sous la forme [Source n] quand tu t'en inspires.",
  "- Si les extraits se contredisent, suis les documents de l'étudiant pour les faits et signale l'écart « à vérifier ».",
  "- Aucun fait absent des extraits et de la discussion : laisse un crochet [à compléter] à la place.",
].join('\n');
