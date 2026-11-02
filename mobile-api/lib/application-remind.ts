import { followupRecipient, followupState } from './application-rules';

export type ReminderTarget = {
  status: string;
  appliedAt: string;
  lastRemindedAt: string | null;
  reminderCount: number;
  contactEmail: string | null;
  offerExpired: boolean;
};

export type ReminderDeps = {
  /** Claims the reminder in one conditional update: null when it is no longer due. */
  reserve: () => Promise<{ lastRemindedAt: string; reminderCount: number; previous: string | null } | null>;
  release: (previous: string | null) => Promise<void>;
  send: (recipient: string) => Promise<boolean>;
};

export type ReminderOutcome =
  | { status: 200; lastRemindedAt: string; reminderCount: number }
  | { status: 409 | 422 | 502; error: string };

/**
 * Sends one reminder. It is claimed before the send (two taps cannot send twice) and given
 * back if the provider refuses it (a failed send is never shown as sent).
 */
export const sendFollowupReminder = async (
  target: ReminderTarget,
  confirmedSent: boolean,
  deps: ReminderDeps,
  now: Date = new Date(),
): Promise<ReminderOutcome> => {
  const recipient = followupRecipient(target.contactEmail);
  const state = followupState({ ...target, hasRecipient: Boolean(recipient), offerExpired: target.offerExpired }, now);
  if (state === 'ask' && !recipient) {
    return { status: 422, error: "Cette entreprise n'a pas d'adresse e-mail : la relance ne peut pas partir d'ici." };
  }
  if (state !== 'due' || !recipient) {
    return { status: 409, error: "Aucune relance n'est possible pour cette candidature pour le moment." };
  }
  if (target.status === 'PENDING' && !confirmedSent) {
    return { status: 409, error: "Confirme d'abord que ta candidature est bien partie." };
  }

  const reserved = await deps.reserve();
  if (!reserved) return { status: 409, error: "Aucune relance n'est possible pour cette candidature pour le moment." };

  const sent = await deps.send(recipient).catch(() => false);
  if (!sent) {
    await deps.release(reserved.previous);
    return { status: 502, error: "La relance n'est pas partie. Réessaie dans quelques minutes." };
  }
  return { status: 200, lastRemindedAt: reserved.lastRemindedAt, reminderCount: reserved.reminderCount };
};
