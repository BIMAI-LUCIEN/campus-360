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

/** J+7 follow-up: 7 days after sending, then 7 days after the last reminder. */
export const isFollowupDue = (
  status: string,
  appliedAt: string,
  lastRemindedAt: string | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!['PENDING', 'SENT_PENDING', 'DELIVERED'].includes(status)) return false;
  const since = new Date(lastRemindedAt || appliedAt).getTime();
  if (!Number.isFinite(since)) return false;
  return now.getTime() - since >= 7 * 24 * 60 * 60 * 1000;
};
