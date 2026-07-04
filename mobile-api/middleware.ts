import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  // Expo / mobile app deep links
  'campus-bordes://',
  // Vercel preview deployments (for testing)
  'https://campus-360-hi97.vercel.app',
  'https://campus-360.vercel.app',
  'https://campus-360-bimai-s-projects.vercel.app',
  // Custom domains
  'https://admin.campus360b.site',
  'https://api.campus360b.site',
  // Local development
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

const isAllowedOrigin = (origin: string) => {
  if (!origin || origin === 'null') return true; // server-side calls
  if (origin === 'campus-bordes://') return true;
  return ALLOWED_ORIGINS.some((prefix) => origin.startsWith(prefix));
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
