// Small, targeted readers for Office Open XML (Word) fragments, used by the
// template import (Module 24). No XML parser and no imports: each function reads
// one thing with a regular expression and is unit-tested.

// A DOCTYPE or an entity declaration is never needed in Word XML: refusing them
// rules out entity expansion (XXE, "billion laughs").
export const rejectDtd = (xml: string): string => {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML refusé : déclaration DOCTYPE ou ENTITY.');
  return xml;
};

const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every `<tag …>…</tag>` and `<tag …/>` fragment, outermost first. Nested
// elements of the same tag (tables inside tables) stay inside their parent.
export const elements = (xml: string, tag: string): string[] => {
  const out: string[] = [];
  const open = new RegExp(`<${escapeRe(tag)}(?=[\\s>/])[^>]*?(/?)>`, 'g');
  const close = `</${tag}>`;
  let match: RegExpExecArray | null;
  while ((match = open.exec(xml))) {
    const start = match.index;
    if (match[1] === '/') {
      out.push(match[0]);
      continue;
    }
    // Find the matching close tag, counting nested opens of the same tag.
    let depth = 1;
    let cursor = open.lastIndex;
    const inner = new RegExp(`<${escapeRe(tag)}(?=[\\s>/])[^>]*?(/?)>|${escapeRe(close)}`, 'g');
    inner.lastIndex = cursor;
    let m: RegExpExecArray | null;
    while (depth > 0 && (m = inner.exec(xml))) {
      if (m[0] === close) depth -= 1;
      else if (m[1] !== '/') depth += 1;
      cursor = inner.lastIndex;
    }
    out.push(xml.slice(start, cursor));
    open.lastIndex = cursor;
  }
  return out;
};

// Direct children of a container (e.g. the paragraphs and tables of <w:body>),
// in document order.
export const children = (xml: string, tags: string[]): { tag: string; xml: string }[] => {
  const out: { tag: string; xml: string }[] = [];
  const open = new RegExp(`<(${tags.map(escapeRe).join('|')})(?=[\\s>/])[^>]*?(/?)>`, 'g');
  let match: RegExpExecArray | null;
  while ((match = open.exec(xml))) {
    const tag = match[1];
    const start = match.index;
    if (match[2] === '/') {
      out.push({ tag, xml: match[0] });
      continue;
    }
    const [whole] = elements(xml.slice(start), tag);
    out.push({ tag, xml: whole });
    open.lastIndex = start + whole.length;
  }
  return out;
};

// Value of an attribute on the first tag of a fragment (`w:val`, `r:embed`…).
export const attr = (fragment: string, name: string): string | null => {
  const first = fragment.match(/^<[^>]*>/)?.[0] ?? fragment;
  const m = first.match(new RegExp(`\\s${escapeRe(name)}="([^"]*)"`));
  return m ? m[1] : null;
};

// Attribute of the first `<tag …>` found anywhere in the fragment.
export const attrOf = (fragment: string, tag: string, name: string): string | null => {
  const m = fragment.match(new RegExp(`<${escapeRe(tag)}(?=[\\s>/])[^>]*>`));
  return m ? attr(m[0], name) : null;
};

export const has = (fragment: string, tag: string): boolean => new RegExp(`<${escapeRe(tag)}(?=[\\s>/])`).test(fragment);

export const decodeXml = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');

// Text of a fragment: the <w:t> runs joined, tabs as "\t".
export const textOf = (fragment: string): string =>
  [...fragment.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>/g)].map((m) => (m[0] === '<w:tab/>' ? '\t' : decodeXml(m[1]))).join('');
