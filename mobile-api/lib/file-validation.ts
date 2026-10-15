// Detects the real type of an uploaded file from its leading bytes. The client's
// declared MIME type and file name are never trusted on their own.

export type FileKind = 'image' | 'source';

export type DetectedFile = {
  kind: FileKind;
  mime: string;
  extension: 'png' | 'jpg' | 'webp' | 'pdf' | 'docx' | 'txt';
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

export class FileValidationError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.name = 'FileValidationError';
    this.status = status;
  }
}

const startsWith = (data: Buffer, bytes: number[], offset = 0) =>
  data.length >= offset + bytes.length && bytes.every((b, i) => data[offset + i] === b);

// A DOCX is a ZIP archive whose central directory lists word/document.xml.
const isDocx = (data: Buffer) =>
  startsWith(data, [0x50, 0x4b, 0x03, 0x04]) && data.includes(Buffer.from('word/document.xml'));

const isPlainText = (data: Buffer) => {
  if (data.length === 0) return false;
  // Control bytes other than tab, LF, FF and CR only appear in binary files.
  for (const byte of data) {
    if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0c && byte !== 0x0d) return false;
    if (byte === 0x7f) return false;
  }
  const text = data.toString('utf8');
  // Invalid UTF-8 sequences decode to U+FFFD; a real text file has none or almost none.
  const replacements = text.split('�').length - 1;
  return replacements <= Math.max(2, text.length / 1000);
};

export const detectFileType = (data: Buffer): DetectedFile | null => {
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: 'image', mime: 'image/png', extension: 'png' };
  }
  if (startsWith(data, [0xff, 0xd8, 0xff])) {
    return { kind: 'image', mime: 'image/jpeg', extension: 'jpg' };
  }
  if (startsWith(data, [0x52, 0x49, 0x46, 0x46]) && startsWith(data, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { kind: 'image', mime: 'image/webp', extension: 'webp' };
  }
  if (startsWith(data, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { kind: 'source', mime: 'application/pdf', extension: 'pdf' };
  }
  if (isDocx(data)) {
    return {
      kind: 'source',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
    };
  }
  if (isPlainText(data)) {
    return { kind: 'source', mime: 'text/plain', extension: 'txt' };
  }
  return null;
};

const normalizeMime = (mime: string) => {
  const base = mime.split(';')[0].trim().toLowerCase();
  return base === 'image/jpg' ? 'image/jpeg' : base;
};

// Declared types a phone may send for each real type (pickers are not always precise).
const ACCEPTED_DECLARATIONS: Record<string, string[]> = {
  'image/png': ['image/png'],
  'image/jpeg': ['image/jpeg'],
  'image/webp': ['image/webp'],
  'application/pdf': ['application/pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
  ],
  'text/plain': ['text/plain', 'text/markdown'],
};

export const validateUpload = (
  data: Buffer,
  expectedKind: FileKind,
  declaredMime?: string | null,
): DetectedFile => {
  if (data.length === 0) throw new FileValidationError('Le fichier est vide.', 400);
  const limit = expectedKind === 'image' ? MAX_IMAGE_BYTES : MAX_SOURCE_BYTES;
  if (data.length > limit) {
    throw new FileValidationError(
      `Fichier trop volumineux (maximum ${Math.round(limit / 1024 / 1024)} Mo).`,
      413,
    );
  }

  const detected = detectFileType(data);
  if (!detected || detected.kind !== expectedKind) {
    throw new FileValidationError(
      expectedKind === 'image'
        ? 'Format non pris en charge. Utilisez une image PNG, JPEG ou WEBP.'
        : 'Format non pris en charge. Utilisez un fichier PDF, DOCX ou TXT.',
    );
  }

  const declared = declaredMime ? normalizeMime(declaredMime) : '';
  const generic = !declared || declared === 'application/octet-stream';
  if (!generic && !ACCEPTED_DECLARATIONS[detected.mime].includes(declared)) {
    throw new FileValidationError('Le contenu du fichier ne correspond pas à son type.');
  }
  return detected;
};
