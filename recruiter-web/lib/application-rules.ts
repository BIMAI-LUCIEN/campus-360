/**
 * Pure business rules for internship applications lifecycle.
 * The recruiter answers the student directly (WhatsApp, or the e-mail's Reply-To), so the
 * student is the one who reports what happened next (decision of 2026-11-01): a reply,
 * an interview, an acceptance or a refusal. A WhatsApp reply is also detected automatically.
 */
const CANCELLABLE = ['PENDING', 'SENT_PENDING', 'DELIVERED', 'FAILED', 'REVIEWING'];
/** Statuses an application has once it has really reached the company. */
const REACHED = ['PENDING', 'SENT_PENDING', 'DELIVERED', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];
const OUTCOMES = ['REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];

export const canStudentSetStatus = (current: string, next: string): boolean => {
  if (next === 'WITHDRAWN') return CANCELLABLE.includes(current);
  return OUTCOMES.includes(next) && REACHED.includes(current) && current !== next;
};

/** Statuses after which a new automatic send must not overwrite the application. */
export const BLOCKS_RESEND = ['SENT_PENDING', 'DELIVERED', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];

/**
 * A delivery callback (n8n) only moves an application that is still in the sending
 * stage: it never brings back an outcome the student already reported.
 */
export const canDispatchSetStatus = (current: string, next: string): boolean => {
  if (next === 'DELIVERED' || next === 'FAILED') return ['PENDING', 'SENT_PENDING', 'FAILED', 'DELIVERED'].includes(current);
  if (next === 'REVIEWING') return ['PENDING', 'SENT_PENDING', 'DELIVERED'].includes(current);
  return false;
};

export const MAX_REMINDERS = 2;
export const REMINDER_INTERVAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * PENDING is what a student's own send leaves (their mailbox or wa.me, on the phone): the
 * app asks them to confirm the send before a reminder. DELIVERED is a send by Campus 360.
 */
export const FOLLOWUP_STATUSES = ['PENDING', 'DELIVERED'];

/**
 * due: a reminder can go out. ask: the deadline passed but no e-mail or the offer expired,
 * so only « did you get a reply? » remains. waiting: before the deadline. exhausted: no
 * reply after the last reminder. unconfirmed: a send by Campus 360 that never came back.
 */
export type FollowupState = 'due' | 'ask' | 'waiting' | 'exhausted' | 'unconfirmed' | 'none';

/** The company's real address, or null: a reminder is never sent to a guess. */
export const followupRecipient = (email: string | null | undefined): string | null => {
  const value = (email || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
};

/** J+7 then J+14, 2 reminders at most (contexte.md §21). The single rule of the follow-up. */
export const followupState = (
  input: {
    status: string;
    appliedAt: string;
    lastRemindedAt?: string | null;
    reminderCount?: number | null;
    hasRecipient: boolean;
    offerExpired: boolean;
  },
  now: Date = new Date(),
): FollowupState => {
  const applied = new Date(input.appliedAt).getTime();
  if (input.status === 'SENT_PENDING') {
    return Number.isFinite(applied) && now.getTime() - applied >= DAY_MS ? 'unconfirmed' : 'none';
  }
  if (!FOLLOWUP_STATUSES.includes(input.status)) return 'none';
  const since = new Date(input.lastRemindedAt || input.appliedAt).getTime();
  if (!Number.isFinite(since)) return 'none';
  if (now.getTime() - since < REMINDER_INTERVAL_DAYS * DAY_MS) return 'waiting';
  if ((input.reminderCount ?? 0) >= MAX_REMINDERS) return 'exhausted';
  return input.hasRecipient && !input.offerExpired ? 'due' : 'ask';
};
