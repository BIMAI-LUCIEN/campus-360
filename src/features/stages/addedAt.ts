// "Added X ago" label for a stage offer card, from stage_jobs.created_at (the
// moment the offer entered our database, not the source publication date).
// Absolute dates are shown in Cameroon time: UTC+1 all year, no daylight saving.
// Computed by hand on purpose: Intl / toLocaleString with a timeZone is not
// reliable under Hermes on Android. No imports: loaded as-is by the Node tests.

const CAMEROON_OFFSET_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const FUTURE_TOLERANCE_MS = 5 * MINUTE_MS;

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const absoluteLabel = (time: number, now: Date): string => {
  const local = new Date(time + CAMEROON_OFFSET_MS);
  const localNowYear = new Date(now.getTime() + CAMEROON_OFFSET_MS).getUTCFullYear();
  const year = local.getUTCFullYear() === localNowYear ? '' : ` ${local.getUTCFullYear()}`;
  const minutes = String(local.getUTCMinutes()).padStart(2, '0');
  return `Ajouté le ${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]}${year} à ${local.getUTCHours()} h ${minutes}`;
};

export const formatAddedAgo = (createdAtIso: string, now: Date = new Date()): string => {
  if (!createdAtIso) return '';
  const time = Date.parse(createdAtIso);
  if (Number.isNaN(time)) return '';

  const elapsed = now.getTime() - time;
  if (elapsed < 0) {
    // Small clock skew between server and phone: treat as just added.
    return -elapsed <= FUTURE_TOLERANCE_MS ? "Ajouté à l'instant" : absoluteLabel(time, now);
  }
  if (elapsed < MINUTE_MS) return "Ajouté à l'instant";
  if (elapsed < HOUR_MS) return `Ajouté il y a ${Math.floor(elapsed / MINUTE_MS)} min`;
  if (elapsed < DAY_MS) return `Ajouté il y a ${Math.floor(elapsed / HOUR_MS)} h`;
  if (elapsed < 7 * DAY_MS) return `Ajouté il y a ${Math.floor(elapsed / DAY_MS)} j`;
  return absoluteLabel(time, now);
};
