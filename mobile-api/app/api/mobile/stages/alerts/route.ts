import { timingSafeEqual } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { runJobAlerts } from '@/lib/job-alerts';

export const runtime = 'nodejs';

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * POST /api/mobile/stages/alerts
 * Server to server (VPS cron, n8n): announces the published offers not yet announced,
 * whatever published them (scraping agents, admin portal). Shared secret, fail closed.
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
    const result = await runJobAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[stages/alerts] run failed:', error);
    return NextResponse.json({ error: 'Alertes indisponibles.' }, { status: 500 });
  }
}
