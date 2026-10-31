import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest, NextResponse } from 'next/server';

import { AUTH_CONFIG, auth } from '@/lib/auth';
import { isTrustedOrigin } from '@/lib/origins';

export const runtime = 'nodejs';

const authHandler = toNextJsHandler(auth);

// Same origins as Better Auth's own `trustedOrigins`: any other site gets no
// CORS header, so it can never read a session response with credentials.
const setCorsHeaders = (headers: Headers, req?: Request | null) => {
  const origin = req?.headers.get('origin');
  if (origin && (isTrustedOrigin(origin, process.env) || AUTH_CONFIG.trustedOrigins.includes(origin))) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    // Native mobile clients do not send an Origin header.
    headers.set('Access-Control-Allow-Origin', '*');
  }
  headers.append('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Expo-Origin, x-client-info, apikey, X-Requested-With',
  );
};

const withCorsHeaders = (res: Response, req?: Request | null): NextResponse => {
  const headers = new Headers(res.headers);
  setCorsHeaders(headers, req);

  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};

export async function OPTIONS(request: NextRequest) {
  const headers = new Headers();
  setCorsHeaders(headers, request);
  return new NextResponse(null, { status: 204, headers });
}

// Never fabricate a session when the auth backend fails: surface a 503 instead.
const unavailable = (request: NextRequest) =>
  withCorsHeaders(
    NextResponse.json({ error: 'Service d’authentification temporairement indisponible.' }, { status: 503 }),
    request,
  );

export async function GET(request: NextRequest) {
  try {
    const res = await authHandler.GET(request);
    return withCorsHeaders(res, request);
  } catch (err) {
    console.error('[auth route] GET failed:', err);
    return unavailable(request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const res = await authHandler.POST(request);
    if (res.status >= 500 && new URL(request.url).pathname.includes('/sign-out')) {
      // Signing out locally must still succeed even if the backend is down.
      return withCorsHeaders(NextResponse.json({ success: true }), request);
    }
    return withCorsHeaders(res, request);
  } catch (err) {
    console.error('[auth route] POST failed:', err);
    return unavailable(request);
  }
}
