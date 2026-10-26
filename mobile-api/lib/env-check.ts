// Pure function, no imports. Validates environment variables on server startup.
// Never exposes or logs any secret values — only lists missing or invalid variable names.

export type Env = Record<string, string | undefined>;

export const missingProductionEnv = (env: Env): string[] => {
  const missing: string[] = [];

  // BETTER_AUTH_SECRET: must be present and at least 32 characters
  const authSecret = env.BETTER_AUTH_SECRET?.trim();
  if (!authSecret || authSecret.length < 32) {
    missing.push('BETTER_AUTH_SECRET');
  }

  // BETTER_AUTH_URL
  if (!env.BETTER_AUTH_URL?.trim()) {
    missing.push('BETTER_AUTH_URL');
  }

  // DATABASE_URL
  if (!env.DATABASE_URL?.trim()) {
    missing.push('DATABASE_URL');
  }

  // FREE_LAUNCH_MODE: strictly 'true' or 'false'
  const freeMode = env.FREE_LAUNCH_MODE?.trim();
  if (freeMode !== 'true' && freeMode !== 'false') {
    missing.push('FREE_LAUNCH_MODE');
  }

  // FREE_LAUNCH_UNTIL: if FREE_LAUNCH_MODE === 'true', must be a valid parseable date
  if (freeMode === 'true') {
    const until = env.FREE_LAUNCH_UNTIL?.trim();
    if (!until || isNaN(Date.parse(until))) {
      missing.push('FREE_LAUNCH_UNTIL');
    }
  }

  // FILES_SIGNING_SECRET
  if (!env.FILES_SIGNING_SECRET?.trim()) {
    missing.push('FILES_SIGNING_SECRET');
  }

  // UPLOAD_ROOT: required unless running in a serverless environment (VERCEL)
  if (!env.VERCEL && !env.UPLOAD_ROOT?.trim()) {
    missing.push('UPLOAD_ROOT');
  }

  // OPENROUTER_API_KEY
  if (!env.OPENROUTER_API_KEY?.trim()) {
    missing.push('OPENROUTER_API_KEY');
  }

  // RESEND_API_KEY
  if (!env.RESEND_API_KEY?.trim()) {
    missing.push('RESEND_API_KEY');
  }

  // SASPAY_API_KEY: required unless PAYMENTS_ENABLED === 'false'
  if (env.PAYMENTS_ENABLED?.trim() !== 'false') {
    if (!env.SASPAY_API_KEY?.trim()) {
      missing.push('SASPAY_API_KEY');
    }
  }

  return missing;
};

export const assertProductionEnv = (env: Env): void => {
  if (env.NODE_ENV !== 'production') return;
  const missing = missingProductionEnv(env);
  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes ou invalides : ${missing.join(', ')}`,
    );
  }
};
