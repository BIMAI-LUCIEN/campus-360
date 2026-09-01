import { NextResponse } from 'next/server';

import { AUTH_CONFIG } from '@/lib/auth';

export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({
    passwordReset: Boolean(process.env.RESEND_API_KEY),
    google: Boolean(AUTH_CONFIG.googleEnabled),
  });
}
