import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGIN_PREFIXES = [
  'http://localhost:',
  'http://127.0.0.1:',
  'https://campus-360-hi97.vercel.app',
];

const isAllowedOrigin = (origin: string) => {
  if (origin === 'campus-3602://') return true;
  return ALLOWED_ORIGIN_PREFIXES.some((prefix) => origin.startsWith(prefix));
};

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isPreflight = request.method === 'OPTIONS';
  const response = isPreflight
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();

  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Cookie, Expo-Origin, Authorization',
    );
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.headers.set('Vary', 'Origin');
  }

  // Security headers on every response that flows through the middleware.
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: ['/api/auth/:path*', '/api/mobile/:path*'],
};
