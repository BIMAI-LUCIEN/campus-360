// Nom du fichier exporté : le titre réel du document. Seuls les caractères
// interdits par Windows, Android et iOS sont retirés (espaces et accents sont gardés).
const FORBIDDEN_CHARS = /[\\/:*?"<>|\u0000-\u001f]+/g;

export const documentDownloadName = (title: string | null | undefined, extension: string, fallback = 'Document'): string => {
  const base = String(title ?? '')
    .replace(FORBIDDEN_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 120)
    .trim();
  return `${base || fallback}.${extension}`;
};

// Un en-tête HTTP n'accepte que du latin-1 : le nom réel passe en filename*=UTF-8''…,
// et filename= garde une version ASCII pour les très vieux clients.
const encodeRfc5987 = (value: string): string =>
  encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

export const attachmentDisposition = (fileName: string): string => {
  const ascii = fileName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/"/g, "'");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987(fileName)}`;
};
