import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({
    passwordReset: Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
}

