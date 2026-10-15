// Splits extracted pages into overlapping chunks for lexical retrieval. A chunk
// never spans two pages, so every citation points at a single page.

export type ExtractedPage = { page: number; text: string };
export type TextChunk = { page: number; position: number; content: string };

export const CHUNK_MAX_CHARS = 3200; // ~800 tokens
export const CHUNK_OVERLAP_CHARS = 320; // 10 %

export const normalizeText = (text: string): string =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Picks the best cut point in (minEnd, end]: paragraph, then line, then sentence, then word.
const findCut = (text: string, start: number, end: number, maxChars: number): number => {
  if (end >= text.length) return text.length;
  const minEnd = start + Math.floor(maxChars * 0.6);
  const window = text.slice(minEnd, end);
  for (const separator of ['\n\n', '\n', '. ', '? ', '! ', '; ', ' ']) {
    const index = window.lastIndexOf(separator);
    if (index >= 0) return minEnd + index + separator.length;
  }
  return end;
};

export const chunkPages = (
  pages: ExtractedPage[],
  maxChars: number = CHUNK_MAX_CHARS,
  overlap: number = CHUNK_OVERLAP_CHARS,
): TextChunk[] => {
  const chunks: TextChunk[] = [];
  let position = 0;
  for (const { page, text: raw } of pages) {
    const text = normalizeText(raw);
    let start = 0;
    while (start < text.length) {
      const end = findCut(text, start, Math.min(start + maxChars, text.length), maxChars);
      const content = text.slice(start, end).trim();
      if (content) chunks.push({ page, position: position++, content });
      if (end >= text.length) break;
      // Step back by the overlap, then forward to a word start, but always make progress.
      let next = Math.max(end - overlap, start + 1);
      const space = text.indexOf(' ', next);
      if (space >= 0 && space < end) next = space + 1;
      start = next;
    }
  }
  return chunks;
};
