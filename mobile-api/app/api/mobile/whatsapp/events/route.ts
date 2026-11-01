import { timingSafeEqual } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { notifyApplicationStatus } from '@/lib/automations';
import {
  findApplicationsAwaitingReply,
  setWhatsAppConnectedByInstance,
  updateApplicationDispatchStatus,
} from '@/lib/stages-db';
import { parseWhatsAppEvent, phoneKey } from '@/lib/whatsapp-events';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 256 * 1024;

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * POST /api/mobile/whatsapp/events
 * Evolution API webhook of the students' instances (server to server, shared secret
 * in `x-campus360-secret`). A recruiter writing back to a student moves the matching
 * application to REVIEWING (« réponse reçue ») and notifies the student.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
  const provided = request.headers.get('x-campus360-secret')?.trim() || '';
  if (!expected || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Événement trop volumineux.' }, { status: 413 });
  }

  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  try {
    const event = parseWhatsAppEvent(body);
    if (event.kind === 'connection') {
      await setWhatsAppConnectedByInstance(event.instance, event.connected);
    } else if (event.kind === 'incoming') {
      const ids = await findApplicationsAwaitingReply(event.instance, phoneKey(event.fromPhone));
      for (const id of ids) {
        const updated = await updateApplicationDispatchStatus(id, 'REVIEWING');
        if (updated?.changed) await notifyApplicationStatus(id, 'REVIEWING');
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[whatsapp events] processing failed:', error);
    return NextResponse.json({ error: 'Traitement impossible.' }, { status: 500 });
  }
}
