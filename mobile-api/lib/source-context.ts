// Sources context shared by the section chat, the interview draft and the full
// document generation: retrieval split by source role, then the prompt blocks
// and citations built in source-grounding.ts.

import { listDocumentFiles, searchChunks } from './document-files-db';
import { buildGroundedContext, type Citation } from './source-grounding';

export {
  buildGroundedContext,
  buildSourcesContext,
  markCited,
  SOURCES_GROUNDING_RULES,
  stripHtml,
  type Citation,
} from './source-grounding';

// Ready sources of the document, restricted to the ticked ones (all when absent),
// then lexical retrieval for the question, run separately for the student's own
// documents and for the references so neither group crowds out the other.
export const retrieveSourcesContext = async (input: {
  documentId: string;
  userId: string;
  sourceIds?: string[];
  question: string;
  limit?: number;
}): Promise<{ context: string; citations: Citation[] } | null> => {
  const ready = (await listDocumentFiles(input.documentId, input.userId, 'source')).filter((f) => f.status === 'ready');
  // Labels follow the order the app sends (its display order), else oldest first.
  const byId = new Map(ready.map((f) => [f.id.toLowerCase(), f]));
  const selected = input.sourceIds
    ? Array.from(new Set(input.sourceIds.map((id) => id.toLowerCase()))).map((id) => byId.get(id)).filter((f): f is NonNullable<typeof f> => Boolean(f))
    : [...ready].reverse();
  if (selected.length === 0) return null;

  const personalIds = selected.filter((f) => f.source_role !== 'reference').map((f) => f.id);
  const referenceIds = selected.filter((f) => f.source_role === 'reference').map((f) => f.id);
  const perGroup = input.limit ?? 6;
  const search = (fileIds: string[]) =>
    fileIds.length === 0
      ? Promise.resolve([])
      : searchChunks({ documentId: input.documentId, userId: input.userId, fileIds, question: input.question, limit: perGroup });
  const [personalChunks, referenceChunks] = await Promise.all([search(personalIds), search(referenceIds)]);

  return buildGroundedContext({ personalIds, personalChunks, referenceIds, referenceChunks });
};
