// Older editor versions saved their hint text ("Commencez à rédiger votre …
// ici comme dans Word...") as real content. It must never reach an export or
// be counted as the student's text.
const LEGACY_PLACEHOLDER = /Commencez à rédiger votre [^<]*? ici comme dans Word\.\.\./g;

export const stripEditorPlaceholder = (html: string): string =>
  (html || '')
    .replace(LEGACY_PLACEHOLDER, '')
    .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
    .trim();

// True when a section has no real content (only empty paragraphs or whitespace).
export const isEmptyEditorHtml = (html: string): boolean => {
  const cleaned = stripEditorPlaceholder(html);
  if (/<(img|table|figure|hr)\b/i.test(cleaned)) return false;
  return cleaned.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;
};
