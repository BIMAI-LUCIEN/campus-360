import { normalizeHeadings } from './documentRender';

// Helpers for the HTML the writing assistant sends back (chat drafts and
// interview drafts). The server sanitizes again when the section is saved.

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Plain-text reply → paragraphs (blank lines) and <br> (single newlines).
export const textToHtml = (text: string): string =>
  text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('');

// Model HTML is inserted into the editor WebView: strip anything executable.
export const cleanModelHtml = (html: string): string =>
  html
    .replace(/^```(?:html)?\s*|```\s*$/g, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button)[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*(javascript|vbscript|data):[^"']*\2/gi, '')
    .trim();

// Ready to insert: cleaned, headings at the editor's levels, no typed numbers.
export const insertableHtml = (html: string) => normalizeHeadings(cleanModelHtml(html));

export const htmlToReadable = (html: string) =>
  html
    .replace(/<\/(p|h[1-6]|li|blockquote|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
