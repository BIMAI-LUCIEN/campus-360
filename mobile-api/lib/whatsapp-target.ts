/**
 * Pure helper for resolving authenticated WhatsApp targets and ownership.
 * Zero external imports so it can be loaded in unit tests and everywhere.
 */

export function normalizeTargetPhone(rawPhone: string | null | undefined): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Cameroon mobile numbers: 9 digits starting with 6 -> prefix with country code 237
  if (digits.length === 9 && digits.startsWith('6')) {
    digits = '237' + digits;
  }

  return digits;
}

export function resolveWhatsAppTarget(profile: {
  whatsappPhone?: string | null;
  phone?: string | null;
} | null | undefined): { phone: string; instanceName: string } | null {
  const candidate = profile?.whatsappPhone?.trim() || profile?.phone?.trim() || '';
  const normalized = normalizeTargetPhone(candidate);
  if (!normalized || normalized.length < 8) {
    return null;
  }

  return {
    phone: normalized,
    instanceName: `student-${normalized}`,
  };
}

export function isOwnInstance(
  requested: string | null | undefined,
  own: string,
): boolean {
  if (!requested || !requested.trim()) {
    return true;
  }
  return requested.trim() === own.trim();
}
