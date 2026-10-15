// Extracts plain text from an uploaded source, page by page when the format has
// pages (PDF). DOCX and TXT have no pages: their text is returned as page 1 and
// citations then point at the source without a page number.

export type ExtractedSource = {
  pages: { page: number; text: string }[];
  pageCount: number;
  paginated: boolean;
  truncated: boolean;
};

export const MAX_PDF_PAGES = 200;
export const MAX_EXTRACTED_CHARS = 2_000_000;
const MAX_DOCX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

const capText = (pages: { page: number; text: string }[]) => {
  let total = 0;
  let truncated = false;
  const kept: { page: number; text: string }[] = [];
  for (const p of pages) {
    if (total >= MAX_EXTRACTED_CHARS) {
      truncated = true;
      break;
    }
    const text = p.text.slice(0, MAX_EXTRACTED_CHARS - total);
    if (text.length < p.text.length) truncated = true;
    total += text.length;
    kept.push({ page: p.page, text });
  }
  return { kept, truncated };
};

const assertHasText = (pages: { text: string }[], hint: string) => {
  if (!pages.some((p) => p.text.trim().length > 0)) throw new ExtractionError(hint);
};

const extractPdf = async (data: Buffer): Promise<ExtractedSource> => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  });
  let doc;
  try {
    doc = await task.promise;
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === 'PasswordException') throw new ExtractionError('Ce PDF est protégé par un mot de passe.');
    throw new ExtractionError('Ce PDF est illisible ou endommagé.');
  }
  try {
    const pageCount = doc.numPages;
    const last = Math.min(pageCount, MAX_PDF_PAGES);
    const pages: { page: number; text: string }[] = [];
    for (let n = 1; n <= last; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : '') : ''))
        .join('')
        .replace(/[ \t]+\n/g, '\n');
      pages.push({ page: n, text });
      page.cleanup();
    }
    assertHasText(pages, 'Aucun texte trouvé dans ce PDF (document scanné ?). Ajoutez une version texte.');
    const { kept, truncated } = capText(pages);
    return { pages: kept, pageCount, paginated: true, truncated: truncated || pageCount > MAX_PDF_PAGES };
  } finally {
    await doc.destroy();
  }
};

// Sums the uncompressed sizes listed in the ZIP central directory, so a
// decompression bomb is refused before any inflation happens.
export const zipUncompressedTotal = (data: Buffer): number => {
  const minEocd = Math.max(0, data.length - 65_557);
  let eocd = -1;
  for (let i = data.length - 22; i >= minEocd; i -= 1) {
    if (data.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ExtractionError('Ce fichier DOCX est endommagé.');
  const entries = data.readUInt16LE(eocd + 10);
  let offset = data.readUInt32LE(eocd + 16);
  let total = 0;
  for (let i = 0; i < entries; i += 1) {
    if (offset + 46 > data.length || data.readUInt32LE(offset) !== 0x02014b50) {
      throw new ExtractionError('Ce fichier DOCX est endommagé.');
    }
    const size = data.readUInt32LE(offset + 24);
    if (size === 0xffffffff) throw new ExtractionError('Ce fichier DOCX est trop volumineux.');
    total += size;
    offset += 46 + data.readUInt16LE(offset + 28) + data.readUInt16LE(offset + 30) + data.readUInt16LE(offset + 32);
  }
  return total;
};

const extractDocx = async (data: Buffer): Promise<ExtractedSource> => {
  if (zipUncompressedTotal(data) > MAX_DOCX_UNCOMPRESSED_BYTES) {
    throw new ExtractionError('Ce fichier DOCX est trop volumineux une fois décompressé.');
  }
  const mammoth = await import('mammoth');
  const extractRawText = mammoth.extractRawText ?? (mammoth as unknown as { default: typeof mammoth }).default.extractRawText;
  let text: string;
  try {
    text = (await extractRawText({ buffer: data })).value;
  } catch {
    throw new ExtractionError('Ce fichier DOCX est illisible ou endommagé.');
  }
  const pages = [{ page: 1, text }];
  assertHasText(pages, 'Ce fichier DOCX ne contient aucun texte.');
  const { kept, truncated } = capText(pages);
  return { pages: kept, pageCount: 0, paginated: false, truncated };
};

export const extractPlainText = (text: string): ExtractedSource => {
  const pages = [{ page: 1, text }];
  assertHasText(pages, 'Cette source ne contient aucun texte.');
  const { kept, truncated } = capText(pages);
  return { pages: kept, pageCount: 0, paginated: false, truncated };
};

const decodeText = (data: Buffer, charset?: string | null): string => {
  try {
    return new TextDecoder(charset || 'utf-8', { fatal: false }).decode(data).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('utf-8').decode(data).replace(/^﻿/, '');
  }
};

export const extractSource = async (data: Buffer, mime: string, charset?: string | null): Promise<ExtractedSource> => {
  switch (mime) {
    case 'application/pdf':
      return extractPdf(data);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractDocx(data);
    case 'text/plain':
      return extractPlainText(decodeText(data, charset));
    default:
      throw new ExtractionError('Format de source non pris en charge.');
  }
};

export { decodeText };
