/**
 * Pure parsing of Evolution API webhook events (no imports, unit-tested).
 * The student's own WhatsApp sends the application, so a recruiter's answer
 * arrives on the student's instance as an incoming `messages.upsert`.
 */

export type WhatsAppEvent =
  | { kind: 'connection'; instance: string; connected: boolean }
  | { kind: 'incoming'; instance: string; fromPhone: string }
  | { kind: 'ignored' };

const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

/** Last 9 digits: a Cameroon number with or without the 237 prefix compares equal. */
export const phoneKey = (value: unknown): string => digits(value).slice(-9);

export const parseWhatsAppEvent = (body: unknown): WhatsAppEvent => {
  if (!body || typeof body !== 'object') return { kind: 'ignored' };
  const payload = body as Record<string, any>;
  const event = String(payload.event ?? '').toLowerCase().replace(/_/g, '.');
  const instance = String(payload.instance ?? '').trim();
  if (!instance.startsWith('student-')) return { kind: 'ignored' };

  if (event === 'connection.update') {
    const state = String(payload.data?.state ?? '').toLowerCase();
    if (!state) return { kind: 'ignored' };
    return { kind: 'connection', instance, connected: state === 'open' };
  }

  if (event === 'messages.upsert') {
    const message = Array.isArray(payload.data) ? payload.data[0] : payload.data;
    const key = message?.key ?? {};
    const jid = String(key.remoteJid ?? '');
    // Only a person writing to the student: not the student's own messages,
    // not groups, broadcasts or status updates.
    if (key.fromMe === true || !jid.endsWith('@s.whatsapp.net')) return { kind: 'ignored' };
    const fromPhone = digits(jid.split('@')[0]);
    if (fromPhone.length < 9) return { kind: 'ignored' };
    return { kind: 'incoming', instance, fromPhone };
  }

  return { kind: 'ignored' };
};
