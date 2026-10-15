// Free launch state, as told by the server (account.wallet.freeLaunch and
// freeLaunchUntil). Off by default: before the account is loaded the app never
// claims something is free.
let freeLaunch = false;
let freeLaunchUntil: string | null = null;

export const isFreeLaunch = (): boolean => freeLaunch;

export const freeLaunchEndDate = (): string | null => freeLaunchUntil;

export const setFreeLaunch = (active: boolean, until: string | null = null): void => {
  freeLaunch = active;
  freeLaunchUntil = until;
};

// "Gratuit", or "Gratuit jusqu'au 15 janvier 2027" when the end date is known.
export const freeLabel = (): string => {
  if (!freeLaunchUntil) return 'Gratuit';
  const date = new Date(freeLaunchUntil);
  if (Number.isNaN(date.getTime())) return 'Gratuit';
  return `Gratuit jusqu'au ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
};

export const FREE_LABEL = 'Gratuit';
