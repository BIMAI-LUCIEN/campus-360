// Pure scoring helper (no imports) shared by the automations and unit-tested in tests/.

export const MATCH_ALERT_THRESHOLD = 70;

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Share (0-100) of the offer's requirements covered by the student's skills. A requirement is
 * covered when a skill contains it or is contained in it (case and accent insensitive).
 */
export const computeMatchScore = (skills: readonly string[], requirements: readonly string[]): number => {
  const normalizedSkills = skills.map(normalize).filter((skill) => skill.length >= 2);
  const normalizedRequirements = requirements.map(normalize).filter((req) => req.length >= 2);
  if (normalizedSkills.length === 0 || normalizedRequirements.length === 0) return 0;
  const covered = normalizedRequirements.filter((req) =>
    normalizedSkills.some((skill) => skill.includes(req) || req.includes(skill)),
  ).length;
  return Math.round((covered / normalizedRequirements.length) * 100);
};
