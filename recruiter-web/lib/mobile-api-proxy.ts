import { NextResponse, type NextRequest } from 'next/server';

// Relays an admin request to mobile-api's admin routes (Module 24, report
// templates), server to server. The caller has already checked the admin
// session; this adds the shared service secret and the admin's id. Browser
// cookies are never forwarded.

const SEGMENT = /^[A-Za-z0-9-]{1,64}$/;
// Admin areas of mobile-api this relay may reach (Module 24 templates, Module 27 PDF intake).
const PREFIXES = ['templates', 'pdf-intake'] as const;
export type MobileApiAdminPrefix = (typeof PREFIXES)[number];

export const forwardToMobileApi = async (
  request: NextRequest,
  segments: string[],
  adminUserId: string,
  prefix: MobileApiAdminPrefix = 'templates',
) => {
  const base = process.env.MOBILE_API_INTERNAL_URL?.replace(/\/+$/, '');
  const secret = process.env.ADMIN_SERVICE_SECRET;
  if (!base || !secret) {
    return NextResponse.json({ error: 'Service indisponible.' }, { status: 503 });
  }
  if (!PREFIXES.includes(prefix) || !segments.every((s) => SEGMENT.test(s))) {
    return NextResponse.json({ error: 'Chemin invalide.' }, { status: 400 });
  }
  const url = `${base}/api/admin/${prefix}${segments.length ? `/${segments.join('/')}` : ''}${request.nextUrl.search}`;
  const headers: Record<string, string> = {
    'x-admin-service-key': secret,
    'x-admin-user-id': adminUserId,
  };
  const contentType = request.headers.get('content-type');
  const contentLength = request.headers.get('content-length');
  if (contentType) headers['content-type'] = contentType;
  if (contentLength) headers['content-length'] = contentLength;
  const hasBody = !['GET', 'HEAD'].includes(request.method);

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Stream the (possibly multipart) body instead of buffering it.
      ...(hasBody ? { duplex: 'half' } : {}),
      redirect: 'error',
      cache: 'no-store',
    } as RequestInit);
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    console.error('[mobile-api-proxy] relay failed', error);
    return NextResponse.json({ error: 'Service injoignable.' }, { status: 502 });
  }
};
