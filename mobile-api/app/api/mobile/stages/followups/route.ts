import { timingSafeEqual } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { runApplicationFollowups } from '@/lib/application-followups';

export const runtime = 'nodejs';

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * POST /api/mobile/stages/followups
 * Server to server (daily VPS cron): reminds the students whose applications reached a
 * follow-up deadline. Shared secret, fail closed.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.N8N_INGESTION_SECRET?.trim();
  const provided =
    request.headers.get('x-n8n-api-key')?.trim() ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    '';
  if (!expected || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  try {
    const result = await runApplicationFollowups();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[stages/followups] run failed:', error);
    return NextResponse.json({ error: 'Rappels indisponibles.' }, { status: 500 });
  }
}
