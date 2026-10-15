// A dispatch needs a real recipient for its channel; otherwise the error message
// to return (422). No fallback recipient, ever.

export const missingDispatchTarget = (
  channel: 'whatsapp' | 'email',
  target: { phone?: string | null; email?: string | null },
): string | null => {
  if (channel === 'whatsapp') {
    const digits = (target.phone || '').replace(/[^0-9]/g, '');
    return digits.length >= 8 ? null : "Cette entreprise n'a pas de numéro WhatsApp.";
  }
  return (target.email || '').includes('@') ? null : "Cette entreprise n'a pas d'adresse e-mail.";
};
