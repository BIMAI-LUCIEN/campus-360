import { NextRequest, NextResponse } from 'next/server';

function isAllowedOrigin(origin: string) {
  return (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://10.48.198.18:') ||
    origin === 'campus-bordes://'
  );
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const response = request.method === 'OPTIONS'
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();

  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Cookie, Expo-Origin, Authorization');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.headers.set('Vary', 'Origin');
  }

  return response;
}

export const config = {
  matcher: ['/api/auth/:path*', '/api/mobile/:path*'],
};
