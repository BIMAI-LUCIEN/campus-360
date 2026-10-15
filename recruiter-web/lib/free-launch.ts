// V1 launch: paid actions are free for a limited time so students can try the app.
// Everything is driven by environment variables and must be explicit in production:
//   FREE_LAUNCH_MODE   'true' | 'false'  (required in production)
//   FREE_LAUNCH_UNTIL  ISO date           (required in production when the mode is 'true')
//   STARTING_COINS     coins given once at account creation (default 3000, 1 coin = 1 FCFA)
//   AI_COST_*          AI credits per action once the free launch is over
// Errors are thrown on first use, never at import time (next build has no env).
// This file exists twice, identical: mobile-api/lib/free-launch.ts and
// recruiter-web/lib/free-launch.ts (a test compares them).

type Env = Record<string, string | undefined>;

export type FreeLaunchState = { active: boolean; until: string | null };

let warnedMissingMode = false;

export const resolveFreeLaunch = (env: Env, now: Date = new Date()): FreeLaunchState => {
  const mode = env.FREE_LAUNCH_MODE;
  const production = env.NODE_ENV === 'production';

  if (mode !== 'true' && mode !== 'false') {
    if (production) throw new Error('FREE_LAUNCH_MODE doit valoir true ou false en production.');
    if (!warnedMissingMode) {
      warnedMissingMode = true;
      console.warn('[free-launch] FREE_LAUNCH_MODE is not set: free launch assumed outside production.');
    }
    return { active: true, until: null };
  }
  if (mode === 'false') return { active: false, until: null };

  const rawUntil = env.FREE_LAUNCH_UNTIL?.trim();
  if (!rawUntil) {
    if (production) throw new Error('FREE_LAUNCH_UNTIL est obligatoire en production quand le lancement gratuit est actif.');
    return { active: true, until: null };
  }
  const until = new Date(rawUntil);
  if (!/^\d{4}-\d{2}-\d{2}/.test(rawUntil) || Number.isNaN(until.getTime())) {
    throw new Error("FREE_LAUNCH_UNTIL n'est pas une date ISO valide.");
  }
  return { active: now.getTime() < until.getTime(), until: until.toISOString() };
};

export const isFreeLaunch = (): boolean => resolveFreeLaunch(process.env).active;

export const freeLaunchState = (): FreeLaunchState => resolveFreeLaunch(process.env);

const boundedInt = (raw: string | undefined, fallback: number, max: number, message: string): number => {
  if (raw === undefined || raw.trim() === '') return fallback;
  if (!/^\d+$/.test(raw.trim())) throw new Error(message);
  const value = Number(raw.trim());
  if (value < 0 || value > max) throw new Error(message);
  return value;
};

export const resolveStartingCoins = (env: Env): number =>
  boundedInt(env.STARTING_COINS, 3000, 100000, 'STARTING_COINS doit être un entier entre 0 et 100000.');

export type AiCostKind = 'passage' | 'careerDoc' | 'fullDoc';

const AI_COST_VARS: Record<AiCostKind, { name: string; fallback: number }> = {
  passage: { name: 'AI_COST_PASSAGE', fallback: 1 },
  careerDoc: { name: 'AI_COST_CAREER_DOC', fallback: 2 },
  fullDoc: { name: 'AI_COST_FULL_DOC', fallback: 3 },
};

// Credits charged for an AI action: 0 during the free launch, the configured
// reduced price afterwards.
export const resolveAiCost = (env: Env, kind: AiCostKind, now: Date = new Date()): number => {
  if (resolveFreeLaunch(env, now).active) return 0;
  const { name, fallback } = AI_COST_VARS[kind];
  return boundedInt(env[name], fallback, 100, `${name} doit être un entier entre 0 et 100.`);
};

export const aiCost = (kind: AiCostKind): number => resolveAiCost(process.env, kind);
