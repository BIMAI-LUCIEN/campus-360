// Nom du fichier téléchargé : le titre réel du document. Seuls les caractères
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
