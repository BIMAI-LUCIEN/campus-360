/**
 * Pure business rules for internship applications lifecycle.
 * Students may only withdraw their own application from an active/pending status.
 * Advancing status to INTERVIEW, ACCEPTED or REJECTED is strictly reserved for recruiters and admins.
 */
export const canStudentSetStatus = (current: string, next: string): boolean => {
  if (next !== 'WITHDRAWN') {
    return false;
  }
  const cancellable = ['PENDING', 'SENT_PENDING', 'DELIVERED', 'FAILED', 'REVIEWING'];
  return cancellable.includes(current);
};
