// Pure helpers for images stored by id in document HTML (`<img data-file-id>`):
// find them, inline them as data URIs (PDF export) and read their pixel size.
// No I/O, so they are unit-tested directly.

const FILE_ID_ATTR = /data-file-id\s*=\s*["']([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})["']/i;
const IMG_TAG = /<img\b[^>]*>/gi;
const MAX_IMAGES_PER_EXPORT = 60;

export type LoadedImage = { data: Buffer; mime: string };

export const extractImageFileIds = (html: string): string[] => {
  const ids = new Set<string>();
  for (const tag of html.match(IMG_TAG) || []) {
    const match = tag.match(FILE_ID_ATTR);
    if (match) ids.add(match[1].toLowerCase());
  }
  return Array.from(ids).slice(0, MAX_IMAGES_PER_EXPORT);
};

// Rewrites every <img data-file-id> so its src is an inline data URI. Images
// that cannot be loaded are removed rather than left as broken links.
export const inlineDocumentImages = (html: string, images: Map<string, LoadedImage>): string =>
  html.replace(IMG_TAG, (tag) => {
    const match = tag.match(FILE_ID_ATTR);
    if (!match) return tag;
    const image = images.get(match[1].toLowerCase());
    if (!image) return '';
    const withoutSrc = tag.replace(/\ssrc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    const dataUri = `data:${image.mime};base64,${image.data.toString('base64')}`;
    return withoutSrc.replace(/^<img\b/i, () => `<img src="${dataUri}"`);
  });

// Pixel size from the PNG IHDR chunk or the first JPEG SOF marker.
export const readImageSize = (data: Buffer, mime: string): { width: number; height: number } | null => {
  if (mime === 'image/png' && data.length >= 24) {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  if (mime === 'image/jpeg') {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) return null;
      const marker = data[offset + 1];
      const length = data.readUInt16BE(offset + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { width: data.readUInt16BE(offset + 7), height: data.readUInt16BE(offset + 5) };
      offset += 2 + length;
    }
  }
  return null;
};
