export const MAX_ACCOUNT_SKILLS = 20;
export const MIN_SKILL_LENGTH = 2;
export const MAX_SKILL_LENGTH = 60;

/**
 * Normalizes a student's skills list: trims and collapses spaces, drops entries
 * shorter than 2 characters, truncates to 60 characters, deduplicates
 * case-insensitively while preserving first casing, and caps at 20 items.
 */
export const sanitizeSkills = (input: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const normalized = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_SKILL_LENGTH);
    if (normalized.length < MIN_SKILL_LENGTH) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= MAX_ACCOUNT_SKILLS) break;
  }

  return result;
};
