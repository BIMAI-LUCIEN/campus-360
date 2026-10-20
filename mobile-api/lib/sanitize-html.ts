/**
 * Strips wrapping markdown code fence (```html ... ```) and document-level tags (html, head, body).
 */
export const stripCodeFence = (raw: string): string => {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```html\s*/i, '').replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/g, '');
  cleaned = cleaned.replace(/<\/?(html|body|head)[^>]*>/gi, '');
  return cleaned.trim();
};

/**
 * Campus 360 - Safe Academic HTML Sanitizer
 * Defense-in-depth sanitization for user-submitted document content.
 * Prevents XSS, script injection, iframe phishing and unsafe styles while
 * allowing rich academic formatting (headings, tables, callouts, figures, images).
 */

const DANGEROUS_TAGS_REGEX = /<\s*(script|style|iframe|object|embed|applet|frame|frameset|link|meta|base|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|style|iframe|object|embed|applet|frame|frameset|link|meta|base|form|input|button|textarea|select)[^>]*\/?\s*>/gi;

const ALLOWED_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small',
  'ul', 'ol', 'li',
  'blockquote', 'cite', 'code', 'pre',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'figure', 'figcaption', 'img',
  'div', 'span', 'br', 'hr',
  'a',
  'section', 'article', 'header', 'footer', 'main', 'aside'
]);

const ALLOWED_STYLES = new Set([
  'text-align', 'font-weight', 'font-style', 'text-decoration',
  'color', 'background-color', 'font-size', 'line-height',
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'border', 'border-top', 'border-bottom', 'border-left', 'border-right',
  'border-collapse', 'border-radius', 'border-width', 'border-color',
  'width', 'max-width', 'min-width', 'height', 'max-height',
  'box-shadow', 'display', 'text-indent'
]);

function sanitizeCssStyle(rawStyle: string): string {
  const parts = rawStyle.split(';');
  const safeParts: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const val = trimmed.slice(colonIdx + 1).trim();

    // Reject dangerous style constructs
    const lowerVal = val.toLowerCase();
    if (
      lowerVal.includes('url(') ||
      lowerVal.includes('expression(') ||
      lowerVal.includes('javascript:') ||
      lowerVal.includes('behavior') ||
      lowerVal.includes('-moz-binding')
    ) {
      continue;
    }

    if (ALLOWED_STYLES.has(prop)) {
      // Validate value syntax
      if (/^[a-zA-Z0-9#%.,_() -]+$/.test(val)) {
        safeParts.push(`${prop}: ${val}`);
      }
    }
  }

  return safeParts.join('; ');
}

function sanitizeUrl(url: string, allowDataImage = false): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text')) {
    return null;
  }

  if (lower.startsWith('https://') || lower.startsWith('http://') || lower.startsWith('/')) {
    return trimmed;
  }

  if (allowDataImage && lower.startsWith('data:image/')) {
    return trimmed;
  }

  return null;
}

export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  // 1. Strip entire dangerous tags with content
  let cleaned = rawHtml.replace(DANGEROUS_TAGS_REGEX, '');

  // 2. Parse tags and strip unallowed elements/attributes
  cleaned = cleaned.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tagName, attrs) => {
    const lowerTag = tagName.toLowerCase();
    const isClosing = match.startsWith('</');

    if (!ALLOWED_TAGS.has(lowerTag)) {
      return ''; // drop tag completely
    }

    if (isClosing) {
      return `</${lowerTag}>`;
    }

    // Process attributes for opening tag
    const safeAttrs: string[] = [];
    // Uploaded images are stored by id; their (short-lived signed) src is resolved at display time.
    let fileId: string | null = null;
    const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // Block all event handlers (onclick, onload, onerror, etc.)
      if (attrName.startsWith('on')) continue;

      if (attrName === 'class') {
        const safeClass = attrVal.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
        if (safeClass) safeAttrs.push(`class="${safeClass}"`);
      } else if (attrName === 'id') {
        const safeId = attrVal.replace(/[^a-zA-Z0-9_\-]/g, '').trim();
        if (safeId) safeAttrs.push(`id="${safeId}"`);
      } else if (attrName === 'style') {
        const safeStyle = sanitizeCssStyle(attrVal);
        if (safeStyle) safeAttrs.push(`style="${safeStyle}"`);
      } else if (lowerTag === 'img' && attrName === 'data-file-id') {
        const candidate = attrVal.trim().toLowerCase();
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(candidate)) {
          fileId = candidate;
          safeAttrs.push(`data-file-id="${candidate}"`);
        }
      } else if (lowerTag === 'img' && attrName === 'src') {
        const safeSrc = sanitizeUrl(attrVal, true);
        if (safeSrc) safeAttrs.push(`src="${safeSrc}"`);
      } else if (lowerTag === 'img' && (attrName === 'alt' || attrName === 'title')) {
        const safeText = attrVal.replace(/["<>]/g, '');
        safeAttrs.push(`${attrName}="${safeText}"`);
      } else if (lowerTag === 'img' && (attrName === 'width' || attrName === 'height')) {
        if (/^\d+%?$/.test(attrVal.trim())) {
          safeAttrs.push(`${attrName}="${attrVal.trim()}"`);
        }
      } else if (lowerTag === 'a' && attrName === 'href') {
        const safeHref = sanitizeUrl(attrVal, false);
        if (safeHref) {
          safeAttrs.push(`href="${safeHref}"`);
          safeAttrs.push(`target="_blank" rel="noopener noreferrer"`);
        }
      } else if (
        (lowerTag === 'td' || lowerTag === 'th') &&
        (attrName === 'colspan' || attrName === 'rowspan')
      ) {
        if (/^\d+$/.test(attrVal.trim())) {
          safeAttrs.push(`${attrName}="${attrVal.trim()}"`);
        }
      } else if (attrName === 'contenteditable') {
        if (attrVal === 'true' || attrVal === 'false') {
          safeAttrs.push(`contenteditable="${attrVal}"`);
        }
      }
    }

    const keptAttrs = fileId ? safeAttrs.filter((attr) => !attr.startsWith('src=')) : safeAttrs;
    const selfClosing = match.endsWith('/>') ? ' /' : '';
    const attrString = keptAttrs.length > 0 ? ' ' + keptAttrs.join(' ') : '';
    return `<${lowerTag}${attrString}${selfClosing}>`;
  });

  return cleaned;
}
