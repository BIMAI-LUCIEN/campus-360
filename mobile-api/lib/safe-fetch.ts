import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import zlib from 'node:zlib';

// Server-side fetch of a user-supplied URL with SSRF guards: http(s) on default
// ports only, every resolved address checked against private ranges, the
// validated address pinned for the connection (no DNS rebinding), every
// redirect re-validated, and hard limits on time and size.

export const SAFE_FETCH_TIMEOUT_MS = 10_000;
export const SAFE_FETCH_MAX_BYTES = 5 * 1024 * 1024;
export const SAFE_FETCH_MAX_REDIRECTS = 3;

const ALLOWED_CONTENT_TYPES = ['text/html', 'application/xhtml+xml', 'text/plain', 'application/pdf'];

export class SafeFetchError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'SafeFetchError';
    this.code = code;
  }
}

const blockList = new net.BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockList.addSubnet(address, prefix, 'ipv4');
}
for (const [address, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blockList.addSubnet(address, prefix, 'ipv6');
}

// IPv4-mapped (::ffff:a.b.c.d) and NAT64 addresses carry an IPv4 that must be checked too.
const embeddedIpv4 = (address: string): string | null => {
  const lower = address.toLowerCase();
  const dotted = lower.match(/^(?:::ffff:|64:ff9b::)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) return dotted[1];
  const hex = lower.match(/^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
};

export const isBlockedAddress = (address: string): boolean => {
  const family = net.isIP(address);
  if (family === 4) return blockList.check(address, 'ipv4');
  if (family === 6) {
    const v4 = embeddedIpv4(address);
    if (v4) return blockList.check(v4, 'ipv4');
    if (address.toLowerCase().startsWith('::ffff:')) return true;
    return blockList.check(address, 'ipv6');
  }
  return true;
};

export const parsePublicUrl = (raw: string): URL => {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new SafeFetchError('url_invalide', 'Adresse web invalide.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SafeFetchError('url_refusee', 'Seules les adresses http et https sont acceptées.');
  }
  if (url.username || url.password) {
    throw new SafeFetchError('url_refusee', 'Les adresses avec identifiants ne sont pas acceptées.');
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new SafeFetchError('url_refusee', 'Seuls les ports web standard sont acceptés.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new SafeFetchError('url_refusee', 'Cette adresse est interne et ne peut pas être utilisée.');
  }
  if (net.isIP(host) && isBlockedAddress(host)) {
    throw new SafeFetchError('url_refusee', 'Cette adresse est interne et ne peut pas être utilisée.');
  }
  return url;
};

type ResolvedAddress = { address: string; family: 4 | 6 };

const resolvePublicAddress = async (url: URL): Promise<ResolvedAddress> => {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const literal = net.isIP(host);
  const addresses: ResolvedAddress[] = literal
    ? [{ address: host, family: literal as 4 | 6 }]
    : (await dns.promises.lookup(host, { all: true, verbatim: true }).catch(() => {
        throw new SafeFetchError('url_introuvable', 'Ce site est introuvable.');
      })).map((a) => ({ address: a.address, family: a.family as 4 | 6 }));
  if (addresses.length === 0) throw new SafeFetchError('url_introuvable', 'Ce site est introuvable.');
  // Refuse if any record points inside: a mixed answer is a classic rebinding setup.
  if (addresses.some((a) => isBlockedAddress(a.address))) {
    throw new SafeFetchError('url_refusee', 'Cette adresse est interne et ne peut pas être utilisée.');
  }
  return addresses[0];
};

type RawResponse = { status: number; headers: http.IncomingHttpHeaders; body: Buffer };

const requestOnce = (url: URL, pinned: ResolvedAddress, deadline: number): Promise<RawResponse> =>
  new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      reject(new SafeFetchError('url_delai', 'Le site met trop de temps à répondre.'));
      return;
    }
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Campus360-SourceFetcher/1.0 (+https://campus360b.site)',
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,application/pdf;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        // Pin the connection to the address that passed validation.
        lookup: (_hostname, options, callback) => {
          const opts = typeof options === 'object' && options ? options : {};
          if ((opts as { all?: boolean }).all) {
            (callback as unknown as (e: null, a: ResolvedAddress[]) => void)(null, [pinned]);
          } else {
            (callback as (e: null, a: string, f: number) => void)(null, pinned.address, pinned.family);
          }
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400) {
          res.resume();
          resolve({ status, headers: res.headers, body: Buffer.alloc(0) });
          return;
        }
        const declared = Number(res.headers['content-length'] || 0);
        if (declared > SAFE_FETCH_MAX_BYTES) {
          res.destroy();
          reject(new SafeFetchError('url_trop_lourde', 'La page est trop volumineuse (maximum 5 Mo).'));
          return;
        }
        const parts: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > SAFE_FETCH_MAX_BYTES) {
            res.destroy();
            reject(new SafeFetchError('url_trop_lourde', 'La page est trop volumineuse (maximum 5 Mo).'));
            return;
          }
          parts.push(chunk);
        });
        res.on('end', () => resolve({ status, headers: res.headers, body: Buffer.concat(parts) }));
        res.on('error', reject);
      },
    );
    req.setTimeout(remaining, () => {
      req.destroy(new SafeFetchError('url_delai', 'Le site met trop de temps à répondre.'));
    });
    req.on('error', (error) => {
      reject(error instanceof SafeFetchError ? error : new SafeFetchError('url_echec', 'Impossible de joindre ce site.'));
    });
    req.end();
  });

const decompress = (body: Buffer, encoding: string | undefined): Buffer => {
  const options = { maxOutputLength: SAFE_FETCH_MAX_BYTES };
  try {
    switch ((encoding || '').trim().toLowerCase()) {
      case 'gzip':
      case 'x-gzip':
        return zlib.gunzipSync(body, options);
      case 'deflate':
        return zlib.inflateSync(body, options);
      case 'br':
        return zlib.brotliDecompressSync(body, options);
      case '':
      case 'identity':
        return body;
      default:
        throw new SafeFetchError('url_illisible', 'Le contenu de ce site est illisible.');
    }
  } catch (error) {
    if (error instanceof SafeFetchError) throw error;
    throw new SafeFetchError('url_trop_lourde', 'La page est trop volumineuse ou corrompue.');
  }
};

export type SafeFetchResult = { finalUrl: string; contentType: string; charset: string | null; body: Buffer };

export const safeFetch = async (rawUrl: string): Promise<SafeFetchResult> => {
  const deadline = Date.now() + SAFE_FETCH_TIMEOUT_MS;
  let url = parsePublicUrl(rawUrl);
  for (let hop = 0; hop <= SAFE_FETCH_MAX_REDIRECTS; hop += 1) {
    const pinned = await resolvePublicAddress(url);
    const response = await requestOnce(url, pinned, deadline);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location) throw new SafeFetchError('url_echec', 'Redirection invalide.');
      url = parsePublicUrl(new URL(location, url).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      throw new SafeFetchError('url_echec', `Le site a répondu avec une erreur (${response.status}).`);
    }
    const header = String(response.headers['content-type'] || '').toLowerCase();
    const contentType = header.split(';')[0].trim();
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      throw new SafeFetchError('url_type', 'Ce type de contenu n’est pas pris en charge (page web, texte ou PDF).');
    }
    const charsetMatch = header.match(/charset=([^;]+)/);
    const body = decompress(response.body, response.headers['content-encoding'] as string | undefined);
    return { finalUrl: url.toString(), contentType, charset: charsetMatch ? charsetMatch[1].trim() : null, body };
  }
  throw new SafeFetchError('url_echec', 'Trop de redirections.');
};
