import crypto from 'node:crypto';

import { getCloudinaryConfig } from './cloudinary';
import { MobileApiError } from './mobile-error';
import { extractSource } from './source-extraction';

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
};

const isCloudinaryHost = (hostname: string) =>
  hostname === 'cloudinary.com' || hostname.endsWith('.cloudinary.com');

// PDF delivery is blocked on the Cloudinary account (public and Basic-auth URLs answer
// 401/404): the signed Admin API download still returns the original file.
const cloudinaryDownloadUrl = (target: URL) => {
  const match = /\/(image|raw)\/upload\/(?:v\d+\/)?(.+)\.pdf$/i.exec(target.pathname);
  if (!match) return null;
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const params: Record<string, string> = {
    format: 'pdf',
    public_id: decodeURIComponent(match[2]),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: 'upload',
  };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
  const query = new URLSearchParams({ ...params, api_key: apiKey, signature });
  return `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${match[1]}/download?${query}`;
};

/** Downloads a catalogue PDF from Cloudinary or the Supabase storage, never from another host. */
export const fetchCatalogPdf = async (targetUrl: string): Promise<ArrayBuffer> => {
  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    throw new MobileApiError('Source du document invalide.', 502);
  }

  let pdfResponse: Response;
  if (isCloudinaryHost(parsedTarget.hostname)) {
    const { apiKey, apiSecret } = getCloudinaryConfig();
    const cloudAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    pdfResponse = await fetch(parsedTarget, {
      headers: { Authorization: `Basic ${cloudAuth}` },
      redirect: 'error',
    });
    const downloadUrl = !pdfResponse.ok ? cloudinaryDownloadUrl(parsedTarget) : null;
    if (downloadUrl) pdfResponse = await fetch(downloadUrl, { redirect: 'error' });
    if (!pdfResponse.ok && parsedTarget.pathname.includes('/image/upload/')) {
      const rawUrl = new URL(parsedTarget);
      rawUrl.pathname = rawUrl.pathname.replace('/image/upload/', '/raw/upload/');
      pdfResponse = await fetch(rawUrl, {
        headers: { Authorization: `Basic ${cloudAuth}` },
        redirect: 'error',
      });
    }
  } else {
    const supabaseUrl = new URL(requireEnv('SUPABASE_URL'));
    if (parsedTarget.origin !== supabaseUrl.origin) {
      throw new MobileApiError('Source du document non autorisee.', 403);
    }
    const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    pdfResponse = await fetch(parsedTarget, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      redirect: 'error',
    });
  }

  if (!pdfResponse.ok) {
    console.warn('[catalog-pdf] Fetching PDF source failed:', pdfResponse.status);
    throw new MobileApiError('Impossible de charger ce PDF.', 502);
  }
  return pdfResponse.arrayBuffer();
};

type CachedText = { pages: { page: number; text: string }[]; at: number };

// Extracting a long PDF takes seconds: the text of the last PDFs is kept in memory
// so a second quiz on the same course starts at once.
const textCache = new Map<string, CachedText>();
const CACHE_SIZE = 30;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Text of a catalogue PDF, page by page (empty pages when it is a scan). */
export const loadCatalogPdfText = async (documentId: string, filePath: string) => {
  const key = `${documentId}:${filePath}`;
  const cached = textCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.pages;

  let pages: { page: number; text: string }[] = [];
  try {
    const data = await fetchCatalogPdf(filePath);
    pages = (await extractSource(Buffer.from(data), 'application/pdf')).pages;
  } catch (error) {
    // A missing, scanned or protected PDF has no text: the caller falls back to the metadata.
    console.warn('[catalog-pdf] Text extraction failed:', (error as Error).message);
  }
  textCache.delete(key);
  textCache.set(key, { pages, at: Date.now() });
  while (textCache.size > CACHE_SIZE) textCache.delete(textCache.keys().next().value as string);
  return pages;
};
