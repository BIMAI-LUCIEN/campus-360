/**
 * htmlToDocx — minimal HTML → docx Paragraph[] converter.
 *
 * Why we don't use a full HTML parser (parse5, htmlparser2):
 *   The HTML we get out of TipTap / the AI is very constrained — only the
 *   allowlisted tags (p, h1-h4, strong, em, ul, ol, li, br, img, figure,
 *   figcaption, div). A 200-line regex / state walker is enough and ships
 *   no extra dependency.
 *
 * What we preserve:
 *   - H1/H2/H3/H4 → docx heading levels
 *   - <strong> / <b> → bold
 *   - <em> / <i>   → italic
 *   - <ul> / <ol>  → bullet/number lists (each <li> = its own Paragraph)
 *   - <br>         → line break inside a paragraph
 *   - <img>        → placeholder caption (we can't safely embed base64
 *                    images in docx without binary inspection; the student
 *                    is told to use the PDF export for image fidelity)
 *   - nested inline formatting (e.g. <strong><em>x</em></strong>)
 */

import { Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

type InlineFormat = { bold?: boolean; italic?: boolean };

/**
 * Walk inline content of a leaf element (p, h1-h4, li, figcaption) and
 * produce TextRun[]. We carry bold/italic across nested tags.
 */
function collectInlineRuns(node: Node, fmt: InlineFormat = {}): TextRun[] {
  const runs: TextRun[] = [];

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ');
      if (text) runs.push(new TextRun({ text, ...fmt }));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      runs.push(new TextRun({ break: 1 }));
      return;
    }

    if (tag === 'strong' || tag === 'b') {
      runs.push(...collectInlineRuns(el, { ...fmt, bold: true }));
      return;
    }
    if (tag === 'em' || tag === 'i') {
      runs.push(...collectInlineRuns(el, { ...fmt, italic: true }));
      return;
    }
    // Fallback: flatten unknown inline tags by reading their text + children.
    runs.push(...collectInlineRuns(el, fmt));
  });

  return runs;
}

function headingLevelFor(tag: string): (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined {
  switch (tag) {
    case 'h1': return HeadingLevel.HEADING_1;
    case 'h2': return HeadingLevel.HEADING_2;
    case 'h3': return HeadingLevel.HEADING_3;
    case 'h4': return HeadingLevel.HEADING_4;
    default:   return undefined;
  }
}

export function htmlToDocxParagraphs(html: string): Paragraph[] {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    // SSR fallback: emit a single paragraph of stripped text so the page
    // still renders without throwing. Real export runs in the browser.
    const plain = html.replace(/<[^>]+>/g, '').trim();
    return plain ? [new Paragraph({ text: plain })] : [];
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  const out: Paragraph[] = [];

  wrapper.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').trim();
      if (text) out.push(new Paragraph({ text }));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    // Headings
    const lvl = headingLevelFor(tag);
    if (lvl) {
      out.push(new Paragraph({
        heading: lvl,
        children: collectInlineRuns(el),
        spacing: { before: 200, after: 100 },
      }));
      return;
    }

    // Paragraph
    if (tag === 'p') {
      const runs = collectInlineRuns(el);
      out.push(new Paragraph({
        children: runs.length ? runs : [new TextRun({ text: '' })],
        spacing: { line: 360 }, // 1.5
        alignment: AlignmentType.JUSTIFIED,
      }));
      return;
    }

    // Lists — emit each <li> as its own Paragraph; list-level bullets
    // are added by the heading tag (no top-level ul wrapper doc needed).
    if (tag === 'ul') {
      Array.from(el.children).forEach((li) => {
        if (li.tagName.toLowerCase() !== 'li') return;
        out.push(new Paragraph({
          children: collectInlineRuns(li),
          bullet: { level: 0 },
        }));
      });
      return;
    }
    if (tag === 'ol') {
      Array.from(el.children).forEach((li, idx) => {
        if (li.tagName.toLowerCase() !== 'li') return;
        out.push(new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. `, bold: true }),
            ...collectInlineRuns(li),
          ],
        }));
      });
      return;
    }

    // Figure / figcaption — emit caption only (we can't embed base64 img
    // safely in the docx package without extra deps). Image stays in PDF.
    if (tag === 'figure' || tag === 'figcaption') {
      const caption = el.getAttribute('data-caption') || el.textContent?.trim() || '';
      if (caption) {
        out.push(new Paragraph({
          children: [new TextRun({ text: `[Image: ${caption}]`, italics: true })],
          alignment: AlignmentType.CENTER,
        }));
      }
      return;
    }

    // Image placeholder that hasn't been replaced yet — drop a caption.
    if (tag === 'div' && el.classList.contains('image-placeholder')) {
      const caption = el.getAttribute('data-caption') || 'Image';
      out.push(new Paragraph({
        children: [new TextRun({ text: `[Insérer: ${caption}]`, italics: true })],
        alignment: AlignmentType.CENTER,
      }));
      return;
    }

    // <img> at top level (rare since we wrap in figures, but be safe)
    if (tag === 'img') {
      const alt = el.getAttribute('alt') || 'Image';
      out.push(new Paragraph({
        children: [new TextRun({ text: `[Image: ${alt}]`, italics: true })],
        alignment: AlignmentType.CENTER,
      }));
      return;
    }

    // <hr>
    if (tag === 'hr') {
      out.push(new Paragraph({ text: '─────────────────────────────────────' }));
      return;
    }

    // Unknown block — recurse into children so we don't drop content.
    Array.from(el.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        out.push(...htmlToDocxParagraphs((child as Element).outerHTML));
      } else if (child.nodeType === Node.TEXT_NODE) {
        const t = (child.textContent ?? '').trim();
        if (t) out.push(new Paragraph({ text: t }));
      }
    });
  });

  return out;
}