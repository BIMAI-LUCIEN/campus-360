// Sources context shared by the section chat and the interview draft: the
// prompt block built from retrieved chunks, and the citation list returned to
// the app. Labels follow the order of the selected sources.

import { listDocumentFiles, searchChunks, type RetrievedChunk } from './document-files-db';

export type Citation = {
  label: number;
  sourceId: string;
  title: string;
  page: number | null;
  excerpt: string;
  sourceUrl: string | null;
  cited: boolean;
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
export const buildSourcesContext = (orderedFileIds: string[], chunks: RetrievedChunk[]) => {
  const labelOf = new Map(orderedFileIds.map((id, i) => [id.toLowerCase(), i + 1]));
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

// Ready sources of the document, restricted to the ticked ones (all when absent),
// then lexical retrieval for the question.
export const retrieveSourcesContext = async (input: {
  documentId: string;
  userId: string;
  sourceIds?: string[];
  question: string;
  limit?: number;
}): Promise<{ context: string; citations: Citation[] } | null> => {
  const ready = (await listDocumentFiles(input.documentId, input.userId, 'source')).filter((f) => f.status === 'ready');
  const readyIds = new Set(ready.map((f) => f.id.toLowerCase()));
  const selected = (input.sourceIds ?? ready.map((f) => f.id)).map((id) => id.toLowerCase()).filter((id) => readyIds.has(id));
  if (selected.length === 0) return null;
  const chunks = await searchChunks({
    documentId: input.documentId,
    userId: input.userId,
    fileIds: selected,
    question: input.question,
    limit: input.limit ?? 8,
  });
  return buildSourcesContext(selected, chunks);
};
