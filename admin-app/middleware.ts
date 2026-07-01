import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGIN_PREFIXES = [
  'http://localhost:',
  'http://127.0.0.1:',
  'https://campus-360-hi97.vercel.app',
];

const isAllowedOrigin = (origin: string) => {
  if (origin === 'campus-bordes://') return true;
  return ALLOWED_ORIGIN_PREFIXES.some((prefix) => origin.startsWith(prefix));
};

// ─────────────────────────────────────────────────────────────────────────
// Auth gate for /admin/*
//
// The previous design called `requireAdminPage()` from the admin layout,
// which created a redirect loop:
//   /admin/login  → (no session) → redirect /admin/login  → loop → 404
//
// We now do a fast, cookie-presence check here so unauthenticated users
// hit a single redirect to /admin/login. Pages keep their full
// `requireAdminPage()` call for the DB-backed admin-role check.
//
// Public admin routes (no session required) bypass this gate entirely.
// ─────────────────────────────────────────────────────────────────────────

const ADMIN_PUBLIC_PATHS = new Set<string>(['/admin/login', '/admin/forbidden']);

// Better Auth's session cookie name. In production (Secure=true) Better Auth
// prefixes the cookie with `__Secure-` to prevent it from being set over an
// insecure connection, so we check both variants. There's also a
// `session_data` companion cookie that holds the cached session payload.
const SESSION_COOKIE_NAMES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
  'better-auth.session_data',
  '__Secure-better-auth.session_data',
];

const isAdminPath = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/admin');

const hasSessionCookie = (req: NextRequest) =>
  SESSION_COOKIE_NAMES.some((name) => req.cookies.get(name)?.value);

export function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // ── Admin auth gate (must run BEFORE CORS handling so redirects don't
  //    accidentally emit CORS headers on the redirect response) ─────────
  if (isAdminPath(pathname) && !ADMIN_PUBLIC_PATHS.has(pathname)) {
    if (!hasSessionCookie(request)) {
      const loginUrl = new URL('/admin/login', request.url);
      // Preserve where the user was trying to go so the login page can
      // bounce them back after sign-in.
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── CORS for mobile + dev ─────────────────────────────────────────────
  const originHeader = request.headers.get('origin');
  const isPreflight = request.method === 'OPTIONS';
  const response = isPreflight
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();

  if (originHeader && isAllowedOrigin(originHeader)) {
    response.headers.set('Access-Control-Allow-Origin', originHeader);
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

  // Stash the resolved pathname on a request header so server components
  // (e.g. the admin shell breadcrumb) can read it without prop-drilling.
  response.headers.set('x-pathname', pathname);
  // `origin` is unused locally but kept in scope for future CORS work.
  void origin;

  return response;
}

export const config = {
  // Run on every /admin/* path AND the existing CORS-protected API routes.
  matcher: ['/admin/:path*', '/api/auth/:path*', '/api/mobile/:path*'],
};