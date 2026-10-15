import { NextRequest, NextResponse } from 'next/server';

import { isTrustedOrigin } from './lib/origins';

const isAllowedOrigin = (origin: string) => isTrustedOrigin(origin, process.env);

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
      'Content-Type, Cookie, Expo-Origin, Authorization, X-Requested-With',
    );
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.headers.set('Vary', 'Origin');
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  // Match all API routes and the Better Auth auth routes
  matcher: ['/api/:path*', '/auth/:path*'],
};
