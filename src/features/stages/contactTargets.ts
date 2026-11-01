// Real contact targets of a company, or null. Never a fallback number or address:
// without a real target the app disables the action instead of writing to a stranger.

export const companyWhatsapp = (company?: { contactWhatsapp?: string | null } | null): string | null => {
  let digits = (company?.contactWhatsapp || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  // A Cameroon mobile number saved without its country code (6XXXXXXXX): wa.me needs 237.
  if (digits.length === 9 && digits.startsWith('6')) digits = `237${digits}`;
  return digits.length >= 8 ? digits : null;
};

export const companyEmail = (company?: { contactEmail?: string | null } | null): string | null => {
  const email = (company?.contactEmail || '').trim();
  return email.includes('@') ? email : null;
};

export const CONTACT_UNAVAILABLE = "Contact de l'entreprise indisponible";
